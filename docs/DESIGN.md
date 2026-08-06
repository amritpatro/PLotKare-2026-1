# PlotKare design system, 2026

## Product philosophy

PlotKare should feel calm, specific and accountable. It manages consequential property information, so the interface favors clear evidence, safe actions, stable layouts and concise guidance over decorative density. It is a premium operational product, not a marketing landing page masquerading as a dashboard.

## Foundations

- Keep the existing warm cream/off-white canvas, current logo, brand maroon `#8B1538`, and gold accent `#C9A962` unchanged.
- Use brand maroon for primary action, selected state, key headings and high-confidence emphasis; never for every card, chip or paragraph.
- Use the thin gold/mustard accent as a hairline, boundary, premium highlight or verified-evidence cue. Keep semantic warning, danger and success colors distinct.
- Typography keeps the three-font system: serif display for page titles and meaningful property moments, sans for body/UI, and mono for coordinates, plot IDs and data labels. Never use display type for dense tables or forms.
- Type scale: 12 meta, 14 supporting copy, 16 body/form text, 20 section title, 28 page title, 40 marketing/title moment. Input text stays at least 16px on mobile.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Use 24/32 inside work panels and 48/64 only for page rhythm.
- Radius: 6px controls, 8px cards, 12px modals. Avoid oversized pills except statuses.
- Elevation: border first; low shadow only for menus, dialogs, hoverable cards, map overlays and sticky surfaces.

## Components

- Buttons use clear hierarchy: primary, secondary, destructive, quiet/icon. Loading preserves width and always names the action.
- Inputs have labels, help or error text, visible focus, `aria-invalid` and connected error descriptions.
- Cards frame an individual record or tool, not an entire page section. Repeated cards share a compact header, status, one key metric and a direct action.
- Tables preserve filtering, sorting and responsive escape hatches; mobile uses record rows rather than a crushed desktop table.
- Toasts announce outcomes but never replace persistent inline validation for form errors.
- Menus, dialogs and mobile navigation restore focus and close with Escape.

## Per-role principles

- Admin: queues, exception management, service health and auditability.
- Employee: assigned work, SLA priority and safe handoffs.
- Field agent: one active job, device states, large touch targets and evidence capture.
- Owner: property confidence, recent evidence and next scheduled care.
- Seller: listing readiness, verification and buyer response.
- Buyer: discovery, trust evidence, inquiry and decision support.

## Maps, 3D and payments

- Maps always expose location status, coordinates, landmark, freshness and a non-map fallback.
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
