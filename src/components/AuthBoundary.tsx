'use client'

import { useEffect, useState } from 'react'

// Persisted auth must hydrate before protected pages decide to redirect.
export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready ? children : <p role="status" className="p-6 text-zinc-400">Loading…</p>
}
