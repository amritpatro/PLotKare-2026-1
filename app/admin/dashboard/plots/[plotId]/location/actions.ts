'use server'

import { logger } from '@/lib/monitoring/logger'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { reverseGeocodeLabel } from '@/lib/maps/reverse-geocode'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const coordinateNumber = (min: number, max: number) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.coerce.number().min(min).max(max))

const verifySchema = z.object({
  plotId: z.string().uuid(),
  latitude: coordinateNumber(12, 20),
  longitude: coordinateNumber(76, 85.5),
  adjusted: z.coerce.boolean().optional().default(false),
})

const rejectSchema = z.object({
  plotId: z.string().uuid(),
  note: z.string().trim().min(5).max(600),
})

function plotsRedirect(kind: 'success' | 'error', code: string): never {
  redirect(`/admin/dashboard/plots?${kind}=${code}`)
}

function googleMapsNavigationUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

export async function verifyPlotLocation(formData: FormData) {
  const parsed = verifySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) plotsRedirect('error', 'invalid_location_review')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,owner_id,property_id,plot_number,location,submitted_latitude,submitted_longitude,location_source,location_submitted_at,target_place_label')
    .eq('id', parsed.data.plotId)
    .maybeSingle()

  if (plotError || !plot) {
    logger.error('Plot location verification lookup failed:', plotError)
    plotsRedirect('error', 'location_review_failed')
  }

  const submittedLatitude = Number(plot.submitted_latitude)
  const submittedLongitude = Number(plot.submitted_longitude)
  if (!Number.isFinite(submittedLatitude) || !Number.isFinite(submittedLongitude)) {
    plotsRedirect('error', 'submitted_location_required')
  }

  const adjusted =
    parsed.data.adjusted ||
    Math.abs(submittedLatitude - parsed.data.latitude) > 0.000001 ||
    Math.abs(submittedLongitude - parsed.data.longitude) > 0.000001
  const now = new Date().toISOString()
  const targetPlaceLabel =
    (await reverseGeocodeLabel(parsed.data.latitude, parsed.data.longitude)) || plot.target_place_label || plot.location || null

  const { error: plotUpdateError } = await supabase
    .from('plots')
    .update({
      target_latitude: parsed.data.latitude,
      target_longitude: parsed.data.longitude,
      target_place_label: targetPlaceLabel,
      coordinates_confirmed_at: now,
      coordinates_confirmed_by: user.id,
      location_status: 'verified',
      location_note: adjusted ? 'Admin adjusted the pin before verification.' : null,
      location_verified_at: now,
      location_verified_by: user.id,
      location_adjusted_by_admin: adjusted,
      location_source: plot.location_source || 'owner_manual',
      location_submitted_at: plot.location_submitted_at || now,
      google_maps_link: googleMapsNavigationUrl(parsed.data.latitude, parsed.data.longitude),
    })
    .eq('id', plot.id)

  if (plotUpdateError) {
    logger.error('Plot location verification update failed:', plotUpdateError)
    plotsRedirect('error', 'location_review_failed')
  }

  if (plot.property_id) {
    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        coordinates_confirmed_at: now,
        coordinates_confirmed_by: user.id,
        coordinates_source: 'admin_verified',
      })
      .eq('id', plot.property_id)

    if (propertyUpdateError) {
      logger.error('Property location mirror update failed:', propertyUpdateError)
      plotsRedirect('error', 'location_review_failed')
    }
  }

  await supabase
    .from('inspections')
    .update({
      target_latitude: parsed.data.latitude,
      target_longitude: parsed.data.longitude,
      target_place_label: targetPlaceLabel,
      proximity_radius_meters: 50,
    })
    .eq('plot_id', plot.id)
    .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])

  await supabase.from('notifications').insert({
    recipient_id: plot.owner_id,
    actor_id: user.id,
    title: 'Plot location verified',
    message: `${plot.plot_number || 'Your plot'} GPS pin is verified and ready for field inspections.`,
    category: 'location',
    metadata: {
      plot_id: plot.id,
      property_id: plot.property_id,
      adjusted,
    },
    link_path: '/owner/properties',
  })

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.plot_location_verified',
    entityType: 'plot',
    entityId: plot.id,
    metadata: {
      propertyId: plot.property_id,
      adjusted,
      source: plot.location_source || 'owner_manual',
    },
  })

  revalidatePath('/admin/dashboard/plots')
  revalidatePath(`/admin/dashboard/plots/${plot.id}/location`)
  revalidatePath('/admin/dashboard/inspection-reports')
  revalidatePath('/owner')
  revalidatePath('/owner/properties')
  revalidatePath('/agent')
  plotsRedirect('success', 'location_verified')
}

export async function rejectPlotLocation(formData: FormData) {
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) plotsRedirect('error', 'invalid_rejection_note')

  const { user } = await requirePageRole(['admin'])
  const supabase = createSupabaseAdminClient()

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('id,owner_id,property_id,plot_number')
    .eq('id', parsed.data.plotId)
    .maybeSingle()

  if (plotError || !plot) {
    logger.error('Plot location rejection lookup failed:', plotError)
    plotsRedirect('error', 'location_review_failed')
  }

  const { error: updateError } = await supabase
    .from('plots')
    .update({
      location_status: 'rejected',
      location_note: parsed.data.note,
      location_verified_at: null,
      location_verified_by: null,
      location_adjusted_by_admin: false,
      google_maps_link: null,
    })
    .eq('id', plot.id)

  if (updateError) {
    logger.error('Plot location rejection update failed:', updateError)
    plotsRedirect('error', 'location_review_failed')
  }

  await supabase.from('notifications').insert({
    recipient_id: plot.owner_id,
    actor_id: user.id,
    title: 'Plot location needs correction',
    message: `${plot.plot_number || 'Your plot'} GPS pin was rejected. Please resubmit with a clearer point and landmark.`,
    category: 'location',
    metadata: {
      plot_id: plot.id,
      property_id: plot.property_id,
    },
    link_path: '/owner/properties',
  })

  await recordAuditLog({
    actorId: user.id,
    action: 'admin.plot_location_rejected',
    entityType: 'plot',
    entityId: plot.id,
    metadata: {
      propertyId: plot.property_id,
      noteLength: parsed.data.note.length,
    },
  })

  revalidatePath('/admin/dashboard/plots')
  revalidatePath(`/admin/dashboard/plots/${plot.id}/location`)
  revalidatePath('/owner')
  revalidatePath('/owner/properties')
  plotsRedirect('success', 'location_rejected')
}
