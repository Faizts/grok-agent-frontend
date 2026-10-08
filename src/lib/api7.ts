// Phase 7 API additions
import { apiFetch } from './api'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

export function apiUrl(path: string) {
  return `${API}${path}`
}

// ── Skills ────────────────────────────────────────────────────────────────

export interface Skill {
  builtin?: boolean
  id: string
  agent_id: string | null
  user_id: string
  name: string
  description: string
  content: string
  tags: string[]
  use_count: number
  created_at: string
  updated_at: string
}

export async function listSkills(token: string, agentId?: string): Promise<Skill[]> {
  const qs = agentId ? `?agent_id=${agentId}` : ''
  return apiFetch<Skill[]>(`/skills${qs}`, {}, token)
}

export async function createSkill(token: string, data: {
  name: string
  description?: string
  content: string
  tags?: string[]
  agent_id?: string | null
}): Promise<Skill> {
  return apiFetch<Skill>('/skills', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function deleteSkill(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/skills/${id}`, { method: 'DELETE' }, token)
}

// ── MCP Servers ───────────────────────────────────────────────────────────

export interface MCPServer {
  id: string
  name: string
  transport: 'http'
  url: string
  command: string
  enabled: boolean
  created_at: string
}

export async function listMCP(token: string): Promise<MCPServer[]> {
  return apiFetch<MCPServer[]>('/mcp', {}, token)
}

export async function createMCP(token: string, data: {
  name: string
  transport: 'http'
  url?: string
  command?: string
}): Promise<{ id: string; name: string }> {
  return apiFetch('/mcp', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function toggleMCP(token: string, id: string, enabled: boolean): Promise<void> {
  return apiFetch(`/mcp/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) }, token)
}

export async function deleteMCP(token: string, id: string): Promise<void> {
  return apiFetch(`/mcp/${id}`, { method: 'DELETE' }, token)
}

// ── Usage ─────────────────────────────────────────────────────────────────

export interface UsageStats {
  total_llm_calls: number
  total_tool_calls: number
  total_tasks_complete: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
  avg_duration_ms: number
}

export interface ToolStat {
  tool_name: string
  count: number
}

export interface DailyUsage {
  date: string
  llm_calls: number
  prompt_tokens: number
  completion_tokens: number
}

export async function getUsageStats(token: string): Promise<UsageStats> {
  return apiFetch<UsageStats>('/usage/stats', {}, token)
}

export async function getTopTools(token: string): Promise<ToolStat[]> {
  return apiFetch<ToolStat[]>('/usage/tools?limit=8', {}, token)
}

export async function getDailyUsage(token: string, days = 30): Promise<DailyUsage[]> {
  return apiFetch<DailyUsage[]>(`/usage/daily?days=${days}`, {}, token)
}

// ── Memory ────────────────────────────────────────────────────────────────

export interface MemoryItem {
  id: string
  store: 'main' | 'solutions' | 'skills' | 'fragments'
  content: string
  created_at: string
}

export async function listMemory(token: string, agentId: string, store?: string): Promise<MemoryItem[]> {
  const qs = store ? `?store=${store}` : ''
  return apiFetch<MemoryItem[]>(`/agents/${agentId}/memory${qs}`, {}, token)
}

export async function deleteMemory(token: string, agentId: string, memId: string): Promise<void> {
  return apiFetch<void>(`/agents/${agentId}/memory/${memId}`, { method: 'DELETE' }, token)
}

// ── Approvals ────────────────────────────────────────────────────────────

export async function listApprovals(token: string) {
  return apiFetch<import('./api').Approval[]>('/approvals', {}, token)
}

export async function respondApproval(
  token: string,
  id: string,
  decision: 'approved' | 'denied' | 'always'
) {
  return apiFetch(`/approvals/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  }, token)
}
