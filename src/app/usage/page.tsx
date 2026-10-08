'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, Zap, Brain, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getUsageStats, getTopTools, getDailyUsage, type UsageStats, type ToolStat, type DailyUsage } from '@/lib/api7'
import Navbar from '@/components/Navbar'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={18} />
      </div>
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-300 text-sm font-mono w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-2">
        <div
          className="bg-violet-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-zinc-400 text-xs w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

export default function UsagePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [tools, setTools] = useState<ToolStat[]>([])
  const [daily, setDaily] = useState<DailyUsage[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!user) return
    try {
      const [s, t, d] = await Promise.all([
        getUsageStats(user.token),
        getTopTools(user.token),
        getDailyUsage(user.token, 14),
      ])
      setStats(s); setTools(t ?? []); setDaily(d ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    let active = true
    void Promise.resolve().then(() => { if (active) return loadAll() })
    return () => { active = false }
  }, [user, router, loadAll])



  const maxDailyTokens = Math.max(...daily.map((d) => d.prompt_tokens + d.completion_tokens), 1)
  const maxToolCount   = Math.max(...tools.map((t) => t.count), 1)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      {error && <p role="alert" className="p-3 text-red-300">{error}</p>}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usage Dashboard</h1>
            <p className="text-zinc-400 text-sm">Tokens, tasks, and tool activity across all agents</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading usage data...</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <StatCard label="LLM Calls"     value={stats?.total_llm_calls ?? 0}      icon={Brain}        color="bg-violet-600/20 text-violet-400" />
              <StatCard label="Tool Calls"    value={stats?.total_tool_calls ?? 0}     icon={Zap}          color="bg-blue-600/20 text-blue-400" />
              <StatCard label="Tasks Done"    value={stats?.total_tasks_complete ?? 0} icon={CheckCircle}  color="bg-green-600/20 text-green-400" />
              <StatCard label="Total Tokens"  value={stats?.total_tokens ?? 0}         icon={TrendingUp}   color="bg-amber-600/20 text-amber-400"
                sub={`${stats?.total_prompt_tokens ?? 0} in / ${stats?.total_completion_tokens ?? 0} out`} />
              <StatCard label="Avg Latency"   value={`${stats?.avg_duration_ms ?? 0}ms`} icon={Clock}     color="bg-zinc-700/50 text-zinc-300" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily token usage chart (sparkline-style) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Token usage — last 14 days</h3>
                {daily.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-6">No data yet</p>
                ) : (
                  <div className="flex items-end gap-1.5 h-32">
                    {daily.map((d) => {
                      const total = d.prompt_tokens + d.completion_tokens
                      const h = maxDailyTokens > 0 ? Math.max((total / maxDailyTokens) * 100, 4) : 4
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            className="w-full bg-violet-600/60 hover:bg-violet-500 rounded-sm transition-colors cursor-default"
                            style={{ height: `${h}%` }}
                            title={`${d.date}: ${total.toLocaleString()} tokens`}
                          />
                          <span className="text-zinc-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Top tools */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Most used tools</h3>
                {tools.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-6">No tool calls yet</p>
                ) : (
                  <div className="space-y-3">
                    {tools.map((t) => (
                      <MiniBar key={t.tool_name} label={t.tool_name} value={t.count} max={maxToolCount} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
