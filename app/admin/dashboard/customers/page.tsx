'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  loadAdminCustomers,
  saveAdminCustomers,
  type AdminCustomer,
} from '@/lib/admin-demo-store'

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<AdminCustomer[]>([])
  const [detail, setDetail] = useState<AdminCustomer | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    plan: 'Standard' as AdminCustomer['plan'],
  })

  useEffect(() => setRows(loadAdminCustomers()), [])

  const persist = (next: AdminCustomer[]) => {
    saveAdminCustomers(next)
    setRows(next)
  }

  const addCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    const id = String(Date.now())
    const row: AdminCustomer = {
      id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      plan: form.plan,
      plotsCount: 0,
      joinedDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      plotDetails: [],
    }
    persist([...rows, row])
    setAddOpen(false)
    setForm({ name: '', email: '', phone: '', city: '', plan: 'Standard' })
  }

  return (
    <div className="px-8 pb-12 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Customers</h1>
          <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Manage registered landowners</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-[#C0392B] px-4 py-2 font-sans text-sm font-semibold text-white hover:opacity-95"
        >
          Add Customer
        </button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Plots</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] font-sans text-[#1F2937]">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-[#6B7280]">{r.email}</td>
                <td className="px-4 py-3 text-[#6B7280]">{r.phone}</td>
                <td className="px-4 py-3 text-[#6B7280]">{r.city}</td>
                <td className="px-4 py-3">{r.plotsCount}</td>
                <td className="px-4 py-3">{r.plan}</td>
                <td className="px-4 py-3 text-[#6B7280]">{r.joinedDate}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDetail(r)}
                    className="rounded-lg border border-[#C0392B] px-3 py-1.5 text-xs font-semibold text-[#C0392B] hover:bg-[#FFF1F2]"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 pt-2 font-sans text-sm text-[#6B7280]">
              <p>
                <span className="text-[#9CA3AF]">Email:</span> {detail.email}
              </p>
              <p>
                <span className="text-[#9CA3AF]">Phone:</span> {detail.phone}
              </p>
              <p>
                <span className="text-[#9CA3AF]">City:</span> {detail.city}
              </p>
              <p>
                <span className="text-[#9CA3AF]">Plan:</span> {detail.plan}
              </p>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="font-medium text-[#1F2937]">Plots</p>
                <ul className="mt-2 space-y-2">
                  {detail.plotDetails.map((p) => (
                    <li key={p.plotNumber} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                      <span className="font-mono text-[#C0392B]">{p.plotNumber}</span> — {p.location},{' '}
                      {p.size}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-[#E5E7EB] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1F2937]">Add customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={addCustomer} className="space-y-3 pt-2">
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#1F2937]"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Email</label>
              <input
                required
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#1F2937]"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Phone</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#1F2937]"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">City</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#1F2937]"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#6B7280]">Plan</label>
              <select
                value={form.plan}
                onChange={(e) =>
                  setForm((s) => ({ ...s, plan: e.target.value as AdminCustomer['plan'] }))
                }
                className="mt-1 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[#1F2937]"
              >
                <option>Basic</option>
                <option>Standard</option>
                <option>Premium</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#C0392B] py-2.5 font-sans text-sm font-semibold text-white"
            >
              Save
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
