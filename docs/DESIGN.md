# PlotKare design system, 2026

## Product philosophy

PlotKare should feel calm, specific and accountable. It manages consequential property information, so the interface favors clear evidence, safe actions, stable layouts and concise guidance over decorative density. It is a premium operational product, not a marketing landing page masquerading as a dashboard.

The identity is deep maroon/oxblood plus restrained gold over a warm cream canvas. It is not a purple SaaS theme. The visual language should feel closer to a modern land-deed, verified property record and heritage-trust register than a generic admin template.

## Foundations

- Keep the existing warm cream/off-white canvas, current logo, brand maroon `#8B1538`, and gold accent `#C9A962` unchanged. New UI should use tokens/classes instead of introducing new literal hex values.
- Use brand maroon for primary action, selected state, key headings and high-confidence emphasis; never for every card, chip or paragraph.
- Use the thin gold/mustard accent as a hairline, boundary, map outline, premium highlight or verified-evidence cue. Keep semantic warning, danger and success colors distinct.
- Typography keeps the three-font system: serif display for page titles and meaningful property moments, sans for body/UI, and mono for coordinates, plot IDs and data labels. Never use display type for dense tables or forms.
- Type scale: 12 meta, 14 supporting copy, 16 body/form text, 20 section title, 28 page title, 40 marketing/title moment. Input text stays at least 16px on mobile.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Use 24/32 inside work panels and 48/64 only for page rhythm.
- Radius: 8px controls and badges, 16px cards and panels, 20-24px large map/hero surfaces, full circle avatars. Avoid oversized pills except statuses.
- Elevation: border first; low shadow only for menus, dialogs, hoverable cards, map overlays and sticky surfaces.

## Components

- Buttons use clear hierarchy: primary, secondary, destructive, quiet/icon. Loading preserves width and always names the action.
- Inputs have labels, help or error text, visible focus, `aria-invalid` and connected error descriptions.
- Cards frame an individual record or tool, not an entire page section. Repeated cards share a compact header, status, one key metric and a direct action.
- Tables preserve filtering, sorting and responsive escape hatches; mobile uses record rows rather than a crushed desktop table.
- Toasts announce outcomes but never replace persistent inline validation for form errors.
- Menus, dialogs and mobile navigation restore focus and close with Escape.

## Imagery and watermark rules

- Use the India map, document stack, wax seal, magnifying-glass map and related land-record illustrations as brand assets, not generic decoration.
- On landing pages, imagery may be a visible story card or a faint watermark. Watermarks must stay at 6-10% opacity, use `mix-blend-multiply` on cream surfaces, sit off to one side and never sit directly under body text.
- One watermark per section maximum. Decorative watermark images use empty alt text, `aria-hidden`, and `pointer-events-none`.
- Operational dashboards should use imagery only for empty/loading/error states, map states, and verification context. Dense tables and forms should stay data-first.
- Real user/property data must not be invented for visuals. If data is private, say it is private or available in the dashboard.

## Per-role principles

- Admin: queues, exception management, service health and auditability.
- Employee: assigned work, SLA priority and safe handoffs.
- Field agent: map-first view, one active job, device states, large touch targets, offline/PWA sync state and evidence capture.
- Owner: property confidence, recent evidence and next scheduled care.
- Seller: listing readiness, verification and buyer response.
- Buyer: discovery, trust evidence, inquiry and decision support.

## Maps, 3D and payments

- Maps always expose location status, coordinates, landmark, freshness and a non-map fallback.
- Custom map markers should follow the maroon/gold identity. Avoid default Leaflet pins for product-critical views once a custom marker can be used safely.
- Live tracking should feel smooth and current: interpolate marker movement, use a small pulsing halo for active agents, and clearly mark stale/offline states.
- GPS state uses only semantic status: ready, needs permission, inaccurate, too far, override needed, confirmed, unavailable.
- 3D uses progressive loading, an accessible detail alternative, and clear unavailable/error copy.
- Payments show a deliberate unavailable/manual state until the live provider is verified. Never imply a successful payment before webhook confirmation.
- Auth screens distinguish user mistakes from infrastructure outages. Upstream 5xx or Cloudflare `521` must show a service-unavailable state with retry and status context, not a wrong-password message.

## Motion

- Motion supports orientation and feedback, never decoration. Standard durations: 120ms micro feedback, 180ms controls, 240ms panels, 320ms page entrance.
- Use opacity/transform only; avoid layout shifts, auto-playing counters, scroll-jacking, cursor tracking and perpetual movement.
- Respect `prefers-reduced-motion`; all essential meaning remains without animation.

## Accessibility and responsiveness

- Meet WCAG AA color contrast and visible keyboard focus.
- Maintain a logical heading order, landmarks, descriptive labels and live announcements for asynchronous results.
- Test 360/375, 768, 1280 and 1440 widths. No action or label may become inaccessible at zoom or narrow width.
- Data-dense screens use responsive grids and horizontal table containment rather than clipped content.

## Contribution rules

- Preserve palette, route guards, schema, API contracts, Supabase policies, offline sync and payment webhook behavior unless a separately reviewed change authorizes it.
- Add a loading, empty and error state with every new async view.
- Optimize images through `next/image` when the source permits; provide accurate alt text and dimensions/sizes.
- Run typecheck, lint and production build after each batch. Use role-based browser checks for affected work.
