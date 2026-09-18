# Profile border curation — 2026-09-18

Replace the nine generic border treatments with nine authored effects and add
Wildflower: ten new designs alongside retained Celestial and Crystal.
Use distinct taste categories, illustrated ornaments and motion confined
to decoration. Share the production renderer between preview and public layouts.

Preserve the nine existing item/renderer IDs so inventory, equipped loadouts and
earned progression references survive. Rename these items in the catalog; never
turn an earned reward into a free item. Add only Wildflower as a new free row.
The migration extends the finite border allowlist without changing other slot
constraints, RLS or equip RPCs. Seed and drift checks must match the migration.

Acceptance: twelve active borders, ten distinct new treatments; responsive
corners/edges at compact and full profile sizes; readable and clickable content;
static reduced-motion and animation-disabled states; pause offscreen and in
hidden documents. Add catalog/compatibility regression tests and browser evidence
at desktop/mobile sizes, then run all mandatory validation and update the logs.

## Final art direction

The user rejected a uniform futuristic direction. Redo all ten: Rosette and
Love Letter (girly), Sakura Diary and Manga Panel (anime), Midnight Rose and
Blackthorn (dark), Web Angel and Afterhours (underground internet), Sea Glass
and Wildflower (natural). These use different illustrated silhouettes,
materials and motion, not palette variants of glowing geometric rails.
The user expects a progress reset at launch; legacy progression is not an art
direction constraint. Retaining IDs is simply the smallest implementation.

## Acceptance evidence

- Ten different silhouettes, two in each taste category, plus Celestial/Crystal.
- The real catalog preview, public profile card, desktop/mobile, light/dark
  surfaces and custom corner radii are covered by
  `scripts/browser/profile-borders-smoke.mjs`.
- Motion does not change content geometry or intercept pointer/keyboard input.
  Reduced motion, explicit pause, document visibility and viewport visibility
  stop decoration. Unmount removes the decorative elements.
- Evidence is under `artifacts/profile-borders/`. Local validation includes
  628 unit tests, the full mandatory suite, schema lint and a fresh DB reset.
- `20260918140000_authored_profile_borders.sql` is applied only locally. Apply
  it with the normal release process to publish the new catalog metadata.
