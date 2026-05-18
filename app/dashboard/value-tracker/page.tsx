'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { TrendingUp } from 'lucide-react'

const chartData = [
  { month: 'Apr 25', vzg047: 52, vzg112: 46 },
  { month: 'May 25', vzg047: 54, vzg112: 47 },
  { month: 'Jun 25', vzg047: 56, vzg112: 49 },
  { month: 'Jul 25', vzg047: 58, vzg112: 50 },
  { month: 'Aug 25', vzg047: 60, vzg112: 52 },
  { month: 'Sep 25', vzg047: 62, vzg112: 54 },
  { month: 'Oct 25', vzg047: 64, vzg112: 55 },
  { month: 'Nov 25', vzg047: 66, vzg112: 56 },
  { month: 'Dec 25', vzg047: 68, vzg112: 58 },
]

const comparison = [
  {
    plot: 'VZG-047',
    purchase: 'Baseline captured',
    current: 'Advisor review ready',
    gain: 'Improving',
    percentage: 'Strong',
  },
  {
    plot: 'VZG-112',
    purchase: 'Baseline captured',
    current: 'Consultation ready',
    gain: 'Improving',
    percentage: 'Positive',
  },
]

export default function ValueTrackerPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />

      <div className="ml-64">
        <DashboardTopBar title="Value Tracker" />

        <div className="space-y-8 px-8 pb-12 pt-24">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="mb-6 font-serif text-xl font-bold text-[#1F2937]">12-Month Value Signal</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVzg047" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C0392B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#C0392B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVzg112" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#1F2937' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area
                  type="monotone"
                  dataKey="vzg047"
                  stroke="#C0392B"
                  fillOpacity={1}
                  fill="url(#colorVzg047)"
                  name="VZG-047"
                />
                <Area
                  type="monotone"
                  dataKey="vzg112"
                  stroke="#F59E0B"
                  fillOpacity={1}
                  fill="url(#colorVzg112)"
                  name="VZG-112"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="mb-6 font-serif text-xl font-bold text-[#1F2937]">Portfolio Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-[#9CA3AF]">
                      Plot
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-[#9CA3AF]">
                      Baseline
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-[#9CA3AF]">
                      Current Review
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-[#9CA3AF]">Signal</th>
                    <th className="px-4 py-3 text-left font-mono text-xs font-semibold text-[#9CA3AF]">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {comparison.map((item) => (
                    <tr key={item.plot}>
                      <td className="px-4 py-4 font-mono font-semibold text-[#1F2937]">{item.plot}</td>
                      <td className="px-4 py-4 font-sans text-[#6B7280]">{item.purchase}</td>
                      <td className="px-4 py-4 font-sans font-semibold text-[#1F2937]">{item.current}</td>
                      <td className="px-4 py-4 font-mono font-semibold text-[#F59E0B]">{item.gain}</td>
                      <td className="px-4 py-4 font-mono font-semibold text-[#16A34A]">
                        <span className="inline-flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          {item.percentage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
