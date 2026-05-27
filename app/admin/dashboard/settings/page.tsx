import { SettingsPageContent } from '@/components/settings/settings-page-content'

export default function AdminSettingsPage() {
  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <SettingsPageContent mode="admin" />
    </div>
  )
}
