# Chromadie 2.0 Changelog

Document user-visible redesign changes by milestone.

## 2026-07-25 — Phase 0: Baseline and Safety

Internal milestone; no user-visible redesign or product behavior change.

- Audited the current Svelte SPA, route handling, account stores, profile, roll, shop, leaderboard, cosmetics, Supabase boundaries, Pages Functions, deployment, and metadata flow.
- Added `docs/CURRENT_SYSTEM_MAP.md` and `docs/PHASE_0_REPORT.md`.
- Added narrow route, profile, and roll contract helpers plus focused regression coverage for current owner/visitor, guest/auth, route, canonical roll, and public-field behavior.
- Preserved authentication, server-authoritative rolls, scoring, economy, rewards, RLS, public URLs, and historical data semantics.
- No schema migration or redesign screen work was introduced.
- The first Docker-backed validation attempt found the pre-existing stopped `supabase_db_Chromadie` container; it was restarted without a database reset, and the final full validation suite passed.

## 2026-07-25 — Phase 1: Design Foundations

No live profile behavior changed.

- Added token layers for color, typography, spacing, radius, elevation, layout, breakpoints, and motion.
- Added reusable `Surface`, `Button`, `Media`, and `Module` foundation components with keyboard focus and reduced-motion behavior.
- Added an isolated responsive profile canvas using immutable fixture data at `/prototype/profile`.
- Added noindex prototype metadata through a dedicated Pages Function.
- Added 4 Phase 1 contract tests; the full suite now passes 39 tests.
- No schema, backend, auth, scoring, economy, RLS, or production-data changes were made.

## 2026-07-25 — Phase 2: Profile Shell

The existing profile URLs now render a live profile shell backed by the current public/owner profile contract.

- Added a responsive identity hero with rank, streaks, EP, total rolls, best roll, recent colors, pinned achievements, and sanitized cosmetics.
- Added explicit owner and visitor presentation, including authenticated rival actions and owner access to the existing controls path.
- Preserved the current full profile renderer at `?legacy=1` for mood editing, pinned badges, rivals, and account deletion during migration.
- Shared profile hydration between the new shell and legacy renderer to keep privacy and field mappings aligned.
- Added safe loading, unavailable, warning, empty-history, keyboard-focus, mobile, and reduced-motion handling for the new shell.
- The current schema has no public bio/avatar fields, so the shell uses a safe username monogram and existing brand mark without inventing profile data.
- No schema, backend authority, auth, scoring, economy, rewards, RLS, or production-data semantics changed. Roll integration remains Phase 3 work.

## 2026-07-25 — Phase 3: Integrated Roll Vertical Slice

Authenticated owners can now make today’s roll part of the live profile instead of leaving the profile to visit a separate game surface.

- Added an owner-only `ProfileRoll` module inside the live profile shell with restore, ready, rolling, canonical result, reward, collection/story, and next-action states.
- Reused the existing `roll_die`, `get_my_daily_roll`, and `get_score_percentile` RPCs; server-returned score, rarity, conditions, contributors, identity, achievements, milestones, and event rewards remain authoritative.
- Added a shared request/canonical/lock seam used by both the existing game and the profile roll, including stale session/request guards and the existing ten-second duplicate-click reroll guard.
- Successful authenticated rolls refresh profile, inventory, wallet, and the live profile projection without navigation.
- Preserved guest local persistence, authenticated root-game behavior, share/challenge actions, public visitor read-only profiles, profile URLs, metadata, and `legacy=1` controls.
- Added mobile and `prefers-reduced-motion` handling for the integrated presentation.
- Added 5 focused Phase 3 tests; the full suite now passes 48 tests.
- No schema, backend authority, auth, scoring, economy, rewards, RLS, or production-data semantics changed. Phase 4 profile configuration and discovery work remain out of scope.

## 2026-07-25 — Phase 4: Profile Configuration

Owners can now shape the live profile with a safe, structured configuration
surface while visitors continue to see only an explicitly published profile.

- Added a versioned profile configuration boundary with signature color,
  immersive/editorial/focus layout variants, ordered modules, and up to six
  typed HTTPS links.
- Added an owner-only profile studio with local draft preview, save-draft, and
  explicit publish actions. The daily roll module remains visible and
  server-enforced.
- Added published-only public configuration loading and safe client rendering;
  invalid link protocols, raw markup/CSS, malformed modules, and hidden drafts
  do not enter the public profile.
- Preserved existing `/profile`, `/u/<username>`, legacy controls,
  authentication, metadata, guest flow, roll authority, scoring, economy,
  rewards, RLS boundaries, and historical data semantics.
- Added the additive `profile_configurations` migration, RPC grant/RLS audit,
  deletion-cascade coverage, and 4 focused Phase 4 tests. The full suite now
  passes 52 tests.
- Phase 4 stops at configuration and links; profile story/history/discovery
  expansion and unrelated refactors remain out of scope.

## 2026-07-25 — Phase 5: Story and Progression

Profiles now retain a public-safe memory of their color journey while keeping
private achievement progress private.

- Added durable profile-created and canonical roll events with an idempotent
  historical backfill and account-deletion cascade.
- Added a bounded public story projection with a visual color timeline and a
  lifetime condition collection derived from authoritative score records.
- Expanded the existing recent/achievement modules with progressive story
  depth: the timeline grows with roll activity and the collection showcase
  opens after ten rolls.
- Preserved the Phase 4 configuration shape, existing pinned badges, private
  `user_achievements` data, roll/scoring/reward/economy authority, guest flow,
  routes, metadata, and public profile privacy boundaries.
- Added 4 focused Phase 5 tests plus database security coverage for event
  capture, bounded public reads, browser grants, and deletion cleanup.
- Phase 5 stops before discovery redesign, social interactions, SvelteKit, and
  unrelated refactors.

## 2026-07-25 — Phase 6: Discovery

The leaderboard is now a public discovery hub where every result is an entry
point into a color profile.

- Added bounded today, weekly, monthly, all-time, exceptional, rising, new,
  and deterministic daily-random discovery surfaces behind one public RPC.
- Replaced anonymous leaderboard rows with responsive public profile cards that
  show the canonical color story, profile stats, a direct profile CTA, and a
  safe share action.
- Added username-prefix and rarity filters plus bounded load-more pagination.
- Preserved `/leaderboard`, existing period tabs, direct `/u/<username>`
  navigation, metadata, and the authenticated rivals/follow compatibility
  path.
- Kept internal profile ids out of new public discovery payloads and preserved
  all server authority for rolls, scoring, rewards, economy, and social writes.
- Added additive discovery indexes, database grant/boundary assertions, and 6
  focused Phase 6 tests.
- Phase 6 stops before reactions, guestbooks, blocking/reporting, SvelteKit,
  and unrelated refactors.

## 2026-07-25 — Phase 7: Social Layer

Profiles now support small, safe reasons to return to one another without
opening private messaging.

- Added favorites, three non-competitive positive reactions, and a bounded
  plain-text guestbook with author/profile-owner deletion.
- Added authenticated block/report controls and server-enforced per-action
  rate limits; reports retain moderation details outside public projections.
- Added owner controls for social interactions, guestbook availability, recent
  activity visibility, and discovery inclusion.
- Added a profile-shell social module with mobile, keyboard, loading/disabled,
  and reduced-motion-safe presentation.
- Preserved the existing five-rival follow behavior while applying the new
  block/privacy boundary; no social action changes scoring, rank, EP, rewards,
  achievements, economy, roll authority, or notifications.
- Added protected social tables/RPCs, account-deletion cascade coverage, and 4
  focused Phase 7 regression tests. The full suite now passes 66 tests.
- Phase 7 stops before notifications, private messaging, visitor analytics,
  comparisons, SvelteKit, and unrelated refactors.

## 2026-07-25 — Phase 8: Decoration Studio and Monetization Boundaries

The authenticated shop is now a decoration studio centered on the profile
identity, with an explicit boundary between free foundations, earned
expression, and future premium expression.

- Added a small `DecorationStudio` wrapper and changed the fitting-room hero to
  use the actual live `ProfileShell` renderer in an isolated, network-free
  preview mode.
- Kept a complete free baseline visible and usable for every profile; premium
  expression changes presentation only and does not affect gameplay, rank, or
  social access.
- Added explicit catalog access tiers and two preview-only premium expression
  examples keyed to a server-side `atelier_plus` entitlement.
- Added protected profile entitlements with service-role-only grants,
  owner-only bounded key reads, server-side premium equip checks, and account
  deletion cleanup. EP purchase behavior for existing earned items is
  unchanged.
- Updated shop metadata and labels without changing `/shop`, public profile
  URLs, crawler metadata contracts, authentication, scoring, rewards, RLS, or
  historical data semantics.
- Added Phase 8 regression/security coverage; the full suite now passes 71
  tests. Payment provider/webhook issuance, notifications, private messaging,
  and unrelated Phase 9 work remain deferred.

## 2026-07-25 — Phase 9: Launch Polish — Runtime Hardening

The first launch-polish slice strengthens the public profile acquisition path
and the keyboard/mobile runtime without changing gameplay or account semantics.

- Added a `check:performance` regression gate for JavaScript, CSS, and HTML
  asset budgets. The existing Vite single-chunk warning remains visible.
- Added a keyboard skip link and route-content focus after in-app and history
  navigation while preserving modal and mobile-menu focus restoration.
- Hardened structured media rendering to allow same-origin/HTTPS sources only,
  preserve layout space, and show an accessible fallback on load failure.
- Added bounded public cache windows for published public HTML and immutable
  caching for hashed assets. Missing, private/owner, and `legacy=1` profile
  responses remain non-cacheable.
- Added five focused Phase 9 regression tests; the full suite now passes 77
  tests.
- Product analytics delivery, browser/device audit, media/embeds, deeper
  code-splitting, moderation operations, and legacy-renderer retirement remain
  separately scoped.

## 2026-07-25 — Phase 9 continuation: Measurement and moderation operations

Added a consented product-event contract and documented the current social
moderation boundary without introducing a durable analytics or moderation
backend.

- Added an opt-in privacy-page preference and a provider-neutral event seam for
  route views, profile views, roll readiness/completion, profile sharing, and
  shop try-on/equip transitions.
- Redacted and bounded event properties; no username, email, profile/account
  id, score, color, draft, entitlement, guestbook, report, or moderation data
  enters the contract.
- Kept the current adapter page-local and no-network. Supabase analytics,
  event persistence, retention jobs, notifications, and visitor tracking were
  not introduced.
- Added `docs/ANALYTICS_CONTRACT.md` and
  `docs/MODERATION_OPERATIONS.md`, including report triage boundaries,
  protected-table constraints, rate limits, deletion behavior, and current
  missing dashboard/audit/appeal surfaces.
- Added five focused continuation tests; the full native suite now contains
  82 passing tests.

Browser/device certification, measured code-splitting, media/embeds,
OG/share expansion, and legacy-renderer retirement remain separate Phase 9
slices.

## 2026-07-25 — Phase 9 continuation: Browser audit and deployment safety

Completed the local browser/device audit boundary and documented a linked
deployment blocker.

- Chromium desktop/mobile smoke passed for direct refresh, route titles,
  keyboard skip/focus, reduced motion, mobile navigation, accessibility-tree
  landmarks/names, guest roll persistence, public-profile error, privacy
  consent, and signed-out shop behavior. No browser runtime errors or mobile
  horizontal overflow were observed.
- Added `docs/PHASE_9_BROWSER_AUDIT_REPORT.md` with exact evidence, browser
  limitations, remote RPC/catalog checks, and the go/no-go assessment.
- Added `docs/ROLLBACK_AND_RECOVERY.md` covering Pages rollback, Supabase
  migration stop conditions, backup/PITR ownership, safe recovery, and data
  semantics.
- Added four focused browser-audit contract tests; the native suite now has 86
  passing tests.
- Read-only remote checks found Phase 4–8 migrations/RPCs absent from the
  linked project and two catalog rows missing remotely. No migration push,
  production-data write, client fallback, or product-behavior change was made.

Phase 9 launch certification is **NO-GO** until an authorized release/DB owner
reconciles the remote migration/catalog state, verifies the RPC/security
boundary, deploys matching assets, and completes a clean Firefox/device pass.
