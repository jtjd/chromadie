# Ten atmosphere studies — 2026-09-25

## Scope and audit

Add ten distinct, selectable profile atmospheres for comparing quality and taste
against the existing fourteen. Existing scenes, ownership, progression rewards,
and prices stay intact. The shared environment already serves public profiles
and Studio; its canvas lifecycle bounds pixels, runs at 30 fps, and suspends
motion for hidden/offscreen, paused, compact, and reduced-motion states.

## Plan

1. Author Aurora Veil, Abyssal Bloom, Astral Orbit, Lantern Festival, Firefly
   Grove, Opal Tide, Retro Horizon, Lunar Moths, Koi Reverie, and Kinetic Studio.
   Each gets distinct geometry, materials, composition, and movement, with an
   open identity region. Use responsive transparent Canvas layers: no added
   media bandwidth or opaque replacement of a chosen background.
2. Register ten free study items through the existing finite renderer catalog
   and server-owned equip/publish paths. Add an additive migration extending
   both renderer constraints, synchronize seed and drift checks. No RLS, RPC,
   scoring, inventory, or entitlement changes. Rollback retires the new items;
   retain renderer keys for already equipped profiles.
3. Exercise every scene in the actual shared environment on desktop/mobile,
   compact stills, motion/pause/reduced motion, hidden/offscreen recovery,
   switching and teardown. Inspect screenshots and measure drawing cost.
4. Run all mandatory checks plus local reset and strict DB lint, update the
   decision/progress/changelog records, and retain a browsable comparison study.

## Acceptance

Exactly ten new effects are available through Customize, with stable catalog
IDs and no replacement of existing atmospheres. Each is visibly distinct on
desktop and mobile, including still states. Effects remain decorative and
click-through; profile access/privacy logic is untouched. Tests cover finite,
deterministic painting, catalog parity and real frame progression/lifecycle.
All required validation passes; document any deployment or verification limits.

## Completion evidence — 2026-09-26

All ten are implemented as additional free catalog entries. The actual Customize
select/save flow, persisted server loadout, and separate anonymous public browser
pass for every item at desktop and mobile sizes. The shared-renderer test verifies
changing pixels, stationary pause/reduced/compact frames, hidden/offscreen
recovery, click-through keyboard interaction, teardown, no video requests, and
the pixel budget. Existing five authored renderers and Rain Window/Silk Folds
video recovery pass as well. Screenshots were inspected in both the study
composition and actual compact profile.

All required commands pass: build, Svelte check (zero errors/warnings), ESLint,
889 unit tests, links, CSP, performance, username policy drift, balance drift,
catalog drift, 5,000-sample scoring parity, DB security, local reset, and strict
DB lint. Enforced performance budgets pass; aggregate JS/CSS catalog targets
remain nonblocking advisories. Local drawing medians are 1.4–20.8 ms at 1440×900.

Reproduce with `node scripts/browser/profile-atmospheres-smoke.mjs --studies`,
`node scripts/browser/profile-atmospheres-smoke.mjs`, and
`node scripts/browser/atmosphere-studies-account-smoke.mjs`. Browser evidence is
under `artifacts/atmosphere-studies/` and `artifacts/profile-atmospheres/`.
The account test uses and deletes only a disposable local account; its navigation
retry is limited to confirmed local `ERR_NETWORK_CHANGED` requests.

No production deployment or remote migration. Existing local account data was
backed up and restored after the required reset. See
[`../ATMOSPHERE_STUDIES_REVIEW.md`](../ATMOSPHERE_STUDIES_REVIEW.md) for the
collection, comparison gallery, implementation tradeoffs, and rollback policy.
