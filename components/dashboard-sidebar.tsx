'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogoMarkSmall } from '@/components/logo'
import {
  BarChart3,
  FileText,
  Zap,
  Lock,
  DollarSign,
  Settings,
  Map,
  Box,
  LogOut,
  Building2,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const navItems = [
  { href: '/dashboard', label: 'My Plots', icon: Map },
  { href: '/dashboard/reports', label: 'Inspection Reports', icon: FileText },
  { href: '/dashboard/amenities', label: 'Amenities', icon: Zap },
  { href: '/dashboard/listings', label: 'Property Listings', icon: Building2 },
  { href: '/dashboard/documents', label: 'Document Vault', icon: Box },
  { href: '/dashboard/value-tracker', label: 'Value Tracker', icon: BarChart3 },
  { href: '/dashboard/legal-status', label: 'Legal Status', icon: Lock },
  { href: '/dashboard/payments', label: 'Payments', icon: DollarSign },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 border-r border-[#E5E7EB] bg-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-5">
          <Link href="/" className="flex items-center gap-2">
            <LogoMarkSmall />
            <span className="font-sans text-sm font-semibold tracking-wide text-[#1F2937]">
              PlotKare
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className="block">
                  <motion.div
                    whileHover={{ x: 2 }}
                    className={`flex items-center gap-3 rounded-lg border-l-[3px] py-3 pl-[13px] pr-3 font-sans text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-l-[#C0392B] bg-[#FFF1F2] text-[#C0392B]'
                        : 'border-l-transparent text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </motion.div>
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
    </div>
  )
}
