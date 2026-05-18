export type BlogPost = {
  slug: string
  title: string
  description: string
  category: string
  readTime: string
  datePublished: string
  /** Plain-text paragraphs for SEO-friendly rendering */
  paragraphs: string[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-protect-your-plot-from-encroachment-india',
    title: 'How to Protect Your Plot from Encroachment in India',
    description:
      'A practical owner checklist for boundary evidence, inspection cadence, local escalation, and document hygiene.',
    category: 'Protection',
    readTime: '7 min read',
    datePublished: '2026-05-12',
    paragraphs: [
      'Encroachment usually starts quietly. A small access-path shift, temporary storage on one edge, a fence line moved by a few feet, or repeated parking near your frontage can become expensive when nobody records the early evidence.',
      'The first layer of protection is a clean property file. Keep the sale deed, tax receipts, EC, layout approval, survey sketch, and boundary notes in one place. When a field agent visits, the report should refer to the same plot number and known boundaries every time.',
      'The second layer is predictable inspection. Monthly or quarterly visits should capture all sides of the asset, approach roads, adjacent construction, visible stones or markers, and any new materials on site. Consistent photo angles matter more than dramatic photos.',
      'The third layer is escalation discipline. If something changes, separate facts from advice: what changed, when it was seen, what proof exists, and what next action is recommended. That keeps family, counsel, and local representatives working from the same evidence.',
      'PlotKare turns this routine into a digital trail: visual records, owner notes, road access observations, and document reminders that make remote ownership less dependent on memory or informal updates.',
    ],
  },
  {
    slug: 'ec-certificate-renewal-and-property-document-checklist',
    title: 'EC Certificate Renewal and Property Document Checklist for Owners',
    description:
      'What property owners should keep ready before inspections, refinancing, family transfer, or marketplace listing.',
    category: 'Documents',
    readTime: '6 min read',
    datePublished: '2026-05-12',
    paragraphs: [
      'An encumbrance certificate is only one part of a healthy property file. Owners should also track tax payments, mutation status, layout references, identity links, and any previous legal notices or survey reports.',
      'The mistake most owners make is waiting until a sale, loan, or dispute to find documents. By then, missing files create delay and weaken negotiating power. A living digital vault should be updated before urgency arrives.',
      'Build a recurring review rhythm. Once a quarter, confirm whether taxes are paid, whether any new encumbrance search is needed, and whether the latest inspection report matches the documents on file.',
      'For co-owned properties, store authority notes clearly. Who can speak to an agent, order a survey, approve a listing, or contact counsel? This prevents delays when one owner is outside the city or abroad.',
      'A property asset becomes more valuable when its paperwork is ready. Field evidence shows what is on the ground; document hygiene proves the owner can act when needed.',
    ],
  },
  {
    slug: 'from-vizag-launch-to-national-property-management',
    title: 'From Vizag Launch to National Property Management: How PlotKare Scales',
    description:
      'Why a local-first operating model can expand across India for plots, apartments, flats, and land assets.',
    category: 'Market',
    readTime: '5 min read',
    datePublished: '2026-05-12',
    paragraphs: [
      'Property management in India cannot be built only as software. Owners need a digital layer, but they also need local field evidence, document workflows, and verified marketplace readiness.',
      'A launch market gives the platform a disciplined operating model: inspection routes, report templates, service partner onboarding, local pricing, owner communication, and escalation playbooks.',
      'Once those workflows are repeatable, the same product can serve more asset types. A vacant plot needs boundary and access monitoring. An apartment needs association, maintenance, rental, and document visibility. A flat needs occupancy, repair, and resale readiness.',
      'The core idea stays the same: protect the asset, track its value and status, grow it through optional services, and prepare it for verified buying or selling when the owner is ready.',
      'This is why the map experience matters. It tells the story of local proof becoming a national property intelligence layer, one asset at a time.',
    ],
  },
  {
    slug: 'digilocker-property-document-verification-guide',
    title: 'How DigiLocker Can Support Property Document Verification',
    description:
      'A plain-English guide to combining digital identity, owner records, and property files for cleaner transactions.',
    category: 'Verification',
    readTime: '6 min read',
    datePublished: '2026-05-12',
    paragraphs: [
      'Digital document systems reduce friction, but they do not replace property due diligence. Owners still need a clear chain between identity, asset records, field evidence, and transaction documents.',
      'Use digital identity tools to organize what belongs to whom. Then connect those records to the property file: deed copies, tax references, inspection reports, EC records, listing history, and service logs.',
      'The value is not only storage. The value is speed. When a buyer, lawyer, banker, or family member asks for proof, the owner can share a structured record instead of forwarding scattered files.',
      'For remote owners, this is especially important. Time zones, family coordination, and unclear filenames slow down decisions. A verified digital property file keeps everyone looking at the same version of the truth.',
      'PlotKare is designed around that combined view: identity, document reminders, field reports, and asset status in one owner-facing place.',
    ],
  },
  {
    slug: 'ways-to-generate-income-from-vacant-plot-without-building',
    title: '10 Ways to Generate Income from a Vacant Plot Without Building',
    description:
      'A practical look at low-structure income ideas, from temporary leasing to solar, farming, storage, and signage.',
    category: 'Growth',
    readTime: '8 min read',
    datePublished: '2026-05-12',
    paragraphs: [
      'A vacant plot does not have to stay idle, but every income idea should begin with permissions, access, fencing, water, power, neighborhood fit, and agreement quality.',
      'Short-term options can include nursery use, container farming, mushroom kit cultivation, parking, storage, temporary yards, signboard leasing, or event support where local rules allow it.',
      'Longer-term options can include solar hosting, telecom or EV infrastructure support, warehousing partnerships, managed gardens, or lease-backed development planning. These need stronger contracts and clearer exit terms.',
      'The owner should compare income with risk. A small monthly return is not worth a boundary dispute, unpaid utility bill, or tenant who becomes hard to remove. Every service needs written terms, dated photos, and periodic inspection.',
      'The best use of an idle asset is the one that protects future sale value while producing current utility. That is why monitoring, legal checks, and service partner management belong together.',
    ],
  },
]

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug)
}
