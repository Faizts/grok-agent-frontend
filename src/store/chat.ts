export interface SavedFile { path: string; name: string; size: number; modified: number }
export type MessageRole = 'user' | 'assistant' | 'tool_call' | 'tool_result'
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: string
  toolCallId?: string
  attachments?: SavedFile[]
  streaming?: boolean
}
export interface StreamEvent {
  turn_id?: string
  attachments?: SavedFile[]
  type: string
  content?: string
  tool?: string
  input?: unknown
  output?: unknown
  error?: string
  message?: string
  tool_call_id?: string
  call_id?: string
  id?: string
}
export function finishMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(m => m.role !== 'assistant' || m.content).map(m => ({ ...m, streaming: false }))
}
export function applyEvent(messages: ChatMessage[], event: StreamEvent): ChatMessage[] {
  if (event.type === 'turn_started') {
    const index = messages.findLastIndex(m => m.role === 'user')
    return messages.map((m, i) => i === index && event.turn_id ? { ...m, id: event.turn_id } : m)
  }
  if (event.type === 'files') return messages.map(m => m.id === event.turn_id ? { ...m, attachments: event.attachments ?? [] } : m)
  const id = event.tool_call_id ?? event.call_id ?? event.id
  if (event.type === 'text') {
    const last = messages.at(-1)
    if (last?.role === 'assistant' && last.streaming) {
      return [...messages.slice(0, -1), { ...last, content: last.content + (event.content ?? '') }]
    }
    return [...messages, { id: crypto.randomUUID(), role: 'assistant', content: event.content ?? '', streaming: true }]
  }
  if (event.type === 'tool_call') return [...finishMessages(messages), {
    id: crypto.randomUUID(), role: 'tool_call', content: '', toolName: event.tool,
    toolInput: event.input, toolCallId: id,
  }]
  if (event.type === 'tool_result') {
    const output = typeof event.output === 'string' ? event.output : JSON.stringify(event.output ?? '')
    const index = messages.findLastIndex(m => m.role === 'tool_call' && (id ? m.toolCallId === id : m.toolOutput === undefined && (!event.tool || m.toolName === event.tool)))
    if (index < 0) return [...messages, { id: crypto.randomUUID(), role: 'tool_result', content: output, toolName: event.tool, toolOutput: output }]
    return messages.map((m, i) => i === index ? { ...m, toolOutput: output } : m)
  }
  if (event.type === 'done' || event.type === 'error') return finishMessages(messages)
  return messages
}
interface HistoryMessage { attachments?: SavedFile[]; id: string; role: string; content: string; tool_name?: string; tool_call_id?: string; tool_input?: unknown; tool_result?: string }
export function fromHistory(history: HistoryMessage[]): ChatMessage[] {
  let messages: ChatMessage[] = []
  for (const m of history) {
    if (m.role === 'tool_call') {
      let input = m.tool_input ?? m.content
      if (typeof input === 'string' && input) {
        try { input = JSON.parse(input) } catch {}
      }
      messages.push({ id: m.id, role: 'tool_call', content: '', toolName: m.tool_name, toolInput: input, toolCallId: m.tool_call_id })
    } else if (m.role === 'tool_result' || m.role === 'tool') {
      messages = applyEvent(messages, { type: 'tool_result', tool: m.tool_name, output: m.tool_result ?? m.content, tool_call_id: m.tool_call_id })
    } else if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ id: m.id, role: m.role, content: m.content, attachments: m.attachments, streaming: false })
    }
  }
  return messages
}
