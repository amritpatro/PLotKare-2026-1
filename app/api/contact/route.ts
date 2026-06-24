import { logger } from '@/lib/monitoring/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isRateLimited } from '@/lib/api/rate-limit'
import { hasTransactionalEmailConfiguration, sendTransactionalEmail } from '@/lib/email/resend'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(30).optional().default(''),
  message: z.string().trim().min(10).max(4000),
})

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function notifySupport(input: {
  name: string
  email: string
  phone: string
  message: string
  subject: string
  source: 'landing_listing_inquiry' | 'website_contact'
}) {
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL

  if (!supportEmail || !hasTransactionalEmailConfiguration()) {
    logger.warn('Contact notification email skipped', {
      reason: 'transactional_email_not_configured',
      source: input.source,
    })
    return
  }

  const safeName = escapeHtml(input.name)
  const safeEmail = escapeHtml(input.email)
  const safePhone = escapeHtml(input.phone || 'Not provided')
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />')

  const delivery = await sendTransactionalEmail({
    to: supportEmail,
    replyTo: input.email,
    subject: input.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
        <h1 style="font-family:Georgia,serif;color:#8B1538">New PlotKare enquiry</h1>
        <p><strong>Source:</strong> ${input.source === 'landing_listing_inquiry' ? 'Listing inquiry' : 'Website contact'}</p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <div style="margin-top:20px;padding:16px;border:1px solid #ead7de;border-radius:8px;background:#fff8fb">
          <strong>Message</strong>
          <p style="line-height:1.6">${safeMessage}</p>
        </div>
      </div>
    `,
    text: [
      'New PlotKare enquiry',
      `Source: ${input.source === 'landing_listing_inquiry' ? 'Listing inquiry' : 'Website contact'}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || 'Not provided'}`,
      '',
      input.message,
    ].join('\n'),
  })

  if ('error' in delivery) {
    logger.warn('Contact notification email failed', {
      source: input.source,
      reason: delivery.error,
    })
  }
}

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
    const source = hasListingRef ? 'landing_listing_inquiry' : 'website_contact'
    const subject = hasListingRef ? `Listing inquiry from ${name}` : `Website contact from ${name}`

    const { error } = await supabase.from('consultation_requests').insert({
      user_id: null,
      role: 'public_visitor',
      source,
      subject,
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

    await notifySupport({ name, email, phone, message: normalizedMessage, subject, source }).catch((deliveryError) => {
      logger.warn('Contact notification email crashed', {
        source,
        reason: deliveryError instanceof Error ? deliveryError.message : 'unknown',
      })
    })

    logger.info('Contact form submission stored', {
      source,
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
