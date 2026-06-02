import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { publicBusinessConfig } from '@/lib/business-config'

export function FloatingContactCta() {
  const whatsappUrl = publicBusinessConfig.whatsappUrl

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {publicBusinessConfig.generalEmail ? (
        <Link
          href={`mailto:${publicBusinessConfig.generalEmail}?subject=PlotKare%20enquiry`}
          className="premium-interactive rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-secondary"
        >
          Email us
        </Link>
      ) : null}
      {whatsappUrl ? (
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Talk to PlotKare on WhatsApp"
          className="premium-interactive flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-2 ring-white/80 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label="Talk to PlotKare on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
