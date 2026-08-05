# Premium SaaS evolution roadmap

## Ranking method

Priority is ranked by investor-visible impact multiplied by user/business impact, then divided by effort. Security, authentication and truthful listing media are P0 regardless of effort.

| Priority | Batch | Impact | Effort | Exit evidence |
| --- | --- | --- | --- | --- |
| P0 | New-user auth lifecycle | Very high | Medium | Signup, OAuth role choice and fresh login land on correct role paths |
| P0 | Real/optimized listing and amenity media | Very high | Medium | No broken imagery; verified listing assets or truthful pending-photo fallback |
| P1 | Design tokens and shared primitives | High | Medium | Buttons, forms, cards, menus, dialogs, tables and toasts share rules |
| P1 | Admin control center | Very high | Medium | Queue-first overview with service health and exception actions |
| P1 | Owner property health workspace | High | Medium | Current status, next visit, evidence and document action lead the page |
| P1 | Field-agent mobile flow | Very high | Medium | Assignment-to-submit works one-handed with GPS/camera/offline states |
| P2 | Seller and buyer experience | High | Medium | Listing readiness/inquiry states are task-led and honest |
| P2 | Employee operations workspace | Medium | Medium | SLA, handoff and customer context are easy to scan |
| P2 | Map/tracking and 3D state polish | Medium | Small | Loading, fallback, unavailable and alternative content states pass QA |
| P2 | Payment state polish | Medium | Small | Clear disabled/manual path until live verification |
| P3 | Motion and accessibility sweep | High | Medium | Reduced-motion, keyboard and screen-reader acceptance passes |

## Batch order

1. Authentication repair: implemented in this branch. Complete browser tests before release.
2. Media inventory and fallbacks: audit every public image reference, replace approved missing media, configure image optimization and preserve truthful placeholders.
3. Foundations: consolidate existing token usage and shared primitives without changing the palette.
4. Shell and navigation: preserve the information architecture while improving desktop scanability and mobile keyboard behavior.
5. Admin dashboard batch.
6. Owner dashboard batch.
7. Field-agent dashboard batch.
8. Seller, buyer/customer and employee batches, one role at a time.
9. Leaflet/tracking, 3D, and payment states.
10. Empty/loading/error, motion and accessibility acceptance sweep.

## Verification per batch

- `pnpm exec tsc --noEmit`
- `pnpm run lint`
- `pnpm run build`
- Desktop and mobile browser smoke tests for the changed role.
- Confirm no palette, schema, API, RLS, route guard, offline sync or payment webhook behavior changed.

## External release gates

- Supabase email confirmation/reset and profile trigger verified in production.
- Google OAuth provider, redirect allowlist and callback tested with a real account.
- Resend domain, SPF, DKIM and DMARC verified; test two recipient providers.
- Upstash, Sentry, PostHog, cron secret, canonical domain/DNS and health endpoint validated.
- Live agent GPS/camera test on a physical mobile device.
- Median Lighthouse targets: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 100 for public pages.
