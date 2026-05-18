'use client'

const activities = [
  'New customer registered — Priya Sharma',
  'Plot VZG-047 inspection due in 3 days',
  'Consultation booked — Ravi Kumar',
  'Listing PLT-KMD-008 received 2 new inquiries',
  'Amenity toggle: CCTV Camera Setup set inactive',
]

export default function AdminOverviewPage() {
  return (
    <div className="px-8 pb-12 pt-24">
      <h1 className="font-serif text-2xl font-bold text-[#1F2937]">Overview</h1>
      <p className="mt-1 font-sans text-sm text-[#9CA3AF]">Snapshot of your PlotKare operations</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="font-mono text-xs text-[#6B7280]">Total Customers</p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#C0392B]">3</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="font-mono text-xs text-[#6B7280]">Total Plots Registered</p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#C0392B]">5</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="font-mono text-xs text-[#6B7280]">Active Listings</p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#C0392B]">3</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="font-mono text-xs text-[#6B7280]">Consultation Pipeline</p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#F59E0B]">Active</p>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Recent activity</h2>
        <ul className="mt-4 space-y-3 font-sans text-sm text-[#6B7280]">
          {activities.map((line) => (
            <li key={line} className="flex gap-2 border-b border-[#F3F4F6] pb-3 last:border-0">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C0392B]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
