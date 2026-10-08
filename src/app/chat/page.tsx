'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, Zap, MessageSquare, ArrowUpRight, Clock3, RefreshCw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/auth'
import { listAgents, createAgent, createConversation, listConversations, desktopUrl, type Conversation, type Agent } from '@/lib/api'

export default function ChatPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const [data, history] = await Promise.all([listAgents(user.token), listConversations(user.token)])
        if (active) { setAgents(data ?? []); setConversations(history ?? []); setError('') }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load agents.')
      } finally {
        if (active) { setLoading(false); timer = setTimeout(load, 5000) }
      }
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [user, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || creating || !newName.trim()) return
    setCreating(true)
    try {
      const agent = await createAgent(user.token, newName.trim(), newPrompt || undefined)
      const conv = await createConversation(user.token, agent.id, 'New conversation')
      router.push(`/chat/${conv.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create agent.')
    } finally {
      setCreating(false)
    }
  }

  async function openAgent(agent: Agent) {
    if (!user || opening) return
    setOpening(agent.id)
    try {
      const conv = await createConversation(user.token, agent.id, 'New conversation')
      router.push(`/chat/${conv.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open conversation.')
    } finally { setOpening(null) }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Agents</h1>
            <p className="text-zinc-400 text-sm mt-1">Your agents share one computer and browser. Each keeps its own memory.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={16} /> New Agent
          </button>
        </div>

        {error && <div role="alert" className="mb-6 rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200 flex items-center justify-between gap-4"><span>{error}</span><button onClick={() => window.location.reload()} className="shrink-0 underline">Retry</button></div>}
        <section className="mb-10" aria-label="Conversation history">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={18} className="text-violet-400" />
            <h2 className="text-lg font-semibold">Conversation history</h2>
            <span className="ml-auto text-xs text-zinc-500">{conversations.length} saved</span>
          </div>
          {loading ? <div className="animate-pulse h-20 rounded-2xl bg-zinc-900 border border-zinc-800" /> : conversations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Your conversations will appear here after you create one.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {conversations.map(c => {
                const linked = agents.find(a => a.id === c.agent_id)
                return <button key={c.id} onClick={() => router.push(`/chat/${c.id}`)} className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:border-violet-500/60 hover:bg-zinc-800/80 focus-visible:outline-2 focus-visible:outline-violet-400 transition-colors">
                  <span className="shrink-0 rounded-lg bg-violet-500/10 p-2 text-violet-400"><MessageSquare size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-100">{c.title || 'Untitled conversation'}</span><span className="block truncate text-xs text-zinc-500 mt-1">{linked?.name ?? 'Agent'} · {c.message_count ?? 0} messages · {new Date(c.last_activity ?? c.created_at).toLocaleDateString()}</span></span>
                  <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-violet-400" />
                </button>
              })}
            </div>
          )}
        </section>
        {/* New agent form */}
        {showNew && (
          <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4">Create Agent</h3>
            <div className="space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Agent name (e.g. Research Assistant)"
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="System prompt (optional — leave blank for default)"
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={creating}
                className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {creating ? 'Creating...' : 'Create & Chat'}
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                className="text-zinc-400 hover:text-white px-5 py-2.5 rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Agents grid */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <Bot size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No agents yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 rounded-2xl p-5 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
                    <Bot size={20} className="text-violet-400" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === 'running'
                      ? 'bg-green-900/50 text-green-400 border border-green-800'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {a.status === 'running' ? '● running' : '○ idle'}
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-1">{a.name}</h3>
                <p className="text-zinc-500 text-xs line-clamp-2 mb-4">
                  {a.system_prompt || 'Default assistant'}
                </p>
                <div className="flex gap-2">
                  <button disabled={!!opening} onClick={() => {
                    const latest = conversations.find(c => c.agent_id === a.id)
                    if (latest) router.push(`/chat/${latest.id}`)
                    else void openAgent(a)
                  }}
                    className="flex items-center gap-1.5 flex-1 justify-center bg-zinc-800 hover:bg-violet-600 disabled:opacity-50 text-zinc-300 hover:text-white text-xs px-3 py-2 rounded-xl transition-colors">
                    {opening === a.id ? <RefreshCw size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                    {conversations.some(c => c.agent_id === a.id) ? 'Resume chat' : 'Start chat'}
                  </button>
                  <button disabled={!!opening} onClick={() => void openAgent(a)} title="New conversation" aria-label={`New conversation with ${a.name}`}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs px-3 py-2 rounded-xl transition-colors"><Plus size={13} /></button>
                  {a.novnc_port && (
                    <button
                      onClick={() => window.open(desktopUrl(a.novnc_port), '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-xl transition-colors"
                      title="Open desktop"
                    >
                      <Zap size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
