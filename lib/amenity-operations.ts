type SupabaseClientLike = {
  from: (table: string) => any
}

export type AmenityReviewStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'completed'

export type AmenityWorkflowRow = {
  id: string
  createdAt: string
  requesterId: string | null
  requesterName: string
  requesterEmail: string | null
  requesterPhone: string | null
  requesterRole: string | null
  plotId: string | null
  plotNumber: string | null
  propertyId: string | null
  propertyTitle: string | null
  location: string | null
  amenityId: string
  amenityName: string
  amenityCategory: string | null
  amenityKind: string | null
  amount: number | null
  reviewStatus: AmenityReviewStatus
  taskStatus: string | null
  priority: string
  dueAt: string | null
  escalationLevel: number
  assignedEmployeeId: string | null
  assignedEmployeeLabel: string | null
  reviewNote: string | null
  taskId: string | null
}

type ReadAmenityWorkflowOptions = {
  requestIds?: string[]
  plotIds?: string[]
  propertyIds?: string[]
  requesterIds?: string[]
  assignedEmployeeId?: string | null
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function deriveReviewStatus(taskStatus: string | null | undefined, metadata: Record<string, unknown>) {
  const explicitStatus = metadata.review_status
  if (
    explicitStatus === 'requested' ||
    explicitStatus === 'under_review' ||
    explicitStatus === 'approved' ||
    explicitStatus === 'rejected' ||
    explicitStatus === 'scheduled' ||
    explicitStatus === 'completed'
  ) {
    return explicitStatus
  }

  if (taskStatus === 'in_progress') return 'under_review'
  if (taskStatus === 'blocked') return 'rejected'
  if (taskStatus === 'completed') return 'approved'
  return 'requested'
}

function deriveAssignedEmployeeLabel(
  task: Record<string, unknown> | null | undefined,
  employeesById: Map<string, { employee_role?: string | null; profile?: { full_name?: string | null; email?: string | null } | null }>,
) {
  const assignedEmployeeId = typeof task?.assigned_employee_id === 'string' ? task.assigned_employee_id : null
  if (!assignedEmployeeId) return null

  const employee = employeesById.get(assignedEmployeeId)
  if (!employee) return assignedEmployeeId.slice(0, 8)

  const label = employee.profile?.full_name || employee.profile?.email || assignedEmployeeId.slice(0, 8)
  return employee.employee_role ? `${label} · ${employee.employee_role.replaceAll('_', ' ')}` : label
}

export async function readAmenityWorkflowRows(
  supabase: SupabaseClientLike,
  options: ReadAmenityWorkflowOptions = {},
): Promise<AmenityWorkflowRow[]> {
  let baseQuery = supabase
    .from('active_amenities')
    .select('id,owner_id,plot_id,amenity_id,created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (options.requestIds?.length) {
    baseQuery = baseQuery.in('id', options.requestIds)
  }
  if (options.plotIds?.length) {
    baseQuery = baseQuery.in('plot_id', options.plotIds)
  }
  if (options.requesterIds?.length) {
    baseQuery = baseQuery.in('owner_id', options.requesterIds)
  }

  const { data: requests, error: requestError } = await baseQuery
  if (requestError) throw requestError

  let requestRows = (requests ?? []) as Array<{
    id: string
    owner_id: string | null
    plot_id: string | null
    amenity_id: string
    created_at: string
  }>

  if (options.propertyIds?.length) {
    const { data: propertyPlots, error: propertyPlotError } = await supabase
      .from('plots')
      .select('id,property_id')
      .in('property_id', options.propertyIds)

    if (propertyPlotError) throw propertyPlotError
    const allowedPlotIds = new Set((propertyPlots ?? []).map((row: { id: string }) => row.id))
    requestRows = requestRows.filter((row) => row.plot_id && allowedPlotIds.has(row.plot_id))
  }

  if (requestRows.length === 0) return []

  const requestIds = requestRows.map((row) => row.id)
  const plotIds = uniqueStrings(requestRows.map((row) => row.plot_id))
  const amenityIds = uniqueStrings(requestRows.map((row) => row.amenity_id))
  const requesterIds = uniqueStrings(requestRows.map((row) => row.owner_id))

  const [{ data: plots }, { data: amenities }, { data: requesters }, { data: tasks }, { data: notes }] =
    await Promise.all([
      plotIds.length
        ? supabase
            .from('plots')
            .select('id,property_id,plot_number,location')
            .in('id', plotIds)
        : Promise.resolve({ data: [] }),
      amenityIds.length
        ? supabase
            .from('amenities')
            .select('id,name,category,kind,amount')
            .in('id', amenityIds)
        : Promise.resolve({ data: [] }),
      requesterIds.length
        ? supabase
            .from('profiles')
            .select('id,full_name,email,phone,role')
            .in('id', requesterIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('admin_task_assignments')
        .select('id,entity_id,assigned_employee_id,status,priority,due_at,escalation_level,metadata,updated_at,created_at')
        .eq('entity_type', 'active_amenity')
        .in('entity_id', requestIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('admin_internal_notes')
        .select('id,entity_id,note,created_at')
        .eq('entity_type', 'active_amenity')
        .in('entity_id', requestIds)
        .order('created_at', { ascending: false }),
    ])

  const propertyIds = uniqueStrings((plots ?? []).map((row: { property_id: string | null }) => row.property_id))
  const assignedEmployeeIds = uniqueStrings(
    (tasks ?? []).map((row: { assigned_employee_id: string | null }) => row.assigned_employee_id),
  )

  const [{ data: properties }, { data: employees }] = await Promise.all([
    propertyIds.length
      ? supabase
          .from('properties')
          .select('id,title,city,state')
          .in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    assignedEmployeeIds.length
      ? supabase
          .from('employees')
          .select('id,employee_role,profiles(full_name,email)')
          .in('id', assignedEmployeeIds)
      : Promise.resolve({ data: [] }),
  ])

  const plotsById = new Map<string, any>((plots ?? []).map((row: any) => [row.id, row]))
  const amenitiesById = new Map<string, any>((amenities ?? []).map((row: any) => [row.id, row]))
  const requestersById = new Map<string, any>((requesters ?? []).map((row: any) => [row.id, row]))
  const propertiesById = new Map<string, any>((properties ?? []).map((row: any) => [row.id, row]))
  const employeesById = new Map<string, { employee_role?: string | null; profile?: { full_name?: string | null; email?: string | null } | null }>(
    (employees ?? []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return [row.id, { employee_role: row.employee_role, profile }]
    }),
  )

  const tasksByRequestId = new Map<string, any>()
  for (const task of tasks ?? []) {
    const existing = tasksByRequestId.get(task.entity_id)
    if (!existing) {
      tasksByRequestId.set(task.entity_id, task)
      continue
    }

    const existingCancelled = existing.status === 'cancelled'
    const nextCancelled = task.status === 'cancelled'
    if (existingCancelled && !nextCancelled) {
      tasksByRequestId.set(task.entity_id, task)
      continue
    }

    const existingTime = new Date(existing.updated_at ?? existing.created_at ?? 0).getTime()
    const nextTime = new Date(task.updated_at ?? task.created_at ?? 0).getTime()
    if (nextTime > existingTime) {
      tasksByRequestId.set(task.entity_id, task)
    }
  }

  const latestNotesByRequestId = new Map<string, { note: string; created_at: string }>()
  for (const note of notes ?? []) {
    if (!latestNotesByRequestId.has(note.entity_id)) {
      latestNotesByRequestId.set(note.entity_id, note)
    }
  }

  const rows = requestRows.map((request) => {
    const plot = request.plot_id ? plotsById.get(request.plot_id) : null
    const property = plot?.property_id ? propertiesById.get(plot.property_id) : null
    const amenity = amenitiesById.get(request.amenity_id)
    const requester = request.owner_id ? requestersById.get(request.owner_id) : null
    const task = tasksByRequestId.get(request.id) ?? null
    const metadata =
      task && task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata)
        ? (task.metadata as Record<string, unknown>)
        : {}
    const latestNote = latestNotesByRequestId.get(request.id)
    const reviewNote =
      typeof metadata.review_note === 'string' && metadata.review_note.trim().length > 0
        ? metadata.review_note
        : latestNote?.note ?? null

    return {
      id: request.id,
      createdAt: request.created_at,
      requesterId: request.owner_id,
      requesterName: requester?.full_name || requester?.email || 'Requester',
      requesterEmail: requester?.email ?? null,
      requesterPhone: requester?.phone ?? null,
      requesterRole: requester?.role ?? null,
      plotId: request.plot_id,
      plotNumber: plot?.plot_number ?? null,
      propertyId: plot?.property_id ?? null,
      propertyTitle: property?.title ?? null,
      location: plot?.location ?? property?.city ?? null,
      amenityId: request.amenity_id,
      amenityName: amenity?.name ?? request.amenity_id,
      amenityCategory: amenity?.category ?? null,
      amenityKind: amenity?.kind ?? null,
      amount: typeof amenity?.amount === 'number' ? amenity.amount : null,
      reviewStatus: deriveReviewStatus(task?.status, metadata),
      taskStatus: task?.status ?? null,
      priority: task?.priority ?? 'normal',
      dueAt: task?.due_at ?? null,
      escalationLevel: task?.escalation_level ?? 0,
      assignedEmployeeId: task?.assigned_employee_id ?? null,
      assignedEmployeeLabel: deriveAssignedEmployeeLabel(task, employeesById),
      reviewNote,
      taskId: task?.id ?? null,
    } satisfies AmenityWorkflowRow
  })

  if (options.assignedEmployeeId) {
    return rows.filter((row) => row.assignedEmployeeId === options.assignedEmployeeId)
  }

  return rows
}
