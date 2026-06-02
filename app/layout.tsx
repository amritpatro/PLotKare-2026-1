import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { JsonLd } from '@/components/json-ld'
import { PostHogPageview } from '@/components/posthog-pageview'
import { ThreeConsoleSanitizer } from '@/components/three-console-sanitizer'
import { SITE_NAME, canonicalPageUrl, absoluteUrl, getSiteUrl, withBasePath } from '@/lib/site-config'
import { publicBusinessConfig, publicOfficeAddress } from '@/lib/business-config'
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
const defaultOgImage = absoluteUrl('/og-image.png')
const shouldLoadVercelAnalytics = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `Plot Management and Property Monitoring Services | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Monthly plot inspections, document tracking, and verified marketplace visibility for landowners across India. Book a free consultation.',
  keywords: [
    'plot management services India',
    'property monitoring services India',
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
    title: `Plot Management and Property Monitoring Services | ${SITE_NAME}`,
    description:
      'Monthly plot inspections, document tracking, and verified marketplace visibility for landowners across India.',
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
    title: `Plot Management and Property Monitoring Services | ${SITE_NAME}`,
    description:
      'Monthly plot inspections, document tracking, and verified marketplace visibility for landowners across India.',
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
    apple: withBasePath('/apple-touch-icon.png'),
  },
}

const officeAddress = publicOfficeAddress()
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: canonicalPageUrl('/'),
  ...(publicBusinessConfig.generalEmail ? { email: publicBusinessConfig.generalEmail } : {}),
  ...(officeAddress.length > 0
    ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: officeAddress.join(', '),
          addressLocality: 'Visakhapatnam',
          addressRegion: 'Andhra Pradesh',
          addressCountry: 'IN',
        },
      }
    : {}),
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
      <body className="overflow-x-hidden font-sans antialiased">
        <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
        <ThreeConsoleSanitizer />
        {children}
        <PostHogPageview />
        {shouldLoadVercelAnalytics && <Analytics />}
        {shouldLoadVercelAnalytics && <SpeedInsights />}
      </body>
    </html>
  )
}
