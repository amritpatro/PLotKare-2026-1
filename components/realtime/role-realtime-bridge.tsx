'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type RoleRealtimeBridgeProps = {
  role: 'seller' | 'owner' | 'customer' | 'employee'
  userId: string
}

const roleTables = {
  seller: ['notifications', 'support_tickets', 'maintenance_requests', 'properties', 'plots'],
  owner: ['notifications', 'support_tickets', 'maintenance_requests', 'properties', 'inspections'],
  customer: ['notifications', 'support_tickets', 'maintenance_requests', 'customer_property_links', 'inspections'],
  employee: ['notifications', 'admin_task_assignments', 'verification_events', 'employee_work_logs', 'support_tickets', 'inspections', 'maintenance_requests'],
} as const

export function RoleRealtimeBridge({ role, userId }: RoleRealtimeBridgeProps) {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const refreshSoon = () => {
      if (refreshTimer.current) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        router.refresh()
      }, 350)
    }

    const channel = supabase.channel(`plotkare-${role}-${userId}`)
    roleTables[role].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refreshSoon)
    })

    channel.subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = null
      void supabase.removeChannel(channel)
    }
  }, [role, router, userId])

  return null
}
