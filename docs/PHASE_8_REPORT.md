# Chromadie 2.0 — Phase 8 Report

**Milestone:** Decoration Studio and Monetization Boundaries  
**Audit / implementation date:** 2026-07-25  
**Branch:** `redesign/profile-first`

## Baseline status

Phase 7 began from a green baseline: 66 native tests passed, the required
build/check/lint/link/CSP/balance/catalog/scoring/database-security commands
passed, and the local Supabase schema lint/reset completed. The application
remained a Svelte/Vite SPA with the existing authenticated shop, live catalog,
EP wallet, inventory, profile cosmetics, and server-authoritative purchase and
equip RPCs.

Phase 8 was scoped as an additive decoration-studio and entitlement boundary.
It did not introduce SvelteKit, a payment provider, billing/webhook issuance,
or a second profile route.

## Work completed

- Added `access_tier` and `entitlement_key` metadata to `public.shop_items`.
- Added two premium expression examples (`bg_prism_atmosphere` and
  `name_prism_atelier`) under the `atelier_plus` entitlement key. They are
  preview-only unless the entitlement is granted by the service boundary.
- Added `public.profile_entitlements` with account-delete cascade, RLS, no
  browser table privileges, and service-role-only writes.
- Added `get_my_profile_entitlements()` for the current owner and
  `grant_profile_entitlement(...)` for a fixed-search-path, service-role-only,
  idempotent grant seam. No browser path can grant an entitlement.
- Preserved existing EP/inventory purchase behavior. `purchase_item` rejects
  premium rows before EP mutation, and `equip_item` rechecks the matching
  entitlement server-side.
- Added `DecorationStudio.svelte` and changed the fitting-room hero to use the
  actual `ProfileShell.svelte` renderer in isolated preview mode. The preview
  does not load profile/social data, expose owner controls, or mutate account
  state.
- Added explicit free-baseline, earned, and premium-expression labels. The
  free baseline remains complete and available without purchase.
- Updated shop page metadata to “Decoration Studio” without changing routes,
  public profile metadata, sitemap behavior, or crawler contracts.

## Failures discovered and resolved

The implementation exposed migration and audit issues during local validation:

1. The live catalog snapshot had a closed cost `CASE` that did not include the
   new zero-cost premium keys. Reset failed with a null catalog cost; the
   snapshot and seed CASE coverage were corrected.
2. The later reprice migration had a second closed cost `CASE`; its premium
   branches were added before rerunning reset.
3. Schema lint reported an unused entitlement variable in the replacement
   purchase function; it was removed.
4. The database security harness used a scalar `proconfig` assertion for a
   multi-row entitlement function check; it was changed to a bounded boolean
   aggregate.
5. The first Phase 8 native test run had two stale fixture expectations. The
   expectations were updated to reflect the intended milestone-item and
   price-sorted owned-catalog behavior; no production behavior was weakened.

The final local reset, schema lint, and database-security audit passed after
these corrections.

## Coverage added

`test/phase-8-decoration.test.js` adds focused contracts for:

- free, earned, and premium access labels;
- entitlement access versus inventory ownership;
- owned-catalog inclusion and deterministic sorting;
- use of the real profile canvas in a no-network preview mode;
- absence of raw HTML/eval escape hatches;
- protected entitlement table/RLS/grant boundaries;
- premium server gates and account-delete cleanup.

The native suite finished with **71 passed, 0 failed**. The SQL security suite
also asserts browser-role table denial, service-role grants, fixed search paths,
premium catalog metadata, wrapper/implementation execution grants, and
entitlement deletion during account cleanup.

## Compatibility and migration risks

- Catalog rows must remain synchronized across `shop_items`, `seed.sql`, the
  live snapshot, and every closed cost/reprice CASE. The local reset caught
  this hazard in the milestone.
- `profile_entitlements` is intentionally not a browser-readable table. Any
  future payment or administration integration must issue keys through a
  service-side, idempotent path and preserve the account-delete cascade.
- A catalog cost of zero is not a free-access signal for premium rows. Access
  tier and entitlement checks must remain distinct from EP and inventory state.
- The studio preview depends on `ProfileShell` remaining network-free in
  preview mode and must not gain social, owner-control, or mutation behavior.
- Existing purchase/equip RPC contracts retain staff-test-wallet, inventory,
  and profile cosmetic semantics. Future changes must preserve those paths and
  their RLS/grant assertions.
- No payment provider, webhook, receipt, refund, subscription, or entitlement
  administration semantics exist yet; adding them is a separate security and
  operational milestone.

## Recommended Phase 9 boundary

If product direction authorizes a next milestone, begin with a separate audit
of entitlement issuance and operational ownership. Limit the first slice to a
single provider-independent grant/revoke/reconciliation contract, idempotency,
audit history, account deletion, failure handling, and test fixtures. Do not
couple billing work to scoring, roll eligibility, rewards, RLS relaxation, or
public profile metadata. Keep notifications, private messaging, visitor
analytics, comparisons, SvelteKit, and unrelated refactors deferred until
their own acceptance criteria exist.

## Go / no-go assessment

**GO for Phase 8 completion.** The additive schema and client seam are
implemented, the existing economy and server authority are preserved, the
profile preview is isolated, the focused coverage passes, and local schema and
security validation are green.

**NO-GO for Phase 9 implementation in this milestone.** Payment/webhook
issuance and broader monetization operations require a new scope, provider and
failure model, migration plan, and acceptance review.

## Final validation record

The exact final command results are recorded below after the full validation
pass:

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 254 modules transformed; JS 574.49 kB; CSS 240.86 kB; existing Vite warning for a chunk over 500 kB |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 71 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:balance-drift` | PASS | `Balance drift check passed: 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | PASS | `Catalog drift check passed locally: snapshot and seed match (82 items).` Remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.`; audit transaction rolled back |
| `supabase db lint --local --level warning --fail-on warning` | PASS | `No schema errors found` |
| `npm run db:reset` | PASS | Finished supabase db reset on branch `redesign/profile-first` |
