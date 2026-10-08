'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Trash2, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listAgents, type Agent } from '@/lib/api'
import { listMemory, deleteMemory, type MemoryItem } from '@/lib/api7'
import Navbar from '@/components/Navbar'

const STORES = ['all', 'main', 'solutions', 'skills', 'fragments'] as const
type StoreFilter = typeof STORES[number]

const STORE_COLORS: Record<string, string> = {
  main:      'bg-violet-900/40 text-violet-300 border-violet-700/50',
  solutions: 'bg-green-900/40  text-green-300  border-green-700/50',
  skills:    'bg-blue-900/40   text-blue-300   border-blue-700/50',
  fragments: 'bg-zinc-800      text-zinc-400   border-zinc-700',
}

export default function MemoryPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')
  useEffect(() => {
    if (!user) { router.replace('/'); return }
    let active = true
    listAgents(user.token).then(data => {
      if (!active) return
      setAgents(data ?? [])
      if (data?.length) setSelectedAgent(data[0].id)
    }).catch(err => { if (active) setError(String(err)) })
    return () => { active = false }
  }, [user, router])

  useEffect(() => {
    if (!user || !selectedAgent) return
    let active = true
    listMemory(user.token, selectedAgent, storeFilter === 'all' ? undefined : storeFilter)
      .then(data => { if (active) setMemories(data ?? []) })
      .catch(err => { if (active) setError(String(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, selectedAgent, storeFilter])

  async function handleDelete(memId: string) {
    if (!user || !selectedAgent) return
    setError('')
    try {
    await deleteMemory(user.token, selectedAgent, memId)
    setMemories((prev) => prev.filter((m) => m.id !== memId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const filtered = memories.filter((m) =>
    search === '' || m.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      {error && <p role="alert" className="p-3 text-red-300">{error}</p>}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
            <Brain size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Memory</h1>
            <p className="text-zinc-400 text-sm">What your agents remember across sessions</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Agent selector */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm
                       focus:outline-none focus:border-violet-500"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Store filter */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {STORES.map((s) => (
              <button
                key={s}
                onClick={() => setStoreFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  storeFilter === s
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex-1 min-w-[200px]">
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none flex-1"
            />
          </div>
        </div>

        {/* Stats */}
        <p className="text-zinc-500 text-xs mb-4">
          {filtered.length} memor{filtered.length === 1 ? 'y' : 'ies'} found
        </p>

        {/* Memory list */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Brain size={48} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No memories yet. Start chatting to build memory.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3 group hover:border-zinc-600 transition-colors"
              >
                <span className={`text-xs px-2 py-1 rounded-lg border shrink-0 mt-0.5 ${STORE_COLORS[m.store] ?? STORE_COLORS.fragments}`}>
                  {m.store}
                </span>
                <p className="text-zinc-200 text-sm flex-1 leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-600 text-xs">{new Date(m.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-900/20"
                    title="Delete memory"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
