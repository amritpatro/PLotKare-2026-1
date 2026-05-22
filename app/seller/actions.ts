'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAuditLog } from '@/lib/audit'
import { notifyOperationsOfTicket } from '@/lib/support-notifications'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertVerificationRequest } from '@/lib/verification-requests'

const plotSchema = z.object({
  title: z.string().trim().min(2),
  plotNumber: z.string().trim().min(1),
  location: z.string().trim().min(2),
  sqYards: z.coerce.number().min(50),
  facing: z.enum(['East', 'West', 'North', 'South']),
  priceLakhs: z.coerce.number().min(0).default(0),
})

const customerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().min(6).optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  propertyId: z.string().uuid(),
  registrationDate: z.string().optional().or(z.literal('')),
})

const serviceRequestSchema = z.object({
  propertyId: z.string().uuid(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

const supportTicketSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal('')),
  subject: z.string().trim().min(3),
  description: z.string().trim().min(5),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

function sellerActionUrl(kind: 'success' | 'error', code: string, section = 'plots') {
  const params = new URLSearchParams({ [kind]: code })
  const routeBySection: Record<string, string> = {
    plots: '/seller/plots',
    customers: '/seller/customers',
    services: '/seller/services',
    support: '/seller/support',
    notifications: '/seller/notifications',
    documents: '/seller/documents',
  }
  return `${routeBySection[section] ?? '/seller'}?${params.toString()}`
}

async function getSellerRecord() {
  const { user } = await requirePageRole(['plot_seller', 'admin'])
  const supabase = createSupabaseAdminClient()

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id,profile_id,company_name')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!seller) throw new Error('Seller profile is not ready yet.')

  return { supabase, user, seller }
}

export async function createSellerPlot(formData: FormData) {
  const parsed = plotSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(sellerActionUrl('error', 'invalid_plot_form'))
  }

  let userId: string | null = null
  let sellerId: string | null = null
  let propertyId: string | null = null
  let plotId: string | null = null
  let failure: string | null = null

  try {
    const { supabase, user, seller } = await getSellerRecord()
    userId = user.id
    sellerId = seller.id

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        owner_profile_id: user.id,
        seller_id: seller.id,
        property_kind: 'plot',
        title: parsed.data.title,
        address: parsed.data.location,
        lifecycle_status: 'available',
        verification_status: 'submitted',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (propertyError) throw propertyError
    propertyId = property.id

    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .insert({
        owner_id: user.id,
        property_id: property.id,
        seller_id: seller.id,
        plot_number: parsed.data.plotNumber,
        location: parsed.data.location,
        sq_yards: parsed.data.sqYards,
        facing: parsed.data.facing,
        corner_plot: false,
        purchase_price_lakhs: 0,
        current_value_lakhs: parsed.data.priceLakhs,
        status: 'available',
        lifecycle_status: 'available',
        verification_status: 'submitted',
      })
      .select('id')
      .single()

    if (plotError) throw plotError
    plotId = plot.id

    await upsertVerificationRequest(supabase, {
      entityType: 'property',
      entityId: property.id,
      requesterId: user.id,
      status: 'submitted',
      priority: 'normal',
      metadata: {
        source: 'seller_plot_creation',
        seller_id: seller.id,
        plot_id: plot.id,
      },
    })
  } catch (error) {
    console.error('Seller plot creation failed:', error)
    failure = error instanceof Error && error.message === 'Seller profile is not ready yet.'
      ? 'seller_profile_missing'
      : 'plot_save_failed'
  }

  if (failure || !plotId || !propertyId || !userId || !sellerId) {
    redirect(sellerActionUrl('error', failure ?? 'plot_save_failed'))
  }

  revalidatePath('/seller')
  await recordAuditLog({
    actorId: userId,
    action: 'seller.plot_created',
    entityType: 'plot',
    entityId: plotId,
    metadata: { propertyId, sellerId },
  })

  redirect(sellerActionUrl('success', 'plot_created', 'plots'))
}

export async function addSoldCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(sellerActionUrl('error', 'invalid_customer_form', 'customers'))
  }

  let userId: string | null = null
  let sellerId: string | null = null
  let customerId: string | null = null
  let failure: string | null = null

  try {
    const { supabase, user, seller } = await getSellerRecord()
    userId = user.id
    sellerId = seller.id

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id,seller_id,lifecycle_status')
      .eq('id', parsed.data.propertyId)
      .eq('seller_id', seller.id)
      .maybeSingle()

    if (propertyError) throw propertyError
    if (!property) throw new Error('Property is not available for this seller.')

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        created_by_seller_id: seller.id,
        full_name: parsed.data.fullName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        account_status: 'pending',
        kyc_status: 'submitted',
      })
      .select('id')
      .single()

    if (customerError) throw customerError
    customerId = customer.id

    const { error: linkError } = await supabase.from('customer_property_links').insert({
      customer_id: customer.id,
      property_id: parsed.data.propertyId,
      seller_id: seller.id,
      relationship_type: 'buyer',
      status: 'pending',
      registration_date: parsed.data.registrationDate || null,
      created_by: user.id,
    })

    if (linkError) throw linkError

    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({ current_customer_id: customer.id, lifecycle_status: 'sold' })
      .eq('id', parsed.data.propertyId)

    if (propertyUpdateError) throw propertyUpdateError

    const { error: plotUpdateError } = await supabase
      .from('plots')
      .update({ sold_customer_id: customer.id, lifecycle_status: 'sold', status: 'sold', sold_at: new Date().toISOString() })
      .eq('property_id', parsed.data.propertyId)

    if (plotUpdateError) throw plotUpdateError
  } catch (error) {
    console.error('Seller customer link failed:', error)
    failure = error instanceof Error && error.message === 'Seller profile is not ready yet.'
      ? 'seller_profile_missing'
      : 'customer_link_failed'
  }

  if (failure || !customerId || !userId || !sellerId) {
    redirect(sellerActionUrl('error', failure ?? 'customer_link_failed', 'customers'))
  }

  revalidatePath('/seller')
  await recordAuditLog({
    actorId: userId,
    action: 'seller.customer_linked',
    entityType: 'customer',
    entityId: customerId,
    metadata: { propertyId: parsed.data.propertyId, sellerId },
  })

  redirect(sellerActionUrl('success', 'customer_linked', 'customers'))
}

export async function createSellerServiceRequest(formData: FormData) {
  const parsed = serviceRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(sellerActionUrl('error', 'invalid_service_form', 'services'))
  }

  let userId: string | null = null
  let sellerId: string | null = null
  let requestId: string | null = null
  let failure: string | null = null

  try {
    const { supabase, user, seller } = await getSellerRecord()
    userId = user.id
    sellerId = seller.id

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id,seller_id')
      .eq('id', parsed.data.propertyId)
      .eq('seller_id', seller.id)
      .maybeSingle()

    if (propertyError) throw propertyError
    if (!property) throw new Error('Property is not available for this seller.')

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
    console.error('Seller service request failed:', error)
    failure = error instanceof Error && error.message === 'Seller profile is not ready yet.'
      ? 'seller_profile_missing'
      : 'service_request_failed'
  }

  if (failure || !requestId || !userId || !sellerId) {
    redirect(sellerActionUrl('error', failure ?? 'service_request_failed', 'services'))
  }

  revalidatePath('/seller')
  await recordAuditLog({
    actorId: userId,
    action: 'seller.service_request_created',
    entityType: 'maintenance_request',
    entityId: requestId,
    metadata: { sellerId, propertyId: parsed.data.propertyId },
  })

  redirect(sellerActionUrl('success', 'service_requested', 'services'))
}

export async function createSellerSupportTicket(formData: FormData) {
  const parsed = supportTicketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(sellerActionUrl('error', 'invalid_support_form', 'support'))
  }

  let userId: string | null = null
  let sellerId: string | null = null
  let ticketId: string | null = null
  const propertyId = parsed.data.propertyId || null
  let failure: string | null = null

  try {
    const { supabase, user, seller } = await getSellerRecord()
    userId = user.id
    sellerId = seller.id

    if (propertyId) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id,seller_id')
        .eq('id', propertyId)
        .eq('seller_id', seller.id)
        .maybeSingle()

      if (propertyError) throw propertyError
      if (!property) throw new Error('Property is not available for this seller.')
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
    console.error('Seller support ticket failed:', error)
    failure = error instanceof Error && error.message === 'Seller profile is not ready yet.'
      ? 'seller_profile_missing'
      : 'support_ticket_failed'
  }

  if (failure || !ticketId || !userId || !sellerId) {
    redirect(sellerActionUrl('error', failure ?? 'support_ticket_failed', 'support'))
  }

  revalidatePath('/seller')
  await recordAuditLog({
    actorId: userId,
    action: 'seller.support_ticket_created',
    entityType: 'support_ticket',
    entityId: ticketId,
    metadata: { propertyId, sellerId },
  })

  redirect(sellerActionUrl('success', 'support_ticket_created', 'support'))
}
