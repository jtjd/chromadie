# Progression Core System

Status: complete and migrated — 2026-08-20

## Scope

Turn the existing rank, ritual, and discovery journey into one server-authoritative identity progression system. Rank is the mastery dimension; Ritual represents sustained play; Discovery represents probabilistic color finds. The work extends the existing ledger, achievement, inventory, catalog, profile-story, and roll transaction contracts rather than introducing a parallel engine.

## Implementation plan

1. **Existing architecture.** Keep `progression_milestones` as the authored manifest, `user_progression_milestones` as the durable ledger, `user_achievements` and monotonic profile counters as eligibility facts, inventory as acquisition proof, `grant_progression_milestones()` inside the authoritative roll transaction, `get_my_progression()` as the owner read boundary, and the existing public profile story RPC as the bounded public proof boundary.

2. **Acquisition flaw.** Make the milestone manifest's `progress_source` authoritative instead of requiring an achievement row for every goal. Enforce that every published reward remains an active, renderer-backed, zero-cost `earned` item with no premium entitlement. Reject reward remapping after any grant. Repair inventory even when a ledger row already exists.

3. **Progression structure and pacing.** Always show three dimensions: Rank/mastery, Ritual, and Discovery. Use `longest_streak`, not the resettable current streak. Order deterministic goals by real time. Extend Ritual with 730- and 1,095-roll capstones. Order Discovery from exhaustive probability data, place Mythic before rarer Anomaly, label stochastic goals as unfound rather than next, and retire the approximately 179-year greyscale goal from the published journey without removing its historical ownership.

4. **Reward tiers and catalog.** Preserve a generous free baseline and all premium items. Existing progression rewards stay earned. The two new long-term capstones deliberately move `cursor_trail_color_memory` and `border_chroma` from free to earned, cost zero, while preserving inventory and equipped configurations. Seed and catalog-drift checks must encode the same contract rather than normalizing a broken catalog into compliance.

5. **Schema and RPCs.** Add published/pacing metadata to the manifest and live-vs-historical plus presentation/acknowledgement metadata to the ledger. Rewrite grant/read logic around `lifetime_ep`, `total_rolls`, `longest_streak`, or durable achievement facts. Add a service-only idempotent account reconciler; add owner-only presentation and acknowledgement transitions; revoke browser access to grant/reconcile boundaries; make generic progression analytics authenticated-only.

6. **UI and components.** Derive completed, active, future, and new presentation states from authoritative data. Keep Rank visible beside Ritual and Discovery. Redesign the route with the site's neutral surfaces and typography, no invented arrows or accent language. Add lazy canonical reward previews by reusing `ShopItemPreview`; add one shared, restrained unlock queue for both roll surfaces; link rewards to `#customize-effects`; retain bounded progression context in Profile Studio and public profiles.

7. **Migration and backfill.** Use one additive migration. Reconcile every account from durable EP, total-roll, longest-streak, achievement, inventory, and equipped-cosmetic facts. Derive historical timestamps from achievements/profile history where possible, mark historical grants acknowledged, suppress celebratory notifications, never decrement inventory, never invalidate equipped cosmetics, and make reruns idempotent.

8. **Testing.** Keep source-contract tests and add executable database behavior for locked-before-earned, eligible grant, equip-after-grant, duplicate safety, inventory repair, historical provenance, catalog mutation rejection, reward immutability, RPC permissions, public-proof bounds, and analytics permissions. Add pure state tests for out-of-order discovery and completed/active/future grouping, plus progression-focused Chromium coverage for direct refresh, mobile, keyboard, reduced motion, preview, queue, acknowledgement, and Profile Studio handoff.

9. **Performance.** Keep `/progression` route-lazy, replace its broad profile-context load with a narrow progression request, dynamically load catalog/renderer code only when previewing, and add a blocking route budget. Measure the preview chunk separately so canonical renderer reuse does not enter the initial route payload.

10. **Expected file scope.** Add a final `supabase/migrations/20260820*progression_core_system.sql`, progression database test/runner, `src/lib/progressionData.js`, `src/lib/ProgressionRewardPreview.svelte`, and `src/lib/ProgressionUnlockQueue.svelte`. Update `supabase/seed.sql`, progression state/data/analytics modules, both roll surfaces, progression page/components, Profile Studio/public proof integration, balance/catalog/performance scripts, CI/package commands, focused Node/browser/security tests, `docs/ANALYTICS_CONTRACT.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/CHANGELOG_2_0.md`.

## Acceptance boundary

Stop when this vertical slice has replay-safe schema, correct historical reconciliation, genuinely earned rewards, coherent three-dimensional pacing, canonical previews, one shared unlock presentation path, bounded public proof, meaningful telemetry, behavioral database/browser coverage, and the complete repository validation suite is green. Do not refactor unrelated routes or redesign unrelated surfaces.

## Acceptance evidence — 2026-08-20

The local implementation satisfies the acceptance boundary. Evidence recorded
for this milestone:

- **Client and repository:** 436 Node tests; `npm run build`; `npm run check`;
  full `npx eslint src/`; `npm run check:links`; `npm run check:csp`;
  `npm run check:performance`; `npm run check:responsive-build`;
  `npm run check:profile-certification`; and `npm audit --audit-level=high`.
- **Database and authority:** `npm run db:reset`; local Supabase lint with
  `supabase db lint --local --level warning --fail-on warning`;
  `npm run check:db-security`; `npm run check:progression-db`; and
  `npm run check:scoring-parity`.
- **Browser and storage:** `npm run test:browser:progression`;
  `npm run test:browser:r2-local`; and `npm run test:browser:production`.
  These cover the narrow/lazy route, mobile and reduced motion, future and
  independent Discovery visibility, server-backed unlock presentation and
  acknowledgement, canonical reward preview, bounded public proof, Studio
  handoff, local R2 behavior, and the existing production browser smoke.

### Deployment evidence

The ordered migration chain from `20260819150000` through
`20260820000000_progression_core_system.sql` was applied to the linked Supabase
project on 2026-08-20. The remote migration ledger is aligned through
`20260820000000`, and the remote catalog-drift check passes for all 76 items.
Application hosting deployment and live-site verification remain separate from
this database migration record.
