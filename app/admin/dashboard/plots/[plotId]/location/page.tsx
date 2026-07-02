import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { AdminLocationReviewMap } from '@/components/admin/admin-location-review-map'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { rejectPlotLocation, verifyPlotLocation } from './actions'

type PageProps = {
  params: Promise<{ plotId: string }>
}

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
const inputClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'

type PlotRow = {
  id: string
  owner_id: string
  property_id: string | null
  plot_number: string | null
  location: string | null
  sq_yards: number | null
  facing: string | null
  submitted_latitude: number | null
  submitted_longitude: number | null
  submitted_accuracy_meters: number | null
  location_source: string | null
  location_status: string | null
  location_note: string | null
  location_submitted_at: string | null
  address_landmark: string | null
  target_latitude: number | null
  target_longitude: number | null
  target_place_label: string | null
  google_maps_link: string | null
  location_adjusted_by_admin: boolean | null
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function label(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default async function AdminPlotLocationReviewPage({ params }: PageProps) {
  await requirePageRole(['admin'])
  const { plotId } = await params
  const supabase = createSupabaseAdminClient()

  const { data: plotData } = await supabase
    .from('plots')
    .select('id,owner_id,property_id,plot_number,location,sq_yards,facing,submitted_latitude,submitted_longitude,submitted_accuracy_meters,location_source,location_status,location_note,location_submitted_at,address_landmark,target_latitude,target_longitude,target_place_label,google_maps_link,location_adjusted_by_admin')
    .eq('id', plotId)
    .maybeSingle()

  if (!plotData) notFound()
  const plot = plotData as PlotRow

  const [{ data: ownerData }, { data: propertyData }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email').eq('id', plot.owner_id).maybeSingle(),
    plot.property_id
      ? supabase.from('properties').select('id,title,address,city,state,latitude,longitude,verification_status,lifecycle_status').eq('id', plot.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const owner = first(ownerData)
  const property = first(propertyData)
  const submittedLatitude = numberOrNull(plot.submitted_latitude ?? plot.target_latitude)
  const submittedLongitude = numberOrNull(plot.submitted_longitude ?? plot.target_longitude)
  const hasSubmittedPoint = submittedLatitude != null && submittedLongitude != null
  const statusTone =
    plot.location_status === 'verified'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : plot.location_status === 'rejected'
        ? 'border-red-200 bg-red-50 text-red-700'
        : plot.location_status === 'pending_verification'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'

  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <Link href="/admin/dashboard/plots" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1F2937]">
        <ArrowLeft className="h-4 w-4" />
        Back to plots
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
        <section className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C9A962]">Location verification</p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-[#1F2937]">{plot.plot_number || 'Plot reference pending'}</h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Review the owner-submitted point, adjust only if necessary, then verify or reject with a clear reason.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusTone}`}>
              {label(plot.location_status)}
            </span>
          </div>

          {hasSubmittedPoint ? (
            <form action={verifyPlotLocation} className="mt-6 grid gap-4">
              <input type="hidden" name="plotId" value={plot.id} />
              <AdminLocationReviewMap initialLatitude={submittedLatitude} initialLongitude={submittedLongitude} />
              <PendingActionButton
                pendingText="Verifying..."
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-bold text-white transition hover:bg-[#A93225]"
              >
                <CheckCircle2 className="h-5 w-5" />
                Verify and activate location
              </PendingActionButton>
            </form>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-800">
              No owner-submitted coordinates exist for this plot yet.
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className={cardClass}>
            <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Submission details</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Owner</dt>
                <dd className="mt-1 text-[#1F2937]">{owner?.full_name || owner?.email || 'Owner pending'}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Property</dt>
                <dd className="mt-1 text-[#1F2937]">{property?.title || plot.location || 'Property pending'}</dd>
                <dd className="mt-1 text-xs text-[#6B7280]">{[property?.address, property?.city, property?.state].filter(Boolean).join(', ')}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Submitted pin</dt>
                <dd className="mt-1 font-mono text-[#1F2937]">
                  {hasSubmittedPoint ? `${submittedLatitude.toFixed(6)}, ${submittedLongitude.toFixed(6)}` : 'Pending'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Source</dt>
                <dd className="mt-1 text-[#1F2937]">{label(plot.location_source)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Accuracy</dt>
                <dd className="mt-1 text-[#1F2937]">
                  {plot.submitted_accuracy_meters == null ? 'Not provided' : `${Math.round(Number(plot.submitted_accuracy_meters))}m`}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Landmark</dt>
                <dd className="mt-1 text-[#1F2937]">{plot.address_landmark || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Submitted</dt>
                <dd className="mt-1 text-[#1F2937]">
                  {plot.location_submitted_at ? new Date(plot.location_submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}
                </dd>
              </div>
              {plot.location_note ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em]">Previous note</dt>
                  <dd className="mt-1">{plot.location_note}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className="font-serif text-xl font-semibold text-[#1F2937]">Reject location</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Use this when the pin is outside the plot, too vague, or needs owner correction.
            </p>
            <form action={rejectPlotLocation} className="mt-4 grid gap-3">
              <input type="hidden" name="plotId" value={plot.id} />
              <textarea name="note" required rows={5} placeholder="Tell the owner what to correct before resubmitting." className={inputClass} />
              <PendingActionButton
                pendingText="Rejecting..."
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                <XCircle className="h-5 w-5" />
                Reject and request correction
              </PendingActionButton>
            </form>
          </section>

          {hasSubmittedPoint ? (
            <a href={`https://www.google.com/maps/search/?api=1&query=${submittedLatitude},${submittedLongitude}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#C0392B] bg-white px-4 text-sm font-bold text-[#C0392B]">
              <MapPin className="h-4 w-4" />
              Open submitted pin
            </a>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
