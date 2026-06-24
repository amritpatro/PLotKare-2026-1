# PlotKare Apartment Module Roadmap

Status: **post-launch gated roadmap**. Do not start implementation until at least five paying plot customers complete the core plot workflow without critical defects.

## Launch Gate

The apartment module starts only after these existing plot workflows are proven in production:

- Owner registration and onboarding.
- Property and document submission.
- Field-agent assignment.
- GPS arrival confirmation.
- Inspection photo upload and submission.
- Admin review and report approval.
- Authorized document access.
- Support and escalation workflow.

## Architecture Decision

Do not implement `CODEX_APARTMENT_MODULE_PLAN.md` as written. The current schema already has `properties`, `apartments`, `vendors`, `maintenance_requests`, `inspections`, `property_documents`, `customers`, and `customer_property_links`.

The apartment module must extend this existing property lifecycle instead of creating duplicate tables or a separate tenant role model.

## Compatible MVP

Add only the missing structures:

- `apartment_units`
- `unit_tenancies`
- `rental_agreements`
- `utility_readings`
- `apartment_inspection_details`

Use the existing `customer` role for tenants through a `tenant` relationship type. Do not add a new account role unless a later security review approves a role model migration.

## Data And Security Rules

- Keep full Aadhaar uploads out of the MVP. Store only legally necessary, minimized identity data.
- Use existing private document and inspection-photo buckets with apartment-specific object paths.
- Enforce active tenancy and agreement overlap rules in the database, not only in application code.
- Make unit occupancy changes transactional.
- Add foreign keys, checks, uniqueness rules, and indexes before exposing APIs.
- Enable RLS on every new table with complete `USING` and `WITH CHECK` policies.
- Grant Data API access explicitly where required, after RLS is enabled.
- Give field agents access only to assigned inspections. Never grant broad employee access to apartment records.

## Route Plan

- `/owner/apartments`
- `/customer/rentals`
- `/admin/dashboard/apartments`
- Existing `/agent/inspections/[id]` for assigned apartment inspections

## Acceptance Tests

- RLS isolation for owner, customer tenant, admin, support employee, verification employee, and field inspection agent.
- IDOR tests for unit, tenancy, agreement, maintenance, document, and inspection IDs.
- Direct storage URL denial and signed URL ownership checks.
- Migration rollback rehearsal on a branch or staging database.
- End-to-end apartment inspection submission and owner report visibility.
