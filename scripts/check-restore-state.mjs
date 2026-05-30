import { createClient } from '@supabase/supabase-js'

const SNAPSHOT = {
  profileEmail: 'qa-employee-20260525151434@qa.plotkare.local',
  profileFullName: 'QA Employee 20260525151434',
  employeeId: 'ec562c89-c854-4fd5-897a-8390ae23dcbc',
  requesterEmail: 'qa-customer-20260525151434@qa.plotkare.local',
  requesterFullName: 'QA Customer 20260525151434',
  adminEmail: 'qa-admin-20260525151434@qa.plotkare.local',
  adminFullName: 'QA Admin 20260525151434',
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

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')

  const profileEmail = process.env.PROFILE_EMAIL || SNAPSHOT.profileEmail
  const adminEmail = process.env.ADMIN_EMAIL || SNAPSHOT.adminEmail
  const requesterEmail = process.env.REQUESTER_EMAIL || SNAPSHOT.requesterEmail
  const documentId = process.env.DOCUMENT_ID || SNAPSHOT.documentId
  const employeeId = process.env.EMPLOYEE_ID || SNAPSHOT.employeeId
  const verificationRequestId = process.env.VERIFICATION_REQUEST_ID || SNAPSHOT.verificationRequestId

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const out = {}

  try {
    const { data: profileRows, error: pErr } = await supabase.from('profiles').select('id,email,full_name,role,employee_role').eq('email', profileEmail)
    if (pErr) throw pErr
    out.profile = profileRows

    const { data: adminRows, error: aErr } = await supabase.from('profiles').select('id,email,full_name,role').eq('email', adminEmail)
    if (aErr) throw aErr
    out.admin = adminRows

    const { data: requesterRows, error: rErr } = await supabase.from('profiles').select('id,email,full_name').eq('email', requesterEmail)
    if (rErr) throw rErr
    out.requester = requesterRows

    const { data: employeeRows, error: eErr } = await supabase.from('employees').select('id,profile_id,employee_role,active').or(`id.eq.${employeeId},profile_id.eq.${profileRows?.[0]?.id ?? ''}`)
    if (eErr) throw eErr
    out.employee = employeeRows

    const { data: docRows, error: dErr } = await supabase.from('property_documents').select('id,verification_status,assigned_employee_id,priority,due_at').eq('id', documentId)
    if (dErr) throw dErr
    out.property_document = docRows

    const { data: vrById, error: vrErr } = await supabase.from('verification_requests').select('*').eq('id', verificationRequestId)
    if (vrErr) throw vrErr
    out.verification_request_by_id = vrById

    const { data: vrByEntity, error: vreErr } = await supabase.from('verification_requests').select('*').eq('entity_type', 'document').eq('entity_id', documentId)
    if (vreErr) throw vreErr
    out.verification_request_by_entity = vrByEntity

    const { data: logs, error: lErr } = await supabase.from('employee_work_logs').select('*').eq('entity_id', documentId).limit(10)
    if (lErr) throw lErr
    out.employee_work_logs = logs

    console.log(JSON.stringify(out, null, 2))
  } catch (err) {
    console.error('Check failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
