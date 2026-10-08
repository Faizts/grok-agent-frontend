'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bot, Monitor, ChevronLeft, X, MessageSquare, FolderOpen } from 'lucide-react'
import { ChatFiles } from '@/components/chat/ChatFiles'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useAuthStore } from '@/store/auth'
import Navbar from '@/components/Navbar'
import { getConversation, getAgent, desktopUrl, type Agent } from '@/lib/api'

export default function ConversationPage() {
  const params = useParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  return <Conversation key={`${user?.id}:${params.id}`} conversationId={params.id} />
}

function Conversation({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [showDesktop, setShowDesktop] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const conversation = await getConversation(user.token, conversationId)
        const linked = await getAgent(user.token, conversation.agent_id)
        if (!active) return
        setAgent(linked)
        setError('')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load agent.')
      } finally {
        if (active) timer = setTimeout(load, 5000)
      }
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [conversationId, user, router])

  return (
    <div className="h-dvh bg-zinc-950 flex flex-col">
      <Navbar />
      {error && <p role="alert" className="p-2 text-red-300">{error}</p>}
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="w-8 h-8 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Bot size={16} className="text-violet-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              {agent?.name ?? 'Agent'}
            </p>
            <p className="text-zinc-500 text-xs">
              {agent?.status ?? 'Loading agent…'}{!agent?.novnc_port && ' · Desktop not ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setShowFiles(!showFiles); setShowDesktop(false) }} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"><FolderOpen size={14} /> Files</button>
          <button onClick={() => router.push('/chat')} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors" aria-label="View conversation history"><MessageSquare size={14} /> <span className="hidden sm:inline">History</span></button>
          {agent?.novnc_port && (
            <button
              onClick={() => { setShowDesktop(!showDesktop); setShowFiles(false) }}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors ${
                showDesktop
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Monitor size={14} />
              {showDesktop ? 'Hide Desktop' : 'Show Desktop'}
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {!showDesktop && !showFiles && user && <ChatSidebar token={user.token} agentId={agent?.id} conversationId={conversationId} />}
        {/* Chat */}
        <div className={showDesktop || showFiles ? 'w-1/2 min-w-0' : 'flex-1 min-w-0'}>
          <ChatWindow key={`${user?.id}:${conversationId}`} conversationId={conversationId} agentId={agent?.id} botName={agent?.name} />
        </div>

        {showFiles && user && agent && <aside className="w-1/2 min-w-0 overflow-y-auto border-l border-zinc-800 p-5" aria-label={`${agent.name} files`}>
          <div className="flex items-center justify-between"><h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2"><FolderOpen size={16} /> {agent.name}’s files</h2><button onClick={() => setShowFiles(false)} aria-label="Close files" className="text-zinc-500 hover:text-white"><X size={16} /></button></div>
          <ChatFiles token={user.token} agentId={agent.id} />
        </aside>}
        {/* Live Desktop Canvas */}
        {showDesktop && agent?.novnc_port && (
          <div className="w-1/2 border-l border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5">
                <Monitor size={12} /> Shared Computer
              </span>
              <button
                onClick={() => setShowDesktop(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={desktopUrl(agent.novnc_port)}
                className="w-full h-full border-0"
                title="Shared Computer"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
