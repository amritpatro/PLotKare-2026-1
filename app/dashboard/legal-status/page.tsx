'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const legalItems = [
  { name: 'EC Certificate', status: 'clear', date: 'Last checked: 15 Mar 2026' },
  { name: 'Property Tax', status: 'clear', date: 'Last checked: 20 Mar 2026' },
  { name: 'RERA Registration', status: 'clear', date: 'Last checked: 15 Mar 2026' },
  { name: 'Patta', status: 'clear', date: 'Last checked: 10 Mar 2026' },
  { name: 'Mutation', status: 'clear', date: 'Last checked: 18 Mar 2026' },
  { name: 'Encumbrance', status: 'clear', date: 'Last checked: 22 Mar 2026' },
]

export default function LegalStatusPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />

      <div className="ml-64">
        <DashboardTopBar title="Legal Status" />

        <div className="px-8 pb-12 pt-24">
          <div className="max-w-4xl space-y-4">
            {legalItems.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-4 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                {item.status === 'clear' ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#16A34A]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-500" />
                )}

                <div className="flex-1">
                  <h3 className="font-sans font-semibold text-[#1F2937]">{item.name}</h3>
                  <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{item.date}</p>
                </div>

                <button className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 font-sans text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3F4F6]">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
