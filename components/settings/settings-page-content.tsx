import { loadSettingsData } from '@/app/settings/actions'
import { SettingsWorkspace } from './settings-workspace'

type SettingsPageContentProps = {
  mode?: 'standalone' | 'dashboard' | 'admin'
}

export async function SettingsPageContent({ mode = 'standalone' }: SettingsPageContentProps) {
  const data = await loadSettingsData()
  return <SettingsWorkspace initialData={data as unknown as Parameters<typeof SettingsWorkspace>[0]['initialData']} mode={mode} />
}
