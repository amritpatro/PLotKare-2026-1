'use client'

import { useEffect, useState } from 'react'
import { Download, Wifi, WifiOff } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function AgentPwaControls() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)

    if ('serviceWorker' in navigator) {
      const initializeServiceWorker = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations
            .filter((registration) => registration.active?.scriptURL.endsWith('/agent-sw.js') && !registration.scope.endsWith('/agent/'))
            .map((registration) => registration.unregister()),
        )
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('plotkare-agent-') && cacheName !== 'plotkare-agent-static-v3')
              .map((cacheName) => caches.delete(cacheName)),
          )
        }
        await navigator.serviceWorker.register('/agent-sw.js', { scope: '/agent/' })
      }

      initializeServiceWorker().catch(() => {
        // PWA install is helpful for field work, but app usage must not fail if registration is unavailable.
      })
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
        {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {online ? 'Online' : 'Offline'}
      </span>
      {installEvent ? (
        <button type="button" onClick={install} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#1F2937]">
          <Download className="h-4 w-4" />
          Install
        </button>
      ) : null}
    </div>
  )
}
