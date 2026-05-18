'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  loadAdminRegistryPlots,
  saveAdminRegistryPlots,
  type AdminRegistryPlot,
} from '@/lib/admin-demo-store'

export default function AdminPlotsPage() {
  const [rows, setRows] = useState<AdminRegistryPlot[]>([])
  const [view, setView] = useState<AdminRegistryPlot | null>(null)
  const [edit, setEdit] = useState<AdminRegistryPlot | null>(null)
  const [lastDate, setLastDate] = useState('')

  useEffect(() => setRows(loadAdminRegistryPlots()), [])

  const openEdit = (r: AdminRegistryPlot) => {
    setEdit(r)
    setLastDate(
      new Date().toISOString().slice(0, 10),
    )
  }

  const saveEdit = () => {
    if (!edit) return
    const lastInspection = new Date(lastDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const next = rows.map((x) =>
      x.id === edit.id
        ? {
            ...x,
            lastInspection,
          }
        : x,
    )
    saveAdminRegistryPlots(next)
    setRows(next)
    setEdit(null)
  }

  return (
    <div className="px-8 pb-12 pt-24">
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Plots</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">All registered plots across customers</p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-3 py-3">Plot #</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Review</th>
              <th className="px-3 py-3">Consultation</th>
              <th className="px-3 py-3">Inspection</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] font-sans text-[#1F2937]">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-3 font-mono text-[#C0392B]">{r.plotNumber}</td>
                <td className="px-3 py-3">{r.ownerName}</td>
                <td className="px-3 py-3 text-[#6B7280]">{r.location}</td>
                <td className="px-3 py-3 text-[#6B7280]">{r.size}</td>
                <td className="px-3 py-3">Advisor review ready</td>
                <td className="px-3 py-3 font-mono text-[#F59E0B]">Consult for valuation</td>
                <td className="px-3 py-3 text-[#6B7280]">{r.lastInspection}</td>
                <td className="px-3 py-3 text-[#16A34A]">{r.status}</td>
                <td className="px-3 py-3 space-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-lg border border-[#C0392B] px-2 py-1 text-xs font-semibold text-[#C0392B]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setView(r)}
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs text-[#6B7280]"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">Plot details</DialogTitle>
          </DialogHeader>
          {view && (
            <dl className="space-y-2 pt-2 font-sans text-sm text-[#6B7280]">
              <div>
                <dt className="text-[#9CA3AF]">Plot</dt>
                <dd className="font-mono text-[#C0392B]">{view.plotNumber}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Owner</dt>
                <dd>{view.ownerName}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Location</dt>
                <dd>{view.location}</dd>
              </div>
              <div>
                <dt className="text-[#9CA3AF]">Advisory status</dt>
                <dd>
                  <span className="font-mono text-[#F59E0B]">Consult for valuation</span>
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E5E7EB] bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">Update plot</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 pt-2">
              <p className="font-mono text-sm text-[#6B7280]">{edit.plotNumber}</p>
              <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 font-sans text-sm text-[#6B7280]">
                Fixed valuation figures are hidden from admin screens. Use a PlotKare advisor consultation before
                sharing any valuation guidance.
              </p>
              <div>
                <label className="font-mono text-xs text-[#6B7280]">Last inspection date</label>
                <input
                  type="date"
                  value={lastDate}
                  onChange={(e) => setLastDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-[#1F2937]"
                />
              </div>
              <button
                type="button"
                onClick={saveEdit}
                className="w-full rounded-lg bg-[#C0392B] py-2.5 font-sans text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
