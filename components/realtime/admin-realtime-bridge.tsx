'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const adminTables = [
  'notifications',
  'support_tickets',
  'ticket_replies',
  'verification_requests',
  'verification_events',
  'admin_task_assignments',
  'employee_work_logs',
  'property_documents',
  'active_amenities',
  'customer_property_requests',
  'inspections',
  'inspection_photos',
  'inspection_reports',
  'inspection_flags',
  'inspection_checklist_answers',
  'inspection_document_checks',
  'inspection_amenity_checks',
] as const

export function AdminRealtimeBridge({ userId }: { userId: string }) {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase.channel(`plotkare-admin-${userId}`)

    const refreshSoon = () => {
      if (refreshTimer.current) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        router.refresh()
      }, 300)
    }

    adminTables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refreshSoon)
    })

    channel.subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = null
      void supabase.removeChannel(channel)
    }
  }, [router, userId])

  return null
}
