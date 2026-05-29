import { MapPin, ShieldCheck, Smartphone } from 'lucide-react'
import { requireFieldAgentPage } from '@/lib/supabase/role-guard'

const card = 'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'

export default async function AgentProfilePage() {
  const { profile, employee } = await requireFieldAgentPage()
  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#C9A962]">Field identity</p>
        <h1 className="mt-3 font-serif text-3xl font-bold">{profile.full_name || profile.email}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Active PlotKare field inspection access.</p>
      </section>
      <section className={`${card} space-y-4`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-[#C0392B]" />
          <div><p className="text-sm font-semibold">Role</p><p className="text-sm text-[#6B7280]">Field inspection agent</p></div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-[#C0392B]" />
          <div><p className="text-sm font-semibold">Assigned corridor</p><p className="text-sm text-[#6B7280]">{employee.assigned_corridor || 'Assigned per inspection'}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-[#C0392B]" />
          <div><p className="text-sm font-semibold">Offline capture</p><p className="text-sm text-[#6B7280]">Evidence saved on this device syncs when online while the app is open.</p></div>
        </div>
      </section>
    </div>
  )
}
