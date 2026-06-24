import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function apiOk<T>(data: T, init?: ResponseInit) {
  const requestId = crypto.randomUUID()
  const headers = new Headers(init?.headers)
  headers.set('X-Request-ID', requestId)
  return NextResponse.json({ ok: true, data }, { ...init, headers })
}

const publicMessageCodes = new Set([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_SIGNATURE',
  'PAYMENTS_DISABLED',
  'RATE_LIMITED',
])

export function apiError(message: string, status = 400, code = 'BAD_REQUEST', details?: unknown) {
  const requestId = crypto.randomUUID()
  const publicMessage = publicMessageCodes.has(code) ? message : 'Something went wrong. Please try again.'
  return NextResponse.json(
    {
      ok: false,
      requestId,
      error: {
        code,
        message: publicMessage,
        ...(code === 'VALIDATION_ERROR' ? { details } : {}),
      },
    },
    { status, headers: { 'X-Request-ID': requestId } },
  )
}

export function validationError(error: ZodError) {
  return apiError('Please check the form fields and try again.', 422, 'VALIDATION_ERROR', error.flatten())
}

export async function parseJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
