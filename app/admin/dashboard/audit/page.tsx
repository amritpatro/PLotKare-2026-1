import { createSupabaseServerClient } from '@/lib/supabase/server'

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return '{}'
  return JSON.stringify(metadata, null, 2)
}

export default async function AdminAuditPage() {
  const supabase = await createSupabaseServerClient()
  const { data: rows } = await supabase
    .from('audit_logs')
    .select('id,actor_id,action,entity_type,entity_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const auditRows = rows ?? []

  return (
    <div className="px-8 pb-12 pt-24">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#C9A962]">Audit logs</p>
      <h1 className="mt-3 font-serif text-3xl font-bold text-[#1F2937]">Operational History</h1>
      <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#6B7280]">
        Read-only trail of admin and platform actions. This is the compliance memory for verification and future privileged workflows.
      </p>

      <section className={`${cardClass} mt-8`}>
        {auditRows.length === 0 ? (
          <p className="py-10 text-sm text-[#6B7280]">No audit logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Time</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Action</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Entity</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Actor</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {auditRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-4 pr-4 font-mono text-xs text-[#6B7280]">
                      {new Date(row.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 pr-4 font-sans text-sm font-semibold text-[#1F2937]">{row.action}</td>
                    <td className="py-4 pr-4">
                      <p className="font-sans text-sm text-[#1F2937]">{row.entity_type}</p>
                      <p className="mt-1 max-w-[180px] truncate font-mono text-xs text-[#9CA3AF]">{row.entity_id || 'none'}</p>
                    </td>
                    <td className="py-4 pr-4 max-w-[180px] truncate font-mono text-xs text-[#6B7280]">
                      {row.actor_id || 'system'}
                    </td>
                    <td className="py-4">
                      <pre className="max-h-28 max-w-[360px] overflow-auto rounded-lg bg-[#F9FAFB] p-3 font-mono text-[11px] leading-5 text-[#6B7280]">
                        {formatMetadata(row.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
