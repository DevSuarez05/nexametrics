// Solo servidor: el sufijo .server impide que este módulo (y las claves de IA) lleguen al navegador.

import Anthropic from '@anthropic-ai/sdk'
import type { AssistantErrorCode, ChatMessage } from './assistant.types'

const CLAUDE_MODEL = 'claude-opus-5-5'

interface OpenAICompatibleProvider {
  name: string
  url: string
  apiKey: string
  model: string
}

/**
 * Orden de preferencia:
 * 1. Claude (ANTHROPIC_API_KEY), con el SDK oficial de Anthropic.
 * 2. AI Gateway de Lovable (LOVABLE_API_KEY), cuando la app corre dentro de Lovable.
 * 3. Google Gemini (GEMINI_API_KEY).
 * Los dos últimos usan la API compatible con OpenAI.
 */
function resolveOpenAICompatible(): OpenAICompatibleProvider | null {
  const lovable = process.env['LOVABLE_API_KEY']
  if (lovable) {
    return {
      name: 'Lovable',
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      apiKey: lovable,
      model: 'google/gemini-2.5-flash',
    }
  }
  const gemini = process.env['GEMINI_API_KEY']
  if (gemini) {
    return {
      name: 'Gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      apiKey: gemini,
      model: process.env['GEMINI_MODEL'] || 'gemini-2.5-flash',
    }
  }
  return null
}

const SYSTEM_PROMPT = `Eres Nexa, el asistente de IA de NexaMetrics: analista de negocio experto en compras, ventas, inventario y márgenes de pequeñas y medianas empresas. Respondes siempre en español, en tono claro, cercano y directo.

# Qué puedes responder
1. Preguntas sobre los datos del usuario (lo principal): totales, tendencias, comparaciones entre meses, productos, proveedores, clientes, márgenes, ticket promedio, inventario neto, operaciones específicas por código, fecha o estado.
2. Cómo usar NexaMetrics. Módulos: Overview (indicadores y tendencias), Compras y Ventas (registrar, editar y eliminar operaciones), Comparativa (periodo actual vs. anterior), Análisis estadístico (media, mediana, desviación), Historial de operaciones (buscar y filtrar todo), Reportes (resumen imprimible, exportar CSV y exportar a Google Sheets) y About. Los filtros globales (fechas, mes, año, producto, tipo, proveedor, cliente) están arriba y afectan a todos los módulos. "Restablecer datos de ejemplo" recarga los 60 registros de prueba. Los datos se guardan solo en este navegador.
3. Consejos de negocio (qué comprar, qué producto impulsar, cómo mejorar el margen, a qué proveedor o cliente prestar atención), siempre apoyados en cifras de los datos.
4. Conceptos (qué es margen, ticket promedio, rotación, desviación estándar…), explicados en pocas líneas con un ejemplo tomado de sus datos si es posible.
Si la pregunta no tiene relación con el negocio ni con la app, responde brevemente y reconduce hacia lo que puedes hacer.

# Datos
- <datos> contiene TODO lo que sabes del negocio: totales, series por mes, estadísticas por producto, proveedor y cliente, y la lista de operaciones. Montos en pesos colombianos (COP). Las operaciones anuladas no cuentan en totales ni rankings.
- "Este mes", "el mes pasado", "este año" se refieren a fechaReferencia (la fecha de la operación más reciente), no a la fecha de hoy.
- Respeta los filtros activos y menciónalos si limitan la respuesta.
- Puedes calcular (sumar, restar, promediar, porcentajes) a partir de los datos. Revisa tus cuentas antes de responder.
- Si algo no está en los datos ni se puede calcular con ellos, di "No tengo ese dato" y explica qué faltaría. Nunca inventes cifras, productos, clientes ni proveedores.
- El margen es estimado: precio de venta menos costo promedio de compra del producto. Acláralo cuando lo uses.

# Formato
- Empieza por la respuesta directa (la cifra o la conclusión) y luego el detalle.
- Cifras con separador de miles y signo: $1.250.000. Porcentajes con un decimal: 25,6 %.
- Usa Markdown: **negritas** para cifras clave, listas para pasos o consejos y tablas para comparar 3 o más elementos.
- Sé breve (máximo unas 200 palabras) salvo que pidan detalle o un análisis completo.
- En recomendaciones, separa "Lo que dicen tus datos" de "Sugerencia".
- Si la pregunta es ambigua, responde con la interpretación más probable y dilo en una línea.`

export type GatewayResult =
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; code: AssistantErrorCode }

export async function streamAssistantReply(messages: ChatMessage[], context: string): Promise<GatewayResult> {
  const anthropicKey = process.env['ANTHROPIC_API_KEY']
  if (anthropicKey) return streamFromClaude(anthropicKey, messages, context)

  const provider = resolveOpenAICompatible()
  if (!provider) {
    console.error('Nexa: no hay clave de IA. Configura ANTHROPIC_API_KEY (o GEMINI_API_KEY / LOVABLE_API_KEY).')
    return { ok: false, code: 'config' }
  }

  let response: Response
  try {
    response = await fetch(provider.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        stream: true,
        messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n<datos>\n${context}\n</datos>` }, ...messages],
      }),
    })
  } catch (error) {
    console.error(`Nexa: error de red con ${provider.name}`, error)
    return { ok: false, code: 'unavailable' }
  }

  if (response.status === 429) return { ok: false, code: 'rate_limit' }
  if (response.status === 402) return { ok: false, code: 'credits' }
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    console.error(`Nexa: ${provider.name} respondió`, response.status, detail)
    // Clave inválida o sin permisos (Gemini responde 400 con API_KEY_INVALID).
    if (response.status === 401 || response.status === 403 || detail.includes('API_KEY_INVALID')) {
      return { ok: false, code: 'config' }
    }
    return { ok: false, code: 'unavailable' }
  }

  return { ok: true, stream: response.body.pipeThrough(sseToText()) }
}

const encoder = new TextEncoder()

/** Claude: streaming con el SDK oficial; devuelve solo el texto de la respuesta (el razonamiento no se muestra). */
async function streamFromClaude(apiKey: string, messages: ChatMessage[], context: string): Promise<GatewayResult> {
  const client = new Anthropic({ apiKey })
  const stream = client.beta.messages.stream({
    model: process.env['ANTHROPIC_MODEL'] || CLAUDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    // Si el modelo rechaza una petición por sus filtros de seguridad, la API reintenta con un modelo de respaldo.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      // El resumen de datos se repite en cada pregunta: se cachea para que las siguientes sean más baratas y rápidas.
      { type: 'text', text: `<datos>\n${context}\n</datos>`, cache_control: { type: 'ephemeral' } },
    ],
    messages,
  })
  const events = stream[Symbol.asyncIterator]()

  // Espera el primer evento para detectar errores de clave, límite o créditos antes de responder al navegador.
  let first: IteratorResult<Anthropic.Beta.Messages.BetaRawMessageStreamEvent>
  try {
    first = await events.next()
  } catch (error) {
    return { ok: false, code: claudeErrorCode(error) }
  }

  const textOf = (event: Anthropic.Beta.Messages.BetaRawMessageStreamEvent) =>
    event.type === 'content_block_delta' && event.delta.type === 'text_delta' ? event.delta.text : ''

  let pending: IteratorResult<Anthropic.Beta.Messages.BetaRawMessageStreamEvent> | null = first
  return {
    ok: true,
    stream: new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          for (;;) {
            const result = pending ?? (await events.next())
            pending = null
            if (result.done) {
              controller.close()
              return
            }
            const text = textOf(result.value)
            if (text) {
              controller.enqueue(encoder.encode(text))
              return
            }
          }
        } catch (error) {
          console.error('Nexa: Claude cortó la respuesta', error)
          controller.error(error)
        }
      },
      cancel() {
        stream.abort()
      },
    }),
  }
}

function claudeErrorCode(error: unknown): AssistantErrorCode {
  console.error('Nexa: error de Claude', error)
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return 'config'
  if (error instanceof Anthropic.RateLimitError) return 'rate_limit'
  // Sin saldo, la API responde 400; el tipo de error no lo distingue, así que se revisa el mensaje.
  if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) return 'credits'
  return 'unavailable'
}

/** Convierte el stream SSE de chat/completions en el texto plano de cada delta. */
function sseToText(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  const flushLines = (controller: TransformStreamDefaultController<Uint8Array>, final: boolean) => {
    const lines = buffer.split('\n')
    buffer = final ? '' : (lines.pop() ?? '')
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: unknown } }[] }
        const text = parsed.choices?.[0]?.delta?.content
        if (typeof text === 'string' && text) controller.enqueue(encoder.encode(text))
      } catch {
        // Fragmento incompleto o comentario SSE: se ignora.
      }
    }
  }
  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      flushLines(controller, false)
    },
    flush(controller) {
      buffer += decoder.decode()
      flushLines(controller, true)
    },
  })
}
