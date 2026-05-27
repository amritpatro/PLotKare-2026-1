export type FaqItem = {
  question: string
  answer: string
}

export const HOME_FAQS: FaqItem[] = [
  {
    question: 'What is a plot management service?',
    answer:
      'A plot management service gives vacant landowners a structured way to monitor boundaries, access paths, documents, and visible site changes. PlotKare coordinates field records and property documentation so an owner can make decisions without relying on occasional informal updates.',
  },
  {
    question: 'Who uses PlotKare?',
    answer:
      'PlotKare is designed for NRI landowners, out-of-station families with inherited or unattended land, investors managing multiple plots, and local owners who want documented property oversight without personally visiting every cycle.',
  },
  {
    question: 'How much does plot monitoring cost?',
    answer:
      'PlotKare uses consultation-led pricing. The scope depends on plot location, access conditions, documents available, and the inspection cadence required. Owners receive a written scope and pricing before any paid service begins.',
  },
  {
    question: 'What property documents can PlotKare organize?',
    answer:
      'Property files can include sale deeds, EC records, tax receipts, mutation records, layout or survey references, identity documents, photos, and inspection reports. Availability and review status remain visible to authorized users.',
  },
  {
    question: 'Can I share property records with family or an advisor?',
    answer:
      'Authorized users can access available inspection and document records through PlotKare and share appropriate records with family members or professional advisors. Any external delivery or coordination channel is confirmed during consultation.',
  },
]

export const VISAKHAPATNAM_FAQS: FaqItem[] = [
  {
    question: 'Is PlotKare available for plots in Bheemunipatnam and Madhurawada?',
    answer:
      'PlotKare is building field coverage from Visakhapatnam corridors including Bheemunipatnam and Madhurawada. Contact the team with the exact plot location so current availability and an appropriate inspection scope can be confirmed before registration.',
  },
  {
    question: 'Can NRIs review inspection records for a Visakhapatnam plot?',
    answer:
      'Yes. PlotKare is built for owners who cannot personally visit their property regularly. Authorized owners can review dated property records, submitted photographs, document status, and operational updates associated with their registered plot.',
  },
  {
    question: 'What happens if a boundary concern is observed?',
    answer:
      'A visible concern can be recorded against the property file with supporting notes and evidence made available to authorized users. PlotKare provides operational records and escalation visibility; legal decisions remain with the owner and qualified advisors.',
  },
  {
    question: 'How quickly can monitoring begin after registration?',
    answer:
      'The team first reviews the plot location, access details, available documents, and service requirements. A start timeline and written scope can then be confirmed during consultation based on coverage and current operational capacity.',
  },
  {
    question: 'Which documents are relevant for Andhra Pradesh plot owners?',
    answer:
      'Owners may submit sale deed, EC records, tax receipts, survey or layout documents, identity documents, and current property photographs. Required items and their review status are tracked through the appropriate PlotKare workflow.',
  },
  {
    question: 'Can a Visakhapatnam plot appear in the verified marketplace?',
    answer:
      'A property becomes customer-visible only after the applicable review process is completed and the listing is approved. Pending, rejected, or incomplete property submissions are not presented as verified public listings.',
  },
]

export function buildFaqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
