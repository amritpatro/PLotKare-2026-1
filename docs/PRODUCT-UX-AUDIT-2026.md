# PlotKare role-first product and UX audit

## Executive assessment

PlotKare has a stronger operational base than its surface suggests: role boundaries, property onboarding, verified-location controls, agent GPS arrival, support, listings, audit-aware admin areas, Leaflet maps, and a 3D plot viewer are all present. The investor concern is valid because those capabilities are expressed through uneven visual density, generic dashboard framing, and incomplete visual media rather than a coherent premium system.

The recommendation is an evolution: retain white surfaces, `#8B1538`, the current monogram, route structure, and business logic. Reduce visual noise, make hierarchy task-led, use quality imagery only where it establishes trust, and make each dashboard feel designed for its actual operator.

## Role audit

### Admin

Admin has the richest capability set: users, verification, plots, documents, inspections, listings, support, payments, tracking, and audit-facing controls. It currently risks reading as an admin template because many pages use similar cards, dense labels, and repeated status chips. The highest-value improvement is a durable control-center shell: urgent queue, service health, location review and exception resolution first; tables become secondary work surfaces.

### Employee

Employee work is operational coordination, not administration. The interface should foreground assigned queues, SLA risk, customer context, internal handoffs, and clear completion actions. Avoid exposing admin-wide controls or overwhelming the worker with full-system navigation.

### Field agent

The agent experience correctly includes GPS, camera capture, directional evidence, a verified target map, and offline-oriented workflow pieces. It needs a field-first visual treatment: one active assignment, obvious location state, large tap targets, a preflight checklist, capture progress, network/offline state, and unambiguous submit result. It should never resemble a desktop report dashboard.

### Land owner

Owners need confidence and evidence: current property state, next visit, recent finding, document access, support, and an understandable escalation path. The existing workspace has broad coverage, but needs fewer equally weighted cards and more visual priority for property health, location verification, and the latest inspection report.

### Plot seller

Sellers need listing readiness, verification status, buyer inquiries, document gaps, and archive/publish status. The key gap is a trustworthy listing presentation path with real media and transparent approval status. Archive should be visibly final in public listings while remaining recoverable from the seller workspace as business rules permit.

### Plot buyer/customer

Buyers need available verified listings, saved/inquired properties, support, and simple decision context. They do not need owner-operational detail. The experience should use an honest empty state, real listing photography only, concise land-use/risk details, and a persistent next action such as inquiry or document question.

## Cross-cutting audit

### Authentication

The new-user lifecycle had a profile-provisioning race/gap and inconsistent role normalization. The implemented repair is documented in `AUTH-ROOT-CAUSE-REPORT.md`. Live Google OAuth, SMTP, confirmation and reset delivery still require external configuration checks.

### Mapping and tracking

Leaflet is used for real plot/agent context, and the verified-location chain is the correct trust model. Continue to show verified, pending, rejected, and no-target states distinctly. Maps must provide a usable fallback: coordinates, landmark, freshness, navigation link, and an explanatory empty state when tiles or device location are unavailable.

### 3D plot viewer

The React Three Fiber Boduvalasa viewer is a useful differentiator, but it needs explicit loading, no-WebGL, unavailable-data, selected-plot, and keyboard/alternative-detail states. Treat it as a decision aid, never as the only way to inspect a listing.

### Payments

Razorpay routes intentionally return `PAYMENTS_DISABLED`. Keep that honest state: explain that online payment is unavailable, preserve manual consultation/support action, and do not show checkout-looking buttons until the provider and webhook are live-tested.

### Assets

The app has a small genuine asset set for amenities and a layout preview, but marketplace imagery relies on image URLs and needs an asset-quality gate. Never replace missing listing images with synthetic or generic property claims. Use an optimized neutral fallback that clearly says photography is pending verification.

### Loading, empty and error states

Every data surface needs three intentional states: skeleton/loading with stable dimensions, an honest empty state with one next action, and a recoverable error state with retry/support. Auth and field workflows also require submitting, disabled, success and server-rejection states that preserve user input.

## Investor-visible next wins

1. Fix new-user login and publish its verified path.
2. Make public and seller listing imagery trustworthy with optimized assets and a clear fallback.
3. Refresh the admin control center and owner property-health view.
4. Make the field-agent assignment flow visibly mobile-first.
5. Apply a single hierarchy, motion, and state system across every role.
