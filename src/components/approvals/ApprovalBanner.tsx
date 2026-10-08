'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listApprovals, respondApproval, type Approval } from '@/lib/api'

export function ApprovalBanner() {
  const user = useAuthStore(s => s.user)
  return user ? <UserApprovals key={user.token} /> : null
}
function UserApprovals() {
  const user = useAuthStore((s) => s.user)
  const [approvals, setApprovals] = useState<Approval[]>([])

  const [pollError, setPollError] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const responding = useRef(false)
  const resolved = useRef(new Set<string>())
  useEffect(() => {
    if (!user) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const data = await listApprovals(user.token)
        if (active) {
          setApprovals((data ?? []).filter(a => a.status === 'pending' && !resolved.current.has(a.id)))
          setPollError('')
        }
      } catch {
        if (active) setPollError('Could not refresh permission requests. Retrying…')
      } finally {
        if (active) timer = setTimeout(load, 2000)
      }
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [user])

  async function respond(id: string, decision: 'approved' | 'denied' | 'always') {
    if (!user || responding.current) return
    responding.current = true
    setPending(id)
    setError('')
    try {
      await respondApproval(user.token, id, decision)
      resolved.current.add(id)
      setApprovals(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your decision. Try again.')
    } finally { responding.current = false; setPending(null) }
  }

  if (approvals.length === 0 && !error && !pollError) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] max-h-[70vh] overflow-y-auto">
      {pollError && <p role="alert" className="p-3 bg-zinc-900 text-red-300 text-sm">{pollError}</p>}
      {error && <p role="alert" className="p-3 bg-zinc-900 text-red-300 text-sm">{error}</p>}
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
              <p className="text-zinc-300 text-xs mt-1 whitespace-pre-wrap break-words">{a.action}</p>
            </div>
          </div>
          {pending === a.id && <p role="status" className="text-amber-300 text-xs mb-2">Saving decision…</p>}
          <div className="flex gap-2">
            <button
              disabled={pending !== null}
              onClick={() => respond(a.id, 'approved')}
              className="flex items-center gap-1.5 flex-1 justify-center bg-green-800/60 hover:bg-green-700/80 border border-green-700/50
                         text-green-300 text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <Check size={12} /> Allow Once
            </button>
            <button
              disabled={pending !== null}
              onClick={() => respond(a.id, 'always')}
              className="flex items-center gap-1.5 flex-1 justify-center bg-blue-800/60 hover:bg-blue-700/80 border border-blue-700/50
                         text-blue-300 text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <ShieldCheck size={12} /> Always allow
            </button>
            <button
              disabled={pending !== null}
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
