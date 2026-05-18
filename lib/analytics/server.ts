type CaptureInput = {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}

export async function captureServerEvent(input: CaptureInput) {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com').replace(/\/$/, '')

  if (!apiKey) return { skipped: true as const, reason: 'POSTHOG_PROJECT_API_KEY is not configured' }

  const response = await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: input.distinctId,
      event: input.event,
      properties: input.properties ?? {},
    }),
  })

  if (!response.ok) {
    return { skipped: false as const, error: await response.text() }
  }

  return { skipped: false as const }
}
