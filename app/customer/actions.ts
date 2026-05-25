'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { notifyOperationsOfTicket } from '@/lib/support-notifications'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const listingIdSchema = z.object({
  listingId: z.string().uuid(),
})

const inquirySchema = listingIdSchema.extend({
  message: z.string().trim().min(10).max(800),
})

const siteVisitSchema = listingIdSchema.extend({
  preferredDate: z.string().trim().min(1),
  notes: z.string().trim().max(600).optional().or(z.literal('')),
})

const supportTicketSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal('')),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(1200),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

const amenityRequestSchema = z.object({
  propertyId: z.string().uuid(),
  amenityId: z.string().trim().min(1),
})

type ActionKind = 'success' | 'error'

function actionUrl(kind: ActionKind, code: string, section: string) {
  const params = new URLSearchParams({ [kind]: code })
  const routeBySection: Record<string, string> = {
    'browse-listings': '/customer/listings',
    'saved-listings': '/customer/saved',
    inquiries: '/customer/inquiries',
    'site-visits': '/customer/site-visits',
    amenities: '/customer/amenities',
    documents: '/customer/documents',
    support: '/customer/support',
  }
  return `${routeBySection[section] ?? '/customer'}?${params.toString()}`
}

function isMarketplaceSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') ||
    error.message?.toLowerCase().includes('does not exist')
  )
}

async function getCustomerActionContext() {
  const { user } = await requirePageRole(['customer', 'admin'])
  const supabase = await createSupabaseServerClient()
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw error
  return { supabase, user, customerId: customer?.id ?? null }
}

async function ensureActiveListing(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('id,status,approval_status,is_published')
    .eq('id', listingId)
    .eq('status', 'Active')
    .eq('approval_status', 'approved')
    .eq('is_published', true)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Listing is not available.')
}

export async function saveListing(formData: FormData) {
  const parsed = listingIdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_listing', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const { data: existing, error: existingError } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('buyer_profile_id', user.id)
      .eq('listing_id', parsed.data.listingId)
      .maybeSingle()

    if (existingError && !isMarketplaceSchemaMissing(existingError)) throw existingError
    if (existingError && isMarketplaceSchemaMissing(existingError)) {
      failure = 'marketplace_schema_pending'
    }

    if (!failure && !existing) {
      const { error } = await supabase.from('saved_listings').insert({
        buyer_profile_id: user.id,
        customer_id: customerId,
        listing_id: parsed.data.listingId,
      })

      if (error) throw error
    }
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'save_failed'
    console.error('Customer save listing failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'listing_saved', 'saved-listings'))
}

export async function unsaveListing(formData: FormData) {
  const parsed = listingIdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_listing', 'saved-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user } = await getCustomerActionContext()
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('buyer_profile_id', user.id)
      .eq('listing_id', parsed.data.listingId)

    if (error) throw error
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'unsave_failed'
    console.error('Customer unsave listing failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'saved-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'listing_unsaved', 'saved-listings'))
}

export async function createListingInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_inquiry', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const { error } = await supabase.from('listing_inquiries').insert({
      buyer_profile_id: user.id,
      customer_id: customerId,
      listing_id: parsed.data.listingId,
      message: parsed.data.message,
      status: 'new',
    })

    if (error) throw error
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'inquiry_failed'
    console.error('Customer inquiry creation failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'inquiry_created', 'inquiries'))
}

export async function createSiteVisitRequest(formData: FormData) {
  const parsed = siteVisitSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_site_visit', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const preferredDate = new Date(parsed.data.preferredDate)
    if (Number.isNaN(preferredDate.getTime())) {
      failure = 'invalid_site_visit'
    }

    if (!failure) {
      const { error } = await supabase.from('site_visit_requests').insert({
        buyer_profile_id: user.id,
        customer_id: customerId,
        listing_id: parsed.data.listingId,
        scheduled_for: preferredDate.toISOString(),
        preferred_window: parsed.data.preferredDate,
        notes: parsed.data.notes || null,
        status: 'requested',
      })

      if (error) throw error
    }
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'site_visit_failed'
    console.error('Customer site visit request failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'site_visit_created', 'site-visits'))
}

export async function createCustomerSupportTicket(formData: FormData) {
  const parsed = supportTicketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_support_form', 'support'))
  }

  let failure: string | null = null
  let ticketId: string | null = null
  const propertyId = parsed.data.propertyId || null

  try {
    const { user, customerId } = await getCustomerActionContext()
    const supabase = createSupabaseAdminClient()

    if (propertyId) {
      const { data: link, error: linkError } = await supabase
        .from('customer_property_links')
        .select('id')
        .eq('property_id', propertyId)
        .or(`customer_id.eq.${customerId ?? '00000000-0000-0000-0000-000000000000'},created_by.eq.${user.id}`)
        .maybeSingle()

      if (linkError) throw linkError
      if (!link) throw new Error('Property is not linked to this customer account.')
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        requester_id: user.id,
        customer_id: customerId,
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

    await recordAuditLog({
      actorId: user.id,
      action: 'customer.support_ticket_created',
      entityType: 'support_ticket',
      entityId: ticketId,
      metadata: { propertyId, customerId },
    })
  } catch (error) {
    console.error('Customer support ticket failed:', error)
    failure = 'support_ticket_failed'
  }

  if (failure || !ticketId) {
    redirect(actionUrl('error', failure ?? 'support_ticket_failed', 'support'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'support_ticket_created', 'support'))
}

export async function requestCustomerAmenity(formData: FormData) {
  const parsed = amenityRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_amenity_form', 'amenities'))
  }

  let failure: string | null = null

  try {
    const { user, customerId } = await getCustomerActionContext()
    const supabase = createSupabaseAdminClient()

    const { data: link, error: linkError } = await supabase
      .from('customer_property_links')
      .select('property_id')
      .eq('property_id', parsed.data.propertyId)
      .eq('customer_id', customerId ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle()

    if (linkError) throw linkError
    if (!link) throw new Error('Property is not linked to this customer.')

    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('id')
      .eq('property_id', parsed.data.propertyId)
      .maybeSingle()

    if (plotError) throw plotError
    if (!plot) throw new Error('This property does not have a plot record for amenities.')

    const { error } = await supabase.from('active_amenities').upsert(
      {
        owner_id: user.id,
        plot_id: plot.id,
        amenity_id: parsed.data.amenityId,
      },
      { onConflict: 'owner_id,plot_id,amenity_id' },
    )

    if (error) throw error

    await recordAuditLog({
      actorId: user.id,
      action: 'customer.amenity_requested',
      entityType: 'active_amenity',
      metadata: { propertyId: parsed.data.propertyId, amenityId: parsed.data.amenityId, customerId },
    })
  } catch (error) {
    console.error('Customer amenity request failed:', error)
    failure = 'amenity_request_failed'
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'amenities'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'amenity_requested', 'amenities'))
}
