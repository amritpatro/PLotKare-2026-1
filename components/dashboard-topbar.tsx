'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface DashboardTopBarProps {
  title: string
}

export function DashboardTopBar({ title }: DashboardTopBarProps) {
  const router = useRouter()
  const [initials, setInitials] = useState('PK')

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let mounted = true

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name,email')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!mounted) return
      const label = profile?.full_name?.trim() || profile?.email || data.user.email || 'PlotKare'
      const parts = label.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
      const nextInitials = parts
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join('')
      setInitials(nextInitials || 'PK')
    })

    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="fixed right-0 top-0 left-64 border-b border-[#E5E7EB] bg-white px-8 py-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#1F2937]">{title}</h1>
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 bg-[#C0392B]">
            <AvatarFallback className="font-mono text-sm font-semibold text-white">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 rounded-sm border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
          >
            <LogOut size={16} className="text-[#C0392B]" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
