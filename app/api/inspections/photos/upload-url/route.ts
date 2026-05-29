import { apiError } from '@/lib/api/response'

export async function POST() {
  return apiError(
    'Legacy photo uploads are retired. Field evidence must be captured through the assigned Field Inspections portal.',
    410,
    'FIELD_PORTAL_REQUIRED',
  )
}
