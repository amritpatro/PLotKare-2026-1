'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  loadAdminCustomers,
  loadAdminReports,
  saveAdminReports,
  type AdminReportRow,
} from '@/lib/admin-demo-store'

export default function AdminInspectionReportsPage() {
  const [rows, setRows] = useState<AdminReportRow[]>([])
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [plotNumber, setPlotNumber] = useState('')
  const [month, setMonth] = useState('')
  const [agent, setAgent] = useState('')
  const [finding, setFinding] = useState('')

  const customers = useMemo(() => loadAdminCustomers(), [open, rows])

  const plotsForCustomer = useMemo(() => {
    const c = customers.find((x) => x.id === customerId)
    return c?.plotDetails ?? []
  }, [customers, customerId])

  useEffect(() => setRows(loadAdminReports()), [])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const owner = customers.find((x) => x.id === customerId)?.name ?? ''
    const row: AdminReportRow = {
      id: `rep-${Date.now()}`,
      month,
      plotNumber,
      owner,
      agentName: agent,
      finding,
      status: 'Submitted',
    }
    const next = [row, ...rows]
    saveAdminReports(next)
    setRows(next)
    setOpen(false)
    setCustomerId('')
    setPlotNumber('')
    setMonth('')
    setAgent('')
    setFinding('')
  }

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Inspection Reports</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Cross-customer field reports</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white"
        >
          Add Report
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Month</th>
              <th className="px-3 py-3">Plot</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Agent</th>
              <th className="px-3 py-3">Finding</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] text-[#1F2937]">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-3 text-[#6B7280]">{r.month}</td>
                <td className="px-3 py-3 font-mono text-[#C0392B]">{r.plotNumber}</td>
                <td className="px-3 py-3">{r.owner}</td>
                <td className="px-3 py-3">{r.agentName}</td>
                <td className="max-w-xs truncate px-3 py-3 text-[#6B7280]">{r.finding}</td>
                <td className="px-3 py-3 text-[#16A34A]">{r.status}</td>
                <td className="px-3 py-3">
                  <button type="button" className="text-xs text-[#C0392B]">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Add report</h2>
            <form onSubmit={save} className="mt-4 space-y-3">
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Customer</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    setPlotNumber('')
                  }}
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
                >
                  <option value="">Select…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Plot</label>
                <select
                  required
                  value={plotNumber}
                  onChange={(e) => setPlotNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
                >
                  <option value="">Select…</option>
                  {plotsForCustomer.map((p) => (
                    <option key={p.plotNumber} value={p.plotNumber}>
                      {p.plotNumber} — {p.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Month</label>
                <input
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="April 2026"
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Agent name</label>
                <input
                  required
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Finding</label>
                <textarea
                  required
                  rows={3}
                  value={finding}
                  onChange={(e) => setFinding(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-[#C0392B] py-2.5 text-sm font-semibold text-white">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
