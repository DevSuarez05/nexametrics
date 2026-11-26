// Solo servidor: el sufijo .server impide que este módulo (y LOVABLE_API_KEY) llegue al navegador.

import type { AssistantErrorCode, ChatMessage } from './assistant.types'

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const MODEL = 'google/gemini-2.5-flash'

const SYSTEM_PROMPT = `Eres Nexa, analista de negocio de NexaMetrics. Respondes en español, en tono claro y directo.

Reglas:
- Usa SOLO los datos de <datos>. Son el resumen de compras y ventas del usuario (montos en pesos colombianos, COP).
- Cita cifras exactas tal como aparecen en los datos, con separador de miles (ej.: $1.250.000).
- Si la respuesta no está en los datos, di "No tengo ese dato" y explica qué información faltaría. Nunca inventes ni estimes números que no se deriven directamente de los datos.
- Los márgenes son estimados (precio de venta menos costo promedio de compra); acláralo cuando los uses.
- Para recomendaciones (ej. qué comprar), basa cada sugerencia en una cifra concreta de los datos y di que es una sugerencia.
- Usa Markdown: negritas para cifras clave, listas o tablas cuando comparen varios elementos. Máximo unas 200 palabras salvo que pidan detalle.`

export type GatewayResult =
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; code: AssistantErrorCode }

export async function streamAssistantReply(messages: ChatMessage[], context: string): Promise<GatewayResult> {
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) {
    console.error('Nexa: falta LOVABLE_API_KEY')
    return { ok: false, code: 'unavailable' }
  }

  let response: Response
  try {
    response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n<datos>\n${context}\n</datos>` }, ...messages],
      }),
    })
  } catch (error) {
    console.error('Nexa: error de red con el gateway', error)
    return { ok: false, code: 'unavailable' }
  }

  if (response.status === 429) return { ok: false, code: 'rate_limit' }
  if (response.status === 402) return { ok: false, code: 'credits' }
  if (!response.ok || !response.body) {
    console.error('Nexa: el gateway respondió', response.status, await response.text().catch(() => ''))
    return { ok: false, code: 'unavailable' }
  }

  return { ok: true, stream: response.body.pipeThrough(sseToText()) }
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
