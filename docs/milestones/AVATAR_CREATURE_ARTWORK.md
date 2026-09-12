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

## Live feedback correction — disappearance and clumping

Random depth was independent of screen location and could abruptly put an entire
creature behind the avatar. Persistent depth lanes now change only when the
whole silhouette clears the avatar. Fixed-step steering adds predictive
separation, bounded acceleration/speed, and wider excursions. Canvas overscan is
210%; artwork remains scaled relative to the real avatar radius. No migrations.
The previous random spline depth and non-interacting paths are superseded.

All required checks passed, including 609 tests and three-minute per-species
simulation regressions. Browser evidence includes mobile/reduced-motion and
`artifacts/avatar-creatures/separated-flight.png`, sampled at five-second
intervals from the actual simulation and shared artwork renderer.

## User direction — disable bats, restore glow, add Fireflies

Scope: pause Bat Orbit, restore butterfly bloom, add a separate free avatar
Fireflies effect. Existing persistent flight/separation and safe depth changes
are retained for butterflies and fireflies. Bat artwork remains in source for
possible later work, but no bat canvas/controller mounts in the product.

Migration `20260911180000_avatar_fireflies.sql` expands the finite renderer
constraint, inserts `avatar_effect_fireflies`, retires the bat catalog row, and
bumps shop_version. Seed mirrors it. Saved selections/inventory remain intact.
No RLS, RPC authority, scoring, routes, or private-profile behavior changes.
Compatibility: prior clients need the new renderer before users equip Fireflies;
new clients suppress bats even with a stale active catalog row. Deploy the new
client before exposing the new row in the hosted database. Rollback can retire
Fireflies and restore bats without removing either historical identifier.

Validation: full required suite passed, including 610 tests; `npm run db:reset`
applied the new migration and seed; `supabase db lint --local --level warning
--fail-on warning` passed without warnings. DB checks initially failed to connect
while reset restarted Postgres; all passed after reset completed. Browser checks
passed production-component animation, reduced motion, disabled bats, and mobile
overflow. Screenshots in `artifacts/avatar-creatures/` show final glow and fireflies.
The catalog migration was applied to the hosted database on 2026-09-11; this
startup correction remains client-only.

## User correction — dispersed startup

The persistent flight previously exposed its seeded ring on the first frame:
positions shared one radius, velocities were tangential, and all waypoints
started at the center. Startup now samples deterministic positions with a
minimum separation, nonzero headings and speeds, active waypoints, independent
ages, phases, and an initial front depth lane. The fixed-step steering takes over
without a reset, so the first frame is already a varied wandering flight.
No schema, catalog, or compatibility changes were required. A regression
checks varied startup radii and headings and confirms immediate movement for
butterflies, Fireflies, and the retained bat flight module.
