import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { InspectionReviewActions } from './inspection-review-actions'
import { InternalNotes } from './internal-notes'
import { SecurePhotoGallery, type ReviewPhoto } from './secure-photo-gallery'

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

function parseSubmission(photos: unknown) {
  if (!Array.isArray(photos)) return null
  return ([...photos].reverse().find((entry: any) => entry?.type === 'field_submission') as any) ?? null
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
  const { data: ownerProfile } = property?.owner_profile_id
    ? await admin.from('profiles').select('full_name,email').eq('id', property.owner_profile_id).maybeSingle()
    : { data: null }
  const checklist = parseChecklist(inspection.photos)
  const submission = parseSubmission(inspection.photos)
  const documents = Array.isArray(submission?.documents) ? submission.documents : []
  const amenities = Array.isArray(submission?.amenities) ? submission.amenities : []
  const targetLatitude = inspection.target_latitude ?? property?.latitude ?? null
  const targetLongitude = inspection.target_longitude ?? property?.longitude ?? null
  const arrivalLatitude = inspection.arrival_latitude ?? null
  const arrivalLongitude = inspection.arrival_longitude ?? null
  const coordinates =
    arrivalLatitude != null && arrivalLongitude != null
      ? `${Number(arrivalLatitude).toFixed(5)}, ${Number(arrivalLongitude).toFixed(5)}`
      : 'Coordinates pending'

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
            <p className="mt-1 text-sm text-[#6B7280]">Owner: {ownerProfile?.full_name || ownerProfile?.email || 'Owner pending'}</p>
            <p className="mt-1 text-sm text-[#6B7280]">Agent: {agentProfile?.full_name || agentProfile?.email || 'Assigned agent'} · Submitted {formatDate(inspection.submitted_at)}</p>
          </div>
          <div className="grid gap-2 text-sm">
            <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 font-mono text-xs uppercase text-[#6B7280]">{statusLabel(inspection.workflow_step || inspection.status)}</span>
            <span className={`rounded-full border px-3 py-1 font-mono text-xs uppercase ${inspection.arrival_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : inspection.arrival_outside_radius ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {inspection.arrival_verified ? 'GPS verified' : inspection.arrival_outside_radius ? 'Outside radius' : 'GPS needs review'}
            </span>
            <span className="text-xs text-[#9CA3AF]">{inspection.arrival_distance_meters == null ? 'Distance pending' : `${Math.round(Number(inspection.arrival_distance_meters))}m from target`}</span>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="relative h-40 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[linear-gradient(135deg,#f8fafc,#e8f0f7)]">
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C0392B] shadow-[0_0_0_5px_rgba(192,57,43,0.16)]" />
            {arrivalLatitude != null && arrivalLongitude != null && targetLatitude != null && targetLongitude != null ? (
              <>
                <div className="absolute left-[58%] top-[43%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 shadow-[0_0_0_5px_rgba(37,99,235,0.16)]" />
                <div className="absolute left-1/2 top-1/2 h-px w-[12%] origin-left -rotate-12 bg-[#6B7280]" />
              </>
            ) : null}
            <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-[#4B5563]">
              Plot pin to agent GPS · {inspection.arrival_distance_meters == null ? 'distance pending' : `${Math.round(Number(inspection.arrival_distance_meters))} meters`}
            </div>
          </div>
          <div className="mt-4 grid gap-1 text-sm text-[#6B7280]">
            <p><span className="font-semibold text-[#1F2937]">Arrived at:</span> {formatDate(inspection.arrival_captured_at)}</p>
            <p><span className="font-semibold text-[#1F2937]">Location:</span> {inspection.arrival_place_label || coordinates}</p>
            <p><span className="font-semibold text-[#1F2937]">Coordinates:</span> {coordinates}</p>
            <p><span className="font-semibold text-[#1F2937]">GPS accuracy:</span> {inspection.arrival_accuracy_meters == null ? 'Pending' : `${Math.round(Number(inspection.arrival_accuracy_meters))} meters`}</p>
            {arrivalLatitude != null && arrivalLongitude != null ? (
              <a href={`https://www.google.com/maps/search/?api=1&query=${arrivalLatitude},${arrivalLongitude}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-[#C0392B]">
                View arrival location on Google Maps
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <SecurePhotoGallery inspectionId={inspectionId} photos={(photos ?? []) as ReviewPhoto[]} />

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Checklist results</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase text-[#9CA3AF]">
                <th className="py-3 pr-4">Question</th>
                <th className="py-3 pr-4">Answer</th>
                <th className="py-3 pr-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {checklist.length === 0 ? <tr><td colSpan={3} className="py-6 text-[#6B7280]">Checklist not submitted yet.</td></tr> : null}
              {checklist.map((answer: any) => (
                <tr key={answer.key} className={answer.key === 'encroachment' && answer.value === true ? 'bg-red-50' : ''}>
                  <td className="py-3 pr-4 text-[#1F2937]">{answer.label}</td>
                  <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${answer.value === true ? answer.key === 'encroachment' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700' : answer.value === false ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>{answer.value === true ? 'Yes' : answer.value === false ? 'No' : 'Pending'}</span></td>
                  <td className="py-3 pr-4 text-[#6B7280]">{answer.note || 'No note'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Issues flagged</h2>
        {inspection.action_required ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">{inspection.issue_severity || 'Issue'} flagged</p>
            <p className="mt-2 text-sm text-red-700">{inspection.summary || submission.notes || 'Agent flagged this inspection for admin review.'}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#6B7280]">No issues flagged</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Document status</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {documents.length === 0 ? <p className="text-[#6B7280]">No document flags submitted.</p> : null}
            {documents.map((doc: any) => (
              <div key={doc.id || doc.label} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="font-semibold text-[#1F2937]">{doc.label || doc.id}</p>
                <p className="mt-1 text-[#6B7280]">{statusLabel(doc.result)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Amenity checks</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {amenities.length === 0 ? <p className="text-[#6B7280]">No amenity checks submitted.</p> : null}
            {amenities.map((amenity: any) => (
              <div key={amenity.id || amenity.name} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="font-semibold text-[#1F2937]">{amenity.name || amenity.id}</p>
                <p className="mt-1 text-[#6B7280]">{statusLabel(amenity.condition)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {readonly ? <InternalNotes inspectionId={inspectionId} initialNote={inspection.review_notes} /> : null}

      {!readonly ? <InspectionReviewActions inspectionId={inspectionId} /> : null}
    </div>
  )
}
