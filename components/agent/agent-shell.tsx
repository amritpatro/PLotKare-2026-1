'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ClipboardCheck, FileText, LogOut, MapPin, Settings, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoMarkSmall } from '@/components/logo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { RoleRealtimeBridge } from '@/components/realtime/role-realtime-bridge'
import { AgentPwaControls } from './agent-pwa-controls'

type Props = {
  userLabel: string
  avatarUrl?: string | null
  userId: string
  children: React.ReactNode
}

const nav = [
  { href: '/agent', label: 'Today', Icon: MapPin },
  { href: '/agent/reports', label: 'Reports', Icon: FileText },
  { href: '/agent/profile', label: 'Profile', Icon: Settings },
]

function initials(label: string) {
  return label.split(/[\s._@-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'PK'
}

export function AgentShell({ userLabel, avatarUrl, userId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const publicAvatar = avatarUrl && /^https?:\/\//i.test(avatarUrl)
    ? avatarUrl
    : avatarUrl
      ? createSupabaseBrowserClient().storage.from('profile-assets').getPublicUrl(avatarUrl).data.publicUrl
      : null

  useEffect(() => {
    setOnline(navigator.onLine)
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])

  const logout = async () => {
    setBusy(true)
    await createSupabaseBrowserClient().auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 text-[#1F2937]">
      <RoleRealtimeBridge role="employee" userId={userId} />
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/agent" className="flex items-center gap-2">
            <LogoMarkSmall />
            <div>
              <p className="font-sans text-sm font-semibold">PlotKare Field</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9A962]">Inspections</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`flex min-h-10 items-center gap-1 rounded-lg border px-2.5 text-xs ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {online ? 'Online sync ready' : 'Offline saves local'}
            </span>
            <Avatar className="h-10 w-10 bg-[#C0392B]">
              {publicAvatar ? <AvatarImage src={publicAvatar} alt={`${userLabel} profile photo`} /> : null}
              <AvatarFallback className="text-sm text-white">{initials(userLabel)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white md:left-1/2 md:max-w-3xl md:-translate-x-1/2">
        <div className="grid grid-cols-4">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/agent' && pathname.startsWith(`${href}/`))
            return (
              <Link key={href} href={href} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${active ? 'text-[#C0392B]' : 'text-[#6B7280]'}`}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            )
          })}
          <button type="button" disabled={busy} onClick={() => void logout()} className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-[#C0392B] disabled:opacity-60">
            <LogOut className="h-5 w-5" />
            {busy ? 'Leaving' : 'Logout'}
          </button>
        </div>
      </nav>
      <AgentPwaControls />
    </div>
  )
}
