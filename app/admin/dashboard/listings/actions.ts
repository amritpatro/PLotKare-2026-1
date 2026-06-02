'use server'

import { logger } from '@/lib/monitoring/logger'
import { revalidatePath } from 'next/cache'
import { requireAdminContext } from '@/lib/api/auth'
import { recordAuditLog } from '@/lib/audit'

export async function archiveListing(listingId: string) {
  const id = listingId.trim()
  if (!id) return { ok: false, message: 'Missing listing ID.' }

  const context = await requireAdminContext()
  if ('response' in context) return { ok: false, message: 'Admin access required.' }

  const { data: updatedListing, error } = await context.supabase
    .from('listings')
    .update({ status: 'archived', is_published: false, archived_at: new Date().toISOString(), archived_by: context.user.id })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !updatedListing) {
    logger.error('Admin listing archive failed:', error)
    return { ok: false, message: 'Listing could not be archived. Please try again.' }
  }

  await recordAuditLog({
    actorId: context.user.id,
    action: 'admin.listing_archived',
    entityType: 'listing',
    entityId: id,
  })

  revalidatePath('/admin/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath('/')
  return { ok: true, message: 'Listing archived and removed from the public marketplace.' }
}
