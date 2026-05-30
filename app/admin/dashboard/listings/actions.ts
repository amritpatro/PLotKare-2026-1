'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminContext } from '@/lib/api/auth'

export async function archiveListing(formData: FormData) {
  const listingId = String(formData.get('listingId') || '').trim()
  if (!listingId) throw new Error('Missing listing ID.')

  const context = await requireAdminContext()
  if ('response' in context) throw new Error('Admin access required.')

  const { error } = await context.supabase
    .from('listings')
    .update({ status: 'archived', is_published: false })
    .eq('id', listingId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath('/')
  // server actions should return void; throwing on error surfaces failures
  return
}
