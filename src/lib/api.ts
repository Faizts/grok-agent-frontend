const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

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
    throw new Error(err.error ?? 'Request failed')
  }
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
}

export interface Message {
  id: string
  conversation_id: string
  role: string
  content: string
  tool_name: string
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
