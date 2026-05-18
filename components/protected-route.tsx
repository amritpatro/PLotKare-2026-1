'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem('plotkare_auth')
    if (auth !== 'true') {
      router.replace('/login')
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <p className="text-[#6B7280]">Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
