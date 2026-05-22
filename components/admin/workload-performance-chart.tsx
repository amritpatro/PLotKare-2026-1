'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type WorkloadPerformancePoint = {
  label: string
  opened: number
  closed: number
}

export function WorkloadPerformanceChart({ data }: { data: WorkloadPerformancePoint[] }) {
  const hasData = data.some((point) => point.opened > 0 || point.closed > 0)

  if (!hasData) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 text-center">
        <p className="max-w-sm font-sans text-sm leading-6 text-[#6B7280]">
          No inspection, support, or maintenance activity has been recorded in the last 7 days.
        </p>
      </div>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: '#F9FAFB' }}
            contentStyle={{
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
              fontSize: 12,
            }}
          />
          <Bar dataKey="opened" name="Opened" fill="#C0392B" radius={[5, 5, 0, 0]} />
          <Bar dataKey="closed" name="Closed" fill="#C9A962" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
