import Link from 'next/link'
import type { ReactNode } from 'react'
import { ClipboardCheck, History, LogOut, UserCircle } from 'lucide-react'
import { AgentPwaControls } from './agent-pwa'

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
          <AgentPwaControls />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <div className="mb-5">
          <h1 className="font-serif text-3xl font-bold leading-tight text-[#111827]">{title}</h1>
          <p className="mt-2 text-base text-[#6B7280]">{subtitle}</p>
        </div>
        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E5E7EB] bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2 text-xs font-semibold text-[#6B7280]">
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent">
            <ClipboardCheck className="h-5 w-5" />
            Today
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/reports">
            <History className="h-5 w-5" />
            Reports
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg hover:bg-[#F9FAFB]" href="/agent/profile">
            <UserCircle className="h-5 w-5" />
            Profile
          </Link>
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[#C0392B] hover:bg-red-50" href="/auth/login">
            <LogOut className="h-5 w-5" />
            Exit
          </Link>
        </div>
      </nav>
    </main>
  )
}
