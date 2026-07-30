# Phase 10 Report — Vision Reconciliation and Profile Simplification

Date: 2026-07-25  
Branch: `redesign/profile-first-reconciliation`  
Scope: Phase 10 only

## Outcome

Phase 10 changes the live profile’s visual priority from a game-dashboard grid
to a composed identity surface. The authenticated bare root now resolves to
the owner’s live profile. Public `/u/<username>` rendering uses real mapped
profile data and a bounded four-region composition; secondary systems remain
available behind deliberate detail or compatibility surfaces.

No database migration was needed. Authentication, RLS, secure roll RPCs,
anti-reroll behavior, scoring, rewards, rarity, economy, shop ownership,
entitlements, profile history, cosmetics, public/private behavior, social and
moderation boundaries, direct-refresh routing, old share links, and deployment
behavior were not redesigned or weakened.

## Old visual hierarchy

The old `ProfileShell` gave equal visual weight to a large identity hero with
owner/visitor mode labels and rank progress, the owner roll/public roll action,
stats, signature/best roll, links, recent colors and timeline, achievements and
collection, a public-boundary explanation, social controls, and explore/footer
calls to action. The roll result also exposed traits, conditions, rewards, and
shop/leaderboard actions inline. The result read as a collection of dashboard
modules rather than a personal site.

## New visual hierarchy

The default public composition is:

1. identity hero;
2. today’s owner roll or visitor latest color;
3. selected links, or signature color when no links are published;
4. one featured accomplishment or story surface.

The new primary row uses real `profileData.js` mappings and the existing
normalized v1 configuration. `profileComposition.js` projects stored module
definitions into this small presentation without changing what is stored or
what the server authorizes. On mobile, the identity hero is followed directly
by the latest color/roll, then expression and featured story.

## Removed from presentation or demoted

- Removed the visible “Public boundary / What visitors can see” explanation.
- Removed dashboard “Owner view” and “Visitor view” labels.
- Removed hero-level duplicate edit, shop, follow/roll, and rank-progress
  actions from the primary identity composition.
- Removed primary roll-result “Style in shop” and “View leaderboard” calls.
- Demoted rank progress, detailed stats, recent history/timeline, achievement
  and collection grids into “More of the color story.”
- Demoted configuration, editing, decoration, account-management, legacy
  controls, and deletion compatibility into “Owner tools.”
- Demoted favorites, reactions, guestbook, follow, block, report, and social
  settings into “Connect with this profile.”
- Retained the global footer and its normal site navigation; it is not part of
  the public profile primary composition.

The legacy renderer remains reachable with `legacy=1`, and the structured
configuration editor remains available. No data or RPC was deleted.

## Compatibility decisions and known compromises

- `parseRouteLocation` remains backward-compatible. `shouldUseAuthenticatedProfileHome`
  changes only the bare authenticated root; `/?view=game` remains explicit
  roll navigation. Public username, profile-id, challenge, and `legacy=1`
  paths remain intact.
- The existing v1 `boundary` and `explore` module definitions are normalized
  and retained for stored-config compatibility, but are not rendered in the
  default primary/detail hierarchy.
- Visitors receive a latest public result region; they never mount the owner
  `ProfileRoll` or acquire roll authority. Owners still use the secure existing
  `get_my_daily_roll`/`roll_die` path and canonical refresh seam.
- The local/linked Supabase environment still has the Phase 9 documented
  migration/catalog drift. The screenshot fixture was the real public profile
  `/u/Anzul`; its mapped public data rendered, while the existing social RPC
  drift warning remained visible. No remote migration or fallback was added.
- The browser captures are public visitor captures. Owner roll readiness and
  authenticated-root routing are covered by source/contract tests; no test
  account or production data was mutated to create a screenshot state.
- A small `Surface` forwarding prop exposes the identity region to the
  screenshot/visual contract without changing the primitive’s visual behavior.

## Screenshot artifacts and exact viewport results

The repeatable capture command is:

```bash
PROFILE_SCREENSHOT_URL=http://127.0.0.1:5174/u/Anzul \
PROFILE_SCREENSHOT_OUTPUT=artifacts/phase-10/after \
node scripts/capture-profile-screenshots.mjs
```

The before capture uses the same route and fixture against the archived Phase
0–9 checkout on port 5175. The live renderer uses real mapped profile data;
the archived checkout is used only to establish the visual comparison.

Before:

- [1440×900](../artifacts/phase-10/before/1440x900.png)
- [1280×720](../artifacts/phase-10/before/1280x720.png)
- [390×844](../artifacts/phase-10/before/390x844.png)

After:

- [1440×900](../artifacts/phase-10/after/1440x900.png)
- [1280×720](../artifacts/phase-10/after/1280x720.png)
- [390×844](../artifacts/phase-10/after/390x844.png)
- [after metrics](../artifacts/phase-10/after/metrics.json)

Measured after results from the browser capture:

| Viewport | Primary region bounds | Primary composition result |
| --- | --- | --- |
| 1440×900 | identity y=161–444; roll/expression/featured y=468–702 | primary composition fits; `primaryBottom=702 < 900` |
| 1280×720 | identity y=161–442; roll/expression/featured y=466–690 | identity, latest result, and expression fit; `primaryBottom=690 < 720` |
| 390×844 | identity y=146–381; roll y=397–599; expression y=611–766; featured y=778–914 | mobile is intentionally stacked; identity and roll lead; page scrolls after the primary viewport as expected |

The complete page scroll heights are 928, 917, and 1206 respectively; the
desktop gate concerns the primary composition, not the deliberately collapsed
detail and site-footer content.

## Tests and validation

Phase 10 added `test/phase-10-profile-first.test.js` and updated the Phase 2
and Phase 4 profile contracts for the intentional hierarchy change. The test
suite covers the four-region projection, authenticated-home routing, preserved
detail surfaces, removed boundary copy, and compact roll actions.

Final command results are recorded below after the complete validation run.

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 263 modules transformed; JS asset 589.53 kB; CSS asset 253.12 kB; existing >500 kB chunk warning remains visible |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 89 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:balance-drift` | PASS | 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS locally / linked FAIL | Snapshot and seed match (82 items). Explicit linked check reports missing remote `bg_prism_atmosphere` and `name_prism_atelier`; this is the Phase 9 pre-existing remote drift blocker. |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.` |
| `npm run check:performance` | PASS | JavaScript 575.72 kB/650.00 kB; CSS 247.19 kB/300.00 kB; HTML shell 5.59 kB/12.00 kB |
| `bash scripts/repo-hygiene-check.sh` | PASS | Required phase documents exist; no forbidden tracked paths found |

No schema change occurred, so `supabase db lint --local` and `npm run db:reset`
were not applicable to this Phase 10 slice. Existing Phase 9 linked-schema and
catalog drift remains a documented release blocker; it was not changed here.

## Remaining Phase 11 boundary

At the Phase 10 boundary, Phase 11 was explicitly scoped as a
continuous-composition minimalism pass. It was required to remove the
remaining hero-plus-card-grid grammar and make identity and roll one central
visual moment, with links and story as quiet continuation. That subsequent
authorized workflow is now recorded in
[`docs/PHASE_11_REPORT.md`](PHASE_11_REPORT.md); it did not re-expand the
default profile into a dashboard or change the Phase 10 compatibility boundary.
