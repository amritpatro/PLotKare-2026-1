'use client'

import { useReducedMotion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LinkedPropertyValue } from '@/lib/customer-workspace/types'

function labelFor(value: LinkedPropertyValue) {
  return value.property_title || value.plot_number || 'Linked property'
}

function formatLakhs(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}L`
}

export function ValueSnapshotChart({ values }: { values: LinkedPropertyValue[] }) {
  const reduceMotion = useReducedMotion()
  const data = values
    .filter((value) => value.purchase_price_lakhs > 0 || value.current_value_lakhs > 0)
    .slice(0, 6)
    .map((value) => ({
      name: labelFor(value),
      purchase: value.purchase_price_lakhs,
      current: value.current_value_lakhs,
    }))

  if (!data.length) {
    return (
      <div className="dashboard-value-empty" role="status">
        Value information will appear after PlotKare records a purchase value or current valuation for a linked property.
      </div>
    )
  }

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Bar chart comparing recorded purchase and current property values in lakhs"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} interval={0} />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6B7280', fontSize: 11 }}
            tickFormatter={(value) => `${value}L`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(192, 57, 43, 0.045)' }}
            formatter={(value) => formatLakhs(Number(value ?? 0))}
            contentStyle={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              boxShadow: '0 16px 36px rgba(26, 26, 26, 0.12)',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Bar dataKey="purchase" name="Purchase value" fill="#C9A962" radius={[5, 5, 0, 0]} isAnimationActive={!reduceMotion} />
          <Bar dataKey="current" name="Current value" fill="#C0392B" radius={[5, 5, 0, 0]} isAnimationActive={!reduceMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
