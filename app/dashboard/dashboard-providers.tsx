'use client'

import { Toaster } from 'sonner'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster theme="dark" richColors position="bottom-right" />
    </>
  )
}
