# New-user authentication root-cause report

## Outcome

The broken new-user path was caused by an application-level assumption, not a confirmed Supabase RLS defect. The client could successfully create a Supabase Auth user while the application had no durable `profiles` row or role-detail record for that user yet. Route and API guards then saw an incomplete account and could reject or misroute it.

## Lifecycle traced

1. `POST /api/auth/signup` creates the Supabase Auth user.
2. Supabase may create application profile data through the database trigger.
3. The browser receives a session or waits for email confirmation.
4. `proxy.ts` delegates protected-route decisions to `lib/supabase/middleware.ts`.
5. The middleware reads `profiles` and calculates the effective role.
6. Application APIs use `lib/api/auth.ts` to read a profile and enforce role access.
7. OAuth users without a selected customer type are sent to `/auth/choose-role`.

## Root causes

- Signup treated the database trigger as the only profile-provisioning path. It did not check whether that profile exists after a successful Auth operation.
- OAuth role selection attempted a browser-side `profiles` update. That cannot repair an absent profile row and is unnecessarily coupled to client RLS behavior.
- Middleware understood the legacy `role = user` plus `customer_type = plot_buyer` combination as a customer, while API authorization used the raw role. A buyer could therefore route successfully but be rejected by an API.
- Role-detail inserts were not validated for errors, so partial provisioning was possible.

## Implemented patch

- Added server-only `lib/auth/profile-bootstrap.ts`, using the existing privileged server client pattern.
- Signup, password login, and OAuth callback now ensure a profile exists before returning a usable session flow.
- Added the authenticated internal `POST /api/auth/choose-role` route. It creates or completes the profile and required role-detail record before returning a safe destination.
- Role selection now calls that route rather than writing directly from the browser.
- API guards now use the same effective-role normalization as middleware.
- Role-detail upserts now fail visibly, preventing a false-success account state.

## Deliberate boundaries

- No migration, RLS-policy edit, public API contract, dashboard route guard, or Supabase client behavior changed.
- This is not a substitute for live production validation. The Supabase trigger, confirmation policy, redirect allowlist, Google provider, and SMTP delivery remain deployment-gate checks.

## Required live validation

- Create a new owner, seller, and buyer with separate email addresses; confirm each profile and detail record once.
- Confirm each role lands on its intended onboarding route after login and after a fresh browser session.
- Verify an OAuth user with no role reaches role choice, selects one, and reaches onboarding.
- Repeat an expired/invalid confirmation and reset-link case to ensure safe error handling.
