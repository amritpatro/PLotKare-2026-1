'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

const MAIL_ENQUIRY = 'mailto:hello@plotkare.in?subject=PlotKare%20enquiry'

export function FloatingContactCta() {
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://wa.me/'

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      <Link
        href={MAIL_ENQUIRY}
        className="rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-secondary"
      >
        Email us
      </Link>
      <Link
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Talk to PlotKare on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-white/80 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        aria-label="Talk to PlotKare on WhatsApp"
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </Link>
    </div>
  )
}
