type LogContext = Record<string, unknown> | unknown

const REDACTED = '[redacted]'
const SENSITIVE_KEY = /authorization|cookie|email|password|secret|token|key|phone|payload/i

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[truncated]'
  if (value instanceof Error) return { name: value.name }
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitize(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, depth + 1),
    ]),
  )
}

function write(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
  const sink = globalThis.console[level]
  if (context === undefined) sink(message)
  else sink(message, sanitize(context))
}

export const logger = {
  info(message: string, context?: LogContext) {
    write('info', message, context)
  },
  warn(message: string, context?: LogContext) {
    write('warn', message, context)
  },
  error(message: string, context?: LogContext) {
    write('error', message, context)
  },
}

