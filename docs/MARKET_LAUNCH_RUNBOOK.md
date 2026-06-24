# PlotKare Market Launch Runbook

Use this checklist for the first public Visakhapatnam launch. Payment activation is intentionally excluded.

## Current Decision

Status: **Pilot-ready, not yet ready for unrestricted public marketing.**

The application can be shown to invited owners and used for controlled field operations. Do not start broad public acquisition until every P0 item below is complete and the post-deploy smoke test passes on the real domain.

## P0: Complete Before Domain Launch

- [ ] Confirm the legal public business name.
- [ ] Confirm the real office address and whether it should be published.
- [ ] Confirm the staffed public email addresses:
  - [ ] General enquiries: `hello@plotkare.in` or replacement.
  - [ ] Support: `support@plotkare.in` or replacement.
  - [ ] Transactional sender: `RESEND_FROM_EMAIL`.
- [ ] Confirm a staffed WhatsApp number in international digits-only format and set `NEXT_PUBLIC_WHATSAPP_URL=https://wa.me/<number>`.
- [ ] Remove internal implementation language from `/support/`. Customers should not see environment variable names or backend endpoint notes.
- [ ] Repair Supabase custom SMTP credentials. Verify signup confirmation and forgot-password delivery end to end.
- [ ] Enable Google Auth in Supabase only after a Google Web OAuth client is created with `https://neegwuhzphjmrmgrfycs.supabase.co/auth/v1/callback` as the redirect URI.
- [ ] Rotate the invalid Resend key, verify the sending domain, and confirm `RESEND_API_KEY` plus `RESEND_FROM_EMAIL` work before using the fallback password-reset delivery path.
- [ ] Add SPF, DKIM, and DMARC for the transactional email domain.
- [ ] Enable Supabase leaked-password protection.
- [ ] Add the real domain to the Vercel project and complete the required DNS records.
- [ ] Set Vercel production `NEXT_PUBLIC_SITE_URL=https://<real-domain>`.
- [ ] Redeploy after changing Vercel environment variables. Existing deployments do not receive new values.
- [ ] In Supabase Auth URL Configuration:
  - [ ] Set Site URL to `https://<real-domain>`.
  - [ ] Add local callback `http://127.0.0.1:3002/auth/callback**` while local smoke testing is needed.
  - [ ] Add Vercel production callback `https://<vercel-production-host>/auth/callback**` until the custom domain is live.
  - [ ] Add production callback `https://<real-domain>/auth/callback**`. The narrow wildcard is needed for the callback `next` query parameter.
  - [ ] Add `https://www.plotkare.in/auth/callback**` if `www` remains a supported host.
  - [ ] Add exact production password reset URL `https://<real-domain>/update-password/`.
  - [ ] Keep local and preview redirect patterns only where required for testing.
- [ ] Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared serverless rate limiting.
- [ ] Configure `CRON_SECRET` so the scheduled storage-integrity route can authenticate.
- [ ] Configure `NEXT_PUBLIC_SENTRY_DSN` so browser errors are captured with the existing redaction layer.
- [ ] Verify `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPPORT_EMAIL`, PostHog, and server-side Sentry values belong to production accounts.
- [ ] Replace pilot or placeholder wording in legal pages. Payment wording can remain disabled until payments are activated.

## Public Information Update Locations

Update the confirmed business details consistently:

| Information | Locations |
| --- | --- |
| General email | `components/sections/contact.tsx`, `components/footer.tsx`, `components/floating-contact-cta.tsx`, `app/layout.tsx`, `app/visakhapatnam/page.tsx`, `lib/maps/reverse-geocode.ts` |
| Support email | `app/support/page.tsx`, `app/privacy/page.tsx`, `app/refund/page.tsx`, Vercel `SUPPORT_EMAIL`, Vercel `RESEND_FROM_EMAIL` |
| Office address | `components/sections/contact.tsx`, `components/footer.tsx`, `app/layout.tsx`, `app/visakhapatnam/page.tsx` |
| WhatsApp | Vercel `NEXT_PUBLIC_WHATSAPP_URL` |
| Canonical domain | Vercel `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, Supabase redirect allow list, DNS |

## Domain Linking Sequence

1. Add the domain to the linked Vercel `webpage` project.
2. Inspect the domain in Vercel and apply the DNS records Vercel requests.
3. Wait for DNS verification and Vercel-managed SSL provisioning.
4. Add both apex and `www` domains if both should resolve.
5. Choose one canonical domain and redirect the other to it.
6. Set Vercel production `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL.
7. Update Supabase Auth Site URL and exact production redirects.
8. Redeploy production.
9. Verify canonical tags, sitemap URLs, auth emails, reset links, and JSON-LD use the real domain.

## P0 Smoke Test After Deployment

- [ ] Open homepage on desktop and mobile. Confirm no horizontal scrolling, broken CSS, or blank sections.
- [ ] Click the interactive India hero map and open Andhra Pradesh details.
- [ ] Submit the public contact form and confirm an admin can see the stored enquiry.
- [ ] Confirm the floating email CTA opens the real mailbox.
- [ ] Confirm the WhatsApp CTA opens the staffed WhatsApp chat.
- [ ] Create one test account, receive the confirmation email, confirm it, complete onboarding, and sign in again.
- [ ] Request a forgot-password email, open the link, set a new password, and sign in.
- [ ] Test each role with its own account: owner, seller, employee, verification agent, and admin.
- [ ] Confirm unauthorized dashboard URLs redirect or deny access.
- [ ] Create or use a test inspection, verify location capture, photo upload, submission, and admin review.
- [ ] Archive a dedicated test listing and confirm it disappears from homepage and `/listings/`.
- [ ] Confirm private document direct URLs do not open without authorized access.
- [ ] Check `/api/health`, `/robots.txt`, and `/sitemap.xml`.
- [ ] Check Vercel runtime logs, Supabase Auth logs, Sentry, and PostHog after the smoke test.

## P1: Complete Before Broad Marketing

- [ ] Add a staffed support operating procedure with response targets and escalation ownership.
- [ ] Add CAPTCHA or equivalent anti-abuse protection to signup, reset-password, and public enquiry flows.
- [ ] Review and optimize the Supabase advisor warnings for multiple permissive RLS policies.
- [ ] Run a fresh Lighthouse report on the real domain for homepage, Visakhapatnam page, listings, login, and representative dashboards.
- [ ] Add uptime checks for homepage, health endpoint, auth failure spikes, and contact-form failures.
- [ ] Define backup and restore testing cadence for production data.
- [ ] Add a second SMTP provider or documented failover procedure.
- [ ] Document SMTP provider failover and test it quarterly.
- [ ] Review all public claims, pricing language, refund wording, and service coverage with the business owner.
- [ ] Replace placeholder social links only when real accounts are staffed.

## Launch-Day Roles

Assign one person for each:

- [ ] Release owner: deploys and can roll back.
- [ ] Domain owner: controls registrar and DNS.
- [ ] Supabase owner: updates SMTP, Auth URL Configuration, and advisor settings.
- [ ] Operations owner: handles enquiries, WhatsApp, inspection assignment, and issue escalation.
- [ ] Test owner: executes the smoke test and records evidence.

## Rollback Rule

Rollback immediately if login, signup confirmation, password reset, role isolation, inspection submission, document privacy, or homepage rendering fails on the real domain.

## Reference Links

- Vercel custom domain setup: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
