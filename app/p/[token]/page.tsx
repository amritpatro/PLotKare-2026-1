import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PublicPropertyEnquiry } from '@/components/property-care/public-property-enquiry'
import { readinessLabels, type ReadinessTier } from '@/lib/property-care/readiness'

export const dynamic = 'force-dynamic'

export default async function PublicPropertyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createSupabaseAdminClient()
  const { data: qr } = await admin.from('property_qr_settings').select('property_id,public_summary,approximate_location_label').eq('public_token', token).eq('status', 'active').eq('owner_enabled', true).maybeSingle()
  if (!qr) notFound()
  const [{ data: property }, { data: readiness }, { data: plot }] = await Promise.all([
    admin.from('properties').select('title,property_kind,city,state,verification_status').eq('id', qr.property_id).eq('verification_status', 'approved').maybeSingle(),
    admin.from('property_readiness_snapshots').select('tier,evidence,evaluated_at').eq('property_id', qr.property_id).maybeSingle(),
    admin.from('plots').select('sq_yards,facing,location_status').eq('property_id', qr.property_id).maybeSingle(),
  ])
  if (!property) notFound()
  return <main className="min-h-screen bg-[#FAF8F5] px-4 py-12 text-[#1F2937]"><div className="mx-auto max-w-3xl">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8B1538]">PlotKare reviewed opportunity</p><h1 className="mt-3 font-serif text-4xl font-bold">{property.title || 'Verified property'}</h1>
    <p className="mt-3 text-lg text-[#4B5563]">{qr.approximate_location_label || [property.city, property.state].filter(Boolean).join(', ')}</p>
    <div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-6"><p>{qr.public_summary || 'This property is shared through a private, reviewed opportunity channel.'}</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs uppercase text-[#6B7280]">Property type</dt><dd className="mt-1 font-semibold capitalize">{property.property_kind}</dd></div>{plot ? <><div><dt className="text-xs uppercase text-[#6B7280]">Size</dt><dd className="mt-1 font-semibold">{plot.sq_yards ? `${plot.sq_yards} sq yd` : 'On request'}</dd></div><div><dt className="text-xs uppercase text-[#6B7280]">Field evidence</dt><dd className="mt-1 font-semibold">{plot.location_status === 'verified' ? 'Location reviewed' : 'Review in progress'}</dd></div></> : null}</dl>
      {readiness ? <div className="mt-6 border-t pt-5"><p className="text-xs uppercase text-[#6B7280]">Record status</p><p className="mt-1 font-semibold">{readinessLabels[readiness.tier as ReadinessTier]}</p><ul className="mt-2 list-disc pl-5 text-sm text-[#4B5563]">{(readiness.evidence ?? []).slice(0, 3).map((item: string) => <li key={item}>{item}</li>)}</ul></div> : null}
    </div><p className="mt-5 text-xs text-[#6B7280]">PlotKare does not publish owner contact details, ownership documents, or precise private coordinates.</p>
    <PublicPropertyEnquiry token={token} /><p className="mt-5 text-center text-sm text-[#6B7280]">Already have a PlotKare account? Sign in to submit an offer range or request a guided visit.</p>
  </div></main>
}
