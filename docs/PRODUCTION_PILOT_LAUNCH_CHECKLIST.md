# PlotKare Production Pilot Launch Checklist

Status key: `blocked`, `pending`, `in_progress`, `passed`, `failed`, `deferred`.

Launch rule: do not open public launch until every Critical/High security gate is `passed`. If any Critical item is `failed`, deployment is blocked. Controlled pilot is limited to 3-5 invited users after Phases 1-5 pass.

## Phase 0: Scope Freeze

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Apartments deferred until 5 paying plot customers complete the core flow | High | passed | Product | `docs/APARTMENT_MODULE_ROADMAP.md` |
| Razorpay live payments deferred until pilot stability and webhook verification | High | pending | Product/Ops | Manual billing for pilot |
| WhatsApp automation and loan integrations deferred | Medium | pending | Product/Ops | Pilot scope note |
| Single checklist tracks every launch gate | High | passed | Engineering | This file |

## Phase 1: External Auth And Email

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Fresh Resend API key created | Critical | blocked | DNS/Email owner | Requires Resend dashboard access |
| `plotkare.in` verified in Resend | Critical | blocked | DNS/Email owner | Requires DNS records |
| SPF record added | Critical | blocked | DNS owner | Resend DNS evidence |
| DKIM record added | Critical | blocked | DNS owner | Resend DNS evidence |
| DMARC record added | High | blocked | DNS owner | DNS evidence |
| Supabase Auth SMTP configured with Resend | Critical | blocked | Supabase owner | Supabase Auth SMTP screenshot |
| Vercel protected env has valid `RESEND_API_KEY` | Critical | blocked | Vercel owner | Vercel env name only, no value |
| Signup confirmation email arrives | Critical | blocked | QA | Inbox screenshot, no tokens shown |
| Password reset email arrives and reaches `/update-password` | Critical | blocked | QA | Inbox + browser evidence |
| Google OAuth client created | High | blocked | Google/Supabase owner | Google Cloud OAuth screenshot |
| Supabase Google provider enabled | High | blocked | Supabase owner | `/api/auth/providers` returns `google:true` |
| Redirect allowlist includes local, preview, and production `/auth/callback` | High | blocked | Supabase owner | Supabase redirect allowlist screenshot |
| Leaked password protection enabled | High | failed | Supabase owner | Supabase security advisor reports `auth_leaked_password_protection` disabled |
| Password reset link is single-use and expires | High | blocked | QA | Reuse/expired-link evidence |

## Phase 2: Database, RLS, Storage, IDOR, Realtime

Run this SQL before live testing:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| RLS enabled on all sensitive public tables | Critical | passed | Supabase owner | MCP SQL: 48 public tables checked, `rls_disabled_count = 0` |
| Policies reviewed for profiles/customers/properties/plots | Critical | in_progress | Security QA | MCP policy inventory pulled; live IDOR still required |
| Policies reviewed for documents/support/inspections/photos | Critical | in_progress | Security QA | MCP policy inventory pulled; live IDOR/storage tests still required |
| Policies reviewed for listings/notifications/audit/payments/employees/agent_locations | Critical | in_progress | Security QA | MCP policy inventory pulled; broad grants/advisor warnings need follow-up |
| User A cannot read User B plot/property/profile | Critical | blocked | Security QA | Unauthenticated plot route returns `401`; cross-user test blocked because supplied non-owner account did not authenticate |
| User A cannot access User B document signed URL endpoint | Critical | blocked | Security QA | `401/403/404` evidence |
| Seller cannot read owner documents | Critical | blocked | Security QA | `401/403/404` evidence |
| Customer cannot read another customer records | Critical | blocked | Security QA | `401/403/404` evidence |
| Employee cannot access admin-only APIs | Critical | blocked | Security QA | `401/403/404` evidence |
| Field agent cannot access unassigned inspections | Critical | blocked | Security QA | `401/403/404` evidence |
| Direct private storage URLs fail | High | pending | Security QA | Buckets verified private; browser/API direct-link evidence still needed |
| Guessed storage object paths fail | High | pending | Security QA | Private buckets verified; guessed-path test still needed |
| Property document signed URL expires quickly | High | in_progress | Engineering/QA | Code uses 90 seconds; live expiry test needed |
| Admin document access creates audit row | High | in_progress | Engineering/QA | Access route logs `document.admin_accessed`; live audit evidence needed |
| Realtime support/listings isolation verified | High | blocked | Security QA | Two-browser evidence |
| Untested realtime channels disabled or deferred for pilot | High | pending | Engineering | Channel inventory |

## Phase 3: API Hardening And Accountability

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Auth/contact rate limits active | High | in_progress | Engineering/QA | Contact local test passed: malformed POSTs returned `400` x5 then `429`; auth 429 still needs test |
| Upload route rate limits active | High | in_progress | Engineering/QA | Code verified on document/property/inspection upload-url routes; authenticated 429 test needed |
| Agent workflow rate limits active | High | in_progress | Engineering/QA | Code verified on arrival/photo/submit routes; authenticated 429 test needed |
| Admin mutation/storage-check rate limits active | High | in_progress | Engineering/QA | Code verified on approve/reject/storage-check; admin-session 429 test needed |
| Upstash configured in production | High | blocked | Vercel owner | Env names only, no values |
| Audit redaction prevents signed URLs, object paths, JWTs, passwords, Aadhaar, bank data, phone/email leaks | Critical | in_progress | Engineering/QA | `lib/audit.ts` redacts sensitive keys/URLs; live log review still needed |
| Login success/failure audited | High | in_progress | Engineering/QA | Code added; live audit evidence needed |
| Signup request/failure audited | High | in_progress | Engineering/QA | Code added; live audit evidence needed |
| Password reset request audited | High | in_progress | Engineering/QA | Code added; live audit evidence needed |
| Document upload/access/approve/reject audited | High | in_progress | Engineering/QA | Code partially exists; live evidence needed |
| Inspection submit/approve/reject audited | High | in_progress | Engineering/QA | Code exists; live evidence needed |
| Listing archive audited | High | in_progress | Engineering/QA | Code exists; live evidence needed |
| Support create/resolve audited | Medium | pending | Engineering/QA | Verify live |
| Aadhaar/PAN/bank fields masked in UI/logs/API responses | Critical | pending | Engineering/QA | Code review + API response evidence |

## Phase 4: Role Flow E2E

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Land owner signup to onboarding to document upload to support ticket | Critical | blocked | QA | Email first |
| Plot seller onboarding, approval, listing, archive | Critical | blocked | QA | Email + admin fixture needed |
| Plot buyer/customer onboarding, browse listing, inquiry, support | High | blocked | QA | Email first |
| Admin customer list, verification, listing archive, inspection review, audit viewer | High | pending | QA | Test account evidence |
| Employee/support ticket queue, reply, internal note, resolve | High | pending | QA | Test account evidence |
| Field agent assignment, GPS arrival, four photos, checklist, submit | Critical | blocked | QA | Real phone + fixture needed |
| Admin approval generates dashboard-ready report/PDF or marked manual pilot limitation | High | pending | Engineering/QA | Approval test evidence |

## Phase 5: Production Readiness

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Production canonical points to final domain, not preview or development hosts | High | blocked | Vercel/DNS owner | View-source evidence |
| No placeholder contact/email/WhatsApp/address/support-hours data | High | blocked | Operations owner | Verified business data |
| No fake/test listings or dummy phone numbers on production | High | pending | Operations/QA | Public page screenshot |
| Lighthouse median recorded for production homepage/city/login | Medium | blocked | QA | Production URL needed |
| Sentry receives deliberate server error | High | blocked | Monitoring owner | Sentry event screenshot |
| Vercel logs do not expose secrets/sensitive payloads | Critical | blocked | Vercel owner | Log review |
| `/api/health` returns 200 on production | High | blocked | QA | Production URL evidence |

## Phase 6: Controlled Pilot

| Gate | Priority | Status | Owner | Evidence |
| --- | --- | --- | --- | --- |
| Invite only 3-5 known users | High | pending | Product/Ops | Pilot list |
| Manual billing only | Medium | pending | Operations | Invoice process |
| Daily pilot checks for auth/email/document/support/inspection/Sentry/storage | High | pending | Operations | Daily checklist |
| No Critical or High pilot defect remains before public launch | Critical | pending | Product/Engineering | Defect log |

## External Blockers To Clear

- Resend access and new valid API key.
- DNS access for `plotkare.in`.
- Supabase dashboard access for SMTP, OAuth, leaked-password protection, redirect allowlist, RLS verification.
- Google Cloud access for OAuth client.
- Vercel access for production env vars, logs, deployment, and domain config.
- Working test-account credentials for at least two non-admin users with owned plot/property fixtures.
- Test fixtures for at least two users per role and one assigned field inspection.
