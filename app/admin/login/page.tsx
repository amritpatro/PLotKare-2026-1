'use client'

import { Suspense } from 'react'
import { AuthLoginPage } from '@/components/auth-login-page'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginPage mode="admin" />
    </Suspense>
  )
}
