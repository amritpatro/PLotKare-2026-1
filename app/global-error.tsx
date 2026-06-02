'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f8f7f4', color: '#1a1614' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px' }}>
            <p style={{ color: '#8b1538', fontSize: '12px', textTransform: 'uppercase' }}>PlotKare</p>
            <h1 style={{ fontSize: '40px', margin: '16px 0' }}>We could not load this page</h1>
            <p style={{ color: '#57534e', lineHeight: 1.7 }}>Try again in a moment. If the issue continues, return to the homepage.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
              <button type="button" onClick={reset} style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', border: 0, padding: '12px 18px', background: '#8b1538', color: '#fff', cursor: 'pointer' }}>
                <RefreshCw size={16} aria-hidden />
                Try again
              </button>
              <Link href="/" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', padding: '12px 18px', color: '#1a1614' }}>
                <Home size={16} aria-hidden />
                Return home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
