import { NextResponse } from 'next/server'
import { POST as confirmInspectionArrival } from '@/app/api/agent/inspections/[id]/arrival/route'

export async function POST(request: Request) {
  const body = await request.json()
  const inspectionId = String(body.inspectionId || '')
  if (!inspectionId) {
    return NextResponse.json({ ok: false, error: { code: 'INSPECTION_REQUIRED', message: 'inspectionId is required.' } }, { status: 400 })
  }

  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      latitude: body.agentLat ?? body.latitude,
      longitude: body.agentLng ?? body.longitude,
      accuracy: body.agentAccuracy ?? body.accuracy,
      capturedAt: body.timestamp ?? body.capturedAt ?? new Date().toISOString(),
      confirmOutsideRadius: body.outsideRadius ?? body.confirmOutsideRadius ?? false,
    }),
  })

  return confirmInspectionArrival(forwarded, { params: Promise.resolve({ id: inspectionId }) })
}
