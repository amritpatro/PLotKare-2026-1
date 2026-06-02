import * as Sentry from '@sentry/nextjs'
import { redactSentryEvent } from '@/lib/monitoring/sentry-redaction'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: redactSentryEvent,
})
