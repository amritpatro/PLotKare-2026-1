import { NextResponse } from 'next/server'
import { POST as submitInspection } from '@/app/api/agent/inspections/[id]/submit/route'

export async function POST(request: Request) {
  const body = await request.json()
  const inspectionId = String(body.inspectionId || '')
  if (!inspectionId) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_REQUIRED', message: 'inspectionId is required.' } }, { status: 400 })
  }

  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  return submitInspection(forwarded, { params: Promise.resolve({ id: inspectionId }) })
}
