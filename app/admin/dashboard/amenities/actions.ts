'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AMENITY_CATALOG } from '@/lib/amenity-catalog'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const amenityToggleSchema = z.object({
  amenityId: z.string().min(1),
  nextActive: z.enum(['true', 'false']),
})

export async function toggleAmenityAvailability(formData: FormData) {
  const parsed = amenityToggleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  const { user } = await requirePageRole(['admin'])
  const catalogItem = AMENITY_CATALOG.find((item) => item.id === parsed.data.amenityId)
  if (!catalogItem) return

  const supabase = createSupabaseAdminClient()
  const active = parsed.data.nextActive === 'true'

  const { error } = await supabase.from('amenities').upsert(
    {
      id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      kind: catalogItem.kind,
      amount: catalogItem.amount,
      image_path: catalogItem.image,
      active,
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('Admin amenity toggle failed:', error)
    return
  }

  await recordAuditLog({
    actorId: user.id,
    action: active ? 'admin.amenity_enabled' : 'admin.amenity_disabled',
    entityType: 'amenity',
    metadata: { amenityId: catalogItem.id, active },
  })

  revalidatePath('/admin/dashboard/amenities')
}
