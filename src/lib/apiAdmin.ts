import { apiFetch } from './api'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'suspended'
  monthly_budget_usd: number
  spent_this_month_usd: number
  assigned_model: string
  allowed_models: string[]
  created_at: string
}

export interface AdminStats {
  total_users: number
  total_spend_usd: number
  active_sandboxes: number
  omniroute_url: string
  default_budget_usd: number
}

export interface ModelRate {
  model: string
  input_cost_per_1k: number
  output_cost_per_1k: number
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats', {}, token)
}

export async function listAdminUsers(token: string): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users', {}, token)
}

export async function updateAdminUser(
  token: string,
  id: string,
  data: Partial<AdminUser>
): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token)
}

export async function listModelRates(token: string): Promise<ModelRate[]> {
  return apiFetch<ModelRate[]>('/admin/models', {}, token)
}

export async function saveModelRate(token: string, data: ModelRate): Promise<void> {
  return apiFetch<void>('/admin/models', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}
