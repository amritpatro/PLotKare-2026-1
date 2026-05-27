'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  documentRequirementsByRole,
  type DocumentRequirement,
  type DocumentRole,
} from '@/lib/documents/catalog'

type PropertyOption = {
  id: string
  label: string
}

type PropertyRequestOption = {
  id: string
  label: string
}

export type UploadedDocumentRecord = {
  id: string
  document_type: string | null
  verification_status: string | null
  property_id?: string | null
  property_request_id?: string | null
  size_bytes?: number | null
  created_at?: string | null
  review_reason?: string | null
  replaces_document_id?: string | null
  upload_finalized_at?: string | null
}

type PropertyDocumentUploadPanelProps = {
  role: DocumentRole
  properties: PropertyOption[]
  propertyRequests?: PropertyRequestOption[]
  documents?: UploadedDocumentRecord[]
}

const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass =
  'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass =
  'rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#1F2937] transition hover:border-[#C0392B] hover:text-[#C0392B] disabled:cursor-not-allowed disabled:opacity-50'

function statusLabel(value: string | null | undefined) {
  return String(value ?? 'not uploaded').replaceAll('_', ' ')
}

function formatBytes(value: number | null | undefined) {
  if (!value) return 'No file'
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function stableDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'Pending'
}

export function PropertyDocumentUploadPanel({ role, properties, propertyRequests = [], documents = [] }: PropertyDocumentUploadPanelProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const requirements = documentRequirementsByRole[role]
  const latestByType = new Map<string, UploadedDocumentRecord>()
  for (const document of documents) {
    const type = document.document_type ?? ''
    if (type && !latestByType.has(type)) latestByType.set(type, document)
  }

  const submitUpload = (requirement: DocumentRequirement, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')
    const existing = latestByType.get(requirement.type)
    const propertyTarget = String(data.get('propertyTarget') ?? '')
    const propertyId = propertyTarget.startsWith('property:') ? propertyTarget.slice('property:'.length) : null
    const propertyRequestId = propertyTarget.startsWith('request:') ? propertyTarget.slice('request:'.length) : null
    const isReplacement = Boolean(
      existing &&
      ['rejected', 'needs_clarification', 'withdrawn', 'expired'].includes(existing.verification_status ?? '') &&
      (existing.property_id ?? null) === propertyId &&
      (existing.property_request_id ?? null) === propertyRequestId,
    )

    if (!(file instanceof File) || file.size === 0) {
      setMessage(`Choose a file for ${requirement.label}.`)
      return
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setMessage('Files must be 5 MB or smaller.')
      return
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Upload a PDF, JPEG, PNG, or WEBP file only.')
      return
    }

    startTransition(async () => {
      try {
        const prepare = await fetch('/api/property-documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            propertyRequestId,
            documentType: requirement.type,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        })
        const prepared = await prepare.json()
        if (!prepare.ok || !prepared.ok) throw new Error(prepared?.error?.message || 'Document upload could not be prepared.')

        const supabase = createSupabaseBrowserClient()
        const { upload, pendingDocument } = prepared.data
        const { error: uploadError } = await supabase.storage
          .from(pendingDocument.bucket)
          .uploadToSignedUrl(upload.path, upload.token, file)
        if (uploadError) throw uploadError

        const finalize = await fetch('/api/property-documents/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pendingDocument, replacesDocumentId: isReplacement ? existing?.id ?? null : null }),
        })
        const finalized = await finalize.json()
        if (!finalize.ok || !finalized.ok) throw new Error(finalized?.error?.message || 'Upload could not be finalized.')

        form.reset()
        setMessage(`${requirement.label} submitted for verification.`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Document upload failed.')
      }
    })
  }

  const requestWithdrawal = (document: UploadedDocumentRecord, reason: string) => {
    if (reason.trim().length < 5) {
      setMessage('Provide a short reason before requesting withdrawal.')
      return
    }
    startTransition(async () => {
      const response = await fetch(`/api/property-documents/${document.id}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_withdrawal', reason }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        setMessage(payload?.error?.message || 'Withdrawal request could not be saved.')
        return
      }
      setMessage('Withdrawal request sent for operational review.')
      router.refresh()
    })
  }

  const renderCard = (requirement: DocumentRequirement) => {
    const document = latestByType.get(requirement.type)
    const status = document?.verification_status ?? null
    const canWithdraw = document && !['withdrawal_requested', 'withdrawn', 'expired'].includes(status ?? '')
    const canUpload = requirement.propertyScoped || !document || ['rejected', 'needs_clarification', 'withdrawn', 'expired'].includes(status ?? '')
    const hasPropertyTarget = properties.length > 0 || (role === 'customer' && propertyRequests.length > 0)

    return (
      <div key={requirement.type} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#1F2937]">{requirement.label}</p>
            <p className="mt-1 text-xs leading-5 text-[#6B7280]">{requirement.description}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${requirement.required ? 'bg-[#FFF1F2] text-[#C0392B]' : 'bg-[#F9FAFB] text-[#6B7280]'}`}>
            {requirement.required ? 'Mandatory' : 'Optional'}
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-3">
          <p><span className="block font-mono uppercase text-[#9CA3AF]">Status</span>{statusLabel(status)}</p>
          <p><span className="block font-mono uppercase text-[#9CA3AF]">Size</span>{formatBytes(document?.size_bytes)}</p>
          <p><span className="block font-mono uppercase text-[#9CA3AF]">Uploaded</span>{stableDate(document?.created_at)}</p>
        </div>
        {document?.review_reason ? <p className="mt-3 rounded-lg bg-[#FFF1F2] px-3 py-2 text-xs text-[#A93226]">{document.review_reason}</p> : null}
        {document ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/api/property-documents/${document.id}/access?mode=preview`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Preview</a>
            <a href={`/api/property-documents/${document.id}/access?mode=download`} className={secondaryButtonClass}>Download</a>
          </div>
        ) : null}
        {canWithdraw ? <WithdrawalRequest document={document} disabled={isPending} onSubmit={requestWithdrawal} /> : null}
        {canUpload ? (
          <form onSubmit={(event) => submitUpload(requirement, event)} className="mt-4 grid gap-2">
            {requirement.propertyScoped ? (
              <select name="propertyTarget" className={inputClass} defaultValue="" required>
                <option value="" disabled>Select linked property or pending request</option>
                {properties.map((property) => <option key={property.id} value={`property:${property.id}`}>{property.label}</option>)}
                {role === 'customer' ? propertyRequests.map((request) => <option key={request.id} value={`request:${request.id}`}>Pending verification: {request.label}</option>) : null}
              </select>
            ) : null}
            <input name="file" type="file" required className={inputClass} accept={DOCUMENT_ACCEPT} />
            <button type="submit" className={buttonClass} disabled={isPending || (requirement.propertyScoped && !hasPropertyTarget)}>
              {isPending ? 'Submitting...' : document && !requirement.propertyScoped ? 'Upload replacement' : requirement.propertyScoped && document ? 'Upload additional evidence' : 'Upload document'}
            </button>
            {requirement.propertyScoped && !hasPropertyTarget ? <p className="text-xs text-[#6B7280]">A linked property or submitted verification request is required for this document.</p> : null}
          </form>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message ? <p role="status" className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#4B5563]">{message}</p> : null}
      <section>
        <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Mandatory Documents</h3>
        <p className="mt-1 text-sm text-[#6B7280]">These documents are required before verification can be completed. Maximum file size: 5 MB.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{requirements.filter((item) => item.required).map(renderCard)}</div>
      </section>
      <section>
        <h3 className="font-serif text-xl font-semibold text-[#1F2937]">Optional Documents</h3>
        <p className="mt-1 text-sm text-[#6B7280]">Additional evidence may speed up document clarification and service review.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{requirements.filter((item) => !item.required).map(renderCard)}</div>
      </section>
    </div>
  )
}

function WithdrawalRequest({
  document,
  disabled,
  onSubmit,
}: {
  document: UploadedDocumentRecord
  disabled: boolean
  onSubmit: (document: UploadedDocumentRecord, reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="mt-4 grid gap-2 rounded-lg border border-dashed border-[#E5E7EB] p-3">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className={inputClass}
        placeholder="Reason for withdrawal request"
      />
      <button type="button" disabled={disabled} onClick={() => onSubmit(document, reason)} className={secondaryButtonClass}>
        Request withdrawal
      </button>
      <p className="text-xs text-[#6B7280]">Submitted evidence is retained for audit history; it is withdrawn through review rather than deleted.</p>
    </div>
  )
}
