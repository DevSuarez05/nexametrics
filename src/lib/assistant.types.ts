export type AssistantErrorCode = 'rate_limit' | 'credits' | 'unavailable'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
