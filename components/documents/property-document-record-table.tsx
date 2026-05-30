import Link from 'next/link'

type PropertyDocumentRecord = {
  id: string
  title: string
  document_type: string | null
  verification_status: string | null
  category?: string | null
  requirement_level?: string | null
  description?: string | null
  review_reason?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  reviewed_at?: string | null
  property_id?: string | null
  property_request_id?: string | null
  created_at: string | null
  priority?: string | null
  due_at?: string | null
  linked_label?: string | null
  uploader_label?: string | null
  uploader_context?: string | null
  uploader_href?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'submitted').replaceAll('_', ' ')
}

function formatSize(value: number | null | undefined) {
  if (!value) return 'Pending'
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export function PropertyDocumentRecordTable({
  rows,
  empty,
  linkedLabel = 'Linked record',
  showLinked = true,
}: {
  rows: PropertyDocumentRecord[]
  empty: string
  linkedLabel?: string
  showLinked?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] font-mono text-xs uppercase tracking-[0.12em] text-[#9CA3AF]">
            <th className="px-3 py-3">Document</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Status</th>
            {showLinked ? <th className="px-3 py-3">{linkedLabel}</th> : null}
            <th className="px-3 py-3">Created</th>
            <th className="px-3 py-3">Access</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showLinked ? 6 : 5} className="px-3 py-10 text-center text-[#6B7280]">
                {empty}
              </td>
            </tr>
          ) : null}
          {rows.map((document) => (
            <tr key={document.id} className="align-top">
              <td className="px-3 py-3">
                <p className="font-semibold text-[#1F2937]">{document.title}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{document.category || 'Documents'} · {document.requirement_level || 'optional'}</p>
                {document.uploader_label ? (
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Submitted by{' '}
                    {document.uploader_href ? (
                      <Link href={document.uploader_href} className="font-medium text-[#1F2937] underline-offset-2 hover:underline">
                        {document.uploader_label}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#1F2937]">{document.uploader_label}</span>
                    )}
                  </p>
                ) : null}
                {document.uploader_context ? <p className="mt-1 text-xs text-[#6B7280]">{document.uploader_context}</p> : null}
                {document.review_reason ? <p className="mt-2 max-w-[280px] text-xs text-[#A93226]">{document.review_reason}</p> : null}
              </td>
              <td className="px-3 py-3 text-[#6B7280]">
                <p>{document.document_type || 'document'}</p>
                <p className="mt-1 text-xs">{document.mime_type || 'File'} · {formatSize(document.size_bytes)}</p>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                    {statusLabel(document.verification_status)}
                  </span>
                  {document.priority ? (
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                      {document.priority}
                    </span>
                  ) : null}
                </div>
              </td>
              {showLinked ? (
                <td className="px-3 py-3 font-mono text-xs text-[#9CA3AF]">
                  {document.linked_label || document.property_id || 'Profile scope'}
                  {document.due_at ? (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#C9A962]">
                      Due {formatDate(document.due_at)}
                    </div>
                  ) : null}
                </td>
              ) : null}
              <td className="px-3 py-3 text-[#6B7280]">
                {formatDate(document.created_at)}
                {document.reviewed_at ? <p className="mt-1 text-xs">Reviewed {formatDate(document.reviewed_at)}</p> : null}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/property-documents/${document.id}/access?mode=preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B]"
                  >
                    Preview
                  </a>
                  <a
                    href={`/api/property-documents/${document.id}/access?mode=download`}
                    className="rounded-lg bg-[#C0392B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A93226]"
                  >
                    Download
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
