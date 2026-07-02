# PlotKare Launch E2E Checklist

Last updated: 2026-07-01

## Scope Freeze

- Apartments: deferred.
- Payments: deferred unless live payment keys, webhook, and KYC are verified.
- WhatsApp automation: deferred.
- Current target: controlled pilot readiness for plot workflows.

## Parallel Work Lanes

### Lane A: Verified Location And Agent Inspection

- PASS: Owner plot can hold submitted coordinates.
- PASS: Admin verification screen loads for a pending plot.
- PASS: Verified coordinates become active `target_latitude` / `target_longitude`.
- PASS: Agent flow blocks arrival when verified coordinates are missing.
- PASS: Arrival rule `<=50m` passes.
- PASS: Arrival rule `51-200m` requires override.
- PASS: Arrival rule `>200m` blocks.
- PASS: Agent inspection submit requires arrival, four directional photos, checklist answers, and evidence.
- PASS: Submitted inspection persists as `status=completed`, `workflow_step=submitted`, and creates a pending-review report.
- TODO: Manual browser check of admin reject-with-note copy and owner resubmission UX.

### Lane B: Owner, Seller, Customer, Listings

- PARTIAL: Owner/property/plot data path exists and was used for verified-location fixture setup.
- TODO: Owner onboarding/property creation full browser happy path.
- TODO: Seller onboarding/listing creation full browser happy path.
- TODO: Listing approval/archive/public disappearance browser test.
- TODO: Customer inquiry/support browser test.
- PASS: Protected admin and agent routes redirect unauthenticated users to `/auth/login`.
- TODO: Full authenticated cross-role browser matrix.

### Lane C: Employee, Admin, Support, Audit

- TODO: Support employee ticket queue browser test.
- TODO: Support employee reply/internal-note browser test.
- TODO: Employee forbidden admin-only API browser/API test.
- PASS: Admin plots and location review pages load for authenticated admin during E2E.
- PASS: Agent arrival and submit actions create audit events.
- PASS: Audit metadata redaction helper is present; route coverage still needs final review.

### Lane D: Performance And Production Config

- TODO: Lighthouse public page median is recorded.
- Accessibility, Best Practices, and SEO are recorded.
- PASS: `/api/health` returns `200` on built local production server.
- PASS: `/api/auth/providers` reports email and Google provider availability.
- TODO: Password reset delivery status is verified without exposing secrets.
- TODO: Production blockers for Resend, Google OAuth, Vercel env, DNS, and canonical URL are rechecked on final Vercel environment.

## Current Known Fixes Already Verified

- Customer cannot create plots through legacy `/api/plots`.
- Customer cannot request document signed upload URLs through legacy `/api/documents/upload-url`.
- Plot APIs are restricted to land owner/admin and scoped by owner for non-admins.
- Document upload/create/delete APIs are restricted to land owner/admin.
- Field inspection agent login redirects to `/agent`.
- Disposable `rbac-*` test profiles were cleaned up.
- Verified plot location migration exists and is applied to live Supabase.
- Inspection photo upload status compatibility migration exists and is applied to live Supabase.
- Agent photo subject values are normalized to live database constraints.
- Agent inspection submission now maps field condition, issue severity, and report delivery status to live database constraints.
- Production build passes and the deployed/production-mode server health endpoint returns 200.

## Deployment Gate

Deployment is blocked if:

- Any Critical or High auth/RBAC/storage/document issue remains.
- Any cross-user data leak is reproducible.
- Agent inspection can be submitted without verified location or arrival proof.
- Password reset and production email delivery are not confirmed.
- Google OAuth is enabled but callback/redirect behavior is broken.
- Lighthouse or build failures are unresolved without an explicit pilot exception.
