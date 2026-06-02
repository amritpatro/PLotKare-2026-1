'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  ScrollText,
  Headphones,
  Zap,
  Settings,
  LogOut,
  Navigation,
} from 'lucide-react'
import { signOutToLanding } from '@/lib/auth/client-logout'

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'Command' },
  { href: '/admin/dashboard/users', label: 'Users', icon: Users, section: 'Command' },
  { href: '/admin/dashboard/verification', label: 'Verification', icon: ShieldCheck, section: 'Command' },
  { href: '/admin/dashboard/customers', label: 'Customers', icon: Users, section: 'Records' },
  { href: '/admin/dashboard/plots', label: 'Plots', icon: MapPin, section: 'Records' },
  { href: '/admin/dashboard/listings', label: 'Listings', icon: Building2, section: 'Records' },
  { href: '/admin/dashboard/documents', label: 'Documents', icon: FileText, section: 'Operations' },
  { href: '/admin/dashboard/support', label: 'Support', icon: Headphones, section: 'Operations' },
  { href: '/admin/dashboard/employees', label: 'Employees', icon: BriefcaseBusiness, section: 'Operations' },
  { href: '/admin/dashboard/inspection-reports', label: 'Inspection Reports', icon: FileText, section: 'Operations' },
  { href: '/admin/dashboard/tracking', label: 'Field Locations', icon: Navigation, section: 'Operations' },
  { href: '/admin/dashboard/audit', label: 'Audit Logs', icon: ScrollText, section: 'Operations' },
  { href: '/admin/dashboard/amenities', label: 'Amenities', icon: Zap, section: 'Operations' },
  { href: '/admin/dashboard/settings', label: 'Settings', icon: Settings, section: 'System' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const handleLogout = async () => {
    if (isSigningOut) return
    setSessionError(null)
    setIsSigningOut(true)
    try {
      await signOutToLanding(router)
    } catch {
      setSessionError('Sign out failed. Please retry.')
      setIsSigningOut(false)
    }
  }

  return (
    <>
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E5E7EB] bg-white md:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#E5E7EB] px-5 py-5">
          <p className="font-serif text-lg font-bold text-[#1F2937]">PlotKare</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#C0392B]">Control center</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map(({ href, label, icon: Icon, section }, index) => {
            const active =
              href === '/admin/dashboard'
                ? pathname === '/admin/dashboard'
                : pathname === href || pathname.startsWith(`${href}/`)
            const showSection = index === 0 || items[index - 1]?.section !== section
            return (
              <div key={href}>
                {showSection ? (
                  <p className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] first:pt-0">
                    {section}
                  </p>
                ) : null}
                <Link href={href}>
                  <span
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
                      active
                        ? 'border-l-[3px] border-l-[#C0392B] bg-[#FFF1F2] pl-[9px] text-[#C0392B]'
                        : 'border-l-[3px] border-l-transparent pl-[9px] text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </span>
                </Link>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-[#E5E7EB] p-3">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-[#C0392B] hover:bg-[#FFF1F2] disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </div>
    </aside>
    <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-4 md:hidden">
      <Link href="/admin/dashboard">
        <p className="font-serif text-base font-bold text-[#1F2937]">PlotKare</p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#C0392B]">Control center</p>
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isSigningOut}
        className="rounded-lg border border-[#E5E7EB] p-2 text-[#C0392B] disabled:cursor-wait disabled:opacity-60"
        aria-label={isSigningOut ? 'Signing out' : 'Logout'}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
    {sessionError ? (
      <div role="alert" className="fixed right-4 top-20 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {sessionError}
      </div>
    ) : null}
    <nav className="fixed bottom-0 left-0 right-0 z-40 overflow-x-auto border-t border-[#E5E7EB] bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden" aria-label="Admin sections">
      <div className="flex min-w-max">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link key={href} href={href} className={`flex w-[76px] flex-col items-center gap-1 border-t-2 px-1 py-2 text-[10px] ${active ? 'border-[#C0392B] text-[#C0392B]' : 'border-transparent text-[#6B7280]'}`}>
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </div>
    </nav>
    </>
  )
}
