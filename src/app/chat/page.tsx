'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, Zap, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listAgents, createAgent, createConversation, type Agent } from '@/lib/api'
import Navbar from '@/components/Navbar'

export default function ChatPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadAgents()
  }, [user])

  async function loadAgents() {
    if (!user) return
    try {
      const data = await listAgents(user.token)
      setAgents(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newName.trim()) return
    setCreating(true)
    try {
      const agent = await createAgent(user.token, newName.trim(), newPrompt || undefined)
      const conv = await createConversation(user.token, agent.id, 'New conversation')
      router.push(`/chat/${conv.id}`)
    } finally {
      setCreating(false)
    }
  }

  async function openAgent(agent: Agent) {
    if (!user) return
    const conv = await createConversation(user.token, agent.id, 'New conversation')
    router.push(`/chat/${conv.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Agents</h1>
            <p className="text-zinc-400 text-sm mt-1">Each agent has its own computer and memory</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={16} /> New Agent
          </button>
        </div>

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
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 transition-colors group">
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
                  <button onClick={() => openAgent(a)}
                    className="flex items-center gap-1.5 flex-1 justify-center bg-zinc-800 hover:bg-violet-600 text-zinc-300 hover:text-white text-xs px-3 py-2 rounded-xl transition-colors">
                    <MessageSquare size={13} /> Chat
                  </button>
                  {a.novnc_port && (
                    <button
                      onClick={() => window.open(`http://localhost:${a.novnc_port}`, '_blank')}
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
