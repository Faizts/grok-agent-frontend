'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bot, Brain, Zap, BarChart2, Settings, Shield, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { apiFetch } from '@/lib/api'

function decodeJwtRole(token?: string): string | null {
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return payload.role ?? null
  } catch {
    return null
  }
}

export default function Navbar() {
  const router = useRouter()
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return

    // 1. Check JWT claim directly client-side
    const jwtRole = decodeJwtRole(user.token)
    if (user.role === 'admin' || jwtRole === 'admin') {
      setIsAdmin(true)
      return
    }

    // 2. Fallback check via API endpoint
    async function verifyAdmin() {
      try {
        await apiFetch('/admin/stats', {}, user?.token)
        setIsAdmin(true)
      } catch {
        // not admin
      }
    }
    verifyAdmin()
  }, [user])

  const navItems = [
    { href: '/chat',     icon: Bot,      label: 'Agents'    },
    { href: '/memory',   icon: Brain,    label: 'Memory'    },
    { href: '/skills',   icon: Zap,      label: 'Skills'    },
    { href: '/usage',    icon: BarChart2, label: 'Usage'    },
    { href: '/settings', icon: Settings, label: 'Settings'  },
  ]

  if (isAdmin || user?.role === 'admin' || decodeJwtRole(user?.token) === 'admin') {
    navItems.push({ href: '/admin', icon: Shield, label: 'Admin Panel' })
  }

  return (
    <nav className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/chat" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-white hidden sm:block">GrokAgent</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors ${
                href === '/admin'
                  ? 'text-amber-400 bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon size={15} />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-zinc-500 text-sm hidden sm:block">{user?.email}</span>
        {(isAdmin || user?.role === 'admin' || decodeJwtRole(user?.token) === 'admin') && (
          <span className="text-xs bg-amber-900/50 border border-amber-700/60 text-amber-300 px-2 py-0.5 rounded-md font-mono">
            ADMIN
          </span>
        )}
        <button
          onClick={() => { logout(); router.push('/') }}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2
                     rounded-xl hover:bg-zinc-800 transition-colors"
          title="Sign out"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
