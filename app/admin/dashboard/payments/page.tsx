'use client'

import { useEffect, useState } from 'react'
import {
  loadAdminPayments,
  saveAdminPayments,
  type AdminPaymentRow,
} from '@/lib/admin-demo-store'

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<AdminPaymentRow[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: '',
    customerName: '',
    description: '',
    status: 'Recorded',
  })

  useEffect(() => setRows(loadAdminPayments()), [])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date || !form.customerName) return
    const row: AdminPaymentRow = {
      id: `pay-${Date.now()}`,
      date: form.date,
      customerName: form.customerName.trim(),
      description: form.description.trim(),
      amount: 0,
      status: form.status,
    }
    const next = [row, ...rows]
    saveAdminPayments(next)
    setRows(next)
    setOpen(false)
    setForm({ date: '', customerName: '', description: '', status: 'Recorded' })
  }

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Payments</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Consultation and service records</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white"
        >
          Add Consultation Record
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-3 text-[#6B7280]">{r.date}</td>
                <td className="px-3 py-3 text-[#1F2937]">{r.customerName}</td>
                <td className="px-3 py-3 text-[#6B7280]">{r.description}</td>
                <td className="px-3 py-3 text-[#16A34A]">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={add}
            className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
          >
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Manual consultation record</h2>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Date (e.g. 01 May 2026)"
                required
                value={form.date}
                onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
              />
              <input
                placeholder="Customer name"
                required
                value={form.customerName}
                onChange={(e) => setForm((s) => ({ ...s, customerName: e.target.value }))}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
              >
                <option>Recorded</option>
                <option>Advisor review</option>
                <option>Pending</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-[#C0392B] py-2.5 text-sm font-semibold text-white">
                Save
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
