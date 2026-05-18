import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function apiError(message: string, status = 400, code = 'BAD_REQUEST', details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
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
