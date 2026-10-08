'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Terminal, Globe, Code, FileText, Search, Loader2, Send, Wifi, WifiOff, Bot, ChevronDown } from 'lucide-react'
import { applyEvent, finishMessages, fromHistory, type ChatMessage, type StreamEvent } from '@/store/chat'
import { ResponseFiles } from './ChatFiles'
import { getMessages, downloadWorkspaceFile } from '@/lib/api'
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
  const [open, setOpen] = useState(false)
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
            {JSON.stringify(msg.toolInput, null, 2)?.slice(0, 2000)}
          </pre>
          {msg.toolOutput !== undefined && (
            <div className="pt-2 border-t border-zinc-700">
              <p className="text-zinc-500 mb-1">Output:</p>
              <pre className="text-zinc-400 text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {msg.toolOutput?.startsWith('data:image/') ? 'Screenshot captured' : msg.toolOutput?.slice(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, botName, onDownload }: { msg: ChatMessage; botName: string; onDownload: (path: string) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'min-w-0 text-sm leading-7', isUser ? 'max-w-[85%] rounded-3xl px-5 py-3' : 'w-full px-1 py-2',
          isUser
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-400"><Bot size={16} />{botName}</div>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => {
              const file = href?.startsWith('/workspace/') ? href.slice('/workspace/'.length) : href?.startsWith('sandbox:/workspace/') ? href.slice('sandbox:/workspace/'.length) : null
              return file ? <button className="underline text-zinc-100" onClick={() => onDownload(file)}>↓ {children}</button> : <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>
            } }}>{msg.content || ' '}</ReactMarkdown>
            {msg.streaming && !msg.content && (
              <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatWindow({ conversationId, agentId, botName = 'Assistant' }: { conversationId: string; agentId?: string; botName?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setConnected] = useState(false)
  const [isThinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [pendingApproval, setPendingApproval] = useState(false)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)
  const [input, setInput] = useState('')
  const ws = useRef<WebSocket | null>(null)
  const busy = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    let socket: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const finish = () => {
      busy.current = false
      setThinking(false)
      setPendingApproval(false)
      setMessages(finishMessages)
    }
    const connect = async () => {
      setLoading(true)
      try {
        const history = await getMessages(user.token, conversationId)
        if (!active) return
        setMessages(fromHistory(history ?? []))
        socket = new WebSocket(`${WS_URL}/${encodeURIComponent(conversationId)}?token=${encodeURIComponent(user.token)}`)
        ws.current = socket
        socket.onopen = () => {
          if (!active) return
          attempts = 0
          setConnected(true)
          setLoading(false)
        }
        socket.onmessage = e => {
          if (!active) return
          try {
            const event: StreamEvent = JSON.parse(e.data)
            setMessages(m => applyEvent(m, event))
            if (event.type === 'error') {
              setError(event.error ?? event.message ?? event.content ?? 'The agent failed. Please try again.')
              finish()
            } else if (event.type === 'done') finish()
            else if (event.type === 'approval') setPendingApproval(true)
            else if (event.type === 'tool_result') setPendingApproval(false)
          } catch { setError('Received an invalid server event.'); finish() }
        }
        socket.onerror = () => { if (active) setError('Connection failed. Reconnecting…') }
        socket.onclose = () => {
          if (!active) return
          ws.current = null
          setConnected(false)
          if (busy.current) setError('Connection interrupted. The response may be incomplete; no message was resent.')
          finish()
          timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000))
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load conversation.')
        setLoading(false)
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000))
      }
    }
    void connect()
    return () => {
      active = false
      clearTimeout(timer)
      socket?.close()
      ws.current = null
      busy.current = false
    }
  }, [conversationId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(override?: string) {
    if (busy.current || loading || !(override ?? input).trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return
    const text = (override ?? input).trim()

    busy.current = true
    setError('')
    try {
      ws.current.send(JSON.stringify({ message: text }))
    } catch {
      busy.current = false
      setError('Message could not be sent. Please reconnect and try again.')
      return
    }
    setMessages(m => [...m, { id: crypto.randomUUID(), role: 'user', content: text }])
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

  const turns: { id: string; messages: ChatMessage[]; tools: ChatMessage[] }[] = []
  for (const message of messages) {
    if (!turns.length || message.role === 'user') turns.push({ id: message.id, messages: [], tools: [] })
    const turn = turns[turns.length - 1]
    if (message.role === 'tool_call' || message.role === 'tool_result') turn.tools.push(message)
    else if (message.content) turn.messages.push(message)
  }
  async function download(path: string) {
    if (!user || !agentId) return
    try { await downloadWorkspaceFile(user.token, agentId, path) }
    catch (err) { setError(err instanceof Error ? err.message : 'Download failed') }
  }
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {error && <div role="alert" className="mx-4 mt-3 rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}{/step limit|max iterations/i.test(error) && <button disabled={isThinking || !isConnected} onClick={() => send('Continue from the saved progress. Use existing generated files or browser results; do not repeat completed work.')} className="ml-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-white disabled:opacity-50">Continue</button>}</div>}
      {loading && <p role="status" className="p-4 text-sm text-zinc-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading saved conversation / reconnecting…</p>}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-8">
        {!loading && messages.length === 0 && (
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

        <div className="mx-auto max-w-3xl space-y-8">
          {turns.map(turn => <div key={turn.id} className="space-y-5">
            {turn.messages.map(msg => <MessageBubble key={msg.id} msg={msg} botName={botName} onDownload={path => void download(path)} />)}
            {user && agentId && <ResponseFiles files={turn.messages.find(m => m.role === 'user')?.attachments ?? []} token={user.token} agentId={agentId} />}
            {turn.tools.length > 0 && <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer list-none flex items-center gap-1.5 hover:text-zinc-300"><ChevronDown size={12} /> Activity · {turn.tools.length} steps</summary>
              <div className="mt-3 space-y-2">{turn.tools.map(msg => <ToolCallCard key={msg.id} msg={msg} />)}</div>
            </details>}
          </div>)}
        </div>

        {isThinking && (
          <div className="mx-auto max-w-3xl mt-5 flex items-center gap-2 text-zinc-500 text-sm px-1">
            <Loader2 size={14} className="animate-spin" />
            <span>{pendingApproval ? 'Waiting for your approval…' : `${botName} is working…`}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-5 pt-3">
        <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            placeholder={`Message ${botName}…`}
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
              onClick={() => send()}
              disabled={!input.trim() || !isConnected || isThinking || loading}
              className="bg-zinc-100 hover:bg-white disabled:bg-zinc-700 disabled:cursor-not-allowed
                         text-zinc-950 rounded-full p-2.5 transition-colors"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
        <p className="text-zinc-600 text-xs mt-2 text-center">Your bots share a computer. Each keeps its own memory.</p>
      </div>
    </div>
  )
}
