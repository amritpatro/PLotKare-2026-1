import Link from 'next/link'
import type { ReactNode } from 'react'
import { Bell, ClipboardCheck, Headphones, History, Settings, UserCircle } from 'lucide-react'
import { LogoutButton } from '@/components/auth/logout-button'
import { AgentPwaControls } from './agent-pwa'
import { AgentSyncBanner } from './agent-sync-banner'

type AgentShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AgentShell({ title, subtitle, children }: AgentShellProps) {
  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#1F2937]">
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-[#F8F7F4]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/agent" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#9F1239] font-serif text-2xl font-bold text-white">P</span>
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#B45309]">PlotKare</span>
              <span className="block text-sm font-semibold">Field Agent</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <AgentPwaControls />
            <LogoutButton iconOnly className="inline-grid min-h-11 min-w-11 place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#C0392B] disabled:opacity-60" />
          </div>
        </div>
      </header>
      <AgentSyncBanner />

      <section className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <div className="mb-5">
          <h1 className="font-serif text-3xl font-bold leading-tight text-[#111827]">{title}</h1>
          <p className="mt-2 text-base text-[#6B7280]">{subtitle}</p>
        </div>
        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E5E7EB] bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1 text-xs font-semibold text-[#6B7280]">
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent">
            <ClipboardCheck className="h-5 w-5" />
            Today
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/notifications">
            <Bell className="h-5 w-5" />
            Alerts
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/support">
            <Headphones className="h-5 w-5" />
            Support
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/reports">
            <History className="h-5 w-5" />
            Reports
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/profile">
            <UserCircle className="h-5 w-5" />
            Profile
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/settings">
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </nav>
    </main>
  )
}
