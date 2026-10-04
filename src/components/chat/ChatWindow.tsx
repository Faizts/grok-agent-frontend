'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Terminal, Globe, Code, FileText, Search, Loader2, Send, Wifi, WifiOff } from 'lucide-react'
import { useChatStore, ChatMessage } from '@/store/chat'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/api/v1/ws'

const TOOL_ICONS: Record<string, React.ReactNode> = {
  shell:      <Terminal size={13} />,
  python:     <Code size={13} />,
  browser:    <Globe size={13} />,
  file:       <FileText size={13} />,
  web_search: <Search size={13} />,
}

function ToolCallCard({ msg }: { msg: ChatMessage }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-violet-400 hover:bg-zinc-800 transition-colors"
      >
        {TOOL_ICONS[msg.toolName ?? ''] ?? <Terminal size={13} />}
        <span className="font-semibold">{msg.toolName}</span>
        <span className="ml-auto text-zinc-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <pre className="text-zinc-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
            {JSON.stringify(msg.toolInput, null, 2)}
          </pre>
          {msg.toolOutput && (
            <div className="pt-2 border-t border-zinc-700">
              <p className="text-zinc-500 mb-1">Output:</p>
              <pre className="text-zinc-400 text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {msg.toolOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-violet-600 text-white'
            : 'bg-zinc-800 text-zinc-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ' '}</ReactMarkdown>
            {msg.streaming && !msg.content && (
              <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { messages, addMessage, appendToLast, updateLastToolOutput, setThinking, setConnected, isConnected, isThinking } = useChatStore()
  const user = useAuthStore((s) => s.user)
  const [input, setInput] = useState('')
  const ws = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user) return
    const url = `${WS_URL}/${conversationId}?token=${user.token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)

    ws.current.onmessage = (e) => {
      const event = JSON.parse(e.data)

      if (event.type === 'text') {
        appendToLast(event.content)
      } else if (event.type === 'tool_call') {
        addMessage({
          id: crypto.randomUUID(),
          role: 'tool_call',
          content: '',
          toolName: event.tool,
          toolInput: event.input,
        })
      } else if (event.type === 'tool_result') {
        updateLastToolOutput(event.output ?? '')
      } else if (event.type === 'done' || event.type === 'error') {
        setThinking(false)
      }
    }

    return () => ws.current?.close()
  }, [conversationId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return
    const text = input.trim()

    addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true })

    ws.current.send(JSON.stringify({ message: text }))
    setInput('')
    setThinking(true)

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center">
              <span className="text-violet-400 text-3xl">✦</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">What can I help you with?</h3>
              <p className="text-zinc-500 text-sm mt-1">I have access to a real computer — I can run code, browse the web, and manage files.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
              {[
                'Search the web for latest AI news',
                'Write and run a Python script',
                'Create a file and show its contents',
                'Take a screenshot of a website',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                  className="text-left text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'tool_call' ? (
            <ToolCallCard key={msg.id} msg={msg} />
          ) : (
            <MessageBubble key={msg.id} msg={msg} />
          )
        )}

        {isThinking && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm px-1">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-800/60">
        <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            placeholder="Message your agent..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 resize-none outline-none text-sm leading-relaxed"
            style={{ maxHeight: '200px' }}
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs" title={isConnected ? 'Connected' : 'Disconnected'}>
              {isConnected
                ? <Wifi size={14} className="text-green-500" />
                : <WifiOff size={14} className="text-zinc-600" />
              }
            </span>
            <button
              onClick={send}
              disabled={!input.trim() || !isConnected || isThinking}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed
                         text-white rounded-xl p-2 transition-colors"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
        <p className="text-zinc-600 text-xs mt-2 text-center">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
