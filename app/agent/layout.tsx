import type { Metadata } from 'next'
import { AgentShell } from '@/components/agent/agent-shell'
import { requireFieldAgentPage } from '@/lib/supabase/role-guard'

export const metadata: Metadata = {
  title: 'Field Inspections | PlotKare',
  robots: { index: false, follow: false },
}

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireFieldAgentPage()
  return (
    <AgentShell userLabel={profile.full_name || profile.email || 'Field agent'} avatarUrl={profile.avatar_path} userId={user.id}>
      {children}
    </AgentShell>
  )
}
