import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type AuditInput = {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}

export async function recordAuditLog(input: AuditInput) {
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('audit_logs').insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
  } catch {
    // Audit logging should never break the customer-facing action.
  }
}
