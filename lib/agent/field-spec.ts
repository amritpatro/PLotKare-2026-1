export const CORNER_DIRECTIONS = ['north', 'south', 'east', 'west'] as const
export const GPS_MAX_ACCURACY_METERS = 50
export const DEFAULT_PROXIMITY_RADIUS_METERS = 50
export const REQUIRED_ISSUE_PHOTO_COUNT = 2
export const MIN_ISSUE_DESCRIPTION_LENGTH = 10
export const MIN_AMENITY_NOTE_LENGTH = 5

export const FIELD_CHECKLIST = [
  { code: 'boundary_intact', label: 'Compound wall or boundary intact?', adverseWhen: false },
  { code: 'entrance_accessible', label: 'Gate or entrance accessible?', adverseWhen: false },
  { code: 'encroachment_observed', label: 'Encroachment observed?', adverseWhen: true, urgent: true },
  { code: 'new_construction', label: 'New construction nearby?', adverseWhen: true },
  { code: 'access_path_clear', label: 'Access path clear?', adverseWhen: false },
  { code: 'vegetation_overgrowth', label: 'Vegetation or weeds covering boundary or access path?', adverseWhen: true },
  { code: 'waste_dumping', label: 'Waste dumped inside or against the plot boundary?', adverseWhen: true },
  { code: 'water_logging', label: 'Standing water or water logging visible?', adverseWhen: true },
  { code: 'survey_markers_visible', label: 'Survey corner stones visible and undisturbed?', adverseWhen: false },
] as const

export type ChecklistCode = (typeof FIELD_CHECKLIST)[number]['code']
