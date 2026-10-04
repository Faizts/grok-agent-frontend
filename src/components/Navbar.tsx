'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bot, Brain, Zap, BarChart2, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

const NAV = [
  { href: '/chat',     icon: Bot,      label: 'Agents'    },
  { href: '/memory',   icon: Brain,    label: 'Memory'    },
  { href: '/skills',   icon: Zap,      label: 'Skills'    },
  { href: '/usage',    icon: BarChart2, label: 'Usage'    },
  { href: '/settings', icon: Settings, label: 'Settings'  },
]

export default function Navbar() {
  const router = useRouter()
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

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
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2 rounded-xl
                         hover:bg-zinc-800 transition-colors"
            >
              <Icon size={15} />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-zinc-500 text-sm hidden sm:block">{user?.email}</span>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2
                     rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
