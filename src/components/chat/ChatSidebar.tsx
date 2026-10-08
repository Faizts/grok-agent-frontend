'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, Plus, MessageSquare } from 'lucide-react'
import { createConversation, listAgents, listConversations, type Agent, type Conversation } from '@/lib/api'

export function ChatSidebar({ token, agentId, conversationId }: { token: string; agentId?: string; conversationId: string }) {
  const router = useRouter()
  const [bots, setBots] = useState<Agent[]>([])
  const [chats, setChats] = useState<Conversation[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void Promise.all([listAgents(token), listConversations(token)]).then(([agents, conversations]) => {
      if (active) { setBots(agents ?? []); setChats(conversations ?? []) }
    }).catch(() => { if (active) setError('Could not load your bots') })
    return () => { active = false }
  }, [token, conversationId])
  async function open(id: string, fresh = false) {
    if (busy) return
    const saved = chats.find(chat => chat.agent_id === id)
    if (saved && !fresh) { router.push(`/chat/${saved.id}`); return }
    setBusy(true); setError('')
    try { const chat = await createConversation(token, id, 'New conversation'); router.push(`/chat/${chat.id}`) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not start chat') }
    finally { setBusy(false) }
  }
  return <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40 p-3" aria-label="Bots and chats">
    <button disabled={!agentId || busy} onClick={() => agentId && void open(agentId, true)} className="mb-7 flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"><Plus size={16} /> New chat</button>
    <div className="flex-1 overflow-y-auto space-y-6">
      <section><div className="mb-2 flex items-center justify-between px-2 text-xs text-zinc-500"><span>Your bots</span><Link href="/chat" className="hover:text-white">Manage</Link></div>
        {bots.map(bot => <button key={bot.id} disabled={busy} onClick={() => void open(bot.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${agentId === bot.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`}><Bot size={16} /><span className="truncate">{bot.name}</span></button>)}
      </section>
      <section><h2 className="mb-2 px-2 text-xs font-normal text-zinc-500">Recent chats</h2>
        {chats.slice(0, 20).map(chat => <Link key={chat.id} href={`/chat/${chat.id}`} className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${chat.id === conversationId ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-white'}`}><MessageSquare size={13} className="shrink-0" /><span className="truncate">{chat.title || 'New chat'}</span></Link>)}
      </section>
    </div>
    {error && <p role="alert" className="pt-3 text-xs text-red-300">{error}</p>}
    <p className="mt-4 px-2 text-xs leading-5 text-zinc-600">One shared computer.<br />A memory for each bot.</p>
  </aside>
}
