# PlotKare Domain Cutover Runbook

Use this when `plotkare.in` is purchased and ready to connect. Hosting stays on Vercel; AWS Route 53 is only the registrar/DNS layer.

## Before Buying Or Connecting The Domain

[ ] Keep the launch scope frozen: auth, onboarding, role dashboards, document security, owner/seller/customer/admin/employee/agent flows, verified property location, audit logs, monitoring, and performance.
[ ] Do not start full apartment rental/tenant/vendor development before the pilot gate. Apartment is supported as a property type only.
[ ] Run `pnpm run prelaunch:static`.
[ ] Run `pnpm run build`.
[ ] Run `pnpm run smoke:local` against the local production server.
[ ] Confirm `.env.production.example` contains every required Vercel variable name without real values.
[ ] Confirm no real secrets are committed.

## Route 53 And Vercel Domain Setup

[ ] Buy `plotkare.in` in AWS Route 53.
[ ] Create or confirm the `plotkare.in` hosted zone.
[ ] Add `plotkare.in` and `www.plotkare.in` in Vercel project settings.
[ ] Add the Vercel DNS records shown by Vercel into Route 53.
[ ] Wait until Vercel shows SSL as active for both domains.
[ ] Set `NEXT_PUBLIC_SITE_URL=https://plotkare.in` in Vercel.
[ ] Redeploy the Vercel production deployment after environment changes.

## Email, Auth, And Dashboard Configuration

[ ] Verify `plotkare.in` in Resend.
[ ] Add Resend SPF, DKIM, and DMARC records in Route 53.
[ ] Configure Supabase Auth SMTP using the Resend credentials.
[ ] Add `https://plotkare.in/auth/callback**`, `https://www.plotkare.in/auth/callback**`, `https://plotkare.in/auth/update-password`, and `https://www.plotkare.in/auth/update-password` to Supabase redirect URLs.
[ ] Add `https://plotkare.in` and `https://www.plotkare.in` to Google OAuth JavaScript origins.
[ ] Add `https://neegwuhzphjmrmgrfycs.supabase.co/auth/v1/callback` to Google OAuth redirect URIs.
[ ] Enable leaked password protection in Supabase.
[ ] Confirm `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, and `NEXT_PUBLIC_SENTRY_DSN` are present in Vercel.

## After DNS Resolves

[ ] Run `pnpm run smoke:production`.
[ ] Open `https://plotkare.in`, `/login`, `/signup`, `/forgot-password`, `/listings`, and `/visakhapatnam`.
[ ] Submit a password reset to a real test inbox and confirm the link reaches `/auth/update-password`.
[ ] Confirm Google login works, or intentionally keep it disabled with the provider-status explanation.
[ ] Submit the contact form and confirm support email delivery.
[ ] Log in as admin and confirm the dashboard loads.
[ ] Log in as a verification agent and confirm assigned inspection pages load.
[ ] Confirm canonical and sitemap URLs point to `https://plotkare.in`.
[ ] Confirm Vercel logs do not print secrets, signed URLs, password reset tokens, Aadhaar values, bank values, or raw provider errors.
[ ] Confirm Sentry receives a deliberate test event.

## Data Cleanup

[ ] Do not run `scripts/delete-demo-accounts.sql` until the final launch window.
[ ] Before running cleanup, review the SELECT output inside that SQL file.
[ ] Delete matching Supabase Auth users from the Supabase dashboard after profile/data cleanup.
[ ] Run `scripts/seed-production.sql` only after cleanup if catalog seed data is missing.
[ ] Keep the admin account and any real paying customer accounts.

## Pilot Gate

[ ] Launch only as a controlled pilot for 3-5 invited customers first.
[ ] Keep Razorpay live payments disabled unless live keys, webhook verification, and reconciliation are complete.
[ ] Full apartment rental/tenant/vendor workflows remain post-pilot. Current launch supports apartment as a property type for onboarding/inspection context only.
[ ] Move to public market launch only after no Critical or High defects remain from the pilot.
