export type AssistantErrorCode = 'rate_limit' | 'credits' | 'config' | 'unavailable'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
