import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { requireRoleContext } from '@/lib/api/auth'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { getSiteUrl } from '@/lib/site-config'
import { hasTransactionalEmailConfiguration, sendTransactionalEmail } from '@/lib/email/resend'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const inviteSchema = z.object({ propertyId: z.string().uuid(), email: z.string().trim().email().max(254) })
const revokeSchema = z.object({ grantId: z.string().uuid() })
const acceptSchema = z.object({ token: z.string().min(32).max(128) })
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function POST(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  const parsed = inviteSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: property } = await context.supabase.from('properties').select('id,owner_profile_id,title').eq('id', parsed.data.propertyId).maybeSingle()
  if (!property || (!context.isAdmin && property.owner_profile_id !== context.user.id)) return apiError('You cannot share this property.', 403, 'FORBIDDEN')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: grant, error } = await context.supabase.from('property_family_grants').upsert({
    property_id: property.id, invited_by: context.user.id, invited_email: parsed.data.email.toLowerCase(), token_hash: hashToken(token), status: 'pending', expires_at: expiresAt,
  }, { onConflict: 'property_id,invited_email' }).select('id').single()
  if (error || !grant) return apiError('Could not create the family invitation.', 400, 'FAMILY_INVITE_FAILED')
  const url = `${getSiteUrl()}/family/access?token=${token}`
  if (hasTransactionalEmailConfiguration()) await sendTransactionalEmail({ to: parsed.data.email, subject: `View ${property.title || 'a property'} on PlotKare`, text: `You have been invited to view a PlotKare property record. This view-only link expires in 7 days: ${url}`, html: `<p>You have been invited to view a PlotKare property record. This view-only link expires in 7 days.</p><p><a href="${url}">View property record</a></p>` })
  await recordAuditLog({ actorId: context.user.id, action: 'family_access.invited', entityType: 'property_family_grant', entityId: grant.id, metadata: { propertyId: property.id } })
  return apiOk({ grantId: grant.id, expiresAt, delivery: hasTransactionalEmailConfiguration() ? 'email_sent' : 'email_not_configured', shareUrl: url })
}

export async function PATCH(request: Request) {
  const context = await requireRoleContext(['land_owner', 'admin'])
  if ('response' in context) return context.response
  const parsed = revokeSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const { data: grant } = await context.supabase.from('property_family_grants').select('id,invited_by').eq('id', parsed.data.grantId).maybeSingle()
  if (!grant || (!context.isAdmin && grant.invited_by !== context.user.id)) return apiError('Invitation not found.', 404, 'NOT_FOUND')
  await context.supabase.from('property_family_grants').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', grant.id)
  await recordAuditLog({ actorId: context.user.id, action: 'family_access.revoked', entityType: 'property_family_grant', entityId: grant.id })
  return apiOk({ revoked: true })
}

export async function PUT(request: Request) {
  const context = await requireRoleContext(['user', 'land_owner', 'customer', 'plot_seller', 'employee', 'admin'])
  if ('response' in context) return context.response
  const parsed = acceptSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)
  const admin = createSupabaseAdminClient()
  const { data: grant } = await admin.from('property_family_grants').select('id,invited_email,status,expires_at').eq('token_hash', hashToken(parsed.data.token)).maybeSingle()
  if (!grant || grant.status !== 'pending' || new Date(grant.expires_at).getTime() < Date.now() || grant.invited_email.toLowerCase() !== context.profile.email.toLowerCase()) return apiError('This family link is invalid, expired, or for another account.', 403, 'FORBIDDEN')
  await admin.from('property_family_grants').update({ status: 'active', viewer_profile_id: context.user.id, accepted_at: new Date().toISOString() }).eq('id', grant.id)
  await recordAuditLog({ actorId: context.user.id, action: 'family_access.accepted', entityType: 'property_family_grant', entityId: grant.id })
  return apiOk({ accepted: true })
}
