'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { archiveListing } from './actions'

export function ArchiveListingButton({ listingId, archived }: { listingId: string; archived: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveListing(listingId)
      toast[result.ok ? 'success' : 'error'](result.message)
      if (result.ok) router.refresh()
    })
  }

  return (
    <button
      type="button"
      className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs font-semibold text-[#6B7280] hover:border-[#C0392B] hover:text-[#C0392B]"
      disabled={archived || pending}
      onClick={handleArchive}
    >
      {archived ? 'Archived' : pending ? 'Archiving...' : 'Archive'}
    </button>
  )
}
