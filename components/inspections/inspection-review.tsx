import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { InspectionReviewActions } from './inspection-review-actions'

type InspectionReviewProps = {
  inspectionId: string
  readonly?: boolean
  backHref: string
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function statusLabel(value: unknown) {
  return String(value ?? 'pending').replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function parseChecklist(photos: unknown) {
  if (!Array.isArray(photos)) return []
  const submission = [...photos].reverse().find((entry: any) => entry?.type === 'field_submission')
  return Array.isArray((submission as any)?.checklist) ? (submission as any).checklist : []
}

export async function InspectionReview({ inspectionId, readonly = false, backHref }: InspectionReviewProps) {
  const admin = createSupabaseAdminClient()
  const [{ data: inspection }, { data: photos }] = await Promise.all([
    admin
      .from('inspections')
      .select('*,properties(title,address,city,state,owner_profile_id,latitude,longitude),plots(plot_number,location),employees(profile_id,profiles(full_name,email))')
      .eq('id', inspectionId)
      .maybeSingle(),
    admin
      .from('inspection_photos')
      .select('id,object_path,direction,subject,captured_at,latitude,longitude,accuracy_meters,caption,upload_status')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true }),
  ])

  if (!inspection) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
        Inspection not found.
      </div>
    )
  }

  const property = first(inspection.properties)
  const plot = first(inspection.plots)
  const employee = first(inspection.employees)
  const agentProfile = first(employee?.profiles)
  const signedPhotos = await Promise.all((photos ?? []).map(async (photo) => {
    const { data } = await admin.storage.from('inspection-photos').createSignedUrl(photo.object_path, 3600)
    return { ...photo, signedUrl: data?.signedUrl ?? null }
  }))
  const checklist = parseChecklist(inspection.photos)
  const boundaryPhotos = ['north', 'south', 'east', 'west'].map((direction) => signedPhotos.find((photo) => photo.direction === direction))
  const issuePhotos = signedPhotos.filter((photo) => String(photo.direction).startsWith('issue'))

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex min-h-11 items-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1F2937]">
        Back
      </Link>

      {readonly ? (
        <div className="rounded-xl border border-[#E8D8A8] bg-[#FFF8E1] px-4 py-3 text-sm text-[#8A6D1D]">
          View only - admin approval is required before owner release.
        </div>
      ) : null}

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#C9A962]">Inspection review</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#1F2937]">{plot?.plot_number || inspection.inspection_reference || inspection.id.slice(0, 8)}</h1>
            <p className="mt-2 text-sm text-[#6B7280]">{property?.title || plot?.location || 'Property'} · {[property?.address, property?.city, property?.state].filter(Boolean).join(', ')}</p>
            <p className="mt-1 text-sm text-[#6B7280]">Agent: {agentProfile?.full_name || agentProfile?.email || 'Assigned agent'} · Submitted {formatDate(inspection.submitted_at)}</p>
          </div>
          <div className="grid gap-2 text-sm">
            <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 font-mono text-xs uppercase text-[#6B7280]">{statusLabel(inspection.workflow_step || inspection.status)}</span>
            <span className={`rounded-full border px-3 py-1 font-mono text-xs uppercase ${inspection.arrival_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {inspection.arrival_verified ? 'GPS verified' : 'GPS needs review'}
            </span>
            <span className="text-xs text-[#9CA3AF]">{inspection.arrival_distance_meters == null ? 'Distance pending' : `${Math.round(Number(inspection.arrival_distance_meters))}m from target`}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Photo evidence</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {boundaryPhotos.map((photo, index) => {
            const label = ['North', 'South', 'East', 'West'][index]
            return (
              <div key={label} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="font-semibold text-[#1F2937]">{label} boundary</p>
                {photo?.signedUrl ? (
                  <a href={photo.signedUrl} target="_blank" rel="noreferrer">
                    <img src={photo.signedUrl} alt={`${label} boundary evidence`} className="mt-3 aspect-video w-full rounded-lg object-cover" />
                  </a>
                ) : (
                  <div className="mt-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] text-sm text-[#6B7280]">Photo pending</div>
                )}
                <p className="mt-2 font-mono text-[11px] text-[#6B7280]">{formatDate(photo?.captured_at)}</p>
                <p className="mt-1 font-mono text-[11px] text-[#9CA3AF]">{photo?.latitude ?? 'lat pending'}, {photo?.longitude ?? 'lng pending'}</p>
              </div>
            )
          })}
        </div>
        {issuePhotos.length ? (
          <div className="mt-6">
            <h3 className="font-serif text-xl font-semibold text-[#A93226]">Issue evidence</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {issuePhotos.map((photo) => (
                <div key={photo.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.subject || 'Issue evidence'} className="aspect-video w-full rounded-lg object-cover" /> : null}
                  <p className="mt-2 text-sm font-semibold text-red-800">{photo.subject || photo.caption || 'Issue evidence'}</p>
                  <p className="mt-1 font-mono text-[11px] text-red-700">{formatDate(photo.captured_at)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Checklist results</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
                <th className="py-3 pr-4">Question</th>
                <th className="py-3 pr-4">Answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {checklist.length === 0 ? <tr><td colSpan={2} className="py-6 text-[#6B7280]">Checklist not submitted yet.</td></tr> : null}
              {checklist.map((answer: any) => (
                <tr key={answer.key} className={answer.key === 'encroachment' && answer.value === true ? 'bg-red-50' : ''}>
                  <td className="py-3 pr-4 text-[#1F2937]">{answer.label}</td>
                  <td className="py-3 pr-4">{answer.value === true ? 'Yes' : answer.value === false ? 'No' : 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!readonly ? <InspectionReviewActions inspectionId={inspectionId} /> : null}
    </div>
  )
}
