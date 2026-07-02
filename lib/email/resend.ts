type EmailInput = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

function genericResendMessage(errorText: string) {
  if (!errorText) return 'Email delivery temporarily unavailable'
  if (errorText.includes('401') || errorText.toLowerCase().includes('api key')) {
    return 'Email delivery temporarily unavailable'
  }
  return 'Email delivery temporarily unavailable'
}

export function hasTransactionalEmailConfiguration() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendTransactionalEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'hello@plotkare.in'

  if (!apiKey || !apiKey.trim()) {
    console.error('[Email] RESEND_API_KEY not configured')
    return { skipped: true as const, reason: 'Email delivery temporarily unavailable' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.error('[Email] Resend error:', genericResendMessage(errorText))
    return { skipped: false as const, error: 'Email delivery temporarily unavailable' }
  }

  return { skipped: false as const, data: await response.json() }
}
