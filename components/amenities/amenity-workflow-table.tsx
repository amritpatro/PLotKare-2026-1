import type { AmenityWorkflowRow } from '@/lib/amenity-operations'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'requested').replaceAll('_', ' ')
}

export function AmenityWorkflowTable({
  rows,
  empty,
  showRequester = false,
}: {
  rows: AmenityWorkflowRow[]
  empty: string
  showRequester?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase tracking-[0.12em] text-[#9CA3AF]">
            <th className="px-3 py-3">Amenity</th>
            {showRequester ? <th className="px-3 py-3">Requester</th> : null}
            <th className="px-3 py-3">Property / plot</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Assigned</th>
            <th className="px-3 py-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showRequester ? 6 : 5} className="px-3 py-10 text-center text-[#6B7280]">
                {empty}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-3">
                <p className="font-semibold text-[#1F2937]">{row.amenityName}</p>
                <p className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.amenityCategory || row.amenityId}</p>
                {row.reviewNote ? <p className="mt-2 text-xs leading-5 text-[#6B7280]">{row.reviewNote}</p> : null}
              </td>
              {showRequester ? (
                <td className="px-3 py-3 text-[#6B7280]">
                  {row.requesterName}
                  {row.requesterEmail ? <div className="mt-1 font-mono text-xs text-[#9CA3AF]">{row.requesterEmail}</div> : null}
                </td>
              ) : null}
              <td className="px-3 py-3 text-[#6B7280]">
                <div>{row.propertyTitle || 'Property pending'}</div>
                <div className="mt-1 font-mono text-xs text-[#9CA3AF]">
                  {[row.plotNumber, row.location].filter(Boolean).join(' · ') || row.plotId || row.propertyId || 'Linked property'}
                </div>
              </td>
              <td className="px-3 py-3">
                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                  {statusLabel(row.reviewStatus)}
                </span>
              </td>
              <td className="px-3 py-3 text-[#6B7280]">{row.assignedEmployeeLabel || 'Unassigned'}</td>
              <td className="px-3 py-3 text-[#6B7280]">{formatDate(row.dueAt || row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
