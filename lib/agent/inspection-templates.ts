export type InspectionPropertyType = 'vacant_plot' | 'apartment' | 'house_villa' | 'commercial'

export type InspectionPhotoRequirement = {
  key: string
  label: string
  subject: string
}

export type InspectionChecklistItem = {
  key: string
  label: string
  required?: boolean
  issueWhen?: boolean
}

export type InspectionTemplate = {
  propertyType: InspectionPropertyType
  label: string
  requiredPhotos: InspectionPhotoRequirement[]
  optionalPhotos?: InspectionPhotoRequirement[]
  checklist: InspectionChecklistItem[]
}

export type ChecklistAnswerLike = {
  key: string
  value: boolean | null
  note?: string | null
}

export const INSPECTION_PROPERTY_TYPES: InspectionPropertyType[] = ['vacant_plot', 'apartment', 'house_villa', 'commercial']

export const inspectionTemplates: Record<InspectionPropertyType, InspectionTemplate> = {
  vacant_plot: {
    propertyType: 'vacant_plot',
    label: 'Vacant plot',
    requiredPhotos: [
      { key: 'north', label: 'North boundary', subject: 'boundary' },
      { key: 'south', label: 'South boundary', subject: 'boundary' },
      { key: 'east', label: 'East boundary', subject: 'boundary' },
      { key: 'west', label: 'West boundary', subject: 'boundary' },
    ],
    checklist: [
      { key: 'boundary_intact', label: 'Is the boundary wall or fencing intact and undamaged?', required: true, issueWhen: false },
      { key: 'gate_accessible', label: 'Is the main entrance or gate accessible and unobstructed?', required: true, issueWhen: false },
      { key: 'encroachment', label: 'Encroachment observed?', required: true, issueWhen: true },
      { key: 'new_construction', label: 'Is there any new construction activity visible inside or adjacent?', required: true, issueWhen: true },
      { key: 'access_clear', label: 'Is the access path to the plot clear and passable?', required: true, issueWhen: false },
      { key: 'vegetation', label: 'Is vegetation or weeds covering the boundary or access path?', required: true, issueWhen: true },
      { key: 'waste_dumping', label: 'Has any waste been dumped inside or against the boundary?', required: true, issueWhen: true },
      { key: 'water_logging', label: 'Is standing water visible on the plot?', required: true, issueWhen: true },
      { key: 'survey_markers', label: 'Are the corner survey markers visible and undisturbed?', required: true, issueWhen: false },
    ],
  },
  apartment: {
    propertyType: 'apartment',
    label: 'Apartment',
    requiredPhotos: [
      { key: 'entrance', label: 'Entrance / corridor', subject: 'site' },
      { key: 'main_room', label: 'Main room / living area', subject: 'interior' },
      { key: 'kitchen', label: 'Kitchen', subject: 'interior' },
      { key: 'bathroom', label: 'Bathroom', subject: 'interior' },
    ],
    checklist: [
      { key: 'entrance_lock_ok', label: 'Is the main entrance door and lock in good condition?', required: true, issueWhen: false },
      { key: 'windows_intact', label: 'Are all windows intact and able to close properly?', required: true, issueWhen: false },
      { key: 'water_damage', label: 'Is there any visible water damage or seepage on walls or ceiling?', required: true, issueWhen: true },
      { key: 'electrical_functional', label: 'Are all electrical switches and fixtures functional?', required: true, issueWhen: false },
      { key: 'kitchen_plumbing_working', label: 'Is the kitchen plumbing working?', required: true, issueWhen: false },
      { key: 'bathroom_plumbing_working', label: 'Is the bathroom plumbing working?', required: true, issueWhen: false },
      { key: 'common_area_accessible', label: 'Is the building common area clean and accessible?', required: true, issueWhen: false },
      { key: 'lift_operational', label: 'Is the lift, if present, operational?', required: true },
      { key: 'structural_cracks', label: 'Are any structural cracks visible on walls or floor?', required: true, issueWhen: true },
      { key: 'unauthorized_access', label: 'Has any unauthorized access or break-in occurred?', required: true, issueWhen: true },
      { key: 'meter_readings_noted', label: 'Are the electricity and water meter readings noted?', required: true, issueWhen: false },
      { key: 'maintenance_issue', label: 'Is any maintenance issue observed that requires vendor attention?', required: true, issueWhen: true },
    ],
  },
  house_villa: {
    propertyType: 'house_villa',
    label: 'House / villa',
    requiredPhotos: [
      { key: 'front', label: 'Front elevation', subject: 'exterior' },
      { key: 'rear', label: 'Rear side', subject: 'exterior' },
      { key: 'interior', label: 'Interior room', subject: 'interior' },
      { key: 'roof', label: 'Roof / terrace', subject: 'exterior' },
    ],
    optionalPhotos: [
      { key: 'garden', label: 'Garden / yard area', subject: 'exterior' },
    ],
    checklist: [
      { key: 'compound_gate_ok', label: 'Is the compound wall and gate in good condition?', required: true, issueWhen: false },
      { key: 'entrance_lock_secure', label: 'Is the main entrance door and lock secure?', required: true, issueWhen: false },
      { key: 'roof_intact', label: 'Is the roof intact with no visible damage or leakage?', required: true, issueWhen: false },
      { key: 'windows_secure', label: 'Are all windows intact and secure?', required: true, issueWhen: false },
      { key: 'water_seepage', label: 'Is there any visible water seepage or dampness inside?', required: true, issueWhen: true },
      { key: 'garden_maintained', label: 'Is the garden or yard area maintained and free of overgrowth?', required: true, issueWhen: false },
      { key: 'electrical_board_accessible', label: 'Is the electrical main supply and distribution board accessible?', required: true, issueWhen: false },
      { key: 'plumbing_functional', label: 'Is the plumbing functional with no visible leaks or blockages?', required: true, issueWhen: false },
      { key: 'structural_crack', label: 'Is there any structural crack or settlement visible?', required: true, issueWhen: true },
      { key: 'unauthorized_access', label: 'Has any unauthorized access occurred?', required: true, issueWhen: true },
      { key: 'drainage_clear', label: 'Is the drainage around the house clear?', required: true, issueWhen: false },
      { key: 'amenities_operational', label: 'Are amenities such as solar, borewell, or generator operational?', required: true },
    ],
  },
  commercial: {
    propertyType: 'commercial',
    label: 'Commercial property',
    requiredPhotos: [
      { key: 'facade', label: 'Facade / frontage', subject: 'exterior' },
      { key: 'entrance', label: 'Entrance / shutter', subject: 'site' },
      { key: 'interior', label: 'Interior / operating area', subject: 'interior' },
    ],
    checklist: [
      { key: 'facade_condition_ok', label: 'Is the storefront or building facade in good condition?', required: true, issueWhen: false },
      { key: 'entrance_accessible_secured', label: 'Is the main entrance accessible and secured?', required: true, issueWhen: false },
      { key: 'signage_intact', label: 'Is the signage, if any, intact?', required: true },
      { key: 'structural_damage', label: 'Is there any structural damage visible?', required: true, issueWhen: true },
      { key: 'interior_expected_condition', label: 'Is the interior accessible and in the expected condition?', required: true, issueWhen: false },
      { key: 'utilities_present', label: 'Are the utility connections present?', required: true, issueWhen: false },
      { key: 'unauthorized_entry', label: 'Has any unauthorized entry or vandalism occurred?', required: true, issueWhen: true },
      { key: 'waste_disposal_maintained', label: 'Is waste disposal maintained around the property?', required: true, issueWhen: false },
    ],
  },
}

export function normalizeInspectionPropertyType(value: unknown): InspectionPropertyType {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'apartment') return 'apartment'
  if (normalized === 'house' || normalized === 'villa' || normalized === 'house_villa') return 'house_villa'
  if (normalized === 'commercial') return 'commercial'
  return 'vacant_plot'
}

export function inspectionTypeFromProperty(input: {
  inspectionPropertyType?: unknown
  assetType?: unknown
  propertyKind?: unknown
  hasPlot?: boolean
}): InspectionPropertyType {
  if (input.inspectionPropertyType) return normalizeInspectionPropertyType(input.inspectionPropertyType)
  if (input.assetType) return normalizeInspectionPropertyType(input.assetType)
  if (input.propertyKind) return normalizeInspectionPropertyType(input.propertyKind)
  return input.hasPlot === false ? 'apartment' : 'vacant_plot'
}

export function getInspectionTemplate(value: unknown): InspectionTemplate {
  return inspectionTemplates[normalizeInspectionPropertyType(value)]
}

export function requiredChecklistKeys(template: InspectionTemplate) {
  return new Set(template.checklist.filter((answer) => answer.required).map((answer) => answer.key))
}

export function createChecklistAnswers(template: InspectionTemplate) {
  return template.checklist.map((item) => ({
      key: item.key,
      label: item.label,
      value: null as boolean | null,
      note: '',
      required: item.required,
    }))
}

export function mergeChecklistAnswers<T extends ChecklistAnswerLike & { label?: string; required?: boolean }>(
  template: InspectionTemplate,
  answers: T[] | null | undefined,
) {
  const existingByKey = new Map((answers ?? []).map((answer) => [answer.key, answer]))
  return template.checklist.map((item) => {
    const existing = existingByKey.get(item.key)
    return {
      key: item.key,
      label: item.label,
      value: existing?.value ?? null,
      note: existing?.note ?? '',
      required: item.required,
    }
  })
}

export function getTriggeredIssueKeys(template: InspectionTemplate, answers: ChecklistAnswerLike[]) {
  const answerByKey = new Map(answers.map((answer) => [answer.key, answer.value]))
  return template.checklist
    .filter((item) => item.issueWhen !== undefined && answerByKey.get(item.key) === item.issueWhen)
    .map((item) => item.key)
}

export function inspectionPhotoSubjectForDirection(direction: string) {
  const normalized = direction.toLowerCase()
  if (normalized.startsWith('issue')) return 'issue'
  if (normalized.startsWith('amenity')) return 'amenity'

  for (const template of Object.values(inspectionTemplates)) {
    const requirement = template.requiredPhotos.find((photo) => photo.key === normalized)
    if (requirement) return requirement.subject
  }

  return 'site'
}
