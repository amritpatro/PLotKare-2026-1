'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  FileText,
  Zap,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/admin/dashboard/plots', label: 'Plots', icon: MapPin },
  { href: '/admin/dashboard/listings', label: 'Listings', icon: Building2 },
  { href: '/admin/dashboard/inspection-reports', label: 'Inspection Reports', icon: FileText },
  { href: '/admin/dashboard/amenities', label: 'Amenities', icon: Zap },
  { href: '/admin/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/dashboard/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="fixed left-0 top-0 h-screen w-64 border-r border-[#E5E7EB] bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#E5E7EB] px-5 py-5">
          <p className="font-serif text-lg font-bold text-[#1F2937]">PlotKare</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#C0392B]">Admin</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/admin/dashboard'
                ? pathname === '/admin/dashboard'
                : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link key={href} href={href}>
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
            )
          })}
        </nav>
        <div className="border-t border-[#E5E7EB] p-3">
          <button
            type="button"
            onClick={() => {
              const supabase = createSupabaseBrowserClient()
              void supabase.auth.signOut()
              router.replace('/admin/login')
              router.refresh()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-[#C0392B] hover:bg-[#FFF1F2]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
