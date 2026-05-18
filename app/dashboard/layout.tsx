import type { Metadata } from 'next'
import { DashboardProviders } from './dashboard-providers'

export const metadata: Metadata = {
  title: 'Owner dashboard — PlotKare',
  description: 'Signed-in workspace for PlotKare plot monitoring (demo).',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>
}
