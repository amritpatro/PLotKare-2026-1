export type AdminCustomer = {
  id: string
  name: string
  email: string
  phone: string
  city: string
  plotsCount: number
  plan: 'Basic' | 'Standard' | 'Premium'
  joinedDate: string
  plotDetails: { plotNumber: string; location: string; size: string }[]
}

export type AdminRegistryPlot = {
  id: string
  plotNumber: string
  ownerName: string
  location: string
  size: string
  purchasePrice: string
  currentValue: string
  currentValueLakhs: number
  lastInspection: string
  status: string
}

export type AdminReportRow = {
  id: string
  month: string
  plotNumber: string
  owner: string
  agentName: string
  finding: string
  status: string
}

export type AdminPaymentRow = {
  id: string
  date: string
  customerName: string
  description: string
  amount: number
  status: string
}

const C_KEY = 'plotkare_admin_customers'
const P_KEY = 'plotkare_admin_registry_plots'
const R_KEY = 'plotkare_admin_reports'
const PAY_KEY = 'plotkare_admin_payments'

export const DEFAULT_ADMIN_CUSTOMERS: AdminCustomer[] = [
  {
    id: '1',
    name: 'Ravi Kumar',
    email: 'temp@temp.temp',
    phone: '(demo — replace with CRM)',
    city: 'Visakhapatnam',
    plotsCount: 2,
    plan: 'Standard',
    joinedDate: '12 Jan 2025',
    plotDetails: [
      { plotNumber: 'VZG-047', location: 'Kommadi Extension', size: '200 sq yards' },
      { plotNumber: 'VZG-112', location: 'Rushikonda', size: '267 sq yards' },
    ],
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@email.com',
    phone: '(demo — replace with CRM)',
    city: 'Dubai',
    plotsCount: 1,
    plan: 'Premium',
    joinedDate: '20 Feb 2025',
    plotDetails: [{ plotNumber: 'DXB-003', location: 'MVP Colony', size: '150 sq yards' }],
  },
  {
    id: '3',
    name: 'Suresh Rao',
    email: 'suresh@email.com',
    phone: '(demo — replace with CRM)',
    city: 'Houston',
    plotsCount: 1,
    plan: 'Basic',
    joinedDate: '5 Mar 2025',
    plotDetails: [{ plotNumber: 'HOU-901', location: 'Anakapalle New Town', size: '300 sq yards' }],
  },
]

export const DEFAULT_ADMIN_PLOTS: AdminRegistryPlot[] = [
  {
    id: 'a1',
    plotNumber: 'VZG-047',
    ownerName: 'Ravi Kumar',
    location: 'Kommadi Extension',
    size: '200 sq yards',
    purchasePrice: 'Consult hidden',
    currentValue: 'Consult for valuation',
    currentValueLakhs: 68,
    lastInspection: '02 May 2026',
    status: 'Active',
  },
  {
    id: 'a2',
    plotNumber: 'VZG-112',
    ownerName: 'Ravi Kumar',
    location: 'Rushikonda',
    size: '267 sq yards',
    purchasePrice: 'Consult hidden',
    currentValue: 'Consult for valuation',
    currentValueLakhs: 58,
    lastInspection: '15 Apr 2026',
    status: 'Active',
  },
  {
    id: 'a3',
    plotNumber: 'DXB-003',
    ownerName: 'Priya Sharma',
    location: 'MVP Colony',
    size: '150 sq yards',
    purchasePrice: 'Consult hidden',
    currentValue: 'Consult for valuation',
    currentValueLakhs: 52,
    lastInspection: '28 Mar 2026',
    status: 'Active',
  },
  {
    id: 'a4',
    plotNumber: 'HOU-901',
    ownerName: 'Suresh Rao',
    location: 'Anakapalle New Town',
    size: '300 sq yards',
    purchasePrice: 'Consult hidden',
    currentValue: 'Consult for valuation',
    currentValueLakhs: 75,
    lastInspection: '10 Mar 2026',
    status: 'Active',
  },
  {
    id: 'a5',
    plotNumber: 'VZG-088',
    ownerName: 'Ravi Kumar',
    location: 'Madhurawada',
    size: '240 sq yards',
    purchasePrice: 'Consult hidden',
    currentValue: 'Consult for valuation',
    currentValueLakhs: 64,
    lastInspection: '22 Feb 2026',
    status: 'Active',
  },
]

export const DEFAULT_ADMIN_REPORTS: AdminReportRow[] = [
  {
    id: 'r1',
    month: 'March 2026',
    plotNumber: 'VZG-047',
    owner: 'Ravi Kumar',
    agentName: 'Venkatesh Kumar',
    finding: 'Plot boundaries intact.',
    status: 'Completed',
  },
  {
    id: 'r2',
    month: 'February 2026',
    plotNumber: 'VZG-112',
    owner: 'Ravi Kumar',
    agentName: 'Rajesh Singh',
    finding: 'Water tank maintenance recommended.',
    status: 'Completed',
  },
  {
    id: 'r3',
    month: 'March 2026',
    plotNumber: 'DXB-003',
    owner: 'Priya Sharma',
    agentName: 'Venkatesh Kumar',
    finding: 'No encroachment.',
    status: 'Completed',
  },
  {
    id: 'r4',
    month: 'January 2026',
    plotNumber: 'HOU-901',
    owner: 'Suresh Rao',
    agentName: 'Rajesh Singh',
    finding: 'Boundary wall minor repairs.',
    status: 'Completed',
  },
  {
    id: 'r5',
    month: 'February 2026',
    plotNumber: 'VZG-088',
    owner: 'Ravi Kumar',
    agentName: 'Venkatesh Kumar',
    finding: 'All clear.',
    status: 'Completed',
  },
]

export const DEFAULT_ADMIN_PAYMENTS: AdminPaymentRow[] = [
  { id: 'p1', date: '28 Apr 2026', customerName: 'Ravi Kumar', description: 'Standard Plan consultation', amount: 0, status: 'Recorded' },
  { id: 'p2', date: '25 Apr 2026', customerName: 'Priya Sharma', description: 'Premium Plan consultation', amount: 0, status: 'Recorded' },
  { id: 'p3', date: '22 Apr 2026', customerName: 'Suresh Rao', description: 'Basic Plan consultation', amount: 0, status: 'Recorded' },
  { id: 'p4', date: '18 Apr 2026', customerName: 'Ravi Kumar', description: 'Solar amenity scope review', amount: 0, status: 'Advisor review' },
  { id: 'p5', date: '12 Apr 2026', customerName: 'Priya Sharma', description: 'Inspection add-on review', amount: 0, status: 'Advisor review' },
  { id: 'p6', date: '05 Apr 2026', customerName: 'Ravi Kumar', description: 'Standard Plan consultation', amount: 0, status: 'Recorded' },
  { id: 'p7', date: '28 Mar 2026', customerName: 'Suresh Rao', description: 'Basic Plan consultation', amount: 0, status: 'Recorded' },
  { id: 'p8', date: '20 Mar 2026', customerName: 'Priya Sharma', description: 'Premium Plan consultation', amount: 0, status: 'Recorded' },
]

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw) as T
    return p ?? fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function loadAdminCustomers(): AdminCustomer[] {
  const v = loadJson<AdminCustomer[]>(C_KEY, DEFAULT_ADMIN_CUSTOMERS)
  return v.length ? v : DEFAULT_ADMIN_CUSTOMERS
}

export function saveAdminCustomers(rows: AdminCustomer[]) {
  saveJson(C_KEY, rows)
}

export function loadAdminRegistryPlots(): AdminRegistryPlot[] {
  const v = loadJson<AdminRegistryPlot[]>(P_KEY, DEFAULT_ADMIN_PLOTS)
  return v.length ? v : DEFAULT_ADMIN_PLOTS
}

export function saveAdminRegistryPlots(rows: AdminRegistryPlot[]) {
  saveJson(P_KEY, rows)
}

export function loadAdminReports(): AdminReportRow[] {
  const v = loadJson<AdminReportRow[]>(R_KEY, DEFAULT_ADMIN_REPORTS)
  return v.length ? v : DEFAULT_ADMIN_REPORTS
}

export function saveAdminReports(rows: AdminReportRow[]) {
  saveJson(R_KEY, rows)
}

export function loadAdminPayments(): AdminPaymentRow[] {
  const v = loadJson<AdminPaymentRow[]>(PAY_KEY, DEFAULT_ADMIN_PAYMENTS)
  return v.length ? v : DEFAULT_ADMIN_PAYMENTS
}

export function saveAdminPayments(rows: AdminPaymentRow[]) {
  saveJson(PAY_KEY, rows)
}
