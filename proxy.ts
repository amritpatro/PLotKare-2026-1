import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const pathname = request.nextUrl.pathname
  const isApi = pathname.startsWith('/api/')

  if (isApi) {
    const uploadLimit = pathname.endsWith('/photo') ? 10 * 1024 * 1024 : 50 * 1024
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > uploadLimit) {
      return NextResponse.json(
        { error: 'Payload too large', requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } },
      )
    }

  }

  const headers = new Headers(request.headers)
  headers.set('x-request-id', requestId)
  const response = await updateSession(new NextRequest(request, { headers }))
  response.headers.set('X-Request-ID', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)'],
}
