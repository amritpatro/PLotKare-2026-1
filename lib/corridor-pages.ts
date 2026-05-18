export type CorridorPage = {
  slug: string
  title: string
  description: string
  /** Short SEO body */
  paragraphs: string[]
}

export const CORRIDOR_PAGES: CorridorPage[] = [
  {
    slug: 'bheemunipatnam-plot-management',
    title: 'Bheemunipatnam Plot Management & Coastal Layout Monitoring',
    description:
      'Local SEO landing for NRIs and metro owners holding open plots near Bheemunipatnam phases — inspections, boundary photos, and document cadence.',
    paragraphs: [
      'Bheemunipatnam’s phased layouts mix fast-selling beach-adjacent inventory with longer-dated infrastructure. Owners who live abroad benefit from a written inspection scope that covers sand accretion zones, informal paths, and rear-lane encroachments — not only the road-facing edge.',
      'Pair plot visits with EC and layout compliance checks so future buyers see continuity, not gaps, when they diligence your file.',
    ],
  },
  {
    slug: 'madhurawada-land-monitoring',
    title: 'Madhurawada Land Monitoring for IT Corridor Investors',
    description:
      'Focused notes for buyers who treated Madhurawada as a “set and forget” land bank while working in Hyderabad or Bengaluru.',
    paragraphs: [
      'The IT corridor side of Vizag rewards liquidity when your plot file shows maintenance, not mystery. Monthly or quarterly photo sets help you explain boundary integrity to co-investors or family members who have never walked the parcel.',
      'Use the same coordinator for inspections and document pulls so questions do not bounce between silos.',
    ],
  },
  {
    slug: 'anakapalle-new-town-plots',
    title: 'Anakapalle New Town Plots: Field Evidence for Long-Distance Owners',
    description:
      'Anakapalle new town layouts move quickly; this page captures how PlotKare structures monitoring when you cannot drive the NH16 loop monthly.',
    paragraphs: [
      'High transaction velocity can mask encroachment risk — more construction traffic means more informal material storage on vacant edges. Inspection reports should call out equipment staging and temporary fencing explicitly.',
      'If you are staging a resale, attach dated photos to your listing pack so brokers are not improvising descriptions.',
    ],
  },
  {
    slug: 'pendurthi-layout-oversight',
    title: 'Pendurthi Layout Oversight & Rural Edge Encroachment Patterns',
    description:
      'Pendurthi’s growth belt behaves differently from beach towns; monitoring emphasises farm-edge creep and access easements.',
    paragraphs: [
      'Rural-adjacent layouts often see gradual path widening from farm equipment. Early photos make panchayat or revenue conversations shorter.',
      'Keep tax and mutation receipts aligned with inspection dates so your paper trail matches what the field team saw.',
    ],
  },
]

export function getCorridor(slug: string): CorridorPage | undefined {
  return CORRIDOR_PAGES.find((c) => c.slug === slug)
}

export function getCorridorSlugs(): string[] {
  return CORRIDOR_PAGES.map((c) => c.slug)
}
