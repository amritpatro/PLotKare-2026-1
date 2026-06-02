const REDACTED = '[redacted]'
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'email',
  'phone',
  'password',
  'refresh_token',
  'token',
])

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_PATTERN = /\+?[\d\s\-()]{10,}/g
const USER_ID_PATH_PATTERN =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi

function redactString(value: string) {
  return value
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED)
    .replace(USER_ID_PATH_PATTERN, '/[user-id]')
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
    return REDACTED
  }

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey),
      ]),
    )
  }

  return value
}

export function redactSentryEvent<T>(event: T): T {
  return redactValue(event) as T
}
