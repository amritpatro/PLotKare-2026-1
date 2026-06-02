'use server'

import { logger } from '@/lib/monitoring/logger'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { notifyOperationsOfTicket } from '@/lib/support-notifications'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const propertySchema = z.object({
  propertyKind: z.enum(['plot', 'apartment']),
  title: z.string().trim().min(2),
  address: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2).default('Andhra Pradesh'),
  postalCode: z.string().trim().optional().or(z.literal('')),
  plotNumber: z.string().trim().optional().or(z.literal('')),
  sqYards: z.coerce.number().min(50).optional(),
  facing: z.enum(['East', 'West', 'North', 'South']).default('East'),
})

const serviceRequestSchema = z.object({
  propertyId: z.string().uuid(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

const amenityRequestSchema = z.object({
  plotId: z.string().uuid(),
  amenityId: z.string().trim().min(1),
})

const coordinateNumber = (min: number, max: number) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.coerce.number().min(min).max(max))

const coordinateSchema = z.object({
  plotId: z.string().uuid(),
  latitude: coordinateNumber(-90, 90),
  longitude: coordinateNumber(-180, 180),
})

const supportTicketSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal('')),
  subject: z.string().trim().min(3),
  description: z.string().trim().min(5),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

function ownerActionUrl(kind: 'success' | 'error', code: string, section = 'register') {
  const params = new URLSearchParams({ [kind]: code })
  const routeBySection: Record<string, string> = {
    register: '/owner/register',
    verification: '/owner/verification',
    documents: '/owner/documents',
    services: '/owner/services',
    support: '/owner/support',
    amenities: '/owner/amenities',
    properties: '/owner/properties',
  }
  return `${routeBySection[section] ?? '/owner'}?${params.toString()}`
}

export async function registerOwnerProperty(formData: FormData) {
  const parsed = propertySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(ownerActionUrl('error', 'invalid_property_form'))
  }

  const { user } = await requirePageRole(['land_owner', 'admin'])
  const supabase = createSupabaseAdminClient()
  let propertyId: string | null = null
  let failure: string | null = null

  try {
    const { error: ownerError } = await supabase
      .from('owners')
      .upsert({ profile_id: user.id, verification_status: 'submitted' }, { onConflict: 'profile_id' })

    if (ownerError) throw ownerError

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        owner_profile_id: user.id,
        property_kind: parsed.data.propertyKind,
        title: parsed.data.title,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        postal_code: parsed.data.postalCode || null,
        lifecycle_status: 'registered',
        verification_status: 'submitted',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (propertyError) throw propertyError
    propertyId = property.id

    if (parsed.data.propertyKind === 'plot') {
      const { error: plotError } = await supabase.from('plots').insert({
        owner_id: user.id,
        property_id: property.id,
        plot_number: parsed.data.plotNumber || parsed.data.title,
        location: parsed.data.city,
        sq_yards: parsed.data.sqYards ?? 100,
        facing: parsed.data.facing,
        corner_plot: false,
        purchase_price_lakhs: 0,
        current_value_lakhs: 0,
        status: 'registered',
        lifecycle_status: 'registered',
        verification_status: 'submitted',
      })

      if (plotError) throw plotError
    }

    await upsertVerificationRequest(supabase, {
      entityType: 'property',
      entityId: property.id,
      requesterId: user.id,
      status: 'submitted',
      priority: 'normal',
      metadata: {
        source: 'owner_property_registration',
        property_kind: parsed.data.propertyKind,
      },
    })
  } catch (error) {
    logger.error('Owner property registration failed:', error)
    failure = 'property_save_failed'
  }

  if (failure || !propertyId) {
    redirect(ownerActionUrl('error', failure ?? 'property_save_failed'))
  }

  revalidatePath('/owner')
  await recordAuditLog({
    actorId: user.id,
    action: 'owner.property_registered',
    entityType: 'property',
    entityId: propertyId,
    metadata: { propertyKind: parsed.data.propertyKind },
  })

  redirect(ownerActionUrl('success', 'property_registered', 'verification'))
}

export async function requestOwnerAmenity(formData: FormData) {
  const parsed = amenityRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(ownerActionUrl('error', 'invalid_amenity_form', 'amenities'))
  }

  const { user } = await requirePageRole(['land_owner', 'admin'])
  const supabase = createSupabaseAdminClient()
  let failure: string | null = null

  try {
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('id,owner_id')
      .eq('id', parsed.data.plotId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (plotError) throw plotError
    if (!plot) throw new Error('Plot is not attached to this owner.')

    const { error } = await supabase.from('active_amenities').upsert(
      {
        owner_id: user.id,
        plot_id: parsed.data.plotId,
        amenity_id: parsed.data.amenityId,
      },
      { onConflict: 'owner_id,plot_id,amenity_id' },
    )

    if (error) throw error
  } catch (error) {
    logger.error('Owner amenity request failed:', error)
    failure = 'amenity_request_failed'
  }

  if (failure) {
    redirect(ownerActionUrl('error', failure, 'amenities'))
  }

  revalidatePath('/owner')
  redirect(ownerActionUrl('success', 'amenity_requested', 'amenities'))
}

export async function updateOwnerPlotCoordinates(formData: FormData) {
  const parsed = coordinateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(ownerActionUrl('error', 'invalid_coordinates', 'properties'))
  }

  const { user } = await requirePageRole(['land_owner', 'admin'])
  const supabase = createSupabaseAdminClient()
  let failure: string | null = null

  try {
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('id,owner_id,property_id,plot_number')
      .eq('id', parsed.data.plotId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (plotError) throw plotError
    if (!plot) throw new Error('Plot is not attached to this owner.')

    const now = new Date().toISOString()
    const { error: plotUpdateError } = await supabase
      .from('plots')
      .update({
        target_latitude: parsed.data.latitude,
        target_longitude: parsed.data.longitude,
        coordinates_confirmed_at: now,
        coordinates_confirmed_by: user.id,
      })
      .eq('id', plot.id)
      .eq('owner_id', user.id)

    if (plotUpdateError) throw plotUpdateError

    if (plot.property_id) {
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
        })
        .eq('id', plot.property_id)
        .eq('owner_profile_id', user.id)

      if (propertyUpdateError) throw propertyUpdateError
    }

    await supabase
      .from('inspections')
      .update({
        target_latitude: parsed.data.latitude,
        target_longitude: parsed.data.longitude,
      })
      .eq('plot_id', plot.id)
      .in('status', ['requested', 'scheduled', 'in_progress', 'needs_followup'])

    await recordAuditLog({
      actorId: user.id,
      action: 'owner.plot_coordinates_saved',
      entityType: 'plot',
      entityId: plot.id,
      metadata: {
        propertyId: plot.property_id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      },
    })
  } catch (error) {
    logger.error('Owner coordinate update failed:', error)
    failure = 'coordinates_save_failed'
  }

  if (failure) {
    redirect(ownerActionUrl('error', failure, 'properties'))
  }

  revalidatePath('/owner')
  revalidatePath('/owner/properties')
  revalidatePath('/owner/verification')
  redirect(ownerActionUrl('success', 'coordinates_saved', 'properties'))
}

async function ensureOwnerProperty(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string, propertyId: string) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('id,owner_profile_id')
    .eq('id', propertyId)
    .eq('owner_profile_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!property) throw new Error('Property is not available for this owner.')

  return property
}

export async function createOwnerServiceRequest(formData: FormData) {
  const parsed = serviceRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(ownerActionUrl('error', 'invalid_service_form', 'services'))
  }

  const { user } = await requirePageRole(['land_owner', 'admin'])
  const supabase = createSupabaseAdminClient()
  let requestId: string | null = null
  let failure: string | null = null

  try {
    const property = await ensureOwnerProperty(supabase, user.id, parsed.data.propertyId)
    const { data: request, error } = await supabase
      .from('maintenance_requests')
      .insert({
        property_id: property.id,
        requester_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) throw error
    requestId = request.id
  } catch (error) {
    logger.error('Owner service request failed:', error)
    failure = 'service_request_failed'
  }

  if (failure || !requestId) {
    redirect(ownerActionUrl('error', failure ?? 'service_request_failed', 'services'))
  }

  revalidatePath('/owner')
  await recordAuditLog({
    actorId: user.id,
    action: 'owner.service_request_created',
    entityType: 'maintenance_request',
    entityId: requestId,
    metadata: { propertyId: parsed.data.propertyId },
  })

  redirect(ownerActionUrl('success', 'service_requested', 'services'))
}

export async function createOwnerSupportTicket(formData: FormData) {
  const parsed = supportTicketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(ownerActionUrl('error', 'invalid_support_form', 'support'))
  }

  const { user } = await requirePageRole(['land_owner', 'admin'])
  const supabase = createSupabaseAdminClient()
  const propertyId = parsed.data.propertyId || null
  let ticketId: string | null = null
  let failure: string | null = null

  try {
    if (propertyId) {
      await ensureOwnerProperty(supabase, user.id, propertyId)
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        requester_id: user.id,
        property_id: propertyId,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) throw error
    ticketId = ticket.id

    await notifyOperationsOfTicket(supabase, {
      ticketId: ticket.id,
      requesterId: user.id,
      subject: parsed.data.subject,
      priority: parsed.data.priority,
    })
  } catch (error) {
    logger.error('Owner support ticket failed:', error)
    failure = 'support_ticket_failed'
  }

  if (failure || !ticketId) {
    redirect(ownerActionUrl('error', failure ?? 'support_ticket_failed', 'support'))
  }

  revalidatePath('/owner')
  await recordAuditLog({
    actorId: user.id,
    action: 'owner.support_ticket_created',
    entityType: 'support_ticket',
    entityId: ticketId,
    metadata: { propertyId },
  })

  redirect(ownerActionUrl('success', 'support_ticket_created', 'support'))
}
