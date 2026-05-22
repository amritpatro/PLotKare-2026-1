import { AdminSidebar } from '@/components/admin-sidebar'
import { requirePageRole } from '@/lib/supabase/role-guard'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePageRole(['admin'])

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AdminSidebar />
      <div className="ml-64 min-h-screen">{children}</div>
    </div>
  )
}
