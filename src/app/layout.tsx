import type { Metadata } from 'next'
import { ApprovalBanner } from '@/components/approvals/ApprovalBanner'
import './globals.css'
import { AuthBoundary } from '@/components/AuthBoundary'


export const metadata: Metadata = {
  title: 'GrokAgent — AI with a real computer',
  description: 'Your personal AI agent with browser, shell, and memory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-white antialiased font-sans">
        <AuthBoundary>
          {children}
          <ApprovalBanner />
        </AuthBoundary>
      </body>
    </html>
  )
}
