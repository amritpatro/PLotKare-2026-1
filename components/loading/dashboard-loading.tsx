export function DashboardLoading({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 pb-24 pt-28 sm:px-6 md:px-8 md:pb-12">
      <div className="mx-auto max-w-7xl space-y-6" aria-busy="true" aria-label={label}>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A962]">{label}</p>
          <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
          <div className="mt-3 h-4 w-[28rem] max-w-full animate-pulse rounded-md bg-[#F3F4F6]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl border border-[#E5E7EB] bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-[#E5E7EB] bg-white" />
      </div>
    </div>
  )
}
