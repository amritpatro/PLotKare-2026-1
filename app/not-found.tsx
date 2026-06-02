import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-20 text-center">
      <div className="max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">404</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-4 font-sans text-base leading-7 text-muted-foreground">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 font-sans text-sm font-medium text-white hover:bg-primary/90">
          <Home className="h-4 w-4" aria-hidden />
          Return home
        </Link>
      </div>
    </main>
  )
}

