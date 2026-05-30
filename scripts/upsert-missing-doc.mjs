import { createClient } from '@supabase/supabase-js'

const SNAPSHOT = {
  requesterEmail: 'qa-customer-20260525151434@qa.plotkare.local',
  employeeId: 'ec562c89-c854-4fd5-897a-8390ae23dcbc',
  documentId: 'a92edd8b-0c43-4861-a9d8-fedf83c9e63c',
  verificationRequestId: '838198ea-fe76-4a51-8fa6-eb9d4e749feb',
}

function env(name, fallback = '') {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseIsoDate(value, fallback) {
  const candidate = value || fallback
  if (!candidate) return null
  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date: ${candidate}`)
  }
  return parsed.toISOString()
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')

  const requesterEmail = process.env.REQUESTER_EMAIL || SNAPSHOT.requesterEmail
  const employeeId = process.env.EMPLOYEE_ID || SNAPSHOT.employeeId
  const documentId = process.env.DOCUMENT_ID || SNAPSHOT.documentId
  const dueAt = parseIsoDate(process.env.VERIFICATION_DUE_AT, '2026-05-26T15:38:25.465304+00:00')
  const objectPath = process.env.DOCUMENT_OBJECT_PATH || `${requesterEmail}/restored-qa-document.pdf`

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // find requester profile id
    const { data: requesterProfiles, error: reqErr } = await supabase.from('profiles').select('id').eq('email', requesterEmail).limit(1)
    if (reqErr) throw reqErr
    const requesterProfileId = requesterProfiles?.[0]?.id ?? null

    const { data: requesterCustomers, error: customerErr } = await supabase
      .from('customers')
      .select('id,profile_id')
      .eq('profile_id', requesterProfileId ?? '')
      .limit(1)
    if (customerErr) throw customerErr
    const requesterCustomerId = requesterCustomers?.[0]?.id ?? null

    const payload = {
      id: documentId,
      title: 'Restored QA document',
      document_type: 'identity',
      bucket: 'property-documents',
      object_path: objectPath,
      verification_status: 'submitted',
      customer_id: requesterCustomerId,
      assigned_employee_id: employeeId,
      priority: 'urgent',
      due_at: dueAt,
      escalation_level: 0,
      created_at: new Date().toISOString(),
      visibility: 'internal',
    }

    console.log('Upserting property_documents with id:', documentId)
    const { error } = await supabase.from('property_documents').upsert(payload, { onConflict: 'id' })
    if (error) throw error

    console.log('Upsert successful. Verifying row...')
    const { data: rows, error: fetchErr } = await supabase.from('property_documents').select('*').eq('id', documentId).limit(1)
    if (fetchErr) throw fetchErr
    console.log(JSON.stringify(rows, null, 2))
  } catch (err) {
    console.error('Upsert failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
