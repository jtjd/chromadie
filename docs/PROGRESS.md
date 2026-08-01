# Chromadie 2.0 Progress

## Homepage Conversion Pass — 2026-07-31

- Reframed `/` around customizable public profiles, daily rolls, leaderboard
  discovery, and a repeated username claim action.
- Added one profile-led hero, three centralized example-profile fixtures, and
  a compact roll/discovery explanation with desktop and 390 × 844 evidence.
- Added four redacted, consent-gated homepage conversion events without
  changing authentication, username moderation, routes, or gameplay authority.
- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` pass;
  performance budgets remain over the repository thresholds.

## Active Phase

Phase 14 — Avatars, Backgrounds, and Spotify

## Current Milestone

Phase 13.1 remains local-only and its public cutover is still gated. Phase 14
adds optional avatar, background, and Spotify expression through the existing
Supabase stack without changing the approved profile composition. The
expression and storage-size migrations are applied to the linked database; the
public gate remains active for testing.

The profile identity editor now treats each account username as its display
name and exposes only bio editing.

Profile settings now controls visitor-facing daily-roll visibility, and profile
refreshes avoid briefly rendering stale daily-color presentation when returning
to a browser tab.

Profile hydration now requests independent projections in parallel and caches
the static achievement catalog to reduce tab-return and first-profile latency.

Staff accounts now have an alpha-only hosted MP3 profile-audio path with
server-enforced storage limits, looping playback, and autoplay fallback.

## Completed

- Product direction agreed.
- Starter documentation created.
- Current implementation audited across the SPA, routes, stores, profile, roll, shop, leaderboard, cosmetics, Supabase, Pages Functions, deployment, and metadata paths.
- `docs/CURRENT_SYSTEM_MAP.md` created.
- Pure route, profile, and roll contracts added behind the existing interfaces: `src/lib/routes.js`, `src/lib/profileContract.js`, and `src/lib/rollState.js`.
- Five focused Phase 0 regression tests added in `test/phase-0-contracts.test.js`.
- `docs/PHASE_0_REPORT.md` created with baseline, failure, migration, boundary, and go/no-go assessment.
- No schema, RLS, scoring, economy, reward, route, production-data, or UI behavior changes made.
- Phase 1 token, typography, spacing, radius, elevation, layout, breakpoint, and motion foundations added.
- Shared `Surface`, `Button`, `Media`, and `Module` primitives added and used by the fixture canvas.
- Responsive fixture profile canvas added at `/prototype/profile` with `noindex,nofollow` metadata.
- Explicit reduced-motion behavior added for new motion primitives and prototype transitions.
- Existing live profile, auth, roll, shop, leaderboard, and public profile behavior remains on the Phase 0 path.
- Shared live profile hydration extracted to `src/lib/profileData.js` and used by both renderers.
- `src/lib/ProfileShell.svelte` integrated at the existing profile routes with identity, owner/visitor modes, rank, stats, best roll, recent colors, pinned badges, cosmetics, and safe loading/error/empty states.
- `legacy=1` preserves the existing full profile controls path for mood editing, pinned badges, rivals, and account deletion; public legacy URLs are canonicalized and non-indexable.
- Phase 2 regression tests cover owner RPC/public visitor query separation, private achievement-progress exclusion, the legacy route parser, and live-shell/no-roll boundaries.
- Shared `rollService.js` now owns the client request seam for `roll_die` and the short-lived browser reroll lock used by both roll surfaces.
- Shared percentile presentation and canonical normalization are used by the existing game and the new owner profile roll module.
- `ProfileRoll.svelte` adds authenticated owner restoration, readiness, server-result animation, rarity/condition/reward/collection/next-action states, reroll safeguards, reduced-motion/mobile behavior, and no-navigation completion refreshes.
- Successful owner rolls refresh the existing profile, inventory, and wallet stores, then reload the profile projection through `ProfileShell.svelte`.
- Guest rolling remains local to `Game.svelte`; public visitor profiles render read-only data and never mount owner roll controls.
- Phase 3 regression tests cover the RPC argument/canonical result seam, server failures, reroll lock expiry, percentile tiers, owner-only mounting, no client scoring/reward calculation, and reduced-motion/profile refresh contracts.
- Phase 4 adds the version-1 `profile_configurations` table with RLS, no browser table grants, safe default configuration, owner draft/publish RPCs, and published-only public projection.
- `ProfileEditor.svelte` adds owner-local preview, signature color, layout variant, ordered module visibility, and bounded typed HTTPS links without raw markup, CSS, or client-authoritative gameplay state.
- `profileData.js` keeps owner draft loading separate from visitor published loading; `ProfileShell.svelte` renders configured modules/links through the shared safe normalizer and retains the always-visible owner roll module.
- Phase 4 regression/security coverage protects config normalization, owner/visitor projection separation, draft/publish boundaries, RPC role grants, invalid input rejection, public draft exclusion, and account-delete cascade.
- Phase 5 adds durable `profile_events` for profile creation and canonical score changes, idempotent historical backfill, and `get_public_profile_story` with bounded timeline and lifetime condition collection projections.
- `ProfileTimeline.svelte` and `ProfileCollection.svelte` compose inside the existing configurable recent/achievement modules, preserving Phase 4 saved layouts while adding visual history and collection meaning.
- Story depth grows from the server-owned `total_rolls` field; the collection showcase unlocks at 10 rolls and private `user_achievements` progress remains excluded.
- Phase 5 regression/security coverage protects story normalization, progressive thresholds, owner/visitor story loading, unsafe payload filtering, trigger capture, public RPC bounds, browser grants, and account-delete cascade.
- Phase 6 adds the bounded `get_public_discovery` projection, supporting profile/best-roll/recent-player indexes, and explicit browser grants/search-path bounds.
- `DiscoveryHub.svelte` and `DiscoveryCard.svelte` provide public discovery surfaces, profile CTAs, safe profile sharing, username/rarity filters, and load-more pagination through the existing `/leaderboard` route.
- `discoveryData.js` normalizes public card fields and removes internal identifiers from new discovery payloads; the existing rivals id remains isolated to its authenticated follow compatibility path.
- Phase 6 regression/security coverage protects public-only discovery fields, route allow-lists, safe profile paths/share text, pagination caps, discovery RPC grants, and reduced-motion/raw-HTML contracts.
- Phase 7 adds protected social settings, favorites, positive reactions, guestbook entries, blocks, reports, and per-account social rate-limit windows. New tables have RLS and no browser table privileges; public reads use one bounded social projection.
- `ProfileSocial.svelte` adds owner/visitor favorite/reaction/guestbook/block/report controls and owner activity/discovery/privacy settings inside the existing profile shell. It does not add notifications or private messaging.
- Existing `toggle_follow` retains the five-rival cap and return contract while applying block and interaction checks. Social settings gate public score/story/discovery projections without changing public profile URLs or crawler metadata.
- Phase 7 regression/security coverage protects public social normalization, owner/visitor social loading, guest-safe read behavior, text/rendering boundaries, social table grants/RLS, fixed search paths, rate limits, block cleanup, privacy enforcement, discovery exclusion, and account deletion.
- Phase 8 adds an additive `profile_entitlements` table with RLS, no browser table grants, service-role-only idempotent grants, owner-only entitlement-key projection, and account-deletion cleanup.
- The live shop catalog now has explicit `free`, `earned`, and `premium` access tiers. Existing EP/inventory semantics remain unchanged; two premium expression rows are preview-only until a service-side entitlement exists.
- `DecorationStudio.svelte` and `ShopStudioPreview.svelte` use the real `ProfileShell.svelte` hero renderer in an isolated network-free preview mode. Free baseline messaging and access labels make the monetization boundary explicit without making free profiles socially inferior.
- `purchase_item` rejects premium rows before EP mutation, while `equip_item` rechecks premium entitlement server-side. No payment provider, browser grant path, scoring, reward, RLS weakening, or production entitlement source was introduced.
- Phase 8 regression/security coverage protects access labels, entitlement-versus-inventory ownership, owned catalog filtering, real preview isolation, premium RPC grants, catalog drift, account deletion, and fixed search paths.
- Phase 9 adds `check:performance` with explicit JavaScript, CSS, and HTML budgets; the current Vite chunk warning remains visible and is not hidden.
- `App.svelte` adds a skip link and focuses the active content region after programmatic/popstate navigation without changing route semantics or dialog focus restoration.
- `Media.svelte` now accepts only same-origin/HTTPS sources, reserves its aspect-ratio box, and exposes an accessible local fallback on invalid or failed media loads.
- Public static shells and valid public profile HTML receive bounded cache policies; missing, owner/private, and `legacy=1` profile responses remain `no-cache`. Hashed assets receive immutable caching through `public/_headers`.
- Phase 9 regression coverage protects media protocol boundaries, fallback/source handling, skip navigation, route focus, public/private cache policy, security headers, and performance-budget failure behavior.
- Phase 9 continuation adds an opt-in, provider-neutral product-event contract with a page-local no-network adapter. Events are allowlisted and redacted; consent is stored only in browser local storage, and no event sink or product-event database was introduced.
- Existing route, profile, roll, sharing, and shop transitions emit only coarse observational events after their existing successful/readiness boundaries. No event can change gameplay, account, profile, shop, social, or metadata state.
- Added `docs/ANALYTICS_CONTRACT.md` and `docs/MODERATION_OPERATIONS.md`, documenting consent, redaction, retention/deletion prerequisites, report triage boundaries, protected social data, and current moderation gaps.
- Added five focused Phase 9 continuation tests covering consent, redaction, bounded adapters, no-network behavior, and integration call sites.
- Completed the Chromium browser audit across direct refresh, metadata, keyboard focus, reduced motion, mobile navigation/layout, guest roll, public-profile error, privacy preference, signed-out shop, and accessibility-tree contracts; no browser runtime errors or mobile horizontal overflow were observed.
- Added `docs/PHASE_9_BROWSER_AUDIT_REPORT.md` with browser evidence, linked-remote checks, deployment blocker assessment, and remediation boundaries.
- Added `docs/ROLLBACK_AND_RECOVERY.md` with Cloudflare Pages rollback, Supabase migration stop conditions, backup/PITR ownership, and data-recovery boundaries.
- Added four focused Phase 9 browser-audit contract tests. The native suite now contains 86 tests.
- Read-only linked-project checks found the remote migration history stops at `20260712200000_launch_audit_remediation`; local Phase 4–8 migrations and two catalog keys are not remotely applied. No schema push or client fallback was performed.

## Phase 10 Complete

- The authenticated bare root now resolves to the owner’s live `ProfileShell`;
  explicit `/?view=game` remains the direct roll route.
- The live public composition projects real mapped profile data into identity,
  latest color/roll, expression, and one featured story/accomplishment region.
- Stats, rank progress, history, collection, achievements, social controls,
  configuration, decoration, account controls, and the legacy renderer remain
  available behind collapsed detail or compatibility surfaces.
- The visible public-boundary explanation, dashboard mode labels, redundant
  primary edit/shop/explore/leaderboard calls, and public footer explanation
  were removed from the default hierarchy.
- Added `src/lib/profileComposition.js`, `ProfileExpression.svelte`, and
  `ProfileFeatured.svelte`; compacted secondary result detail in
  `ProfileRoll.svelte`; and added the repeatable browser screenshot script.
- Added the Phase 10 milestone, profile-first gate, product-direction
  addendum, next-phases roadmap, report, and focused regression contracts.
- No migration was required. Existing configuration, RPCs, RLS, scoring,
  rewards, economy, entitlements, history, cosmetics, social data, routes,
  direct refresh behavior, and `legacy=1` remain compatibility boundaries.

## Phase 10 Validation Status

- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` pass;
  the final native suite has 89 passing tests and no failures.
- `npm run check:links`, `npm run check:csp`, `npm run check:balance-drift`,
  `npm run check:scoring-parity`, `npm run check:db-security`,
  `npm run check:performance`, and `bash scripts/repo-hygiene-check.sh` pass.
- Local `npm run check:catalog-drift` passes for the 82-item snapshot/seed
  pair. An explicit linked-project probe still fails because the remote lacks
  `bg_prism_atmosphere` and `name_prism_atelier`, the pre-existing Phase 9
  release blocker. No remote write was attempted.
- Browser captures use real public `/u/Anzul` data at 1440×900, 1280×720, and
  390×844; the complete artifact paths and measured region bounds are in
  `docs/PHASE_10_REPORT.md`.

## Phase 11 Complete

- Replaced the Phase 10 hero-plus-card grammar with one atmospheric opening
  canvas that combines identity and the latest color or owner roll.
- Made links, signature expression, and one accomplishment/story trace quiet
  supporting continuation surfaces without equal-weight cards or repeated
  module chrome.
- Integrated the owner `ProfileRoll` presentation through an additive visual
  prop; secure roll RPCs, canonical results, rerolls, rewards, and refreshes
  remain unchanged.
- Kept history, statistics, social, editing, configuration, account,
  entitlements, shop, and legacy controls reachable through deliberate detail
  surfaces.
- Added the Phase 11 visual contract, focused composition/authority tests,
  real-data screenshots, exact metrics, and the phase report.
- No schema migration, production write, route change, auth/RLS change, or new
  product system was introduced.

## Phase 11 Validation Status

- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` pass;
  the final native suite has 91 passing tests and no failures.
- `npm run check:links`, `npm run check:csp`, `npm run check:balance-drift`,
  `npm run check:scoring-parity`, `npm run check:db-security`,
  `npm run check:performance`, and `bash scripts/repo-hygiene-check.sh` pass.
- Local `npm run check:catalog-drift` passes for the 82-item snapshot/seed
  pair. The linked project still lacks `bg_prism_atmosphere` and
  `name_prism_atelier`; no remote write or client fallback was attempted.
- Browser captures use real public `/u/Anzul` data at 1440×900, 1280×720, and
  390×844. The measured primary composition ends at y=658, y=631, and y=775
  respectively; exact bounds and artifact paths are in
  `docs/PHASE_11_REPORT.md`.

## Phase 11.1 Complete

- Corrected the approved-mockup fidelity gap with a full-viewport atmosphere,
  readable essential type, upper-middle identity placement, and a separate
  lower expression anchor when an explicit fixture exists.
- Hid unconfigured music/expression in the production composition and replaced
  generic missing-bio copy with a truthful mapped color-history/first-chapter
  state; no new identity or music data contract was introduced.
- Added the measured pre-change audit, post-change computed-style audit,
  repeatable scale-controlled screenshot captures, and side-by-side comparison
  under `artifacts/phase-11-1/`.
- Preserved the owner/visitor roll behavior, secure RPC path, history,
  configuration, social/moderation, route, legacy, media/music, and deployment
  compatibility boundaries.

## Phase 11.1 Validation Status

The exact command results and viewport measurements are recorded in
`docs/PHASE_11_1_REPORT.md`. Phase 12 is now complete as a separate
sitewide-shell and default-entry boundary.

## Phase 12 Complete

- Extended the approved profile atmosphere and restrained header language to
  Roll, Discover, Studio, help, privacy, unavailable, and guest-lock surfaces.
- Preserved the approved `ProfileModeHeader` and centered `ProfileShell`
  composition for public and authenticated profile viewing.
- Kept the route contract explicit: signed-out `/` opens the guest Roll
  surface, authenticated `/` resolves to the owner profile after hydration,
  and `/?view=game` remains the direct Roll route.
- Added responsive native Menu behavior and route contracts without changing
  authentication, RLS, roll authority, scoring, economy, social, or legacy
  compatibility behavior.
- Captured repeatable Chromium evidence under `artifacts/phase-12/` and
  documented the visual/compatibility boundary in
  `docs/PHASE_12_REPORT.md`.

## Phase 12 Validation Status

- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` pass;
  the final native suite has 100 passing tests and no failures.
- `npm run check:links`, `npm run check:csp`, `npm run check:performance`,
  `npm run check:balance-drift`, `npm run check:catalog-drift`,
  `npm run check:scoring-parity`, `npm run check:db-security`,
  `bash scripts/repo-hygiene-check.sh`, and `git diff --check` pass locally.
- No schema migration was added, so database reset/lint was not required for
  this milestone. The existing linked Supabase migration/catalog drift
  remains a release concern and was not altered.

## Sitewide Cohesion Refinement — 2026-07-27

- Aligned the supporting application header with the profile header's
  transparent brand treatment, logo mark, spacing, typography, and slash-
  separated navigation language.
- Added `src/styles/site.css` as the shared visual projection for Roll,
  Discover, Studio, help, privacy, challenge, unavailable, and guest-lock
  surfaces. It keeps route-specific layouts while standardizing the profile's
  atmosphere, translucent surfaces, quiet borders, type hierarchy, controls,
  mobile rhythm, and reduced-motion behavior.
- Kept the secure roll path, account/session handling, public profile boundary,
  shop catalog, social/moderation surfaces, direct-refresh routes, and legacy
  profile path unchanged.
- Added `test/sitewide-profile-cohesion.test.js` and reviewed Chromium captures
  for signed-out Roll, Discover, Studio boundary, help, privacy, and public
  profile at desktop and mobile widths without horizontal overflow.

This refinement does not unblock the Phase 13 database baseline gate; the
linked schema/catalog drift and Firefox certification gap remain unchanged.

## Roll-integrated profile response — 2026-07-28

- Kept the existing owner-only `ProfileRoll` on the profile page and added
  bounded lifecycle events for presentation state.
- Added a transient profile response: identity content recedes while the
  canonical roll resolves, then the returned color ripples through the
  atmosphere, identity surface, and collection trace.
- Added reduced-motion equivalents and regression coverage for the event/state
  bridge. No score, rarity, reward, eligibility, inventory, profile-data,
  route, schema, auth/RLS, or historical-roll behavior changed.
- Validation on 2026-07-28: build, Svelte check, ESLint, 103 tests, links, CSP,
  balance, local catalog snapshot/seed, scoring parity, database security,
  performance, and diff checks all pass. The build retains the existing large
  chunk warning; no remote catalog comparison was available without Supabase
  environment credentials.

## Profile ritual and identity surface refinement — 2026-07-29

- Simplified the live identity card to avatar, name/handle, optional
  structured links, and one earned badge. The generated color-history sentence
  no longer presents itself as a fake personal bio.
- Separated the daily color/game layer below the identity card on the same
  page. Its quiet profile mode keeps the primary result to color, score, and a
  details disclosure; the full game record remains available when opened.
- Kept the color archive as a quiet featured trace below the game layer so
  progression remains visible without competing with the person.
- Reworked the owner pre-roll into a staged color-field reveal with an
  explicit skip path, canonical hex reveal, score count-up, progressive
  condition reveal, and reduced-motion equivalents. The existing secure RPC,
  reroll lock, canonical normalization, refresh behavior, and owner-only
  boundary remain unchanged.
- Added `test/profile-ritual-refinement.test.js`. No schema, auth/RLS, route,
  scoring, rarity, rewards, economy, entitlement, historical-data, or public
  privacy behavior changed.
- Validation on 2026-07-29: build, Svelte check, ESLint, 105 tests, links, CSP,
  performance, balance, local catalog snapshot/seed, scoring parity, database
  security, and diff checks all pass. The build retains the existing large
  chunk warning; remote catalog comparison was unavailable without Supabase
  environment credentials.

## Conditions and desktop composition refinement — 2026-07-29

- Kept the full server-reported scoring-condition rail inside the expandable
  game-details body, but removed it from the quiet primary profile result.
- Replaced the wide two-column identity surface with a small centered identity
  card and a separate, low-contrast daily game layer below it. The archive
  remains a quiet trace and the whole composition stacks naturally on mobile.
- Reviewed multiple current guns.lol profile patterns for the identity-first
  hierarchy, compact metadata/link treatment, and optional subordinate
  modules. No profile data, schema, auth/RLS, route, scoring, reward, or roll
  authority changed.
- Browser captures at 1920×1080, 1440×900, 1280×720, and 390×844 show the
  simplified card/game separation and no horizontal overflow.
- Final validation: build, Svelte check, ESLint, 105 tests, links, CSP, balance,
  local catalog snapshot/seed, scoring parity, database security, and diff
  checks pass. Performance is within budget at 581.98 kB JavaScript,
  294.90 kB CSS, and 5.59 kB HTML; the existing large-chunk warning remains.

## Phase 13 Baseline Gate

- Phase 13 implementation is blocked before schema work. The linked project
  ends at `20260712200000_launch_audit_remediation`; local Phase 4–8 migrations
  remain pending remotely.
- The linked catalog is missing `bg_prism_atmosphere` and
  `name_prism_atelier`; the local snapshot and seed still match at 82 items.
- No identity migration, editor, root username route, canonical metadata
  change, DNS/Cloudflare change, Supabase Auth URL change, or email-template
  deployment was performed.
- The exact read-only evidence and safe ordered reconciliation are recorded in
  [`docs/PHASE_13_DATABASE_BASELINE.md`](PHASE_13_DATABASE_BASELINE.md).

## In Progress

- Phase 13 is held at the database baseline gate. No identity-data work has
  started; the profile ritual refinement is the latest implemented visual
  boundary on top of Phase 12.

- Launch certification is pending authorized remote migration/catalog reconciliation and a clean Firefox/device pass. The local Chromium audit is complete; no code change is justified by the browser evidence.

## Blocked

- The linked Supabase project is behind the branch: `get_public_discovery`, public configuration/story/social RPCs, and owner configuration/social/entitlement RPCs return PostgREST `PGRST202`/HTTP 404, and the remote catalog is missing `bg_prism_atmosphere` and `name_prism_atelier`. Applying migrations requires explicit release/DB-owner authorization plus backup/PITR confirmation; it was not performed.
- Firefox automation could not complete because the environment's existing Firefox process was already running and not responding. A clean Firefox/device pass remains a release gate.

## Next

Phase 13 is blocked and work stops at this boundary. The next release action
is authorized ordered migration/catalog reconciliation with backup/PITR and
post-deploy verification, followed by a clean Firefox/device pass. Any
identity-data contract, measured code-splitting,
legacy-renderer retirement, or detail-view refinement requires a separately
approved milestone. The current
product-event contract still has no production sink or assigned operational
owner. Media/embeds, OG/share expansion, SvelteKit, payment/webhook issuance,
private messaging, visitor analytics, comparisons, broader profile visibility,
subjective beauty ranking, and unrelated cleanup remain deferred.

## Validation Status

Results recorded 2026-07-25. The Phase 0 baseline had 30 passing tests; Phase 1 had 39; Phase 2 had 43; Phase 3 had 48; Phase 4 had 52; Phase 5 had 56; Phase 6 had 62; Phase 7 had 66; Phase 8 had 71; Phase 9 launch hardening had 77; the Phase 9 continuation had 82; the browser-audit slice has 86. Phase 9 added no schema migration and reused the green local database state from Phase 8.

| Command | Result | Exact result / blocker |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 258 modules transformed; JS asset 580.61 kB; CSS asset 243.24 kB; Vite emitted the existing >500 kB chunk-size warning |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | Browser-audit run: 86 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:performance` | PASS | `Performance budget passed: JavaScript 567.00 kB/650.00 kB; CSS 237.54 kB/300.00 kB; HTML shell 5.59 kB/12.00 kB` |
| `npm run check:balance-drift` | PASS | `Balance drift check passed: 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | FAIL / BLOCKER | Local snapshot and seed match (82 items), but the linked remote comparison reports missing remote `shop_items`: `bg_prism_atmosphere`, `name_prism_atelier` |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.` (SQL audit emitted assertions and rolled back its test transaction) |
| `supabase migration list --linked` | BLOCKER | Remote applied through `20260712200000_launch_audit_remediation`; local Phase 4–8 migrations `20260725100000`–`20260725140000` remain pending |
| `supabase db diff --linked --schema public` | DRIFT WARNING | Read-only command exited 0 but reported schema drift and unexpected drop statements for Phase 4–8 objects; generated diff was not applied |
| `supabase db lint --local --level warning --fail-on warning` | PASS | `No schema errors found` |
| `npm run db:reset` | PASS | `Finished supabase db reset on branch redesign/profile-first.` |

The Phase 9 implementation and browser-audit slice added no database migration. The Vite build still reports its existing >500 kB warning, so a measured `check:performance` budget was added rather than disguising the warning. Public profile caching is restricted to published public responses; missing and legacy responses remain no-cache. The Phase 8 entitlement migration, schema lint, reset, and security audit remain green locally. The linked remote is not at the same migration/catalog boundary; no remote push was attempted. See [`docs/PHASE_9_BROWSER_AUDIT_REPORT.md`](PHASE_9_BROWSER_AUDIT_REPORT.md) and [`docs/ROLLBACK_AND_RECOVERY.md`](ROLLBACK_AND_RECOVERY.md).

## Phase 3 boundary notes

- The owner roll is mounted only when the resolved profile target matches the authenticated session. Visitor profiles remain read-only and guest users continue to use the root local roll flow.
- `ProfileRoll.svelte` renders only the server’s canonical hex, score, rarity, badges, traits, contributors, identity, percentile, achievements, milestone, and event reward fields. It does not calculate score, rarity, eligibility, or grants.
- The ten-second reroll lock prevents duplicate browser clicks only; `roll_die` remains the authority for daily eligibility and shard consumption.
- Roll completion refreshes existing stores and the profile projection in place; no route or navigation behavior changed.
- No database migration, RLS, scoring, economy, reward, production-data, metadata, or public URL semantics changed.

## Phase 2 boundary notes

- The current profile schema has no public bio or avatar field. The shell uses a safe username monogram and existing brand mark; it does not fabricate profile content.
- At the Phase 2 boundary, the new shell did not mount roll controls; Phase 3 now adds the owner-only `ProfileRoll` while preserving the canonical profile projection and root game flow.
- Owner-only achievement progress and controls remain out of the shell's public render model. `legacy=1` is the temporary owner-controls escape hatch.
- No scoring, economy, rewards, RLS, RPC semantics, production data, or schema definitions changed.

## Phase 4 boundary notes

- Profile configuration is versioned JSONB behind `profile_configurations`; browser roles cannot read or write the table directly.
- Owner reads receive draft and published projections. Visitors and anonymous users receive only the published projection through `get_public_profile_configuration`.
- Save is private; publish is explicit. The local preview is discarded on reload and does not change public rendering.
- SQL and client normalizers accept only fixed module/layout/link identifiers, safe hex colors, bounded labels, and HTTPS URLs. Raw HTML/CSS and arbitrary protocols are not part of the contract.
- The roll module remains visible and owner-only as established in Phase 3. No scoring, eligibility, rewards, economy, auth, metadata, or route semantics changed.

## Phase 5 boundary notes

- `profile_events` is an internal public-safe projection populated by profile/score triggers; it is not a second roll or achievement authority.
- The public story RPC returns at most 40 timeline events and 30 lifetime condition entries. Browser roles cannot read the event table directly.
- Timeline content is limited to profile origin and canonical roll events. Full `user_achievements` progress remains owner-private; pinned badges remain the public selected-achievement surface.
- The condition collection is grouped from canonical `scores.condition_ids` and public achievement labels where available. It does not change score, rarity, rewards, eligibility, economy, or historical score rows.
- Story sections compose inside existing Phase 4 modules so saved version-1 profile configurations remain valid. No new route, metadata, SvelteKit, discovery, or social-write behavior was introduced.

## Phase 6 boundary notes

- `get_public_discovery` is a read-only SECURITY DEFINER projection with a fixed search path, allow-listed surfaces/rarities, username-prefix validation, a maximum page of 20, and a maximum response of 12 rows. The client renders eight cards per page.
- New discovery JSON contains only public profile/card fields and validated usernames; it does not contain internal profile ids, email, wallet state, private achievement progress, draft configuration, or direct score-table rows.
- Today, weekly, monthly, all-time, exceptional, rising, new, and random surfaces remain discovery presentation semantics. They do not create a second score, rarity, reward, eligibility, economy, or prestige authority.
- `Leaderboard.svelte` remains the route entry point. `DiscoveryHub.svelte` owns the new feed; the existing rivals RPC and follow mutation remain the only compatibility path that carries a target id.
- Cards navigate and share through the existing `/u/<username>` route. Pages Function metadata and direct-refresh behavior remain unchanged for profiles and `/leaderboard`.
- Phase 6 stops before social writes, reactions, guestbooks, blocking/reporting, SvelteKit, broad refactors, and unrelated profile schema work.

## Phase 7 boundary notes

- New social tables are additive and RLS-enabled with no `anon` or `authenticated` table grants. Browser writes go through fixed-search-path SECURITY DEFINER RPCs.
- Favorites and three positive reactions are presentation signals only. They do not affect score, rarity, rank, EP, rewards, achievements, shop state, roll authority, or notifications.
- Guestbook entries are visible/hidden/removed rows with 240-character plain-text bounds, control-character/URL rejection, five-write-per-ten-minute rate limiting, and author/profile-owner deletion. Public projection returns at most 20 entries.
- Blocks remove reciprocal follows, favorites, and reactions and suppress social projection/mutations. Existing guestbook rows remain protected for moderation and are hidden across the blocked relationship.
- Reports are authenticated, bounded, deduplicated, rate-limited, and stored outside public JSON. There is no moderation dashboard or notification delivery in this milestone.
- Owner controls cover interactions, guestbook availability, recent activity visibility, and discovery inclusion. Hidden activity returns empty public score/story projections; hidden discovery remains accessible through a direct profile URL.
- The new profile-shell social module is the Phase 7 renderer. The `legacy=1` renderer remains a compatibility path for mood, badges, rivals, and deletion and does not receive a second social implementation.
- Phase 8 boundary notes
  - `profile_entitlements` is additive, RLS-enabled, browser-inaccessible, and service-role-write-only. The client receives bounded keys through an owner RPC and cannot grant or infer entitlement from catalog cost.
  - The 80 existing catalog rows remain earned/inventory or milestone semantics. Two new catalog rows are premium expression examples with zero EP cost and an `atelier_plus` entitlement key; `purchase_item` never treats them as free EP purchases.
  - The decoration studio is a fitting-room preview, not a second profile route. Its profile hero is rendered through `ProfileShell` preview mode without Supabase reads, social controls, owner controls, metadata, or account mutation.
  - Free baseline presentation remains complete and usable. Premium expression changes visual identity only and has no effect on score, rarity, rank, EP, rewards, achievements, roll authority, or public-profile privacy.
  - Payment provider/webhook integration, entitlement administration UI, notifications, private messaging, visitor analytics, comparisons, broader profile visibility, SvelteKit, and unrelated refactors remain deferred.

## Phase 9 boundary notes

- The performance budget is a launch regression guard over built assets, not a claim that the single Vite chunk is optimized. Current limits are 650 KiB JavaScript, 300 KiB CSS, and 12 KiB HTML shell.
- Route focus is limited to programmatic/popstate navigation and preserves modal/mobile focus restoration. The skip link targets `#main-content` and remains visible on keyboard focus.
- Media is structured and presentation-only. Same-origin paths and HTTPS sources are allowed; HTTP, protocol-relative, data, blob, JavaScript, control-character, and oversized sources fall back safely.
- Public HTML cache windows are short and route-specific. Owner/private profile state, missing profiles, and the legacy renderer are not cacheable.
- Cloudflare Web Analytics remains a separate shell-level service. The optional product-event contract is consented, redacted, page-local, and no-network in this slice; no event sink, retention job, or product-event database was added.
- Product events are observational only and never carry usernames, emails, account/profile ids, scores, colors, draft configuration, entitlements, guestbook text, report details, or moderation state. A future provider requires an assigned owner plus retention, deletion, access, and incident rules.
- Social moderation remains protected storage and RPC enforcement with an operations runbook. There is no moderation dashboard, queue, moderator identity audit field, notification delivery, or appeals workflow.
- Legacy controls remain behind `legacy=1`; removal is not part of this slice.

## 2026-07-26 — Phase 10.2: Approved Mockup Visual Convergence

Translated the approved frontend reference into the production Svelte profile
without importing React/Next.js or prototype data.

- Added `docs/APPROVED_MOCKUP_TRANSLATION.md` and
  `checklists/APPROVED_MOCKUP_PARITY_GATE.md` as the visual contract.
- Added a minimal profile-mode header, full-viewport canonical-color
  atmosphere, centered identity surface, compact collection trace, and quiet
  expression/music boundary.
- Kept owner roll authority in `ProfileRoll.svelte`; the integrated compact
  presentation only changes framing and leaves secure RPCs, anti-reroll,
  canonical results, rewards, and refresh behavior intact.
- Added a local-only screenshot fixture switch that reuses real mapped profile
  data for owner and pre-roll visual evidence; production builds cannot enable
  it and no fixture literals enter the live renderer.
- Captured reference, before, visitor, owner, pre-roll, completed, reduced
  motion, missing-avatar, and missing-music evidence under
  `artifacts/phase-10-2/`.
- No schema migration, auth/RLS change, route removal, media integration,
  music provider, social feature, or Phase 11 expansion was introduced.

See [`docs/PHASE_10_2_REPORT.md`](PHASE_10_2_REPORT.md) for exact viewport
measurements, validation results, compatibility decisions, compromises, and
the remaining Phase 11 boundary.

## Shared application header and navigation — 2026-07-29

- Replaced the rendered profile-only header path with the same `SiteModeHeader`
  used by Roll, Discover, and Studio. Every primary route now exposes the same
  Profile / Discover / Studio navigation model and active-state language.
- Kept profile Share and owner Edit actions as contextual controls inside that
  shared header, including the same responsive mobile menu. Public profiles,
  signed-out visitors, and authenticated owners retain their existing action
  boundaries.
- Preserved route parsing, direct-refresh URLs, auth/session handling, profile
  sharing analytics, owner edit dispatch, and all gameplay/backend authority.
- Verified the shared header visually on profile and leaderboard at desktop and
  mobile widths. No schema or migration change was required.
- Validation passed: build, Svelte check, ESLint, 105 tests, links, CSP,
  balance/catalog drift, scoring parity, database security, and performance.
  Final performance assets measured 582.42 kB JavaScript, 293.99 kB CSS, and
  5.59 kB HTML; the existing large-chunk warning remains.

## Profile-first navigation and quiet loading — 2026-07-29

- Removed Roll from the desktop and mobile primary navigation because the
  authenticated owner roll is already part of the profile.
- Preserved the game route for signed-out guest play, shared challenges, old
  direct links, and route compatibility. No roll, score, reward, or eligibility
  authority moved into the client.
- Removed visible account-hydration labels from the shared header, the global
  account banner, and the protected-route content area.
- Removed visible loading panels and silhouettes from both the current and
  compatibility profile renderers. The atmospheric canvas remains stable while
  profile content resolves, with loading exposed non-visually through
  `aria-busy`.
- Kept profile error and unavailable states explicit and unchanged. No schema,
  RLS, authentication, or historical-data change was required.
- Validation passed: build, Svelte check, ESLint, 106 tests, links, CSP,
  balance/catalog drift, scoring parity, database security, and performance.
  Final performance assets measured 580.72 kB JavaScript, 293.75 kB CSS, and
  5.59 kB HTML; the existing large-chunk warning remains.

## Shared header typography correction — 2026-07-29

- Consolidated primary navigation, profile actions, account controls, the
  mobile Menu trigger, and mobile-menu actions onto one Inter-based control
  style.
- Standardized all header controls at 0.78 rem, 600 weight, restrained letter
  spacing, and title case. The logo wordmark remains the only intentional
  typographic exception.
- Removed mono-font and inherited-font differences that made Share, Sign in,
  Profile, Discover, and Menu appear to belong to separate headers.
- No route, authentication, profile, gameplay, or backend behavior changed.
- Verified the result at desktop and mobile widths. Build, Svelte check,
  ESLint, 106 tests, links, CSP, balance/catalog drift, scoring parity,
  database security, and performance all passed. Final assets measured
  580.72 kB JavaScript, 294.08 kB CSS, and 5.59 kB HTML; the existing
  large-chunk warning remains.

## Minimal profile header — 2026-07-29

- Removed Profile, Discover, and Studio from the desktop profile header and
  profile-mode mobile menu.
- Kept the brand, Share, owner Edit, and account controls so public-profile
  actions remain available without turning the page into application chrome.
- Retained the complete primary navigation on Discover, Studio, and other
  non-profile routes.
- Preserved header alignment with a non-interactive profile-mode grid spacer
  and updated the mobile trigger’s accessible label to “Open profile actions.”
- No route, authentication, profile, gameplay, or backend behavior changed.
- Verified desktop and mobile profile headers. Build, Svelte check, ESLint,
  106 tests, links, CSP, balance/catalog drift, scoring parity, database
  security, and performance all passed. Final assets measured 580.97 kB
  JavaScript, 294.29 kB CSS, and 5.59 kB HTML; the existing large-chunk
  warning remains.

## Session-preserved editing state — 2026-07-29

- Added a small session-scoped view-state layer that keeps transient UI state
  across SPA navigation and same-tab reloads without changing published data.
- Profile editor drafts preserve in-progress links, including incomplete link
  rows, and clear after a successful save/publish or account-cache clear.
- Discovery preserves search/filter inputs; Shop preserves collection filters,
  context, sorting, and fitting-room choices, scoped to the active account.
- State restoration is bounded and allowlisted. Server-authoritative profile
  save/publish, authentication, RLS, gameplay, scoring, rewards, and inventory
  semantics remain unchanged.
- Added focused view-state regression coverage.

## Minimal public homepage — 2026-07-29

- Added `HomePage.svelte` as a small, responsive acquisition surface explaining
  the daily roll and evolving-profile loop without dashboard chrome.
- Added a direct “Create your profile” signup action for visitors and an
  “Open your profile” action for authenticated players.
- Kept the shared legal/support footer and atmospheric visual language, with a
  restrained CSS-native color identity composition and reduced-motion-safe
  interactions.
- Made `/` the stable homepage for every session and changed the header logo
  to navigate there. `/?view=game`, `/c/<id>`, `/u/<username>`, Discover,
  Studio, and legal routes remain available.
- Marked the direct compatibility game route non-indexable so the homepage is
  the canonical root acquisition page.
- No schema, authentication authority, RLS, gameplay authority, scoring,
  rewards, history, or public-profile URL behavior changed.
- Verified the homepage at 1280×720 and 390×844. Build, Svelte check, ESLint,
  108 tests, links, CSP, balance/catalog drift, scoring parity, database
  security, and performance all passed. Final assets measured 582.81 kB
  JavaScript, 298.14 kB CSS, and 5.59 kB HTML; the existing large-chunk
  warning remains.

## Horizontal identity card refinement — 2026-07-29

- Reworked the default identity card into a compact horizontal hierarchy with
  the avatar on the left, the name and bounded earned badges beside it, and
  public links beneath the identity copy.
- Kept the card’s daily roll, archive, owner/visitor, public-link, cosmetic,
  and reduced-motion boundaries unchanged.
- Verified the composition at 1440×900 and 390×844 with browser zoom and
  device scale factor set to 100%/1.

## Catchii visual language refinement — 2026-07-29

- Replaced the generic Inter / Space Grotesk / JetBrains typography direction
  with Satoshi for body copy, Cabinet Grotesk for display identity, and Geist
  Mono for technical labels.
- Reworked the homepage into a quiet, typographic personal-site composition:
  oversized `chm.lol` wordmark, restrained copy, text-led signup action, and a
  small daily-ritual note instead of decorative color orbits.
- Unified desktop action controls around the same thin capsule treatment as
  the shared navigation, and softened supporting route surfaces into neutral
  near-black panels with thin rules.
- Reduced the profile atmosphere and identity surface to preserve Chromadie’s
  color response without the saturated AI-dashboard glass treatment. Roll
  flare behavior, profile composition, authentication, and server authority
  remain unchanged.
- Captured full-browser visual evidence at 1440×900 and 390×844 under
  `artifacts/reference-visual-language/` with browser zoom 100% and device
  scale factor 1.

## Homepage navigation and footer correction — 2026-07-29

- Restored the shared Profile / Discover / authenticated Studio navigation on
  the homepage while keeping the profile-mode header intentionally reduced.
- Raised the global footer above the atmospheric background so its legal and
  support links remain visible on the homepage at desktop and mobile sizes.
- No route, authentication, profile, gameplay, scoring, rewards, history, or
  backend behavior changed.
- Re-captured homepage evidence at 1440×900 and 390×844 with browser zoom and
  device scale factor set to 100%/1.

## Profile settings boundary and quiet color story — 2026-07-29

- Removed the profile shell’s owner, story, and owner-facing social disclosure
  menus from the primary profile composition.
- Added the authenticated `/profile/settings` surface for profile editing,
  color-story visibility, social/privacy controls, account controls, and the
  decoration studio link.
- Color story is now hidden by default and can be explicitly enabled from
  Profile settings. Visitor social controls remain available as a quiet,
  non-collapsible continuation on other profiles.
- Because the linked production baseline remains drifted/NO-GO, no migration
  was added. The existing non-rendered `explore` configuration slot stores the
  opt-in compatibly until an approved additive database field can ship.
- Authentication, RLS, server-authoritative rolls, scoring, rewards,
  inventory, social RPCs, and historical data behavior remain unchanged.

## Phase 13A database reconciliation — 2026-07-29

- Recorded the linked production project as `auuoibdmjylrnekqquku` in
  `us-east-2` and confirmed the remote migration history ends at
  `20260712200000_launch_audit_remediation`.
- Confirmed the only local pending migrations are the five reviewed Phase 4–8
  migrations, in timestamp order: profile configuration, profile story,
  public discovery, social layer, and decoration entitlements.
- Completed the fresh local rehearsal: all 64 active migrations, seed, schema
  lint, catalog/security checks, expected RPC grants/search paths, and RLS
  checks passed. The local catalog contains exactly 82 items.
- Recorded production drift: the remote catalog has 80 rows and is missing
  `bg_prism_atmosphere` and `name_prism_atelier`; Phase 4–8 RPCs are absent
  remotely; the profile-story score backfill count is not yet available.
- Owner approval was received, but no production write was run. The release
  remains NO-GO until the linked database password, backup/PITR restore point,
  rollback owner, row counts, lock checks, and low-traffic window are verified.
- Added the exact release plan and reconciliation report. Phase 13 identity,
  root-routing, canonical-domain, avatar, and music work remains blocked.

## Phase 13A credentialed preflight follow-up — 2026-07-29

- The owner-side Supabase CLI connection now succeeds with the database
  password supplied through the environment.
- Linked migration history and dry-run still show exactly the five reviewed
  pending migrations. The linked schema diff completed but its generated
  reverse operations remain prohibited and were not executed.
- Read-only table statistics followed by an exact count confirmed 10 profiles,
  71 scores, 80 shop items, and 5 meta rows; lock/blocking checks found no
  application blocker.
- Exact counts and recovery-release gates remain outstanding. Production is
  unchanged and the Phase 13A push remains NO-GO.

## Temporary live-site preview gate — 2026-07-29

- Added a Pages-native global middleware gate at
  `functions/_middleware.js` for the live-site rehearsal.
- The gate reads only the encrypted production `PREVIEW_PASSWORD` secret,
  issues a bounded signed session cookie after successful authentication, and
  fails closed when the secret is absent.

## Phase 13A production reconciliation completed — 2026-07-29

- The owner accepted the Free-plan no-recovery risk while the live site was
  protected by the Pages password gate.
- The first production push stopped on the unqualified `uuid_generate_v4()`
  default in profile story. The two still-unapplied migrations were corrected
  to use `extensions.uuid_generate_v4()`; no applied migration was changed and
  no migration repair or bypass was used.
- The corrected retry applied all four remaining migrations. Production now
  has all five Phase 4–8 timestamps, 82 catalog items, both missing
  decoration entries, and 81 profile-story backfill events.
- Remote RPC, fixed-search-path, grant, RLS, foreign-key, lock, and blocking
  checks passed. The complete required application validation suite also
  passed locally: build, Svelte check, ESLint, 114 tests, links, CSP, balance,
  catalog, scoring, and database security.
- Phase 13A is aligned and complete. Phase 13 identity work may resume after
  owner-side gated browser smoke testing; it was not started automatically.

## Phase 13 identity and canonical-routing implementation — 2026-07-29

- Added the additive `20260725150000_profile_identity.sql` migration with
  nullable display-name and bio columns, character-aware constraints, a
  fixed-search-path authenticated update RPC, bounded public projections, and
  explicit browser-role grants. Existing rows were not backfilled or deleted.
- Wired the bounded identity projection into owner and visitor hydration. The
  identity card now renders display name, `@username`, plain-text bio, and a
  truthful missing-bio state through the existing composition.
- Added the restrained `/profile/settings` identity editor with visible
  labels, Unicode-aware counters, immediate validation, draft persistence,
  retry-safe saves, accessible errors, and server-authoritative publication.
- Added root `/<username>` Pages/client routing, shared reserved-route and
  encoded-path validation, `/u/<username>` compatibility behavior, canonical
  profile metadata, profile JSON-LD, share URLs, sitemaps, robots, and
  canonical-origin helpers.
- Added Phase 13 identity, routing, origin, metadata, and public-projection
  regression coverage. External Cloudflare custom-domain attachment,
  redirect rules, Supabase dashboard settings, and email-template installation
  remain documented operator actions in `docs/CHM_LOL_DOMAIN_CUTOVER.md`.
## Phase 13 repository implementation complete — 2026-07-29

- Added and applied the additive profile identity migration after the aligned
  Phase 4–8 production baseline. Existing profiles remain intact and identity
  fields are nullable with no backfill.
- Added the server-authoritative identity update RPC, bounded public identity
  projection, plain-text rendering, owner settings editor, draft persistence,
  Unicode-aware counters, and owner/visitor parity coverage.
- Added canonical root username routing, shared reserved paths, encoded-path
  rejection, `/u/<username>` compatibility, canonical metadata, OG/Twitter
  links, JSON-LD, crawler assets, share helpers, and origin-safe auth helpers.
- Fresh local reset, schema lint, build, Svelte check, ESLint, 125 tests,
  links, CSP, balance, catalog, scoring, database security, and repository
  hygiene checks pass. Full browser screenshots are stored under
  `artifacts/phase-13/` and were reviewed at 100% zoom/device scale 1.
- `npm run check:performance` currently reports CSS 305.34 kB against the
  300 kB guard; JavaScript and HTML remain within budget. The overage is
  recorded and must be resolved before the public maintenance gate is removed.
- External chm.lol attachment, host forwarding, Supabase dashboard settings,
  email-template installation, and final live browser smoke tests remain
  operator checklist items. Phase 13 is the final phase; no avatar/media/music
  work may start.
- The temporary Pages gate permits only the Cloudflare ACME validation path
  through so custom-domain verification can complete; normal site access stays
  protected by `PREVIEW_PASSWORD`.

## Phase 13.1 — Username safety, performance, and cutover certification — 2026-07-30

- Added one shared distinction between route-reserved segments and protected
  usernames. Reservation uses exact normalized equality; ordinary creative
  names such as `supporter`, `administratorx`, and `chromadiefan` remain
  available unless another policy rejects them.
- Added the additive local migration
  `20260730100000_username_reservation_policy.sql` with 131 hard-reserved and
  40 manual-release names, authoritative availability/trigger checks, and RLS
  on both reservation and moderation tables. It has not been pushed to the
  linked project.
- The existing staff account `Admin` is explicitly grandfathered by profile
  identity. Its profile and URL are preserved; no other account may claim the
  normalized key `admin`.
- Added `npm run check:username-policy-drift` and its local policy/security
  coverage. Local drift, security, schema lint, and fresh-reset checks pass.
- Reduced compiled CSS to 294.39 kB against the 295 kB Phase 13.1 budget;
  JavaScript is 602.27 kB against 625 kB and the HTML shell is 5.22 kB against
  12 kB.
- Phase 13.1 remains **NO-GO for a public launch**: the reservation migration,
  full browser evidence, external auth/email verification, and password-gate
  removal are still pending. Do not begin avatars, media, or music.

## 2026-07-30 — Phase 14 expression implementation

- Added the additive profile-expression migration with owner-scoped `avatars`
  and `backgrounds` Storage buckets, WebP limits, policies, bounded expression
  RPCs, and account-deletion cleanup.
- Added settings-only avatar and background upload/replace/remove controls with
  client-side MIME/size validation, square cropping or bounded resizing, WebP
  conversion, and safe initials/generated-atmosphere fallbacks.
- Added server-validated Spotify track, playlist, and album links with lazy
  official embeds and no autoplay; only `spotify_type` and `spotify_id` are
  stored.
- Added stored-output budgets of 256 KiB per avatar and 1 MiB per background,
  enforced by browser compression and Supabase Storage bucket limits.
- Preserved owner/visitor parity and the frozen profile composition. Local
  reset, schema lint, security audit, build, check, ESLint, 133 tests, links,
  CSP, balance, catalog, scoring, username drift, repository hygiene, and
  performance budgets pass.
- Captured and reviewed the requested local Phase 14 browser evidence. The
  both expression migrations are applied to the linked database; the public
  gate remains active for testing.

## 2026-07-30 — Scrollable profile continuation

- Kept the opening identity card visually focused and moved secondary profile
  content behind an intentional full-height Explore profile continuation.
- Centered the visitor daily-color presentation and preserved roll, archive,
  expression, achievement, and story data below the fold.
- Hide the continuation cue when no secondary profile content is enabled.

## 2026-07-30 — Profile appearance editor consolidation

- Moved owned-cosmetic preview and equip controls into `/profile/settings`.
- Grouped the existing slots by profile, roll, and leaderboard context while
  preserving the server-authoritative `equip_item` and `unequip_item` RPCs.
- Simplified `/shop` into a full-width catalog and purchase surface with clear
  links back to profile appearance management.
- Kept the approved public profile composition unchanged and made the isolated
  settings preview compact enough for mobile.
- The focused tests, full unit suite, Svelte check, ESLint, build, and
  performance budget pass. Compiled assets are 619.96 kB JavaScript, 291.57 kB
  CSS, and 5.22 kB HTML before final validation.

## 2026-07-30 — Chromatic lock-in roll refinement

- Replaced the passive hexadecimal reveal with a spectrum charge, narrowing
  scan, decisive final-color lock, and rarity-scaled impact.
- Broadcast presentation-only candidate colors to the profile atmosphere while
  preserving the server response as the sole roll authority.
- Made score settlement visible after the result enters instead of completing
  it offscreen.
- Cleaned the result hierarchy and surfaced the leading scoring conditions
  above `View score breakdown`.
- Verified the completed state at 1440×900 and 390×844, including reduced-motion
  fallbacks and the existing profile composition.
- Extended the readable reveal cadence to roughly 7.5 seconds and added a
  Spectrum → Signal → Lock progress track.
- Fixed the compact score breakdown so countdown updates no longer close an
  open disclosure.
- Added a staff-only `Replay reveal` control that rehearses the stored canonical
  result without creating a roll or changing rewards, history, or eligibility.

## 2026-07-30 — Completed-result text contrast

- Added a shared soft-gold earned-value token.
- Applied it only to the completed daily-color EP total and condition point
  values, preserving the rolled color for the label and rarity.
- Added focused regression coverage for the semantic color split.
- Build, Svelte check, ESLint, 139 tests, links, CSP, username policy, balance,
  catalog, scoring parity, and database security pass. The pre-existing dirty
  result/layout work was already over the performance gate at 631.54 kB
  JavaScript and 301.05 kB CSS against 625 kB and 295 kB budgets; this reveal
  adds a small CSS/markup increment, leaving the current build at 634.15 kB
  JavaScript and 303.19 kB CSS. Performance follow-up remains required.

## 2026-07-30 — Reveal score conditions during the roll

- Opened the score breakdown by default on completed results and made its
  summary label communicate the collapse action.
- Added a staged condition rail during the final lock phase using only the
  canonical server-reported contributors.
- Added reduced-motion coverage in the component styles and regression tests.

## 2026-07-30 — Move sharing into roll results

- Removed profile sharing controls from the sitewide header.
- Added a new-style `Share roll` action to completed owner results with native
  share and clipboard fallback behavior.
- Kept the action presentation-only and sourced its text from the canonical
  result and displayed conditions.

## 2026-07-30 — Promote roll sharing above the breakdown

- Moved `Share roll` into the main result element, directly below the visible
  condition rail and above the collapsible breakdown.
- Removed the orphaned header separator left after removing global sharing.

## 2026-07-30 — Align header wordmark typography

- Set `chm.lol` in the shared Geist Mono header language.
- Kept the mark and normalized the wordmark color treatment for a quieter,
  better-integrated lockup.
- Added four curated profile atmosphere cosmetics with full-canvas layers and
  reduced-motion fallbacks.
- Removed the header icon entirely so the `chm.lol` wordmark carries the
  primary visual language.
- Added a homepage claim field that pre-fills the existing signup flow with a
  validated username.
- Added a Mythic homepage roll showcase with conditions, effects, and a
  leaderboard/profile discovery cue using fixture-only presentation data.
- Changed the `.lol` suffix to lavender and renamed the header destination to
  `Leaderboard`.
- Reworked the homepage hero copy to explicitly describe the daily color game,
  score conditions, effects, and leaderboard progression.
- Anchored the homepage hero from the top with its original lower offset and
  softened the `.lol` separator dot so the claim form no longer changes the
  wordmark’s vertical position.
- Replaced the signed-out profile lock screen with a guest onboarding profile
  that mounts the local roll and account-save CTA.
- Restyled that guest roll in profile mode so it reads as the first profile
  environment rather than the legacy standalone Roll screen.
- Reworked the homepage showcase into a composed public profile: identity,
  in-profile Mythic roll, equipped effects, and leaderboard visibility.
- Replaced the signed-out profile’s legacy roll-first screen with staged
  profile onboarding and a deliberate transition into the guest roll.
- Aligned color-result formatting across the homepage, profile roll, and
  visitor color module so hex, rarity, score, EP, and conditions read as one
  consistent hierarchy.
- Replaced the onboarding’s legacy `Game` mount with the integrated profile
  roll and a bounded fictional guest result, including a prominent save/
  compete CTA after completion.
- Matched onboarding atmosphere lifecycle effects to the active profile roll,
  and strengthened the reveal entry with a larger geometric orb and orbit.

## 2026-07-30 — Reveal conditions during scan and lock

- Primed canonical condition metadata before the visual spectrum loop finishes,
  allowing condition chips to animate during the active roll.
- Distributed the condition entrances across the scan cadence and retained an
  immediate reduced-motion path.
- Kept the viewport-wide header transparent while preserving its responsive
  inner padding and route-wide layout.

## 2026-07-30 — Full-width sitewide header

- Removed the 92rem cap from the shared application header so its background
  and layout span the viewport on wide screens.
- Preserved responsive padding, mobile menu behavior, and the narrower content
  widths used by each route below it.
- Added a regression assertion for the full-width header contract.
## 2026-07-31 — Surface atmosphere controls in profile settings

- Added a dedicated animated-background control for rain, snow, fireflies,
  and scanlines in the appearance editor.
- Kept locked atmosphere entries visible with an unlock-in-shop affordance while
  preserving server-side entitlement checks.
- Rebalanced the appearance editor into a wide preview-and-controls layout that
  collapses cleanly on mobile.

## 2026-08-01 — Rebuild profile settings as a focused studio

- Replaced the long all-sections settings stack with a sectioned studio
  workspace: compact navigation rail, one active editor, and live profile
  preview.
- Kept existing identity, expression, cosmetics, layout, social, and account
  controls available without changing their RPC or validation boundaries.
- Added hash-aware section navigation, previous/next controls, compact profile
  shortcuts, and a touch-friendly mobile rail.
- Added a contract test for the new settings information architecture and
  reduced-motion styling.
