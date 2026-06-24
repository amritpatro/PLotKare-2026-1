type EmailInput = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export function hasTransactionalEmailConfiguration() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

export async function sendTransactionalEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) return { skipped: true as const, reason: 'Transactional email is not configured' }

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
    return { skipped: false as const, error: await response.text() }
  }

  return { skipped: false as const, data: await response.json() }
}
