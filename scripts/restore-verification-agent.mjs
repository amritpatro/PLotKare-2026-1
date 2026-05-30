import { createClient } from '@supabase/supabase-js'

const SNAPSHOT = {
  adminEmail: 'qa-admin-20260525151434@qa.plotkare.local',
  adminFullName: 'QA Admin 20260525151434',
  profileEmail: 'qa-employee-20260525151434@qa.plotkare.local',
  profileFullName: 'QA Employee 20260525151434',
  employeeId: 'ec562c89-c854-4fd5-897a-8390ae23dcbc',
  requesterEmail: 'qa-customer-20260525151434@qa.plotkare.local',
  requesterFullName: 'QA Customer 20260525151434',
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

function readArg(name, fallback) {
  const prefix = `--${name}=`
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : fallback
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

async function findAuthUserId(supabase, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error

    const match = data.users.find((user) => user.email === email)
    if (match) return match.id

    if (!data.nextPage) break
  }

  return null
}

async function ensureAuthUser(supabase, { email, password, fullName }) {
  const existingId = await findAuthUserId(supabase, email)
  if (existingId) return existingId

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (error) throw error
  if (!data.user?.id) {
    throw new Error(`Auth user creation returned no user id for ${email}`)
  }

  return data.user.id
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const dryRun = process.argv.includes('--dry-run')
  const confirm = process.argv.includes('--confirm')

  const profileEmail = readArg('profile-email', process.env.PROFILE_EMAIL || SNAPSHOT.profileEmail)
  const profileFullName = readArg('profile-full-name', process.env.PROFILE_FULL_NAME || SNAPSHOT.profileFullName)
  const employeeId = readArg('employee-id', process.env.EMPLOYEE_ID || SNAPSHOT.employeeId)
  const documentId = readArg('document-id', process.env.DOCUMENT_ID || SNAPSHOT.documentId)
  const verificationRequestId = readArg(
    'verification-request-id',
    process.env.VERIFICATION_REQUEST_ID || SNAPSHOT.verificationRequestId,
  )
  const requesterEmail = readArg('requester-email', process.env.REQUESTER_EMAIL || SNAPSHOT.requesterEmail)
  const requesterFullName = readArg('requester-full-name', process.env.REQUESTER_FULL_NAME || SNAPSHOT.requesterFullName)
  const adminEmail = readArg('admin-email', process.env.ADMIN_EMAIL || SNAPSHOT.adminEmail)
  const adminFullName = readArg('admin-full-name', process.env.ADMIN_FULL_NAME || SNAPSHOT.adminFullName)
  const password = process.env.QA_RESTORE_PASSWORD || 'PlotKareQA!2026'
  const dueAt = parseIsoDate(process.env.VERIFICATION_DUE_AT, '2026-05-26T15:38:25.465304+00:00')
  const assignedBy = process.env.ASSIGNED_BY || null

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          profileEmail,
          profileFullName,
          employeeId,
          requesterEmail,
          requesterFullName,
          adminEmail,
          adminFullName,
          documentId,
          verificationRequestId,
          dueAt,
          assignedBy,
          password: '[redacted]',
          note: 'Dry run only; auth users and rows are not created.',
        },
        null,
        2,
      ),
    )
    return
  }

  if (!dryRun && !confirm) {
    console.error('This script will modify Supabase data. Rerun with --confirm to proceed. Use --dry-run to preview.')
    process.exit(1)
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let profileId, requesterId, adminId
  try {
    console.log('Ensuring auth users (auth.admin)')
    profileId = await ensureAuthUser(supabase, { email: profileEmail, password, fullName: profileFullName })
    requesterId = await ensureAuthUser(supabase, { email: requesterEmail, password, fullName: requesterFullName })
    adminId = await ensureAuthUser(supabase, { email: adminEmail, password, fullName: adminFullName })
  } catch (err) {
    console.error('Failed to ensure auth users:', err instanceof Error ? err.message : err)
    throw err
  }

  const profilePayload = {
    id: profileId,
    email: profileEmail,
    full_name: profileFullName,
    role: 'employee',
    employee_role: 'verification_agent',
    role_assigned_at: new Date().toISOString(),
    role_assigned_by: assignedBy,
  }

  const employeePayload = {
    id: employeeId,
    profile_id: profileId,
    employee_role: 'verification_agent',
    active: true,
  }

  const verificationRequestPayload = {
    id: verificationRequestId,
    entity_type: 'document',
    entity_id: documentId,
    requester_id: requesterId,
    assigned_employee_id: employeeId,
    status: 'submitted',
    priority: 'urgent',
    due_at: dueAt,
    escalation_level: 0,
    admin_notes: 'Restored verification-agent QA data',
    metadata: {
      source: 'restore-verification-agent',
      document_id: documentId,
      profile_id: profileId,
    },
  }

  const employeeLogPayload = {
    employee_id: employeeId,
    profile_id: profileId,
    entity_type: 'document',
    entity_id: documentId,
    action: 'verification_agent_restored',
    previous_status: null,
    new_status: 'submitted',
    note: 'Restored QA verification-agent employee and verification queue item',
    metadata: {
      source: 'restore-verification-agent',
      verification_request_id: verificationRequestId,
    },
  }

  const adminProfilePayload = {
    id: adminId,
    email: adminEmail,
    full_name: adminFullName,
    role: 'admin',
    role_assigned_at: new Date().toISOString(),
    role_assigned_by: null,
  }

  if (dryRun) {
    console.log(JSON.stringify({ profilePayload, employeePayload, verificationRequestPayload, employeeLogPayload }, null, 2))
    return
  }

  try {
    console.log('Upserting profile:', profilePayload.id)
    const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
    if (profileError) throw profileError
  } catch (err) {
    console.error('Failed to upsert profile:', err instanceof Error ? err.message : err)
    throw err
  }

  try {
    console.log('Upserting admin profile:', adminProfilePayload.id)
    const { error: adminProfileError } = await supabase.from('profiles').upsert(adminProfilePayload, { onConflict: 'id' })
    if (adminProfileError) throw adminProfileError
  } catch (err) {
    console.error('Failed to upsert admin profile:', err instanceof Error ? err.message : err)
    throw err
  }

  try {
    console.log('Upserting employee record for profile:', profileId)
    const { error: employeeError } = await supabase.from('employees').upsert(employeePayload, { onConflict: 'profile_id' })
    if (employeeError) throw employeeError
  } catch (err) {
    console.error('Failed to upsert employee:', err instanceof Error ? err.message : err)
    throw err
  }

  try {
    console.log('Updating document:', documentId)
    const { error: documentError } = await supabase
      .from('property_documents')
      .update({
        verification_status: 'submitted',
        assigned_employee_id: employeeId,
        priority: 'urgent',
        due_at: dueAt,
        escalation_level: 0,
      })
      .eq('id', documentId)
    if (documentError) throw documentError
  } catch (err) {
    console.error('Failed to update property_documents:', err instanceof Error ? err.message : err)
    throw err
  }

  try {
    console.log('Upserting verification request for entity:', verificationRequestPayload.entity_id)
    const { error: requestError } = await supabase
      .from('verification_requests')
      .upsert(verificationRequestPayload, { onConflict: 'entity_type,entity_id' })
    if (requestError) throw requestError
  } catch (err) {
    console.error('Failed to upsert verification_request:', err instanceof Error ? err.message : err)
    throw err
  }

  try {
    console.log('Inserting employee work log')
    const { error: logError } = await supabase.from('employee_work_logs').insert(employeeLogPayload)
    if (logError) throw logError
  } catch (err) {
    console.error('Failed to insert employee_work_logs:', err instanceof Error ? err.message : err)
    throw err
  }

  const { data: employeeRow, error: employeeLookupError } = await supabase
    .from('employees')
    .select('id,profile_id,employee_role,active')
    .eq('id', employeeId)
    .maybeSingle()

  if (employeeLookupError) throw employeeLookupError

  console.log(
    JSON.stringify(
      {
        restored: true,
        employee: employeeRow,
        documentId,
        verificationRequestId,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})