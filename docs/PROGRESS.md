# Chromadie 2.0 Progress

## Active Phase

Phase 9 — Launch Polish

## Current Milestone

Phase 9 launch-hardening, consented measurement/operations, and local browser
audit slices are complete. Public and authenticated surfaces have a measurable
asset budget, keyboard route access, safe structured media fallbacks, bounded
public HTML caching, immutable asset caching, an opt-in redacted product-event
contract, an explicit social moderation operations boundary, and Chromium
desktop/mobile smoke evidence. Existing discovery, social, shop, profile URLs,
and server-authoritative gameplay remain intact. Launch certification is blocked
by linked Supabase schema/catalog drift, not by a demonstrated local frontend
regression.

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

## In Progress

- Launch certification is pending authorized remote migration/catalog reconciliation and a clean Firefox/device pass. The local Chromium audit is complete; no code change is justified by the browser evidence.

## Blocked

- The linked Supabase project is behind the branch: `get_public_discovery`, public configuration/story/social RPCs, and owner configuration/social/entitlement RPCs return PostgREST `PGRST202`/HTTP 404, and the remote catalog is missing `bg_prism_atmosphere` and `name_prism_atelier`. Applying migrations requires explicit release/DB-owner authorization plus backup/PITR confirmation; it was not performed.
- Firefox automation could not complete because the environment's existing Firefox process was already running and not responding. A clean Firefox/device pass remains a release gate.

## Next

The next release action is an authorized, reviewed migration/catalog reconciliation followed by remote RPC/security and browser smoke verification. After that, complete a clean Firefox/device pass. Measured code-splitting or legacy-renderer retirement remains separate and requires explicit acceptance boundaries. The current product-event contract still has no production sink or assigned operational owner. Media/embeds, OG/share expansion, and SvelteKit remain separate slices. Payment/webhook issuance, private messaging, visitor analytics, comparisons, broader profile visibility, subjective beauty ranking, and unrelated cleanup are not silently included.

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
