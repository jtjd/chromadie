# Phase 0 — Baseline and Safety Report

**Audit date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Milestone:** Phase 0 — Baseline and Safety  
**Scope:** Current-system audit, regression protection, and documentation. No redesign implementation.

## Baseline status

The browser application baseline was healthy for local build, static checks, lint, unit tests, link checks, CSP checks, balance/catalog drift checks, and the existing Pages Function tests. The two database-backed validation commands were initially blocked because the local Supabase PostgreSQL container was already stopped before this milestone; the container was restarted without a database reset and both checks passed in the final run.

The baseline suite was run before the Phase 0 code changes:

| Command | Result | Recorded result |
| --- | --- | --- |
| `npm run build` | PASS | Vite production build completed; 214 modules transformed |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 30 tests passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:balance-drift` | PASS | `66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | PASS | Local snapshot/seed match: 80 items; remote comparison skipped because Supabase env vars were not set |
| `npm run check:scoring-parity` | BLOCKED | Docker error: `container ... is not running` |
| `npm run check:db-security` | BLOCKED | Docker error: `container ... is not running` |

The initial local diagnostic was consistent across the database checks:

```text
supabase_db_Chromadie container is not running: exited
supabase_db_Chromadie  Exited (137)  8 days ago
```

`supabase start` also reported that the project was already considered running while the database container was exited. A scoped `docker start supabase_db_Chromadie` restored the database; no `supabase db reset` or migration was run, and other projects' Docker containers were left untouched. The initial failure was an environment/fixture availability failure, not evidence of a scoring or database-security assertion failure.

Final post-edit validation, after the database restart:

| Command | Result | Recorded result |
| --- | --- | --- |
| `npm run build` | PASS | Vite build completed; 217 modules transformed |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 35 tests passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:balance-drift` | PASS | 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS | Local snapshot/seed match: 80 items; remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.` |

## Audit deliverables

- `docs/CURRENT_SYSTEM_MAP.md` documents routes, component ownership, stores, RPC/API calls, public-profile flow, roll flow, cosmetics/achievements/shop sources, deployment metadata, and coupling hazards.
- `src/lib/routes.js` extracts the existing route parser as a pure contract without changing accepted routes or side effects.
- `src/lib/profileContract.js` centralizes the existing owner predicates and allow-lists the profile/score fields used by the current renderer.
- `src/lib/rollState.js` centralizes existing roll readiness/account guards and bounded canonical result normalization; scoring and reward decisions remain server-side.
- `test/phase-0-contracts.test.js` adds five focused tests covering the requested current contracts.
- `docs/PROGRESS.md`, `docs/DECISIONS.md`, and `docs/CHANGELOG_2_0.md` record the milestone state and boundary decisions.

## Regression coverage added

The new tests cover:

1. Owner versus visitor versus guest profile predicates, including case-insensitive username ownership and id ownership.
2. Guest versus authenticated roll account mode and authentication readiness.
3. Normal-roll and reroll guards, including missing shards, missing user, and active reroll lock.
4. Canonical server result preservation, badge de-duplication/validation, and presentation bounds.
5. Public username, app/query, challenge, and not-found route parsing.
6. Critical public profile and score field mapping while excluding an extra private field.

The full Node test count increased from 30 to 35, with all 35 passing after the extension-resolution correction described below.

## Failures and compatibility notes

The first post-edit test invocation exposed a Node ESM extension issue in the new helper import (`rollPresentation` without `.js`). The import was corrected immediately; the Svelte/Vite build and checks already passed, and the final test run passed all 35 tests. This was a test/runtime compatibility issue, not a product behavior failure.

The initial database-check block was cleared by restarting only the stopped project database container. No `supabase db reset` was run because Phase 0 made no schema changes.

## Migration and security assessment

- Database migrations: none added or modified by Phase 0.
- Production data: no writes or semantic changes.
- Scoring: unchanged; `roll_die` and SQL calculation remain authoritative.
- Economy/rewards: unchanged; purchases, rerolls, EP, achievements, and prestige remain server-owned.
- RLS/projections: unchanged; public profile and leaderboard boundaries remain in place.
- Routes: no route removed, renamed, or redirected.
- UI/product behavior: no redesign or intentional behavior change.
- Existing unrelated working-tree changes were preserved.

## Recommended Phase 1 boundaries

Phase 1 should remain design-foundation work only:

- Add tokens, typography/spacing foundations, motion primitives, and small shared surface/button/media primitives behind existing components.
- Build a fixture-data profile canvas prototype without replacing the live profile route.
- Treat mobile and `prefers-reduced-motion` as acceptance requirements.
- Keep the current route parser, public profile projections, roll RPC, auth hydration, shop catalog, and metadata flow as stable interfaces.
- Do not add a schema migration, move gameplay authority to the client, replace the SPA with SvelteKit, or remove the legacy profile/roll surface during Phase 1.
- Keep the Docker-backed parity and security checks in the required validation suite for future milestones.

## Go / no-go assessment

**GO for Phase 0 completion and for a later Phase 1 design-foundations milestone, within the boundaries below.** All required non-schema validation commands now pass, including scoring parity and database security. This assessment does not authorize beginning Phase 1 in this run; the milestone stops here as requested.

The Phase 1 boundary remains design-only: no backend migration, scoring/economy change, route replacement, SvelteKit migration, or product behavior change.
