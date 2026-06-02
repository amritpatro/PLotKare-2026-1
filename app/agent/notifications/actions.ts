'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const notificationSchema = z.object({
  notificationId: z.string().uuid(),
})

export async function markAgentNotificationRead(formData: FormData) {
  const parsed = notificationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  const agent = await requireFieldAgentPage()
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true })
    .eq('id', parsed.data.notificationId)
    .eq('recipient_id', agent.userId)

  revalidatePath('/agent/notifications')
}
