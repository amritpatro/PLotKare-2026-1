'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { readinessLabels, type ReadinessTier } from '@/lib/property-care/readiness'

type Property = { id: string; title: string; city: string | null; verification_status: string | null }
type Readiness = { property_id: string; tier: ReadinessTier; blockers: string[]; next_action: string; evaluated_at: string }
type Qr = { property_id: string; public_token: string; status: string; owner_enabled: boolean }
type Interest = { property_id: string; id: string; request_type: string; status: string; created_at: string }

export function OwnerCarePanel({ properties, readiness, qrSettings, interests }: { properties: Property[]; readiness: Readiness[]; qrSettings: Qr[]; interests: Interest[] }) {
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState(properties[0]?.id ?? '')
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const current = properties.find((property) => property.id === selected)
  const score = readiness.find((item) => item.property_id === selected)
  const qr = qrSettings.find((item) => item.property_id === selected)
  const publicUrl = origin && qr?.status === 'active' && qr.owner_enabled && qr.public_token
    ? `${origin}/p/${qr.public_token}`
    : null
  const inbox = interests.filter((item) => item.property_id === selected)
  async function post(path: string, data: Record<string, unknown>) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const body = await response.json().catch(() => null)
    setMessage(response.ok ? 'Saved. Refresh this page to see the updated record.' : body?.error?.message || 'Could not save this change.')
  }
  async function updateInterest(data: Record<string, unknown>) {
    const response = await fetch('/api/property-interest', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const body = await response.json().catch(() => null)
    setMessage(response.ok ? 'Interest record updated. Refresh this page to update the queue.' : body?.error?.message || 'Could not update this interest record.')
  }
  async function copyPublicUrl() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setMessage('Public QR property link copied.')
    } catch {
      setMessage('Could not copy the link. Please use the Open public page button instead.')
    }
  }
  if (!properties.length) return null
  return <section className="dashboard-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm" id="care">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8B1538]">Living property record</p><h2 className="mt-2 font-serif text-2xl font-bold text-[#1F2937]">Care, evidence and private opportunity</h2><p className="mt-2 max-w-2xl text-sm text-[#6B7280]">See what needs attention before you share a property with family or qualified buyers.</p></div><select value={selected} onChange={(event) => setSelected(event.target.value)} className="rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm">{properties.map((property) => <option key={property.id} value={property.id}>{property.title || property.city || 'Untitled property'}</option>)}</select></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-3"><div className="rounded-xl border border-[#E5E7EB] p-4"><p className="text-xs uppercase text-[#6B7280]">Readiness</p><p className="mt-2 text-lg font-bold text-[#1F2937]">{score ? readinessLabels[score.tier] : 'Building record'}</p><p className="mt-2 text-sm text-[#6B7280]">{score?.next_action || 'Refresh the record after adding evidence.'}</p>{score?.blockers?.length ? <ul className="mt-3 list-disc pl-5 text-xs text-[#8B1538]">{score.blockers.slice(0, 3).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : null}</div>
      <div className="rounded-xl border border-[#E5E7EB] p-4"><p className="text-xs uppercase text-[#6B7280]">QR opportunity marker</p><p className="mt-2 font-semibold text-[#1F2937]">{qr ? qr.status.replaceAll('_', ' ') : 'Not requested'}</p><p className="mt-2 text-sm text-[#6B7280]">Only reviewed, owner-enabled markers create a public page. Your contact details remain private.</p>{publicUrl ? <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3"><QRCodeSVG value={publicUrl} size={88} level="M" includeMargin aria-label="QR code for the public property page" /><div className="min-w-0"><p className="text-xs font-medium text-[#1F2937]">Your approved QR is ready</p><p className="mt-1 truncate text-xs text-[#6B7280]">{publicUrl}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={copyPublicUrl} className="text-xs font-semibold text-[#8B1538]">Copy link</button><a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#8B1538]">Open public page</a></div></div></div> : null}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => post('/api/property-qr', { propertyId: selected, action: 'request_review', approximateLocationLabel: current?.city || '', publicSummary: `A reviewed ${current?.verification_status === 'approved' ? 'property record' : 'property'} shared through PlotKare.` })} className="rounded-md bg-[#8B1538] px-3 py-2 text-xs font-semibold text-white">Request review</button>{qr?.status === 'active' ? <button onClick={() => post('/api/property-qr', { propertyId: selected, action: 'pause' })} className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-semibold">Pause</button> : null}</div></div>
      <div className="rounded-xl border border-[#E5E7EB] p-4"><p className="text-xs uppercase text-[#6B7280]">Qualified interest</p><p className="mt-2 text-lg font-bold text-[#1F2937]">{inbox.length} open record{inbox.length === 1 ? '' : 's'}</p><p className="mt-2 text-sm text-[#6B7280]">Enquiries, offers and guided-visit requests are kept inside PlotKare.</p>{inbox.slice(0, 2).map((interest) => <div key={interest.id} className="mt-3 border-t pt-3"><p className="text-xs capitalize text-[#4B5563]">{interest.request_type.replaceAll('_', ' ')} · {interest.status.replaceAll('_', ' ')}</p><div className="mt-2 flex gap-2"><button onClick={() => updateInterest({ requestId: interest.id, action: 'request_advisor' })} className="text-xs font-semibold text-[#8B1538]">Ask advisor</button><button onClick={() => updateInterest({ requestId: interest.id, action: 'decline' })} className="text-xs font-semibold text-[#6B7280]">Decline politely</button></div></div>)}</div></div>
    <div className="mt-6 grid gap-6 border-t pt-6 lg:grid-cols-2"><form action={(form) => post('/api/property-care', { propertyId: selected, category: form.get('category'), title: form.get('title'), description: form.get('description'), priority: form.get('priority') })} className="space-y-3"><h3 className="font-semibold text-[#1F2937]">Add a care request</h3><div className="grid grid-cols-2 gap-3"><select name="category" className="rounded-lg border p-2 text-sm"><option value="documents">Documents</option><option value="boundary">Boundary evidence</option><option value="inspection">Inspection</option><option value="tax_reminder">Tax reminder</option><option value="utility_reminder">Utility reminder</option><option value="local_issue">Local issue</option><option value="fence_signboard">Fence or signboard</option></select><select name="priority" className="rounded-lg border p-2 text-sm"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><input required name="title" placeholder="What do you need PlotKare to coordinate?" className="w-full rounded-lg border p-2 text-sm"/><textarea name="description" placeholder="Optional detail" className="w-full rounded-lg border p-2 text-sm"/><button className="rounded-md border border-[#8B1538] px-3 py-2 text-xs font-semibold text-[#8B1538]">Create care item</button></form>
      <form action={(form) => post('/api/family-access', { propertyId: selected, email: form.get('email') })} className="space-y-3"><h3 className="font-semibold text-[#1F2937]">Give family read-only access</h3><p className="text-sm text-[#6B7280]">They can view evidence and updates, but cannot change your records or handle buyer interest.</p><input required name="email" type="email" placeholder="Relative’s email address" className="w-full rounded-lg border p-2 text-sm"/><button className="rounded-md border border-[#8B1538] px-3 py-2 text-xs font-semibold text-[#8B1538]">Send view-only invite</button></form></div>
    {message ? <p role="status" className="mt-4 text-sm text-[#4B5563]">{message}</p> : null}
  </section>
}
