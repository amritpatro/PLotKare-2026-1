export type StatusTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'gray'
  const s = String(status).toLowerCase()

  const green = new Set(['completed', 'approved', 'verified', 'done', 'active', 'paid', 'delivered', 'resolved', 'synced'])
  const yellow = new Set(['pending', 'under_review', 'submitted', 'needs_clarification'])
  const red = new Set(['rejected', 'failed', 'expired', 'blocked', 'error'])
  const blue = new Set(['in_progress', 'assigned', 'processing', 'open', 'waiting_on_customer'])
  const gray = new Set(['draft', 'inactive', 'archived', 'unknown', 'unlinked'])

  if (green.has(s)) return 'green'
  if (yellow.has(s)) return 'yellow'
  if (red.has(s)) return 'red'
  if (blue.has(s)) return 'blue'
  if (gray.has(s)) return 'gray'
  // fallback by simple heuristics
  if (s.includes('approved') || s.includes('complete') || s.includes('done')) return 'green'
  if (s.includes('pending') || s.includes('review')) return 'yellow'
  if (s.includes('reject') || s.includes('fail') || s.includes('expired')) return 'red'
  if (s.includes('progress') || s.includes('assign') || s.includes('processing')) return 'blue'
  return 'gray'
}
