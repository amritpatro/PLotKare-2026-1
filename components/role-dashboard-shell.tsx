'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileText,
  Headphones,
  Home,
  LogOut,
  Map,
  Settings,
  ShieldCheck,
  UserRound,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogoMarkSmall } from '@/components/logo'
import { RoleRealtimeBridge } from '@/components/realtime/role-realtime-bridge'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type RoleDashboardShellProps = {
  role: 'seller' | 'owner' | 'customer' | 'employee'
  title: string
  subtitle: string
  userLabel: string
  userId?: string
  children: React.ReactNode
}

const navByRole = {
  seller: [
    { href: '/seller', label: 'Overview', icon: BarChart3 },
    { href: '/seller/plots', label: 'My Plots', icon: Map },
    { href: '/seller/customers', label: 'Sold Customers', icon: UserRound },
    { href: '/seller/services', label: 'Plans & Services', icon: WalletCards },
    { href: '/seller/amenities', label: 'Amenities', icon: Zap },
    { href: '/seller/support', label: 'Support', icon: Headphones },
    { href: '/seller/notifications', label: 'Notifications', icon: Bell },
    { href: '/seller/documents', label: 'Documents', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  owner: [
    { href: '/owner', label: 'Overview', icon: Home },
    { href: '/owner/register', label: 'Register Property', icon: Building2 },
    { href: '/owner/verification', label: 'Verification', icon: ShieldCheck },
    { href: '/owner/documents', label: 'Documents', icon: FileText },
    { href: '/owner/amenities', label: 'Amenities', icon: Zap },
    { href: '/owner/services', label: 'Service Activity', icon: Wrench },
    { href: '/owner/support', label: 'Support', icon: Headphones },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  customer: [
    { href: '/customer', label: 'Overview', icon: Home },
    { href: '/customer/listings', label: 'Listings', icon: Map },
    { href: '/customer/saved', label: 'Saved', icon: Bell },
    { href: '/customer/inquiries', label: 'Inquiries', icon: BriefcaseBusiness },
    { href: '/customer/site-visits', label: 'Site Visits', icon: ClipboardCheck },
    { href: '/customer/services', label: 'Services', icon: Wrench },
    { href: '/customer/amenities', label: 'Amenities', icon: Zap },
    { href: '/customer/properties', label: 'My Property', icon: Building2 },
    { href: '/customer/documents', label: 'Documents Vault', icon: FileText },
    { href: '/customer/support', label: 'Support Center', icon: Headphones },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  employee: [
    { href: '/employee', label: 'Overview', icon: ClipboardCheck },
    { href: '/employee/tasks', label: 'Tasks', icon: BriefcaseBusiness },
    { href: '/employee/verification', label: 'Verification', icon: ShieldCheck },
    { href: '/employee/documents', label: 'Documents', icon: FileText },
    { href: '/employee/inspections', label: 'Inspections', icon: Map },
    { href: '/employee/amenities', label: 'Amenities', icon: Zap },
    { href: '/employee/support', label: 'Support', icon: Headphones },
    { href: '/employee/operations', label: 'Operations', icon: Wrench },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
} as const

const roleLabel = {
  seller: 'Plot Seller',
  owner: 'Land Owner',
  customer: 'Customer',
  employee: 'Employee',
} as const

function initialsFrom(label: string) {
  const parts = label.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PK'
}

export function RoleDashboardShell({ role, title, subtitle, userLabel, userId, children }: RoleDashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = navByRole[role]

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {userId ? <RoleRealtimeBridge role={role} userId={userId} /> : null}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-[#E5E7EB] bg-white md:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#E5E7EB] px-5 py-5">
            <Link href="/" className="flex items-center gap-2">
              <LogoMarkSmall />
              <span className="font-sans text-sm font-semibold tracking-wide text-[#1F2937]">PlotKare</span>
            </Link>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]">
              {roleLabel[role]} workspace
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto py-6">
            <div className="space-y-1 px-3">
              {nav.map((item) => {
                const Icon = item.icon
                const itemPath = item.href.split('#')[0]
                const isActive = pathname === itemPath

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg border-l-[3px] py-3 pl-[13px] pr-3 font-sans text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-l-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                        : 'border-l-transparent text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="border-t border-[#E5E7EB] p-4">
            <button
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-sans text-sm font-medium text-[#C0392B] transition-colors hover:bg-[#FFF1F2]"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#E5E7EB] bg-white/95 px-5 py-4 backdrop-blur md:left-64 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9A962]">{roleLabel[role]}</p>
            <h1 className="truncate font-serif text-2xl font-bold text-[#1F2937]">{title}</h1>
            <p className="hidden max-w-2xl truncate font-sans text-sm text-[#6B7280] lg:block">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-[#C0392B]">
              <AvatarFallback className="font-mono text-sm font-semibold text-white">{initialsFrom(userLabel)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate font-sans text-sm font-semibold text-[#1F2937]">{userLabel}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF]">Active session</p>
            </div>
            <Link
              href="/settings"
              className="rounded-lg border border-[#E5E7EB] p-2 text-[#6B7280] transition-colors hover:border-[#C0392B]/30 hover:bg-[#FFF1F2] hover:text-[#C0392B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]/25"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={() => void handleLogout()}
              className="rounded-lg border border-[#E5E7EB] p-2 text-[#C0392B] transition-colors hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]/25"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-12 pt-28 md:ml-64 md:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#E5E7EB] bg-white md:hidden">
        {nav.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-1 py-2 text-[10px] text-[#6B7280]">
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
