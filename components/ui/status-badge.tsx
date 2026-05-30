import React from 'react'
import { getStatusTone } from '@/lib/status-tone'

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const tone = getStatusTone(status)
  const normalized = String(status ?? 'unknown').replaceAll('_', ' ')
  const classes = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    yellow: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    gray: 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]',
  }[tone]

  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${classes}`}>
      {normalized}
    </span>
  )
}

export default StatusBadge
