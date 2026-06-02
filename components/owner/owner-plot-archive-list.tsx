'use client'

import { Archive, Loader2, RotateCcw } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type OwnerPlotArchiveRow = {
  id: string
  plot_number: string | null
  location: string | null
  sq_yards: number | null
  facing: string | null
  status: string | null
  lifecycle_status: string | null
  verification_status: string | null
}

type OwnerPlotArchiveListProps = {
  plots: OwnerPlotArchiveRow[]
}

function isArchived(plot: OwnerPlotArchiveRow) {
  return plot.lifecycle_status?.toLowerCase() === 'archived' || plot.status?.toLowerCase() === 'archived'
}

function stateLabel(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

export function OwnerPlotArchiveList({ plots }: OwnerPlotArchiveListProps) {
  const router = useRouter()
  const [rows, setRows] = useState(plots)
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const counts = useMemo(
    () => ({
      active: rows.filter((plot) => !isArchived(plot)).length,
      archived: rows.filter(isArchived).length,
    }),
    [rows],
  )
  const visibleRows = rows.filter((plot) => (tab === 'archived' ? isArchived(plot) : !isArchived(plot)))

  async function archivePlot(plotId: string) {
    setBusyId(plotId)
    setMessage(null)

    try {
      const response = await fetch(`/api/owner/plots/${plotId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || 'Archive failed. Please try again.')
      }

      setRows((current) =>
        current.map((plot) =>
          plot.id === plotId ? { ...plot, status: 'archived', lifecycle_status: 'archived' } : plot,
        ),
      )
      setMessage('Plot archived and removed from public marketplace visibility.')
      startTransition(() => router.refresh())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Archive failed. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Plot archive control</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Archive plots you no longer want active in owner operations or public listing flows.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1">
          {(['active', 'archived'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                tab === item ? 'bg-white text-[#C0392B] shadow-sm' : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              {item === 'active' ? `Active ${counts.active}` : `Archived ${counts.archived}`}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div
          role="status"
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            message.includes('failed') || message.includes('active inspection')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-5 divide-y divide-[#E5E7EB]">
        {visibleRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#6B7280]">
            No {tab} plots in this account.
          </div>
        ) : null}
        {visibleRows.map((plot) => {
          const archived = isArchived(plot)
          const isBusy = busyId === plot.id || isPending

          return (
            <div key={plot.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-[#1F2937]">{plot.plot_number || 'Plot reference pending'}</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {plot.location || 'Location pending'} · {plot.sq_yards ? `${plot.sq_yards} sq. yd` : 'Size pending'} ·{' '}
                  {plot.facing || 'Facing pending'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[plot.lifecycle_status, plot.verification_status, plot.status].filter(Boolean).map((value) => (
                    <span
                      key={String(value)}
                      className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]"
                    >
                      {stateLabel(value)}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => archivePlot(plot.id)}
                disabled={archived || isBusy}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#6B7280] transition hover:border-[#C0392B] hover:text-[#C0392B] disabled:cursor-not-allowed disabled:opacity-55"
                title={archived ? 'Plot is already archived' : 'Archive plot'}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {archived ? 'Archived' : 'Archive'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
