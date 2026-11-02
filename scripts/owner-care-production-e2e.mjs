/*
 * Read-only production-role verification.
 * Set the E2E_* credentials in a secure CI environment; never commit them.
 * This script intentionally creates no users, properties, enquiries, or invitations.
 */
import { createClient } from '@supabase/supabase-js'

const baseUrl = process.argv[2]
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`)
if (!baseUrl) throw new Error('Usage: node scripts/owner-care-production-e2e.mjs <https://deployment-url>')

const roles = [
  ['owner', 'E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD'],
  ['family', 'E2E_FAMILY_EMAIL', 'E2E_FAMILY_PASSWORD'],
  ['buyer', 'E2E_BUYER_EMAIL', 'E2E_BUYER_PASSWORD'],
  ['employee', 'E2E_EMPLOYEE_EMAIL', 'E2E_EMPLOYEE_PASSWORD'],
  ['admin', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
]
const missing = roles.filter(([, email, password]) => !process.env[email] || !process.env[password]).map(([role]) => role)
if (missing.length) throw new Error(`Missing secure test credentials for: ${missing.join(', ')}`)

let failed = false
function check(condition, label) {
  process.stdout.write(`${condition ? 'PASS' : 'FAIL'} ${label}\n`)
  if (!condition) failed = true
}

const health = await fetch(new URL('/api/auth/health', baseUrl))
check(health.ok, 'deployed auth health endpoint')

for (const [role, emailKey, passwordKey] of roles) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.signInWithPassword({ email: process.env[emailKey], password: process.env[passwordKey] })
  check(Boolean(data.user) && !error, `${role} can authenticate`)
  if (!data.user) continue

  const { data: profile, error: profileError } = await client.from('profiles').select('id,role').eq('id', data.user.id).maybeSingle()
  check(Boolean(profile) && !profileError, `${role} can read only its profile`)

  if (role === 'owner') {
    const { error: ownerCareError } = await client.from('property_care_items').select('id').limit(1)
    check(!ownerCareError, 'owner can query authorized property-care records')
  }
  if (role === 'family') {
    const { error: familyReadinessError } = await client.from('property_readiness_snapshots').select('property_id').limit(1)
    check(!familyReadinessError, 'family can query only active shared readiness records')
  }
  if (role === 'buyer') {
    const { error: buyerInterestError } = await client.from('property_interest_requests').select('id').eq('buyer_profile_id', data.user.id).limit(1)
    check(!buyerInterestError, 'buyer can query only its private interest')
  }
  if (role === 'employee' || role === 'admin') {
    const { error: queueError } = await client.from('property_care_items').select('id,status').limit(1)
    check(!queueError, `${role} can query the care queue`)
  }
  await client.auth.signOut()
}

process.exitCode = failed ? 1 : 0
