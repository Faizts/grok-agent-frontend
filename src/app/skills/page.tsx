'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Plus, Trash2, Tag, BookOpen, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { listSkills, createSkill, deleteSkill, type Skill } from '@/lib/api7'
import Navbar from '@/components/Navbar'

export default function SkillsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [skills, setSkills] = useState<Skill[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Skill | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await listSkills(user.token)
      setSkills(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setLoading(false)
    }
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
      const sk = await createSkill(user.token, {
        name,
        description,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      setSkills((prev) => [sk, ...prev])
      setShowForm(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    setError('')
    try {
    await deleteSkill(user.token, id)
    setSkills((prev) => prev.filter((s) => s.id !== id))
    if (selected?.id === id) setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    }
  }

  function resetForm() {
    setName(''); setDescription(''); setContent(''); setTags('')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      {error && <p role="alert" className="p-3 text-red-300">{error}</p>}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Skills</h1>
              <p className="text-zinc-400 text-sm">Built-in workflows and your imported Markdown skills</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white
                       px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} /> New Skill
          </button>
        </div>

        <div className="flex gap-6">
          {/* Skills list */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-20 text-zinc-500">Loading...</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-20">
                <Zap size={48} className="text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">No skills yet.</p>
                <p className="text-zinc-600 text-sm mt-1">
                  Create one manually or they auto-save from successful agent tasks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skills.map((sk) => (
                  <div
                    key={sk.id}
                    onClick={() => setSelected(sk)}
                    className={`bg-zinc-900 border rounded-2xl p-4 cursor-pointer transition-colors hover:border-zinc-600
                                ${selected?.id === sk.id ? 'border-violet-500' : 'border-zinc-800'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-violet-400 shrink-0" />
                        <span className="text-white font-semibold text-sm">{sk.name}</span>
                      </div>
                      {sk.builtin ? <span className="text-xs text-violet-400">Built-in</span> : <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(sk.id) }}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-900/20"
                      >
                        <Trash2 size={13} />
                      </button>}
                    </div>
                    {sk.description && (
                      <p className="text-zinc-400 text-xs mb-3 line-clamp-2">{sk.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {sk.tags?.map((t) => (
                          <span key={t} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className="text-zinc-600 text-xs">Used {sk.use_count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill viewer */}
          {selected && (
            <div className="w-96 shrink-0">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">{selected.name}</h3>
                  <button onClick={() => setSelected(null)}
                    className="text-zinc-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {selected.description && (
                  <p className="text-zinc-400 text-sm mb-3">{selected.description}</p>
                )}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 max-h-96 overflow-y-auto">
                  <pre className="text-zinc-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                    {selected.content}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {selected.tags?.map((t) => (
                    <span key={t} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">New Skill</h2>
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-sm text-zinc-400">
                Import a Markdown workflow (up to 64 KB)
                <input type="file" accept=".md,.markdown,text/markdown" className="block mt-2 text-xs" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ''
                  if (!/\.(md|markdown)$/i.test(file.name) || file.size > 65536) { setError('Choose a Markdown file up to 64 KB.'); return }
                  try {
                    const text = await file.text()
                    if (!text.trim()) { setError('The Markdown file is empty.'); return }
                    setContent(text)
                    setName(text.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.name.replace(/\.(md|markdown)$/i, ''))
                    setError('')
                  } catch { setError('Could not read this file.') }
                }} />
              </label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Skill name" required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <input
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <textarea
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Workflow content (markdown supported)..." required rows={8}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-mono"
              />
              <input
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated, e.g. python, data, scraping)"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white
                             font-semibold py-3 rounded-xl transition-colors text-sm">
                  {saving ? 'Saving...' : 'Save Skill'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                  className="px-4 py-3 text-zinc-400 hover:text-white rounded-xl transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
