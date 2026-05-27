import type { SupabaseClient } from '@supabase/supabase-js'

type VerificationEntityType = 'property' | 'seller' | 'owner' | 'customer' | 'document' | 'property_link_request'

type VerificationRequestInput = {
  entityType: VerificationEntityType
  entityId: string
  requesterId?: string | null
  assignedEmployeeId?: string | null
  status?: string
  priority?: string
  dueAt?: string | null
  escalationLevel?: number
  adminNotes?: string | null
  metadata?: Record<string, unknown>
}

function isMissingWorkflowTable(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.toLowerCase().includes('verification_requests') === true
  )
}

export async function upsertVerificationRequest(
  supabase: SupabaseClient,
  input: VerificationRequestInput,
) {
  const { data: existing, error: existingError } = await supabase
    .from('verification_requests')
    .select('id,requester_id,metadata')
    .eq('entity_type', input.entityType)
    .eq('entity_id', input.entityId)
    .maybeSingle()

  if (existingError) {
    if (isMissingWorkflowTable(existingError)) return null
    throw existingError
  }

  const payload = {
    entity_type: input.entityType,
    entity_id: input.entityId,
    requester_id: input.requesterId ?? existing?.requester_id ?? null,
    assigned_employee_id: input.assignedEmployeeId ?? null,
    status: input.status ?? 'submitted',
    priority: input.priority ?? 'normal',
    due_at: input.dueAt ?? null,
    escalation_level: input.escalationLevel ?? 0,
    admin_notes: input.adminNotes ?? null,
    metadata: {
      ...(typeof existing?.metadata === 'object' && existing.metadata ? existing.metadata : {}),
      ...(input.metadata ?? {}),
    },
  }

  if (existing) {
    const { error } = await supabase.from('verification_requests').update(payload).eq('id', existing.id)
    if (isMissingWorkflowTable(error)) return null
    if (error) throw error
    return existing.id as string
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .insert(payload)
    .select('id')
    .single()

  if (isMissingWorkflowTable(error)) return null
  if (error) throw error
  return data.id as string
}
