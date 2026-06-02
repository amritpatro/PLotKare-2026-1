import { LoaderCircle } from 'lucide-react'

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-20 text-center">
      <div>
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 font-sans text-sm text-muted-foreground">Loading PlotKare...</p>
      </div>
    </main>
  )
}

