'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, DollarSign, Cpu, Server, Edit2, Check, X, ShieldAlert, Ban, RefreshCw, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import Navbar from '@/components/Navbar'
import {
  getAdminStats,
  listAdminUsers,
  updateAdminUser,
  listModelRates,
  saveModelRate,
  type AdminStats,
  type AdminUser,
  type ModelRate,
} from '@/lib/apiAdmin'

export default function AdminPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [usersList, setUsersList] = useState<AdminUser[]>([])
  const [modelRates, setModelRates] = useState<ModelRate[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'users' | 'models' | 'omniroute'>('users')

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editBudget, setEditBudget] = useState<number>(10)
  const [editModel, setEditModel] = useState<string>('gpt-4o')

  // New model state
  const [showNewModel, setShowNewModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newInputCost, setNewInputCost] = useState(0.0015)
  const [newOutputCost, setNewOutputCost] = useState(0.006)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    if (user.role !== 'admin') {
      router.push('/chat')
      return
    }
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const [s, u, m] = await Promise.all([
        getAdminStats(user.token),
        listAdminUsers(user.token),
        listModelRates(user.token),
      ])
      setStats(s)
      setUsersList(u)
      setModelRates(m)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveUser(userId: string) {
    if (!user) return
    try {
      await updateAdminUser(user.token, userId, {
        monthly_budget_usd: editBudget,
        assigned_model: editModel,
      })
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, monthly_budget_usd: editBudget, assigned_model: editModel }
            : u
        )
      )
      setEditingUserId(null)
    } catch (err) {
      alert('Failed to update user')
    }
  }

  async function handleToggleStatus(u: AdminUser) {
    if (!user) return
    const newStatus = u.status === 'active' ? 'suspended' : 'active'
    try {
      await updateAdminUser(user.token, u.id, { status: newStatus })
      setUsersList((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, status: newStatus } : item))
      )
    } catch (err) {
      alert('Failed to change user status')
    }
  }

  async function handleToggleRole(u: AdminUser) {
    if (!user) return
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    try {
      await updateAdminUser(user.token, u.id, { role: newRole })
      setUsersList((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, role: newRole } : item))
      )
    } catch (err) {
      alert('Failed to change user role')
    }
  }

  async function handleCreateModelRate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newModelName.trim()) return
    try {
      await saveModelRate(user.token, {
        model: newModelName.trim(),
        input_cost_per_1k: newInputCost,
        output_cost_per_1k: newOutputCost,
      })
      setModelRates((prev) => [
        ...prev.filter((m) => m.model !== newModelName.trim()),
        { model: newModelName.trim(), input_cost_per_1k: newInputCost, output_cost_per_1k: newOutputCost },
      ])
      setShowNewModel(false)
      setNewModelName('')
    } catch (err) {
      alert('Failed to save model rate')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-600/40 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Control Panel</h1>
              <p className="text-zinc-400 text-sm">
                Multi-tenant budget enforcement, model routing & OmniRoute access control
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-3.5 py-2 rounded-xl text-xs transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400 mb-3">
              <Users size={18} />
            </div>
            <p className="text-zinc-400 text-xs font-medium">Total Users</p>
            <p className="text-2xl font-bold text-white mt-1">{stats?.total_users ?? 0}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-green-600/20 rounded-xl flex items-center justify-center text-green-400 mb-3">
              <DollarSign size={18} />
            </div>
            <p className="text-zinc-400 text-xs font-medium">Total System Spend</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${(stats?.total_spend_usd ?? 0).toFixed(4)}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-3">
              <Cpu size={18} />
            </div>
            <p className="text-zinc-400 text-xs font-medium">Active Sandboxes</p>
            <p className="text-2xl font-bold text-white mt-1">{stats?.active_sandboxes ?? 0}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-amber-600/20 rounded-xl flex items-center justify-center text-amber-400 mb-3">
              <Server size={18} />
            </div>
            <p className="text-zinc-400 text-xs font-medium">OmniRoute Endpoint</p>
            <p className="text-xs font-mono text-zinc-300 mt-2 truncate">
              {stats?.omniroute_url ?? 'http://omniroute:8000/v1'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            User Budgets & Access ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Model Rates & Registry ({modelRates.length})
          </button>
          <button
            onClick={() => setActiveTab('omniroute')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'omniroute'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            OmniRoute Gateway Config
          </button>
        </div>

        {/* Tab 1: Users & Budget Control */}
        {activeTab === 'users' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 text-xs border-b border-zinc-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Monthly Budget</th>
                  <th className="py-3.5 px-4">Spent (Month)</th>
                  <th className="py-3.5 px-4">Assigned Model</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {usersList.map((u) => {
                  const isEditing = editingUserId === u.id
                  const isOverBudget = u.spent_this_month_usd >= u.monthly_budget_usd

                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <p className="text-white font-medium">{u.email}</p>
                        <p className="text-xs text-zinc-500 font-mono">{u.id}</p>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleRole(u)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                            u.role === 'admin'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </button>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                            u.status === 'active'
                              ? 'bg-green-950/60 text-green-300 border-green-800'
                              : 'bg-red-950/60 text-red-300 border-red-800'
                          }`}
                        >
                          {u.status.toUpperCase()}
                        </button>
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">$</span>
                            <input
                              type="number"
                              step="1"
                              value={editBudget}
                              onChange={(e) => setEditBudget(parseFloat(e.target.value) || 0)}
                              className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-white">${u.monthly_budget_usd.toFixed(2)}</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-medium ${isOverBudget ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                            ${u.spent_this_month_usd.toFixed(4)}
                          </span>
                          {isOverBudget && (
                            <span className="text-[10px] bg-red-900/60 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">
                              EXCEEDED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs"
                          >
                            {modelRates.map((mr) => (
                              <option key={mr.model} value={mr.model}>
                                {mr.model}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-violet-300">
                            {u.assigned_model || 'gpt-4o'}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveUser(u.id)}
                              className="bg-green-700 hover:bg-green-600 text-white p-1.5 rounded-lg transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingUserId(u.id)
                              setEditBudget(u.monthly_budget_usd)
                              setEditModel(u.assigned_model || 'gpt-4o')
                            }}
                            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Model Rates & Registry */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-zinc-400 text-sm">
                Cost rates per 1,000 tokens for automatic budget deduction.
              </p>
              <button
                onClick={() => setShowNewModel(true)}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-2 rounded-xl transition-colors font-medium"
              >
                <Plus size={14} /> Add Model Rate
              </button>
            </div>

            {showNewModel && (
              <form onSubmit={handleCreateModelRate} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Model Name</label>
                  <input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="e.g. openrouter/claude-3.5-sonnet"
                    required
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs w-64"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Input Cost / 1K Tokens ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newInputCost}
                    onChange={(e) => setNewInputCost(parseFloat(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs w-36"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Output Cost / 1K Tokens ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newOutputCost}
                    onChange={(e) => setNewOutputCost(parseFloat(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs w-36"
                  />
                </div>
                <button type="submit" className="bg-violet-600 text-white text-xs px-4 py-2.5 rounded-xl">
                  Save Model
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelRates.map((mr) => (
                <div key={mr.model} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="font-mono text-sm font-semibold text-violet-300">{mr.model}</p>
                  <div className="mt-3 text-xs space-y-1 text-zinc-400">
                    <p>Input: <span className="text-white font-mono">${mr.input_cost_per_1k} / 1K</span></p>
                    <p>Output: <span className="text-white font-mono">${mr.output_cost_per_1k} / 1K</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: OmniRoute Config */}
        {activeTab === 'omniroute' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Server size={18} className="text-violet-400" /> OmniRoute Gateway Integration
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              OmniRoute runs locally inside the Docker Compose network at <code className="text-violet-300 font-mono">http://omniroute:8000/v1</code>.
              It routes requests to OpenRouter, Codex, Gemini, Antigravity, Anthropic, and local models.
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 space-y-2">
              <p><span className="text-zinc-500"># Container:</span> grok-agent-omniroute</p>
              <p><span className="text-zinc-500"># Internal API Base:</span> http://omniroute:8000/v1</p>
              <p><span className="text-zinc-500"># Admin Dashboard:</span> http://localhost:8000 (Admin only)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
