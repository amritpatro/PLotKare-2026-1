import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/api/auth'
import { getSiteUrl } from '@/lib/site-config'
import { sendTransactionalEmail } from '@/lib/email/resend'

export async function POST() {
  const context = await requireAdminContext()
  if ('response' in context) return context.response

  const to = process.env.SUPPORT_EMAIL || process.env.RESEND_FROM_EMAIL || context.profile.email
  if (!to) {
    return NextResponse.json(
      { success: false, error: 'Resend error: Email delivery temporarily unavailable' },
      { status: 500 },
    )
  }

  const timestamp = new Date().toISOString()
  const environment = getSiteUrl()
  const delivery = await sendTransactionalEmail({
    to,
    subject: 'PlotKare — Email Delivery Test',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="font-family:Georgia,serif;color:#8B1538">PlotKare Email Delivery Test</h1>
        <p>This is a test email from PlotKare. Email delivery is working correctly.</p>
        <p><strong>Sent at:</strong> ${timestamp}</p>
        <p><strong>Environment:</strong> ${environment}</p>
      </div>
    `,
    text: [
      'This is a test email from PlotKare. Email delivery is working correctly.',
      `Sent at: ${timestamp}`,
      `Environment: ${environment}`,
    ].join('\n'),
  })

  if (delivery.skipped || 'error' in delivery) {
    return NextResponse.json(
      { success: false, error: 'Resend error: Email delivery temporarily unavailable' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
}
