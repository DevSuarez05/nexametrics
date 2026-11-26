import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { streamAssistantReply } from './assistant.server'

const inputSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
  context: z.string().max(40_000),
})

export type AssistantInput = z.infer<typeof inputSchema>

/**
 * Pregunta a Nexa. El navegador envía la conversación y el resumen de sus datos (viven en localStorage);
 * el servidor llama al AI Gateway de Lovable y devuelve la respuesta en streaming.
 */
export const askNexa = createServerFn({ method: 'POST' })
  .validator(inputSchema)
  .handler(async ({ data }) => streamAssistantReply(data.messages, data.context))
