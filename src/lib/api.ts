export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
const API = API_URL

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(typeof err.error === 'string' ? err.error : `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(email: string, password: string) {
  return apiFetch<{
    token: string
    user_id: string
    role?: 'admin' | 'user'
    monthly_budget_usd?: number
    spent_this_month_usd?: number
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email: string, password: string) {
  return apiFetch<{
    token: string
    user_id: string
    role?: 'admin' | 'user'
    monthly_budget_usd?: number
    spent_this_month_usd?: number
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function listAgents(token: string) {
  return apiFetch<Agent[]>('/agents', {}, token)
}

export async function createAgent(token: string, name: string, systemPrompt?: string) {
  return apiFetch<{ id: string; name: string }>('/agents', {
    method: 'POST',
    body: JSON.stringify({ name, system_prompt: systemPrompt }),
  }, token)
}

export async function createConversation(token: string, agentId: string, title?: string) {
  return apiFetch<{ id: string; title: string }>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, title }),
  }, token)
}

export async function listConversations(token: string) {
  return apiFetch<Conversation[]>('/conversations', {}, token)
}

export async function getMessages(token: string, conversationId: string) {
  return apiFetch<Message[]>(`/conversations/${conversationId}/messages`, {}, token)
}

export async function listApprovals(token: string) {
  return apiFetch<Approval[]>('/approvals', {}, token)
}

export async function respondApproval(token: string, id: string, decision: 'approved' | 'denied' | 'always') {
  return apiFetch<{ status: string }>(`/approvals/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  }, token)
}

// Types
export interface Agent {
  id: string
  name: string
  system_prompt: string
  status: string
  sandbox_id: string
  novnc_port: string
  created_at: string
}

export interface Conversation {
  id: string
  agent_id: string
  title: string
  created_at: string
  message_count?: number
  last_activity?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: string
  content: string
  tool_name: string
  tool_call_id?: string
  created_at: string
}

export interface Approval {
  id: string
  agent_id: string
  tool_name: string
  action: string
  status: string
  created_at: string
}

export function getConversation(token: string, id: string) {
  return apiFetch<Conversation>(`/conversations/${encodeURIComponent(id)}`, {}, token)
}
export function getAgent(token: string, id: string) {
  return apiFetch<Agent>(`/agents/${encodeURIComponent(id)}`, {}, token)
}
export function desktopUrl(port: string) {
  const base = process.env.NEXT_PUBLIC_DESKTOP_BASE_URL ?? API
  const url = new URL(base)
  url.port = String(port)
  url.pathname = '/vnc.html'
  url.search = 'autoconnect=1&resize=scale'
  url.hash = ''
  return url.toString()
}

export interface WorkspaceFile { path: string; name: string; size: number; modified: number }
export function listWorkspaceFiles(token: string, agentId: string) {
  return apiFetch<WorkspaceFile[]>(`/agents/${encodeURIComponent(agentId)}/files`, {}, token)
}
export async function fetchWorkspaceFile(token: string, agentId: string, path: string) {
  const response = await fetch(`${API}/agents/${encodeURIComponent(agentId)}/files/download?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }))
    throw new Error(error.error ?? 'Download failed')
  }
  return response.blob()
}
export async function downloadWorkspaceFile(token: string, agentId: string, path: string) {
  const blob = await fetchWorkspaceFile(token, agentId, path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = path.split('/').at(-1) ?? 'download'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
