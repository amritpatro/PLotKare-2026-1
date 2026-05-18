'use client'

import { Suspense } from 'react'
import { AuthLoginPage } from '@/components/auth-login-page'

export default function AuthLoginRoutePage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginPage mode="user" />
    </Suspense>
  )
}
