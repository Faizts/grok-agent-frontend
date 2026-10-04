'use client'

import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant' | 'tool_call' | 'tool_result'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: string
  streaming?: boolean
}

interface ChatStore {
  messages: ChatMessage[]
  isConnected: boolean
  isThinking: boolean
  addMessage: (m: ChatMessage) => void
  appendToLast: (content: string) => void
  updateLastToolOutput: (output: string) => void
  setThinking: (v: boolean) => void
  setConnected: (v: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isConnected: false,
  isThinking: false,

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),

  appendToLast: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content }
      }
      return { messages: msgs }
    }),

  updateLastToolOutput: (output) =>
    set((s) => {
      const msgs = [...s.messages]
      // Find the last tool_call and attach output
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'tool_call') {
          msgs[i] = { ...msgs[i], toolOutput: output }
          break
        }
      }
      return { messages: msgs }
    }),

  setThinking: (v) => set({ isThinking: v }),
  setConnected: (v) => set({ isConnected: v }),
  clearMessages: () => set({ messages: [] }),
}))
