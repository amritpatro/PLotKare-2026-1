'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type PropertyOption = {
  id: string
  label: string
}

type PropertyDocumentUploadPanelProps = {
  role: 'seller' | 'owner' | 'customer'
  properties: PropertyOption[]
  defaultDocumentType?: string
}

const inputClass =
  'w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15'
const buttonClass =
  'rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226] disabled:cursor-not-allowed disabled:opacity-50'

const requiredTypesByRole = {
  seller: [
    ['survey_copy', 'Survey copy'],
    ['layout_image', 'Layout image'],
    ['ownership_proof', 'Ownership proof'],
    ['tax_receipt', 'Tax receipt'],
  ],
  owner: [
    ['aadhaar', 'Aadhaar'],
    ['pan', 'PAN'],
    ['ec', 'Encumbrance certificate'],
    ['survey_document', 'Survey document'],
    ['tax_receipt', 'Tax receipt'],
    ['property_photo', 'Property photo'],
  ],
  customer: [
    ['aadhaar', 'Aadhaar'],
    ['pan', 'PAN'],
    ['agreement', 'Agreement copy'],
    ['registration_copy', 'Registration copy'],
    ['property_photo', 'Property photo'],
  ],
} as const

export function PropertyDocumentUploadPanel({
  role,
  properties,
  defaultDocumentType,
}: PropertyDocumentUploadPanelProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')

    if (!(file instanceof File) || file.size === 0) {
      setMessage('Choose a document or property photo to upload.')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/property-documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: data.get('propertyId') || null,
            documentType: data.get('documentType'),
            title: data.get('title'),
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          }),
        })
        const payload = await response.json()

        if (!response.ok || !payload.ok) {
          throw new Error(payload?.error?.message || 'Document upload could not be prepared.')
        }

        const supabase = createSupabaseBrowserClient()
        const { upload, document } = payload.data
        const { error } = await supabase.storage
          .from(document.bucket)
          .uploadToSignedUrl(upload.path, upload.token, file)

        if (error) throw error

        form.reset()
        setMessage('Document submitted for PlotKare verification.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Document upload failed.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <select name="propertyId" className={inputClass} defaultValue={properties[0]?.id ?? ''} required={properties.length > 0}>
        {properties.length === 0 ? <option value="">General profile document</option> : null}
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.label}
          </option>
        ))}
      </select>
      <select name="documentType" className={inputClass} defaultValue={defaultDocumentType ?? requiredTypesByRole[role][0][0]}>
        {requiredTypesByRole[role].map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="title" required className={inputClass} placeholder="Document title" />
      <input
        name="file"
        type="file"
        required
        className={inputClass}
        accept="image/*,.pdf,.doc,.docx"
      />
      <button type="submit" className={buttonClass} disabled={isPending}>
        {isPending ? 'Uploading...' : 'Upload for verification'}
      </button>
      {message ? <p className="text-sm text-[#6B7280]">{message}</p> : null}
    </form>
  )
}
