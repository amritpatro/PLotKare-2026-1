'use client'

import { useState } from 'react'

export function PublicPropertyEnquiry({ token }: { token: string }) {
  const [status, setStatus] = useState<string | null>(null)
  async function submit(formData: FormData) {
    setStatus('Sending your private enquiry…')
    const response = await fetch(`/api/public/property/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone') || undefined, message: formData.get('message'), consent: formData.get('consent') === 'on' }) })
    const result = await response.json().catch(() => null)
    setStatus(response.ok ? result.data.message : result?.error?.message || 'Could not send your enquiry.')
  }
  return <form action={submit} className="mt-8 space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <div><h2 className="font-serif text-2xl font-bold text-[#1F2937]">Ask privately about this property</h2><p className="mt-2 text-sm text-[#6B7280]">Your contact details are not displayed to the owner. PlotKare qualifies each enquiry first.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><input required name="name" placeholder="Your name" className="rounded-lg border border-[#D1D5DB] px-3 py-3" /><input required name="email" type="email" placeholder="Email address" className="rounded-lg border border-[#D1D5DB] px-3 py-3" /></div>
    <input name="phone" placeholder="Phone (optional)" className="w-full rounded-lg border border-[#D1D5DB] px-3 py-3" />
    <textarea required name="message" rows={4} placeholder="What would you like to know?" className="w-full rounded-lg border border-[#D1D5DB] px-3 py-3" />
    <label className="flex gap-2 text-xs text-[#4B5563]"><input required name="consent" type="checkbox" /> I agree that PlotKare may use these details to respond to this request.</label>
    <button className="rounded-lg bg-[#8B1538] px-5 py-3 font-semibold text-white">Send private enquiry</button>
    {status ? <p role="status" className="text-sm text-[#4B5563]">{status}</p> : null}
  </form>
}
