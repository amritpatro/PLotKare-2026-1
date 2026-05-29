import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readAssignedInspection, requireFieldAgentApiContext } from '@/lib/agent/inspection'

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  direction: z.enum(['north', 'south', 'east', 'west', 'issue', 'amenity']),
  subject: z.enum(['boundary', 'issue', 'amenity']),
  mimeType: z.enum(['image/webp', 'image/jpeg']),
  sizeBytes: z.number().int().positive().max(819200),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFieldAgentApiContext()
  if ('response' in context) return context.response
  const parsedParams = paramsSchema.safeParse(await params)
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: 'Compressed field evidence is invalid.' }, { status: 400 })
  }

  const inspection = await readAssignedInspection(context, parsedParams.data.id)
  if (!inspection || !inspection.arrival_verified || !['in_progress', 'correction_required'].includes(inspection.status)) {
    return NextResponse.json({ error: 'Verify arrival before capturing evidence.' }, { status: 409 })
  }

  const extension = parsedBody.data.mimeType === 'image/webp' ? 'webp' : 'jpg'
  const objectPath = `${context.user.id}/${inspection.id}/${crypto.randomUUID()}-${parsedBody.data.direction}.${extension}`
  const { data, error } = await context.admin.storage.from('inspection-photos').createSignedUploadUrl(objectPath)
  if (error || !data) return NextResponse.json({ error: 'Could not prepare evidence upload.' }, { status: 500 })
  return NextResponse.json({ objectPath, signedUrl: data.signedUrl, token: data.token })
}
