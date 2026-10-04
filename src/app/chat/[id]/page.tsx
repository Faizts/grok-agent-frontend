'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bot, Monitor, ChevronLeft, X } from 'lucide-react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useAuthStore } from '@/store/auth'
import { useChatStore } from '@/store/chat'
import { getMessages, listAgents, type Agent } from '@/lib/api'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const user = useAuthStore((s) => s.user)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [showDesktop, setShowDesktop] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    clearMessages()
    loadHistory()
  }, [conversationId, user])

  async function loadHistory() {
    if (!user) return
    try {
      const msgs = await getMessages(user.token, conversationId)
      msgs.forEach((m) => {
        addMessage({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      })

      // Load agents to find desktop port
      const agents = await listAgents(user.token)
      // The agent is linked via conversation — for now just grab first running one
      const running = agents.find((a) => a.novnc_port)
      if (running) setAgent(running)
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
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
              {agent?.status === 'running' ? '● Active' : '○ Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent?.novnc_port && (
            <button
              onClick={() => setShowDesktop(!showDesktop)}
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
        {/* Chat */}
        <div className={showDesktop ? 'w-1/2' : 'w-full'}>
          <ChatWindow conversationId={conversationId} />
        </div>

        {/* Live Desktop Canvas */}
        {showDesktop && agent?.novnc_port && (
          <div className="w-1/2 border-l border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5">
                <Monitor size={12} /> Agent Desktop
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
                src={`http://localhost:${agent.novnc_port}`}
                className="w-full h-full border-0"
                title="Agent Desktop"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
