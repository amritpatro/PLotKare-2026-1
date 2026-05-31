import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { FloatingContactCta } from '@/components/floating-contact-cta'
import { HeroSection } from '@/components/sections/hero'
import { TrustStrip } from '@/components/sections/trust-strip'
import { ProblemSection } from '@/components/sections/problem'
import { ServicesSection } from '@/components/sections/services'
import { PlotVisualizationSection } from '@/components/sections/plot-visualization'
import { HowItWorksSection } from '@/components/sections/how-it-works'
import { LandUtilisationSection } from '@/components/sections/land-utilisation'
import { StatisticsSection } from '@/components/sections/statistics'
import { AvailablePlotsShowcaseSection } from '@/components/sections/available-plots-showcase'
import { PricingSection } from '@/components/sections/pricing'
import { MonitoringInsightsSection } from '@/components/sections/testimonials'
import { AwardsSection } from '@/components/sections/awards'
import { NewsroomSection } from '@/components/sections/newsroom'
import { ContactSection } from '@/components/sections/contact'
import { FaqSection } from '@/components/sections/faq'
import { Footer } from '@/components/footer'
import { JsonLd } from '@/components/json-ld'
import { SITE_NAME, canonicalPageUrl } from '@/lib/site-config'
import { getVerifiedPublicListings } from '@/lib/public-listings-server'
import { HOME_FAQS, buildFaqSchema } from '@/lib/marketing-seo'

const HOME_TITLE = `Plot Management and Property Monitoring Services | ${SITE_NAME}`
const HOME_DESCRIPTION =
  'Monthly plot inspections, encroachment monitoring, legal document tracking, and verified marketplace for landowners across India. Book a free consultation.'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: canonicalPageUrl('/'),
  },
  openGraph: {
    url: canonicalPageUrl('/'),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
}

export default async function HomePage() {
  const verifiedListings = await getVerifiedPublicListings(3)
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Plot Management and Property Monitoring',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: canonicalPageUrl('/'),
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    description: HOME_DESCRIPTION,
  }

  return (
    <main>
      <JsonLd data={[serviceSchema, buildFaqSchema(HOME_FAQS)]} />
      <Navigation />
      <HeroSection
        supportingLink={{
          href: '/visakhapatnam/',
          label: 'Explore plot management in Visakhapatnam',
        }}
        quickAnswer="PlotKare coordinates monthly plot inspections with geotagged photos, encroachment monitoring, EC certificate and document tracking, and a verified property marketplace for landowners across India. Owners receive a PDF report every inspection cycle. Pricing is confirmed after a free consultation call with no billing before scope is agreed."
      />
      <TrustStrip />
      <ProblemSection />
      <ServicesSection />
      <PlotVisualizationSection />
      <HowItWorksSection />
      <LandUtilisationSection />
      <StatisticsSection />
      <AvailablePlotsShowcaseSection initialListings={verifiedListings} />
      <PricingSection />
      <MonitoringInsightsSection />
      <AwardsSection />
      <NewsroomSection />
      <FaqSection
        heading="Frequently Asked Questions About Plot Management"
        introduction="Direct answers for owners deciding how to monitor vacant property and keep its records usable."
        items={HOME_FAQS}
      />
      <ContactSection />
      <Footer />
      <FloatingContactCta />
    </main>
  )
}
