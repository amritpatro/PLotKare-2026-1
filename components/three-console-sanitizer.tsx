'use client'

import { useEffect } from 'react'

const suppressedMessages = [
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
  'THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.',
]

export function ThreeConsoleSanitizer() {
  useEffect(() => {
    const originalWarn = console.warn

    console.warn = (...args: unknown[]) => {
      const firstArg = typeof args[0] === 'string' ? args[0] : ''
      if (suppressedMessages.some((message) => firstArg.includes(message))) {
        return
      }
      originalWarn(...args)
    }

    return () => {
      console.warn = originalWarn
    }
  }, [])

  return null
}
