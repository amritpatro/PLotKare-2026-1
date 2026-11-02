'use client'

import { useState } from 'react'

export function FamilyAccessAccept({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null)
  async function accept() {
    const response = await fetch('/api/family-access', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const result = await response.json().catch(() => null)
    setMessage(response.ok ? 'Access accepted. You can now view the shared property record from your account.' : result?.error?.message || 'This invitation could not be accepted.')
  }
  return <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm"><h1 className="font-serif text-3xl font-bold text-[#1F2937]">Family property access</h1><p className="mt-3 text-[#4B5563]">This invitation gives view-only access to the owner’s property record. You cannot modify evidence, contact buyers, or manage services.</p><button onClick={accept} className="mt-6 rounded-lg bg-[#8B1538] px-5 py-3 font-semibold text-white">Accept view-only access</button>{message ? <p role="status" className="mt-4 text-sm text-[#4B5563]">{message}</p> : null}<p className="mt-5 text-xs text-[#6B7280]">Sign in with the invited email address before accepting. Links expire after seven days and can be revoked by the owner.</p></div>
}
