'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')

  return (
    <div className="px-8 pb-12 pt-24">
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Settings</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Admin profile</p>

      <div className="mt-8 max-w-lg space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div>
          <label className="font-mono text-xs text-[#6B7280]">Name</label>
          <input
            readOnly
            value="PlotKare Admin"
            className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-2 text-[#1F2937]"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-[#6B7280]">Email</label>
          <input
            readOnly
            value="admin@plotkare.in"
            className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-2 text-[#1F2937]"
          />
        </div>
      </div>

      <div className="mt-8 max-w-lg space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Change password</h2>
        <div>
          <label className="font-mono text-xs text-[#6B7280]">Current password</label>
          <input
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-[#6B7280]">New password</label>
          <input
            type="password"
            value={nw}
            onChange={(e) => setNw(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-[#6B7280]">Confirm new password</label>
          <input
            type="password"
            value={cf}
            onChange={(e) => setCf(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={() => toast.success('Password preferences saved')}
          className="rounded-lg bg-[#C0392B] px-6 py-2.5 font-sans text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  )
}
