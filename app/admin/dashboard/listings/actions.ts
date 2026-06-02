'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminContext } from '@/lib/api/auth'
import { recordAuditLog } from '@/lib/audit'

export async function archiveListing(formData: FormData) {
  const listingId = String(formData.get('listingId') || '').trim()
  if (!listingId) throw new Error('Missing listing ID.')

  const context = await requireAdminContext()
  if ('response' in context) throw new Error('Admin access required.')

  const { error } = await context.supabase
    .from('listings')
    .update({ status: 'archived', is_published: false, archived_at: new Date().toISOString(), archived_by: context.user.id })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  await recordAuditLog({
    actorId: context.user.id,
    action: 'admin.listing_archived',
    entityType: 'listing',
    entityId: listingId,
  })

  revalidatePath('/admin/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath('/')
  // server actions should return void; throwing on error surfaces failures
  return
}
