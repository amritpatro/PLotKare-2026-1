export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024
export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

export type DocumentRole = 'seller' | 'owner' | 'customer'
export type DocumentRequirement = {
  type: string
  label: string
  category: string
  description: string
  required: boolean
  propertyScoped: boolean
}

const identity = 'Identity & Personal Documents'
const title = 'Core Ownership & Title Documents'
const approvals = 'Building & Construction Approvals'
const finance = 'Financial & NOC Documents'
const evidence = 'Property Evidence'

export const documentRequirementsByRole: Record<DocumentRole, DocumentRequirement[]> = {
  seller: [
    { type: 'ownership_proof', label: 'Ownership proof', category: title, description: 'Title or ownership evidence for the listed property.', required: true, propertyScoped: true },
    { type: 'survey_copy', label: 'Survey copy', category: title, description: 'Survey reference or measured plot record.', required: true, propertyScoped: true },
    { type: 'layout_image', label: 'Layout approval / copy', category: approvals, description: 'Approved layout or sale-layout reference.', required: true, propertyScoped: true },
    { type: 'tax_receipt', label: 'Tax receipt', category: finance, description: 'Latest property tax receipt available to the seller.', required: true, propertyScoped: true },
    { type: 'ec', label: 'Encumbrance certificate', category: title, description: 'Supporting EC document for customer review.', required: false, propertyScoped: true },
    { type: 'property_photo', label: 'Property photographs', category: evidence, description: 'Recent real photographs of the property.', required: false, propertyScoped: true },
    { type: 'noc', label: 'NOC / additional proof', category: finance, description: 'Any applicable no-objection or supporting title certificate.', required: false, propertyScoped: true },
  ],
  owner: [
    { type: 'aadhaar', label: 'Aadhaar', category: identity, description: 'Identity proof for ownership verification.', required: true, propertyScoped: true },
    { type: 'pan', label: 'PAN', category: identity, description: 'Tax identity proof for account verification.', required: true, propertyScoped: true },
    { type: 'ownership_proof', label: 'Ownership / title proof', category: title, description: 'Registered deed or title evidence.', required: true, propertyScoped: true },
    { type: 'ec', label: 'Encumbrance certificate', category: title, description: 'Latest available encumbrance certificate.', required: true, propertyScoped: true },
    { type: 'survey_document', label: 'Survey document', category: title, description: 'Survey or boundary document for the property.', required: true, propertyScoped: true },
    { type: 'tax_receipt', label: 'Tax receipt', category: finance, description: 'Latest local property tax receipt.', required: true, propertyScoped: true },
    { type: 'property_photo', label: 'Property photographs', category: evidence, description: 'Recent site photographs for inspection readiness.', required: true, propertyScoped: true },
    { type: 'building_approval', label: 'Building approval', category: approvals, description: 'Construction or layout approval where applicable.', required: false, propertyScoped: true },
    { type: 'noc', label: 'NOC documents', category: finance, description: 'No-objection certificates where applicable.', required: false, propertyScoped: true },
    { type: 'financial_supporting', label: 'Financial supporting record', category: finance, description: 'Additional financial or municipal supporting document.', required: false, propertyScoped: true },
  ],
  customer: [
    { type: 'aadhaar', label: 'Aadhaar', category: identity, description: 'Identity proof for your customer verification.', required: true, propertyScoped: false },
    { type: 'pan', label: 'PAN', category: identity, description: 'Tax identity proof for your customer record.', required: true, propertyScoped: false },
    { type: 'agreement', label: 'Agreement copy', category: title, description: 'Agreement relating to a linked property, if available.', required: true, propertyScoped: true },
    { type: 'registration_copy', label: 'Registration copy', category: title, description: 'Registered ownership or tenancy record for a linked property.', required: true, propertyScoped: true },
    { type: 'property_photo', label: 'Property photographs', category: evidence, description: 'Recent property evidence for support or verification.', required: false, propertyScoped: true },
    { type: 'supporting_document', label: 'Supporting document', category: finance, description: 'Additional supporting ownership or service document.', required: false, propertyScoped: true },
  ],
}

export function findDocumentRequirement(role: DocumentRole, type: string) {
  return documentRequirementsByRole[role].find((requirement) => requirement.type === type)
}
