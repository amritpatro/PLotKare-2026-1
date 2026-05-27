import { AdminRealtimeBridge } from '@/components/realtime/admin-realtime-bridge'
import { AdminSidebar } from '@/components/admin-sidebar'
import { requirePageRole } from '@/lib/supabase/role-guard'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requirePageRole(['admin'])

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AdminRealtimeBridge userId={user.id} />
      <AdminSidebar />
      <div className="min-h-screen pb-16 md:ml-64 md:pb-0">{children}</div>
    </div>
  )
}
