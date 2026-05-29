'use client'

import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export function AgentPwaControls() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw-agent.js', { scope: '/agent/' })
    }
    const ready = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', ready)
    return () => window.removeEventListener('beforeinstallprompt', ready)
  }, [])

  if (!installEvent) return null
  return (
    <button
      type="button"
      onClick={async () => {
        await installEvent.prompt()
        await installEvent.userChoice
        setInstallEvent(null)
      }}
      className="fixed bottom-20 right-4 z-30 flex min-h-12 items-center gap-2 rounded-lg bg-[#C0392B] px-4 text-sm font-semibold text-white shadow-lg"
    >
      <Download className="h-4 w-4" />
      Install Field App
    </button>
  )
}
