'use client'

import { useState } from 'react'

type Props = {
  inspectionId: string
  initialNote?: string | null
}

export function InternalNotes({ inspectionId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote || '')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/employee/inspections/${inspectionId}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Could not save note.')
      setMessage('Internal note saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="font-serif text-2xl font-semibold text-[#1F2937]">Internal notes</h2>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-[#D1D5DB] p-3 text-sm text-[#1F2937] outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/15" />
      {message ? <p className="mt-2 text-sm text-[#6B7280]">{message}</p> : null}
      <button type="button" onClick={save} disabled={saving} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#1F2937] px-4 text-sm font-bold text-white disabled:bg-[#9CA3AF]">
        {saving ? 'Saving...' : 'Save note'}
      </button>
    </section>
  )
}
