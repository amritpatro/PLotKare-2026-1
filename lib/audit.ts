import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/monitoring/logger'

type AuditInput = {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}

const REDACTED = '[redacted]'
const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|api[_-]?key|jwt|signed.?url|url|object.?path|file.?path|report.?path|aadhaar|aadhar|pan|bank|account|ifsc|phone|mobile|email|note|reason|message|description|summary|body|comment/i

const SENSITIVE_TEXT =
  /https?:\/\/|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b[A-Z]{5}[0-9]{4}[A-Z]\b|\b\d{12}\b|\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/i

const SAFE_AUDIT_SIGNAL_KEY = /_(present|length|count)$/i

function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') {
    if (SENSITIVE_TEXT.test(value)) return REDACTED
    if (/https?:\/\//i.test(value)) return REDACTED
    return value.length > 600 ? `${value.slice(0, 600)}...[truncated]` : value
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactAuditValue(item, depth + 1))

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) && !SAFE_AUDIT_SIGNAL_KEY.test(key) ? REDACTED : redactAuditValue(item, depth + 1),
    ]),
  )
}

export function redactAuditMetadata(metadata: Record<string, unknown> = {}) {
  return redactAuditValue(metadata) as Record<string, unknown>
}

export async function recordAuditLog(input: AuditInput) {
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('audit_logs').insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: redactAuditMetadata(input.metadata),
    })
  } catch (error) {
    logger.error('Audit log write failed', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    })
    // Audit logging should never break the customer-facing action.
  }
}
