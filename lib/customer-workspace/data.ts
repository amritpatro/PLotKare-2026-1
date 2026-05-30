import type {
  CustomerWorkspaceData,
  LinkedAmenity,
  ListingInquiry,
  PropertyDocument,
  PropertyLink,
  SavedListing,
  SiteVisitRequest,
} from './types'

type SupabaseError = {
  code?: string
  message?: string
}

type SupabaseClientLike = {
  from: (table: string) => any
}

function isMissingRelation(error: SupabaseError | null | undefined) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') ||
    error.message?.toLowerCase().includes('does not exist')
  )
}

function linkedPropertyFrom(link: PropertyLink) {
  return Array.isArray(link.properties) ? link.properties[0] : link.properties
}

async function readOptionalRows<T>(
  query: PromiseLike<{ data: T[] | null; error: SupabaseError | null }>,
): Promise<{ rows: T[]; ready: boolean }> {
  const { data, error } = await query
  return {
    rows: error && isMissingRelation(error) ? [] : data ?? [],
    ready: !error || !isMissingRelation(error),
  }
}

export async function getCustomerWorkspaceData(
  supabase: SupabaseClientLike,
  userId: string,
): Promise<CustomerWorkspaceData> {
  const [{ data: customer }, { data: buyerDetails }, { data: listings }] = await Promise.all([
    supabase
      .from('customers')
      .select('id,full_name,email,phone,address,account_status,kyc_status,created_at')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('plot_buyer_details')
      .select(
        'investment_budget_lakhs,investment_budget_max_lakhs,preferred_locations,preferred_plot_size_min,preferred_plot_size_max,preferred_property_types,loan_interested,kyc_pan_submitted,kyc_aadhaar_submitted,kyc_verified,kyc_status,updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('listings')
      .select(
        'id,property_id,seller_id,plot_id,plot_number,location,size_sq_yards,size_label,facing,corner_plot,premium,price_lakhs,price_display,status,approval_status,is_published,verified_at,verified_by,inquiries_count,property_kind,bhk,floor_label,created_at',
      )
      .in('status', ['Active', 'featured'])
      .eq('approval_status', 'approved')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const customerId = customer?.id ?? null

  const [
    savedResult,
    inquiryResult,
    siteVisitResult,
    { data: links },
    { data: customerDocuments },
    { data: inspections },
    { data: maintenanceRequests },
    { data: supportTickets },
  ] = await Promise.all([
    readOptionalRows<SavedListing>(
      supabase
        .from('saved_listings')
        .select('id,listing_id,created_at')
        .eq('buyer_profile_id', userId)
        .order('created_at', { ascending: false }),
    ),
    readOptionalRows<ListingInquiry>(
      supabase
        .from('listing_inquiries')
        .select('id,listing_id,message,status,created_at')
        .eq('buyer_profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
    ),
    readOptionalRows<SiteVisitRequest>(
      supabase
        .from('site_visit_requests')
        .select('id,listing_id,preferred_date:scheduled_for,status,notes,created_at')
        .eq('buyer_profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
    ),
    customerId
      ? supabase
          .from('customer_property_links')
          .select(
            `
              id,
              property_id,
              relationship_type,
              status,
              registration_date,
              created_at,
              properties (
                id,
                title,
                property_kind,
                address,
                city,
                state,
                lifecycle_status,
                verification_status
              )
            `,
          )
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    customerId
      ? supabase
          .from('property_documents')
          .select('id,title,document_type,verification_status,property_id,property_request_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at,withdrawal_requested_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    customerId
      ? supabase
          .from('inspections')
          .select('id,property_id,status,scheduled_for,completed_at,summary,created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    customerId
      ? supabase
          .from('maintenance_requests')
          .select('id,property_id,title,priority,status,created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from('support_tickets')
      .select('id,ticket_reference,subject,description,category,priority,status,created_at,property_id')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const propertyLinks = (links ?? []) as PropertyLink[]
  const propertyIds = propertyLinks.map((link) => link.property_id)

  const propertyDocumentRows = propertyIds.length
    ? await supabase
        .from('property_documents')
        .select('id,title,document_type,verification_status,property_id,property_request_id,created_at,category,requirement_level,description,review_reason,mime_type,size_bytes,reviewed_at,withdrawal_requested_at')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const { data: linkedPlots } = propertyIds.length
    ? await supabase
        .from('plots')
        .select('id,property_id,plot_number')
        .in('property_id', propertyIds)
    : { data: [] }

  const linkedPlotRows = (linkedPlots ?? []) as Array<{ id: string; property_id: string | null; plot_number: string | null }>
  const plotIds = linkedPlotRows.map((plot) => plot.id)
  const { data: activeAmenities } = plotIds.length
    ? await supabase
        .from('active_amenities')
        .select('id,plot_id,amenity_id,created_at')
        .in('plot_id', plotIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const amenityIds = Array.from(new Set((activeAmenities ?? []).map((row: { amenity_id: string }) => row.amenity_id)))
  const { data: amenityRows } = amenityIds.length
    ? await supabase
        .from('amenities')
        .select('id,name,category,kind,amount,active')
        .in('id', amenityIds)
    : { data: [] }

  const plotsById = new Map(linkedPlotRows.map((plot) => [plot.id, plot]))
  const amenitiesById = new Map((amenityRows ?? []).map((amenity: { id: string }) => [amenity.id, amenity]))
  const linkedAmenities: LinkedAmenity[] = (activeAmenities ?? [])
    .map((row: { id: string; plot_id: string; amenity_id: string; created_at: string }) => {
      const amenity = amenitiesById.get(row.amenity_id) as
        | { name: string; category: string; kind: string; amount: number; active: boolean }
        | undefined
      const plot = plotsById.get(row.plot_id)
      if (!amenity) return null

      return {
        id: row.id,
        plot_id: row.plot_id,
        amenity_id: row.amenity_id,
        property_id: plot?.property_id ?? null,
        plot_number: plot?.plot_number ?? null,
        name: amenity.name,
        category: amenity.category,
        kind: amenity.kind,
        amount: amenity.amount,
        active: amenity.active,
        created_at: row.created_at,
      }
    })
    .filter(Boolean) as LinkedAmenity[]

  const documentMap = new Map<string, PropertyDocument>()
  const documentRows = [...((customerDocuments ?? []) as PropertyDocument[]), ...((propertyDocumentRows.data ?? []) as PropertyDocument[])]
  for (const document of documentRows) {
    documentMap.set(document.id, document)
  }

  return {
    customer: customer ?? null,
    buyerDetails: buyerDetails ?? null,
    listings: listings ?? [],
    savedListings: savedResult.rows,
    inquiries: inquiryResult.rows,
    siteVisits: siteVisitResult.rows,
    propertyLinks,
    documents: Array.from(documentMap.values()),
    inspections: inspections ?? [],
    maintenanceRequests: maintenanceRequests ?? [],
    supportTickets: supportTickets ?? [],
    amenities: linkedAmenities,
    schemaStatus: {
      savedListingsReady: savedResult.ready,
      inquiriesReady: inquiryResult.ready,
      siteVisitsReady: siteVisitResult.ready,
    },
  }
}

export { linkedPropertyFrom }
