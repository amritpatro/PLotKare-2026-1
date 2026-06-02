import { apiError } from '@/lib/api/response'

export async function POST() {
  return apiError('Online payments are not enabled.', 503, 'PAYMENTS_DISABLED')
}
