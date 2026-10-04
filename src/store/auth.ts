'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  token: string
  role?: 'admin' | 'user'
  status?: 'active' | 'suspended'
  monthly_budget_usd?: number
  spent_this_month_usd?: number
}

interface AuthStore {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null }),
    }),
    { name: 'grok-agent-auth' }
  )
)
