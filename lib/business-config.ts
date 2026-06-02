function clean(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function email(value: string | undefined) {
  const normalized = clean(value)
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

function whatsapp(value: string | undefined) {
  const normalized = clean(value)
  return normalized && /^https:\/\/wa\.me\/\d+$/.test(normalized) ? normalized : null
}

export const publicBusinessConfig = {
  legalName: clean(process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME),
  generalEmail: email(process.env.NEXT_PUBLIC_GENERAL_EMAIL),
  supportEmail: email(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  officeAddressLine1: clean(process.env.NEXT_PUBLIC_OFFICE_ADDRESS_LINE_1),
  officeAddressLine2: clean(process.env.NEXT_PUBLIC_OFFICE_ADDRESS_LINE_2),
  supportHours: clean(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
  whatsappUrl: whatsapp(process.env.NEXT_PUBLIC_WHATSAPP_URL),
}

export function publicOfficeAddress() {
  return [publicBusinessConfig.officeAddressLine1, publicBusinessConfig.officeAddressLine2].filter(Boolean)
}

