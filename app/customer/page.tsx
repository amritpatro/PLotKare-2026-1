import { CustomerWorkspace } from '@/components/customer/customer-workspace'
import { RoleDashboardShell } from '@/components/role-dashboard-shell'
import { getCustomerWorkspaceData } from '@/lib/customer-workspace/data'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BuyerInterestSummary } from '@/components/property-care/buyer-interest-summary'

type CustomerDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function CustomerDashboardPage({ searchParams }: CustomerDashboardPageProps) {
  const { user, profile } = await requirePageRole(['customer', 'admin'])
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}
  const data = await getCustomerWorkspaceData(supabase, user.id)
  const { data: propertyInterests } = await supabase
    .from('property_interest_requests')
    .select('id,property_id,request_type,status,created_at')
    .eq('buyer_profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)
  const profileLabel = profile.full_name || profile.email

  return (
    <RoleDashboardShell
      role="customer"
      title="Buyer workspace"
      subtitle="Browse listings, save opportunities, request visits, and manage linked property services."
      userLabel={profileLabel}
      avatarUrl={profile.avatar_path}
      userId={user.id}
    >
      <BuyerInterestSummary interests={(propertyInterests ?? []) as any} />
      <CustomerWorkspace
        data={data}
        profileLabel={profileLabel}
        successCode={getParam(params, 'success') as never}
        errorCode={getParam(params, 'error') as never}
      />
    </RoleDashboardShell>
  )
}
