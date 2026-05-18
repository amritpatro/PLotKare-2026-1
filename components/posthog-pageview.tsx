'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function PostHogPageviewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com').replace(/\/$/, '')
    if (!apiKey || !pathname) return

    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    const payload = {
      api_key: apiKey,
      event: '$pageview',
      distinct_id: window.localStorage.getItem('plotkare_distinct_id') || crypto.randomUUID(),
      properties: {
        $current_url: window.location.href,
        path: url,
      },
    }

    window.localStorage.setItem('plotkare_distinct_id', payload.distinct_id)
    const body = JSON.stringify(payload)
    if (!navigator.sendBeacon?.(`${host}/capture/`, new Blob([body], { type: 'application/json' }))) {
      void fetch(`${host}/capture/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewInner />
    </Suspense>
  )
}
