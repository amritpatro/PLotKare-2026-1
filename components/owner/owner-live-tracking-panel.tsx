'use client'

import Link from 'next/link'
import { LivePlotMap } from '@/components/agent/live-plot-map'

export type OwnerLiveTrackingRow = {
  inspectionId: string
  title: string
  plotLabel: string
  status: string
  targetLatitude: number | null
  targetLongitude: number | null
  agentLatitude: number | null
  agentLongitude: number | null
  accuracyMeters: number | null
  capturedAt: string | null
}

type OwnerLiveTrackingPanelProps = {
  rows: OwnerLiveTrackingRow[]
}

function formatTime(value: string | null) {
  if (!value) return 'Waiting for GPS'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function OwnerLiveTrackingPanel({ rows }: OwnerLiveTrackingPanelProps) {
  const active = rows[0] ?? null

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C9A962]">Live field movement</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-[#1F2937]">Inspection tracking</h2>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            Real agent GPS updates appear here while an inspection is scheduled or in progress.
          </p>
        </div>
        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs font-semibold text-[#6B7280]">
          {rows.length} active
        </span>
      </div>

      {!active ? (
        <div className="mt-5 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
          No live inspection movement yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <LivePlotMap
            target={{ latitude: active.targetLatitude, longitude: active.targetLongitude }}
            current={
              active.agentLatitude != null && active.agentLongitude != null
                ? {
                    latitude: active.agentLatitude,
                    longitude: active.agentLongitude,
                    accuracy: active.accuracyMeters ?? 0,
                    capturedAt: active.capturedAt ?? new Date().toISOString(),
                  }
                : null
            }
            distanceMeters={null}
            arrivalStatus={null}
            accuracyLabel={active.accuracyMeters == null ? 'GPS accuracy pending' : `Accuracy ${Math.round(active.accuracyMeters)}m`}
          />
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="font-semibold text-[#1F2937]">{active.plotLabel}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{active.title}</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Status</dt>
                <dd className="mt-1 font-semibold text-[#1F2937]">{active.status.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Last movement</dt>
                <dd className="mt-1 text-[#6B7280]">{formatTime(active.capturedAt)}</dd>
              </div>
            </dl>
            <Link href="/owner/services" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#C0392B] px-3 text-sm font-semibold text-[#C0392B]">
              View service history
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
