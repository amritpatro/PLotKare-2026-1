import type { Metadata } from 'next'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getVerifiedPublicListings } from '@/lib/public-listings-server'
import ListingsPageClient from './listings-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visakhapatnam verified plots & apartments — listings hub',
  description:
    'Browse PlotKare verified plots and apartments across Vizag belts with consultation-first listing details.',
  alternates: { canonical: canonicalPageUrl('/listings/') },
  openGraph: {
    url: canonicalPageUrl('/listings/'),
    title: `Verified plots & apartments | ${SITE_NAME}`,
    description: 'Approved inventory with filters for coastal Andhra buyers researching online first.',
    type: 'website',
    siteName: SITE_NAME,
  },
}

export default async function ListingsPage() {
  const listings = await getVerifiedPublicListings()
  return <ListingsPageClient initialListings={listings} />
}
