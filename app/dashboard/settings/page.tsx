import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { SettingsPageContent } from '@/components/settings/settings-page-content'

export default function DashboardSettingsPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Settings" />
        <div className="px-8 pb-12 pt-24">
          <SettingsPageContent mode="dashboard" />
        </div>
      </div>
    </div>
  )
}
