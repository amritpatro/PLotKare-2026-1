'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-20 text-center">
      <div className="max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Something went wrong</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">We could not load this page</h1>
        <p className="mt-4 font-sans text-base leading-7 text-muted-foreground">
          Try again in a moment. If the issue continues, return to the homepage and contact the team.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 font-sans text-sm font-medium text-white hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link href="/" className="inline-flex items-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-sm font-medium text-foreground hover:bg-secondary">
            <Home className="h-4 w-4" aria-hidden />
            Return home
          </Link>
        </div>
      </div>
    </main>
  )
}

