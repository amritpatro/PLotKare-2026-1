type InsightTone = 'crimson' | 'gold' | 'emerald' | 'slate'

type InsightMetric = {
  label: string
  value: string | number
  hint?: string
  tone?: InsightTone
}

type InsightDistribution = {
  label: string
  value: number
  tone?: InsightTone
}

type InsightHighlight = {
  label: string
  value: string
}

const toneStyles: Record<InsightTone, { value: string; bar: string }> = {
  crimson: { value: 'text-[#C0392B]', bar: 'bg-[#C0392B]' },
  gold: { value: 'text-[#A16207]', bar: 'bg-[#C9A962]' },
  emerald: { value: 'text-emerald-700', bar: 'bg-emerald-600' },
  slate: { value: 'text-[#374151]', bar: 'bg-[#6B7280]' },
}

function widthFrom(value: number, total: number) {
  if (total <= 0) return 0
  return Math.max(8, Math.round((value / total) * 100))
}

export function DashboardInsightRibbon({
  eyebrow,
  title,
  body,
  metrics,
  distributionTitle,
  distribution,
  highlights,
}: {
  eyebrow: string
  title: string
  body: string
  metrics: InsightMetric[]
  distributionTitle?: string
  distribution?: InsightDistribution[]
  highlights?: InsightHighlight[]
}) {
  const total = (distribution ?? []).reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">{body}</p>
          {highlights?.length ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">{item.label}</dt>
                  <dd className="mt-2 text-sm font-semibold text-[#1F2937]">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {distribution?.length ? (
          <div className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-[#FCFCFB] p-4 xl:w-[360px]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF]">
                {distributionTitle || 'Distribution'}
              </p>
              <span className="text-xs text-[#6B7280]">{total} tracked</span>
            </div>
            <div className="mt-4 space-y-3">
              {distribution.map((item) => {
                const tone = toneStyles[item.tone ?? 'crimson']
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#374151]">{item.label}</span>
                      <span className={`font-semibold ${tone.value}`}>{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF0F3]">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${widthFrom(item.value, total)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const tone = toneStyles[metric.tone ?? 'crimson']
          return (
            <div key={metric.label} className="rounded-xl border border-[#E5E7EB] bg-[#FCFCFB] px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6B7280]">{metric.label}</p>
              <p className={`mt-3 font-mono text-3xl font-bold ${tone.value}`}>{metric.value}</p>
              {metric.hint ? <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">{metric.hint}</p> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
