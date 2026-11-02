'use client'

import { useState } from 'react'

export function AdminQrReviewButton({ propertyId }: { propertyId: string }) {
  const [message, setMessage] = useState<string | null>(null)
  async function review(approve: boolean) {
    const response = await fetch('/api/admin/property-qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId, approve }) })
    setMessage(response.ok ? 'Saved. Refresh to update the queue.' : 'Review could not be saved.')
  }
  return <div className="flex flex-wrap gap-2"><button onClick={() => review(true)} className="rounded border border-emerald-600 px-2 py-1 text-xs font-semibold text-emerald-700">Approve QR</button><button onClick={() => review(false)} className="rounded border border-[#D1D5DB] px-2 py-1 text-xs">Return to owner</button>{message ? <span className="text-xs text-[#6B7280]">{message}</span> : null}</div>
}
