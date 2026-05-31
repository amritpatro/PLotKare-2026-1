'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

type Props = {
  inspectionId: string
}

export function InspectionReviewActions({ inspectionId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function approve() {
    setBusy('approve')
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/inspections/${inspectionId}/approve`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Approval failed.')
      setMessage('Report approved and released to owner dashboard.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval failed.')
    } finally {
      setBusy(null)
    }
  }

  async function reject() {
    setBusy('reject')
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/inspections/${inspectionId}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Rejection failed.')
      setMessage('Correction request sent to field agent.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Rejection failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="sticky bottom-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg">
      {message ? <p className="mb-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#4B5563]">{message}</p> : null}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <label className="grid gap-1 text-sm text-[#6B7280]">
          Correction/rejection reason
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="rounded-lg border border-[#D1D5DB] p-3 text-sm text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" placeholder="Required only when requesting correction or rejecting." />
        </label>
        <button type="button" onClick={approve} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:bg-[#9CA3AF]">
          {busy === 'approve' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          Approve report
        </button>
        <button type="button" onClick={reject} disabled={Boolean(busy) || reason.trim().length < 20} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#C0392B] px-4 text-sm font-bold text-[#C0392B] disabled:border-[#D1D5DB] disabled:text-[#9CA3AF]">
          {busy === 'reject' ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
          Request correction
        </button>
      </div>
    </section>
  )
}
