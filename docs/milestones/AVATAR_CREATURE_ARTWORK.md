# Avatar creature artwork — 2026-09-11

Scope: user-authorized redesign of the butterfly and bat silhouettes and wing
animation. This supersedes the old handoff's creature geometry and choreography;
the white butterfly/dark bat concepts and existing effect IDs remain.

Plan: author shared vector curves, inspect open/recovery/folded poses and actual
86–108px avatars, integrate into existing two-canvas DOM-avatar compositing,
verify desktop/mobile and reduced motion, and run the mandatory validation suite.

No migration: inventory, equip state, entitlement, profile visibility, routes,
and backend authority remain unchanged. Decorations are code-owned, inert, and
use the existing lazy-loaded renderer. No fetched images or user SVG are added.

Acceptance: recognizable silhouettes with no glow; symmetric wing motion,
readable closed poses, proportionate detail and glow; smooth pointer camera;
static reduced-motion/disabled states; existing lifecycle and full checks pass.

Artwork: SVG-compatible paths in `src/lib/avatar-effect/avatarCreatures.js` are
shared by canvas and the browser review sheet. Butterflies have four distinct
lobes, a narrow body, and antennae. Bats have ears, broad scalloped membranes,
and a contrasting edge. Camera-facing illustration preserves recognition while
position, perspective size, and front/back occlusion retain the orbit depth.
Twelve bats replace twenty-four to give the larger silhouettes breathing room.

Validation completed:

- `npm run build`: passed.
- `npm run check`: passed, zero errors/warnings.
- `npx eslint src/`: passed.
- `npm test`: passed, 608 tests, zero failures/skips.
- `npm run check:links`, `npm run check:csp`, `npm run check:performance`: passed.
- `npm run check:username-policy-drift`, `npm run check:balance-drift`,
  `npm run check:catalog-drift`, `npm run check:scoring-parity`,
  `npm run check:db-security`: passed.
- `node scripts/browser/avatar-creatures-smoke.mjs`: passed; inspected desktop,
  mobile, and reduced-motion production-component screenshots. The fixture uses
  a local fallback avatar, not a live account. Initial harness attempts hit a
  duplicate Svelte runtime and Vite dependency-reload race; the fixture now uses
  one bundled Svelte import and bounded import retries. Final run passed.
- Performance enforcement passes; existing aggregate JS/CSS advisory catalog
  targets remain exceeded. No schema checks apply to this rendering-only change.

Review artifacts: `artifacts/avatar-creatures/desktop.png`, `mobile.png`,
`reduced-motion.png`, `butterfly-orbit.svg`, and `bat-orbit.svg`. Regenerate with
`node scripts/browser/avatar-creatures-smoke.mjs`. The handoff's original
fully projected wing geometry is intentionally superseded by this authorized
illustration redesign; artwork faces the viewer with gentle banking.

## Quality follow-up — 2026-09-11

The user's subsequent review rejected the first pass as animated icons. This
follow-up supersedes its viewer-facing orientation, instance counts, and shared
wing squeeze. Butterfly lobes now interpolate to a separately drawn upward-folded
silhouette; bat wings interpolate to a bent outer-wing pose with trailing membrane
flex. Dark-plum bat fill is brighter, so the membrane reads on dark backgrounds.

Five butterflies or six bats travel in a peripheral corridor, facing their path
tangent with depth-dependent banking. Shared angular speed preserves spacing;
small radial drift and wingbeat bob provide secondary motion. The avatar center
stays clear. This is an intentional choreography redesign, not reference parity.
No schema, inventory, entitlement, route, or privacy contracts changed.

A full-cycle numerical regression checks spacing, center clearance, and nose
alignment. Reviewed consecutive 70ms wingbeat samples and 5-second orbit samples
at 86px, plus production-component desktop/mobile/reduced-motion screenshots.
The mandatory suite passed: build, check, ESLint, all 609 tests, links, CSP,
performance, username/balance/catalog drift, scoring parity, and DB security.

## User correction — independent wandering flight

The user rejected circling the avatar edge. Seeded random waypoint sequences
and cubic B-splines replace the common angular clock. Each creature has its own
timing, heading from velocity, curvature-driven bank, and independently varying
depth. Crossings and changing spacing are intentional; the earlier ring-spacing
and center-clearance criteria no longer apply. Canvas bounds and smooth motion
remain required. No migration or compatibility changes.

Wandering-flight validation: all mandatory commands passed, including 609 tests.
The production-component browser smoke passed desktop, mobile, animation, and
reduced-motion checks. Inspected 25 seconds of sampled flight plus mobile frames;
evidence is `artifacts/avatar-creatures/wandering-flight-review.png` and the
refreshed browser screenshots. Existing aggregate asset-budget advisories remain;
enforced performance budgets pass. No schema checks apply.
