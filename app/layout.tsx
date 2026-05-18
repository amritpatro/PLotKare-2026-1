import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { JsonLd } from '@/components/json-ld'
import { PostHogPageview } from '@/components/posthog-pageview'
import { SITE_NAME, canonicalPageUrl, absoluteUrl, getSiteUrl, withBasePath } from '@/lib/site-config'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const siteUrl = getSiteUrl()
const defaultOgImage = absoluteUrl('/opengraph-default.svg')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Property Asset Management in India`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Protect, track, grow, and trade property assets with PlotKare: inspections, documents, 3D visualization, value tracking, services, and verified listings.',
  keywords: [
    'property asset management India',
    'plot protection services India',
    'vacant land monitoring',
    'apartment management service',
    '3D property visualization',
    'verified property marketplace',
  ],
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: canonicalPageUrl('/'),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Property Asset Management in India`,
    description:
      'Inspection-first monitoring, legal document hygiene, 3D visualization, and resale-ready evidence for plots, apartments, flats, and land assets.',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} property asset management platform`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Property Asset Management in India`,
    description:
      'Inspection-first monitoring, legal document hygiene, 3D visualization, and resale-ready evidence for plots, apartments, flats, and land assets.',
    images: [defaultOgImage],
  },
  alternates: {
    canonical: canonicalPageUrl('/'),
  },
  icons: {
    icon: [
      {
        url: withBasePath('/icon-light-32x32.png'),
        media: '(prefers-color-scheme: light)',
      },
      {
        url: withBasePath('/icon-dark-32x32.png'),
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: withBasePath('/icon.svg'),
        type: 'image/svg+xml',
      },
    ],
    apple: withBasePath('/apple-icon.png'),
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: canonicalPageUrl('/'),
  email: 'hello@plotkare.in',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '2nd Floor, Krishna Towers, Siripuram',
    addressLocality: 'Visakhapatnam',
    postalCode: '530003',
    addressRegion: 'Andhra Pradesh',
    addressCountry: 'IN',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: canonicalPageUrl('/'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
        {children}
        <PostHogPageview />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
