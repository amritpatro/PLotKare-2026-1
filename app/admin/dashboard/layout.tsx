import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AdminSidebar />
      <div className="ml-64 min-h-screen">{children}</div>
    </div>
  )
}
