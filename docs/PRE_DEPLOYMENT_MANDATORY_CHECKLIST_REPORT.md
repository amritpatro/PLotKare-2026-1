# PlotKare Mandatory Pre-Deployment Checklist Report

Generated: 2026-06-03
Branch: codex/predeploy-hardening
Target domain: plotkare.in
Target production app after domain cutover: https://plotkare.in/

This report follows the mandatory pre-deployment prompt. Secret values were not printed, copied, or included.

## Executive Decision

Deployment status: BLOCKED

Reason: the code hardening work is largely complete, but market deployment cannot be approved until owner-controlled platform items are completed: verified public business/legal details, domain/DNS, Vercel production environment variables, email authentication, Supabase auth settings, production rate-limit backing store, and named launch owners.

Current practical readiness:
- Controlled staging / internal smoke test: READY
- Public market launch in Visakhapatnam: BLOCKED
- Release tag / production promotion: BLOCKED

## Mandatory Task Status

| # | Task | Status | Evidence / blocker |
|---|------|--------|--------------------|
| 1 | Git hygiene, release branch, secret/log scan | PARTIAL | Release branch created. Secret/log scans passed for app/components/lib. Release tag and deploy commit are blocked until owner/platform gates are complete. |
| 2 | npm audit, TypeScript, ESLint, build, start | DONE WITH NOTE | `pnpm audit --audit-level=high` passed with 0 high/critical. `pnpm exec tsc --noEmit` passed. `pnpm exec eslint` had 0 errors and 180 warnings. `pnpm build` passed. Exact `npm`/`npx` commands are blocked by local Windows `codex/npm/node.exe` access/path issue; pnpm equivalents passed. |
| 3 | Vercel production environment audit | BLOCKED | Required env names still need to be set/verified in Vercel: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`. Values must not be exposed in repo or report. |
| 4 | Support page internal-language cleanup | DONE | Removed backend/env/pilot/upload-system language. Missing public support email/WhatsApp/hours are hidden until real env values are provided. |
| 5 | Business info propagation | PARTIAL | Replaced hardcoded public business/contact/address details with optional env-driven config. Final legal name, office address, support email, WhatsApp, support hours, and launch date are owner-blocked. |
| 6 | Legal pages | PARTIAL | Removed pilot/test/live-mode wording and hardcoded contact details. Final legal entity, GSTIN/CIN publishing decision, public office address, and effective dates are owner-blocked. |
| 7 | Security headers | DONE | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, DNS prefetch, and nosniff verified locally. Payment permission is disabled while payments are deferred. |
| 8 | API route protection | DONE WITH PROD BLOCKER | Removed dead/ambiguous routes, disabled Razorpay payment/webhook routes, added server-side signup, strengthened generic error handling, added route-level rate-limit checks. Production 429 verification remains blocked until Upstash envs are configured. |
| 9 | Supabase config | PARTIAL | RLS and private bucket posture were checked. Supabase advisor still reports leaked password protection disabled. Auth URL/SMTP must be retested in dashboard after final domain/email configuration. |
| 10 | Vercel config | PARTIAL | App build passes. Domain, env, analytics/monitoring, and production deployment promotion remain blocked by platform configuration. |
| 11 | Domain linking | BLOCKED | `plotkare.in` ownership is stated, but DNS currently requires registrar access and Vercel domain linking. No production domain should be promoted until DNS is verified. |
| 12 | Email DNS/authentication | BLOCKED | SPF, DKIM, DMARC, sender domain verification, and Supabase/Resend sender tests require real domain/email ownership details. |
| 13 | Favicon, OG, metadata | DONE | Added app icon, Apple touch icon, OG image, manifest icon entries, and safer metadata URL handling. |
| 14 | Custom error pages | DONE | Added branded `not-found`, `error`, `loading`, and improved `global-error` surfaces. |
| 15 | Launch roles and contacts | BLOCKED | Release owner, DNS owner, Supabase owner, operations/support owner, and smoke-test owner are not yet known. |
| 16 | Final gate | BLOCKED | No critical code blocker found in the hardening pass, but deployment gate fails because required owner/platform items are incomplete. |

## Security Findings

No secret values were exposed during this audit.

Resolved / hardened:
- Removed hardcoded public contact/address fallbacks from user-facing surfaces.
- Removed direct frontend signup dependence and moved signup to a server route.
- Disabled payment endpoints while payment launch is out of scope.
- Removed unused contact/support and agent API routes that increased audit surface.
- Replaced raw application logging with a redacting logger.
- Sanitized API error responses to reduce internal database/storage message leakage.
- Confirmed private storage buckets and RLS posture from Supabase checks.

Remaining blockers:
- Supabase leaked password protection must be enabled in the dashboard.
- Production rate limiting must be backed by Upstash Redis and verified with a real 429 response.
- Supabase Auth site URL, redirect URLs, SMTP sender, and email templates must be verified after final domain/email setup.
- Vercel production env names must be set without exposing values.

## Database Findings

Observed posture:
- Production cleanup previously reduced operational records and storage objects to a clean pre-launch state.
- Public tables were checked for RLS/policy posture.
- Storage buckets were checked as private.

Remaining database launch work:
- Reconcile local migrations against live Supabase migration history before any database deploy.
- Re-run orphan/duplicate/integrity queries after final production seed data is loaded.
- Do not push migrations blindly from local state if the live migration history differs.

## Storage Findings

Resolved / confirmed:
- Buckets are private.
- No production storage objects remained after prior cleanup.
- Document delivery should remain signed-URL based with ownership checks.

Remaining:
- Perform one final signed URL expiry test after production auth/domain setup.
- Confirm no public bucket or guessed object path returns data after final seed upload.

## Performance Findings

Verified:
- Prior Lighthouse production run reached Performance 92, Accessibility 97, Best Practices 100, SEO 100.
- Local production build passes.
- Core public pages render without observed hydration or asset failures.

Remaining:
- Re-run Lighthouse after final custom domain, Vercel envs, monitoring, and analytics are configured.
- Resolve or accept the current ESLint warning backlog before long-term maintenance handoff.

## Deployment Readiness Score

Authentication: 8/10
Authorization: 8/10
Database: 8/10
Storage: 8/10
API Security: 8/10
Realtime Security: 7/10
Performance: 9/10
Infrastructure: 6/10
Monitoring: 5/10

Overall: 74/100

Decision: BLOCK

The codebase is much closer, but the market-launch score cannot reach 90/100 until the blocked owner/platform items are completed and retested.

## Owner Action List Before Morning Deployment

Provide and approve:
- Public legal/business name
- Legal entity type
- GSTIN/CIN publish/hide decision
- Public office address or hide decision
- General enquiries email
- Support email
- Transactional sender name/email
- Staffed WhatsApp number with country code
- Support hours
- Launch effective date
- Release owner contact
- DNS/domain owner contact
- Supabase owner contact
- Operations/support owner contact
- Final smoke-test owner contact
- Registrar login access for `plotkare.in`

Configure outside the repo:
- Add and verify `plotkare.in` in Vercel.
- Set required Vercel production env variables.
- Configure SPF, DKIM, and DMARC for transactional/support email.
- Configure Supabase Auth site URL and redirect URLs for the final domain.
- Enable Supabase leaked password protection.
- Configure production Upstash Redis for rate limiting.
- Re-run smoke tests and Lighthouse on the final domain.
