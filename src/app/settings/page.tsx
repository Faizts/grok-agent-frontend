'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Plus, Trash2, X, ToggleLeft, ToggleRight, Server, Plug } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listMCP, createMCP, toggleMCP, deleteMCP, type MCPServer } from '@/lib/api7'
import Navbar from '@/components/Navbar'

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [servers, setServers] = useState<MCPServer[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try { setServers((await listMCP(user.token)) ?? []) }
    catch (err) { setError(err instanceof Error ? err.message : 'Request failed.') }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    let active = true
    void Promise.resolve().then(() => { if (active) return load() })
    return () => { active = false }
  }, [user, router, load])


  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || saving) return
    setError('')
    setSaving(true)
    try {
      await createMCP(user.token, { name, transport: 'http', url })
      resetForm()
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(srv: MCPServer) {
    if (!user) return
    setError('')
    try {
    await toggleMCP(user.token, srv.id, !srv.enabled)
    setServers((prev) => prev.map((s) => s.id === srv.id ? { ...s, enabled: !s.enabled } : s))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    setError('')
    try {
    await deleteMCP(user.token, id)
    setServers((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    }
  }

  function resetForm() {
    setName(''); setUrl('')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      {error && <p role="alert" className="p-3 text-red-300">{error}</p>}
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
            <Settings size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-zinc-400 text-sm">Configure MCP servers and integrations</p>
          </div>
        </div>

        {/* MCP Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Plug size={18} className="text-zinc-400" />
              <h2 className="text-white font-semibold text-lg">MCP Servers</h2>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white
                         px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={15} /> Add Server
            </button>
          </div>

          <p className="text-zinc-500 text-sm mb-5">
            Connect external Model Context Protocol servers to give agents new tools — GitHub, Slack, databases, custom APIs, anything with an MCP adapter.
          </p>

          {loading ? (
            <div className="text-zinc-600 text-sm">Loading...</div>
          ) : servers.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-8 text-center">
              <Server size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No MCP servers connected yet.</p>
              <p className="text-zinc-700 text-xs mt-1">
                Add a Streamable HTTP server URL, such as https://your-server.example/mcp.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((srv) => (
                <div key={srv.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 transition-colors
                    ${srv.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                    ${srv.enabled ? 'bg-green-900/40' : 'bg-zinc-800'}`}>
                    <Server size={16} className={srv.enabled ? 'text-green-400' : 'text-zinc-500'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{srv.name}</p>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {srv.transport}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">
                      {srv.transport === 'http' ? srv.url : srv.command}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(srv)}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title={srv.enabled ? 'Disable' : 'Enable'}
                    >
                      {srv.enabled
                        ? <ToggleRight size={22} className="text-green-400" />
                        : <ToggleLeft size={22} />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(srv.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-900/20"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add MCP modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold text-lg">Add MCP Server</h3>
                <button onClick={() => { setShowForm(false); resetForm() }}
                  className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Server name (e.g. github, filesystem)" required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                             placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                />

                <p className="text-xs text-zinc-400">Streamable HTTP MCP endpoint</p>
                <input value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-server.example/mcp" type="url" required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm" />

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white
                               font-semibold py-3 rounded-xl transition-colors text-sm">
                    {saving ? 'Adding...' : 'Add Server'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="px-4 py-3 text-zinc-400 hover:text-white rounded-xl text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
