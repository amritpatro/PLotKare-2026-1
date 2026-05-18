'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Plot3DView } from '@/components/plot-3d-scene'

export type Plot3DViewerModalProps = {
  open: boolean
  onClose: () => void
  plotNumber: string
  /** Relative to 200 sq yards → ground 8×8 */
  sizeRatio: number
}

export function Plot3DViewerModal({ open, onClose, plotNumber, sizeRatio }: Plot3DViewerModalProps) {
  const [dragHintVisible, setDragHintVisible] = useState(true)

  useEffect(() => {
    if (!open) return
    setDragHintVisible(true)
    const t = setTimeout(() => setDragHintVisible(false), 4000)
    return () => clearTimeout(t)
  }, [open, plotNumber])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#050505]"
      role="dialog"
      aria-modal="true"
      aria-label="3D plot view"
      onClick={onClose}
    >
      <header
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 md:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="font-mono text-lg font-semibold text-primary md:text-xl"
          style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
        >
          {plotNumber}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 items-stretch justify-center px-4 pb-2 pt-4 md:px-8"
          onClick={onClose}
        >
          <div
            className="flex h-full min-h-[280px] w-full max-w-5xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Plot3DView
              plotLabel={plotNumber}
              sizeRatio={sizeRatio}
              showDragHint={false}
              className="min-h-0 flex-1"
            />
          </div>
        </div>

        <div
          className={`pointer-events-none shrink-0 pb-6 pt-2 text-center font-mono text-xs text-white/45 transition-opacity duration-700 ${
            dragHintVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          onClick={(e) => e.stopPropagation()}
        >
          Drag to rotate
        </div>
      </div>
    </div>
  )
}
