import Link from 'next/link'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  accent: 'border-[#E8D8A8] bg-[#FFF8E1] text-[#8A6D1D]',
}

export function DashboardSectionHeader({ eyebrow, title, description, action }: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="dashboard-section-header">
      <div className="min-w-0">
        {eyebrow ? <p className="dashboard-eyebrow">{eyebrow}</p> : null}
        <h2 className="dashboard-section-title">{title}</h2>
        {description ? <p className="dashboard-section-description">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function DashboardStatCard({ label, value, description, href, icon }: {
  label: string
  value: ReactNode
  description?: string
  href?: string
  icon?: ReactNode
}) {
  const content = (
    <div className={`dashboard-stat dashboard-card ${href ? 'dashboard-interactive' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="dashboard-eyebrow">{label}</p>
        {icon ? <span className="dashboard-stat-icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="dashboard-stat-value">{value}</p>
      {description ? <p className="dashboard-stat-description">{description}</p> : null}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export function DashboardActionCard({
  eyebrow,
  title,
  description,
  count,
  href,
  icon,
  actionLabel = 'Open queue',
}: {
  eyebrow: string
  title: string
  description: string
  count: number
  href: string
  icon: ReactNode
  actionLabel?: string
}) {
  return (
    <Link href={href} className="dashboard-decision-card dashboard-card dashboard-interactive group">
      <div className="flex items-start justify-between gap-4">
        <span className="dashboard-decision-icon" aria-hidden="true">{icon}</span>
        <span className="dashboard-decision-count" aria-label={`${count} items`}>{count}</span>
      </div>
      <p className="dashboard-eyebrow mt-5">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[#1F2937]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
      <span className="dashboard-decision-action mt-5">
        {actionLabel}<span aria-hidden="true">&#8594;</span>
      </span>
    </Link>
  )
}

export function DashboardStatusBadge({ value, tone = 'neutral' }: { value: string; tone?: Tone }) {
  return <span className={`dashboard-status-badge ${toneClasses[tone]}`}>{value}</span>
}

export function DashboardEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="dashboard-empty" role="status">
      <p className="font-semibold text-[#1F2937]">{title}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
