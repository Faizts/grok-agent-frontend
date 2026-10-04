'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listApprovals, respondApproval, type Approval } from '@/lib/api'

export function ApprovalBanner() {
  const user = useAuthStore((s) => s.user)
  const [approvals, setApprovals] = useState<Approval[]>([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const data = await listApprovals(user.token)
        setApprovals(data)
      } catch { /* silent */ }
    }
    load()
    const interval = setInterval(load, 5000) // poll every 5s
    return () => clearInterval(interval)
  }, [user])

  if (approvals.length === 0) return null

  async function respond(id: string, decision: 'approved' | 'denied' | 'always') {
    if (!user) return
    try {
      await respondApproval(user.token, id, decision)
      setApprovals((prev) => prev.filter((a) => a.id !== id))
    } catch { /* silent */ }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {approvals.map((a) => (
        <div
          key={a.id}
          className="bg-zinc-900 border border-amber-600/60 rounded-2xl p-4 shadow-xl shadow-black/40"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Agent requests permission</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                Use tool <span className="text-amber-300 font-mono">{a.tool_name}</span>
              </p>
              <p className="text-zinc-300 text-xs mt-1 line-clamp-2">{a.action}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => respond(a.id, 'approved')}
              className="flex items-center gap-1.5 flex-1 justify-center bg-green-800/60 hover:bg-green-700/80 border border-green-700/50
                         text-green-300 text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <Check size={12} /> Allow Once
            </button>
            <button
              onClick={() => respond(a.id, 'always')}
              className="flex items-center gap-1.5 flex-1 justify-center bg-blue-800/60 hover:bg-blue-700/80 border border-blue-700/50
                         text-blue-300 text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <ShieldCheck size={12} /> Always
            </button>
            <button
              onClick={() => respond(a.id, 'denied')}
              className="flex items-center gap-1.5 flex-1 justify-center bg-red-900/60 hover:bg-red-800/80 border border-red-800/50
                         text-red-300 text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <X size={12} /> Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
