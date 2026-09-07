'use client'

import Image from 'next/image'
import { useState } from 'react'
import { withBasePath } from '@/lib/site-config'

const PHOTO_PENDING_FALLBACK = '/images/listings/property-photo-pending.png'

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith('http') ? imageUrl : withBasePath(imageUrl)
}

export function ListingImage({
  imageUrl,
  alt,
  sizes,
  className,
  priority = false,
}: {
  imageUrl: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)

  return (
    <>
      <Image
        src={failed ? withBasePath(PHOTO_PENDING_FALLBACK) : resolveImageUrl(imageUrl)}
        alt={failed ? 'Property photograph pending verification' : alt}
        fill
        priority={priority}
        className={className}
        sizes={sizes}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <span className="absolute inset-x-3 bottom-3 rounded-md bg-black/70 px-3 py-2 text-center font-sans text-xs font-medium text-white">
          Property photographs are being verified
        </span>
      ) : null}
    </>
  )
}
