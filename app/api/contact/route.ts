import { logger } from '@/lib/monitoring/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isRateLimited } from '@/lib/api/rate-limit'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(30).optional().default(''),
  message: z.string().trim().min(10).max(4000),
})

export async function POST(request: NextRequest) {
  if (await isRateLimited(request)) {
    return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429 })
  }

  try {
    const parsed = contactSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please check the form fields and try again.' },
        { status: 400 }
      )
    }
    const { name, email, phone, message } = parsed.data

    const supabase = createSupabaseAdminClient()
    const normalizedMessage = String(message ?? '').trim()
    const hasListingRef = /listing reference:/i.test(normalizedMessage)

    const { error } = await supabase.from('consultation_requests').insert({
      user_id: null,
      role: 'public_visitor',
      source: hasListingRef ? 'landing_listing_inquiry' : 'website_contact',
      subject: hasListingRef ? `Listing inquiry from ${name}` : `Website contact from ${name}`,
      message: normalizedMessage,
      status: 'open',
      metadata: {
        name,
        email,
        phone: phone || null,
        user_agent: request.headers.get('user-agent'),
      },
    })

    if (error) {
      logger.error('Contact form persistence error')
      return NextResponse.json(
        { error: 'Could not submit your request right now. Please try again.' },
        { status: 500 }
      )
    }

    logger.info('Contact form submission stored', {
      source: hasListingRef ? 'landing_listing_inquiry' : 'website_contact',
      hasPhone: Boolean(phone),
    })

    return NextResponse.json({ success: true, message: 'Message received' })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }
    logger.error('Contact form error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
