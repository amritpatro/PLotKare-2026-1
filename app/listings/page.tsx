import type { Metadata } from 'next'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import ListingsPageClient from './listings-client'

export const metadata: Metadata = {
  title: 'Visakhapatnam open plots & apartments — listings hub',
  description:
    'Browse demo plots and apartments across Vizag belts with consultation-first listing details. Imagery is illustrative — verify every title on site.',
  alternates: { canonical: canonicalPageUrl('/listings/') },
  openGraph: {
    url: canonicalPageUrl('/listings/'),
    title: `Open plots & apartments | ${SITE_NAME}`,
    description: 'Demo inventory with filters for coastal Andhra buyers researching online first.',
    type: 'website',
    siteName: SITE_NAME,
  },
}

export default function ListingsPage() {
  return <ListingsPageClient />
}
