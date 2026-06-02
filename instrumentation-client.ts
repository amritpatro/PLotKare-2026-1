const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  void import('./sentry.client.config')
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  if (!dsn) return

  void import('@sentry/nextjs').then(({ captureRouterTransitionStart }) => {
    captureRouterTransitionStart(href, navigationType)
  })
}
