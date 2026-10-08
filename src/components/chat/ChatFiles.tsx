'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, FileText, RefreshCw, Loader2 } from 'lucide-react'
import { listWorkspaceFiles, fetchWorkspaceFile, downloadWorkspaceFile, type WorkspaceFile } from '@/lib/api'

export function FileCard({ file, token, agentId }: { file: WorkspaceFile; token: string; agentId: string }) {
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file.name) || file.size > 8 * 1024 * 1024) return
    let active = true
    let url = ''
    void fetchWorkspaceFile(token, agentId, file.path).then(blob => {
      if (!active) return
      url = URL.createObjectURL(blob)
      setPreview(url)
    }).catch(() => {})
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [token, agentId, file.path, file.name, file.size, file.modified])
  async function download() {
    setBusy(true); setError('')
    try { await downloadWorkspaceFile(token, agentId, file.path) }
    catch (err) { setError(err instanceof Error ? err.message : 'Download failed') }
    finally { setBusy(false) }
  }
  return <div className="overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900">
    {/* Authenticated image previews use local blob URLs. */}
    {preview && <Image unoptimized width={400} height={160} src={preview} alt={file.name} className="h-40 w-full object-contain bg-zinc-950" />}
    <button onClick={() => void download()} disabled={busy} className="flex w-full items-center gap-3 p-3 text-left hover:bg-zinc-800 transition-colors" title={`Download ${file.path}`}>
      <FileText size={18} className="shrink-0 text-zinc-400" />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm text-zinc-100">{file.name}</span><span className="text-xs text-zinc-500">{file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</span></span>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-zinc-300" />}
    </button>
    {error && <p role="alert" className="px-3 pb-3 text-xs text-red-300">{error}</p>}
  </div>
}

export function ChatFiles({ token, agentId }: { token: string; agentId: string }) {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try { const items = await listWorkspaceFiles(token, agentId); if (active) { setFiles(items); setError('') } }
      catch (err) { if (active && refresh > 0) setError(err instanceof Error ? err.message : 'Could not load files') }
    }
    void load()
    return () => { active = false }
  }, [token, agentId, refresh])
  return <section className="mx-auto w-full max-w-3xl pt-5" aria-label="Downloadable files">
    <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
      <span>{files.length ? `Agent files · ${files.length}` : 'This agent’s saved files appear here'}</span>
      <button onClick={() => setRefresh(x => x + 1)} className="flex items-center gap-1.5 hover:text-zinc-200" aria-label="Refresh files"><RefreshCw size={12} /> Refresh</button>
    </div>
    {error && <p className="mb-2 text-xs text-zinc-400">{error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-3">{(expanded ? files : files.slice(0, 4)).map(file => <div key={file.path}><p className="mb-1 truncate text-[10px] text-zinc-500" title={file.path}>{file.path.split('/').slice(2, -1).join('/') || 'Files'}</p><FileCard file={file} token={token} agentId={agentId} /></div>)}</div>
    {files.length > 4 && <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs text-zinc-400 hover:text-white">{expanded ? 'Show fewer files' : `Show all ${files.length} files`}</button>}
  </section>
}

export function ResponseFiles({ files, token, agentId }: { files: WorkspaceFile[]; token: string; agentId: string }) {
  if (!files.length) return null
  return <section aria-label="Files attached to this response" className="pt-2">
    <p className="mb-3 text-xs text-zinc-500">{files.length === 1 ? '1 file' : `${files.length} files`}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-3">{files.map(file => <FileCard key={file.path} file={file} token={token} agentId={agentId} />)}</div>
  </section>
}
