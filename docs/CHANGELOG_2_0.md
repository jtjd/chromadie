# Chromadie 2.0 Changelog

Document user-visible redesign changes by milestone.

## 2026-07-31 — Homepage conversion pass

- The homepage now introduces the customizable `chm.lol/username` profile
  before the daily color game.
- Added a profile-led hero, three differentiated example profiles, and a
  simplified daily-roll-to-discovery explanation.
- Preserved existing signup, username policy, auth, route, moderation, and
  server-authoritative roll behavior.

## 2026-07-30 — Staff profile audio alpha

- Added one bounded MP3 profile-audio upload for staff accounts.
- Added looping playback with autoplay attempted by default and native controls
  when browser policy requires interaction.
- Kept audio out of non-staff profiles and preserved the existing profile
  composition.

## 2026-07-30 — Faster profile loading

- Removed the serial profile-data request waterfall by loading independent
  profile projections in parallel.
- Cached the static achievement catalog during the browser session.
- Preserved owner-only requests, public projections, and server authority.

## 2026-07-30 — Profile visibility controls

- Added a profile-settings toggle for hiding the daily roll from visitors while
  keeping it available to the owner.
- Prevented stale daily-color presentation from flashing during tab returns.

## 2026-07-30 — Username is the display name

- Removed editable display names from profile settings.
- Profile cards and the cosmetics preview consistently render the account
  username as the display name.
- Preserved bio editing and normalized legacy display-name values through an
  additive database migration.

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

## 2026-07-25 — Phase 10: Vision Reconciliation and Profile Simplification

The live profile now leads with identity and color expression instead of
presenting a game-dashboard grid.

- The authenticated bare home route resolves to the owner’s live profile;
  explicit roll navigation remains available at `/?view=game`.
- Public profiles now lead with four bounded regions: identity, latest color
  or owner roll, selected expression, and one featured story or accomplishment.
- Real mapped account/profile data remains the production source. No fixture is
  used by the live renderer.
- Stats, rank progress, history, collections, achievements, social controls,
  profile configuration, decoration, and account controls are preserved behind
  collapsed detail or owner compatibility surfaces.
- Removed the visible public-boundary explanation, dashboard owner/visitor
  labels, and redundant primary edit/explore/shop/leaderboard calls.
- Added repeatable before/after screenshots at 1440×900, 1280×720, and
  390×844 plus a focused profile-first test contract.
- Preserved auth, RLS, secure roll behavior, anti-reroll, scoring, rewards,
  rarity, economy, entitlements, history, cosmetics, public/private behavior,
  social/moderation boundaries, direct refresh, old share links, and the
  `legacy=1` fallback. No Phase 11 work started.

## 2026-07-26 — Phase 11: Continuous Profile Composition and Minimalism

Folded the minimalist personal-website direction into the live profile
presentation without changing its data or gameplay authority.

- Replaced the remaining hero-plus-card visual grammar with one atmospheric
  opening composition that combines identity and the latest color or owner
  roll.
- Made selected links, signature expression, and one story/accomplishment
  trace continue through typography, alignment, whitespace, and color instead
  of equal-weight card containers.
- Added an integrated owner-roll presentation mode with one clear daily action;
  secure roll RPCs, anti-reroll behavior, canonical scoring/rewards, and store
  refreshes are unchanged.
- Removed visible featured/long-game/profile-connection dashboard language
  from the default hierarchy while preserving detail, owner, social, account,
  shop, entitlement, and `legacy=1` paths.
- Added the Phase 11 visual contract, focused regression tests, and repeatable
  real-data screenshots at 1440×900, 1280×720, and 390×844.
- No schema migration, route redesign, media integration, new social feature,
  monetization, or production write was introduced. Phase 11 stops here.

## 2026-07-26 — Phase 10.2: Approved Mockup Visual Convergence

- Translated the approved profile mockup into focused Svelte components without
  merging the reference Next.js/React project or copying its mock data.
- Added the minimal `chm.lol` profile-mode header, canonical-color atmosphere,
  centered identity surface, compact collection treatment, and quiet
  expression/music boundary.
- Kept the authenticated owner roll server-authoritative and compacted its
  presentation so the first viewport remains a personal page instead of a
  result dashboard.
- Added the mockup translation map, parity gate, repeatable viewport capture
  script, comparison artifacts, and exact Phase 10.2 report.
- Preserved old routes, `legacy=1`, authentication, RLS, RPCs, scoring,
  rewards, economy, entitlements, history, cosmetics, social/moderation
  boundaries, and deployment behavior. Phase 11 remains a separate boundary.

## 2026-07-26 — Phase 11.1: Approved Mockup Fidelity Correction

- Restored readable essential type scale and replaced the generic bio fallback
  with a truthful mapped color-history/first-chapter state.
- Made the atmosphere fill the viewport with a restrained canonical-color
  bloom, vignette, grain, and lower reflection; the primary card now sits in
  an upper-middle, height-aware composition.
- Separated the optional expression fixture into a lower viewport anchor and
  hid it in production while no real music configuration exists.
- Captured 1920×1080, 1440×900, 1280×720, and 390×844 visitor, owner,
  pre-roll, expression-fixture, missing-optional, and reduced-motion evidence.
- Preserved authentication, RLS, secure roll authority, anti-reroll,
  scoring, rewards, economy, history, cosmetics, social/moderation, routes,
  old URLs, media/music architecture, and deployment behavior. Phase 12 has
  not started.

## 2026-07-26 — Phase 12: Sitewide Profile Language and Default Entry

- Extended the approved atmospheric profile language to Roll, Discover,
  Studio, help, privacy, unavailable, and guest-lock surfaces with a shared
  minimal application header and responsive Menu disclosure.
- Kept public and authenticated profiles on the approved centered
  `ProfileShell`/`ProfileModeHeader` composition.
- Made the first-visit route contract explicit: signed-out `/` opens the guest
  daily-roll surface, authenticated `/` resolves to the owner live profile
  after session hydration, and `/?view=game` remains the direct Roll route.
- Preserved authentication, server-authoritative rolls, RLS, scoring, rewards,
  economy, entitlements, history, cosmetics, social/moderation, routing,
  direct refresh, old URLs, and the legacy profile fallback.
- Added focused route/shell tests and repeatable Chromium screenshots under
  `artifacts/phase-12/`; no schema, identity-data, media, Spotify, social, or
  monetization feature work was introduced.

## 2026-07-26 — Phase 13 database baseline gate

- Audited the local and linked Supabase migration histories before creating an
  identity migration.
- Recorded that the linked project is missing the Phase 4–8 configuration,
  story, discovery, social, and entitlement migrations and two catalog rows:
  `bg_prism_atmosphere` and `name_prism_atelier`.
- Held Phase 13 schema, identity-editor, root-username-route, and canonical
  domain runtime changes until the authorized ordered migration/catalog
  reconciliation is complete.
- Added the Phase 13 plan, database baseline, domain cutover checklist, and
  blocked report. No gameplay, profile composition, auth, RLS, or deployment
  behavior changed.

## 2026-07-27 — Sitewide profile-language refinement

- Made the non-profile header share the profile's transparent brand, logo,
  spacing, typography, and slash-separated navigation language.
- Added a shared visual layer for Roll, Discover, Studio, help, privacy,
  challenge, unavailable, and guest-lock surfaces so they use the profile's
  atmospheric canvas, translucent surfaces, quiet borders, accent-led
  controls, responsive rhythm, and reduced-motion behavior.
- Kept discovery and studio information architecture intact while removing the
  competing legacy dashboard skin.
- Added focused cohesion tests. No auth, route, roll authority, scoring,
  economy, catalog, RLS, social, schema, or production-data behavior changed.

## 2026-07-28 — The roll now changes the profile

- Kept the daily roll embedded in the profile and made its lifecycle visible:
  the identity recedes while the result resolves, then the canonical color
  settles through the atmosphere, identity surface, and collection trace.
- Added reduced-motion behavior and focused regression coverage.
- Preserved the secure roll RPC, server-authoritative scoring/rewards,
  eligibility, inventory refresh, visitor read-only behavior, and all existing
  routes and profile data.

## 2026-07-29 — A calmer profile and a more meaningful daily reveal

- Simplified the public identity surface to a centered person-first card with
  optional structured link pills and a focused integrated roll.
- Moved the color archive below the card as a quiet progression trace instead
  of another competing section inside the identity surface.
- Replaced the small utility-style pre-roll action with a staged color-field
  reveal, canonical score count-up, progressive conditions, and an explicit
  skip path. Reduced-motion users receive the same result without the staged
  animation.
- Kept the existing server-authoritative roll RPC, eligibility, reroll guard,
  score/rarity/reward authority, profile refresh, visitor read-only behavior,
  routes, privacy boundaries, and historical data unchanged.

## 2026-07-29 — Scoring conditions and a wider desktop profile

- Restored a compact scoring-condition rail to integrated profile results,
  showing server-reported contributors, awarded score, and additional-condition
  overflow without reopening the dashboard hierarchy.
- Expanded the desktop identity surface into one spacious two-column profile
  canvas, keeping identity/links, daily color, and the archive in a clear
  hierarchy while preserving the stacked mobile layout.
- Reviewed varied current guns.lol profile patterns for identity-first spacing,
  compact metadata, links, and subordinate optional content.
- Preserved all existing server-authoritative roll, scoring, reward, auth/RLS,
  route, privacy, and historical-data behavior. No schema migration added.

## 2026-07-29 — A simpler identity card with a quiet game layer

- Reduced the profile card to identity only: avatar, name, handle, optional
  links, and the earned launch badge.
- Moved the daily color roll into a separate low-contrast layer directly below
  the card on the same page. The quiet profile result shows only the color,
  score, rarity, and a game-details disclosure.
- Kept scoring conditions, rewards, countdown, rerolls, and the staged reveal
  available through the expanded game details and direct game route.
- Kept the archive outside the identity card as a subtle progression trace.
  No schema, auth/RLS, scoring, roll-authority, route, or historical-data
  behavior changed.

## 2026-07-29 — One header across the whole site

- Unified profile, Roll, Discover, and Studio under the same transparent
  application header with consistent Profile / Discover / Studio
  navigation and active states.
- Kept profile Share and owner Edit as contextual actions in that shared
  header, with matching mobile-menu behavior.
- Preserved direct routes, profile URLs, authentication, sharing analytics,
  owner editing, roll authority, and all backend behavior. No schema migration
  was added.

## 2026-07-29 — Profile-first navigation and quieter profile loads

- Removed the duplicate Roll destination from desktop and mobile primary
  navigation now that authenticated gameplay is integrated into the profile.
- Retained the existing game route for guest play, challenge links, and old
  direct URLs without changing server-authoritative roll behavior.
- Removed visible account hydration from the shared header, global banner, and
  route content area.
- Removed loading cards and silhouettes from both profile renderers. Profile
  content now appears directly over the stable atmospheric canvas, with
  non-visual `aria-busy` state retained for assistive technology.
- Preserved explicit profile error states, authentication, RLS, scoring,
  rewards, historical data, and public-profile URL behavior.
- Passed the complete validation suite with 106 tests and the performance,
  security, link, CSP, drift, and scoring-parity gates.

## 2026-07-29 — Consistent shared-header typography

- Unified desktop navigation, contextual profile actions, account controls,
  the mobile Menu trigger, and mobile-menu actions under one Inter-based
  0.78 rem control style.
- Removed the mismatched mono, inherited, and differently sized treatments
  while retaining the logo wordmark as the sole brand-specific exception.
- Passed desktop/mobile visual checks and the complete 106-test validation
  suite.

## 2026-07-29 — Minimal profile-mode header

- Removed Profile, Discover, and Studio destination links from profile pages
  on desktop and mobile.
- Kept brand, Share, owner Edit, and account controls on profiles while
  retaining full destination navigation everywhere else.
- Updated the profile mobile-menu label and first-section spacing for the
  reduced action set.
- Passed desktop/mobile visual checks and the complete 106-test validation
  suite.

## 2026-07-29 — Minimal public homepage

- Added a responsive root landing page that explains the daily color identity
  game through one headline, a concise description, and a CSS-native color
  composition.
- Added a visitor signup CTA and a signed-in owner-profile CTA while retaining
  the shared legal/support footer.
- Changed the header logo to return to the homepage in every session.
- Made `/` the stable landing route and preserved `/?view=game`, challenge
  links, public profile URLs, clean application routes, and legal routes.
- Kept authentication, RLS, server-authoritative rolls, scoring, rewards,
  history, and schema behavior unchanged.
- Passed desktop/mobile visual review and the complete 108-test validation
  suite.

## 2026-07-29 — Preserve in-progress view state

- Profile editing now keeps unsaved configuration and link rows when navigating
  away and returning in the same tab.
- Discovery keeps search and rarity filters, while Shop keeps its context,
  filters, sorting, and fitting-room choices, scoped per account.
- Restored state is bounded and allowlisted; successful profile save/publish
  and logout clear the relevant transient state.
- No published profile data, authentication, RLS, gameplay, scoring, rewards,
  inventory, or schema behavior changed.

## 2026-07-29 — Horizontal identity card refinement

- Moved the avatar to the left side of the default profile card.
- Placed the profile name and up to three earned badges beside the avatar.
- Moved public links beneath the identity copy while keeping the card sparse
  and preserving the existing mobile composition.
- No profile data, authentication, gameplay, or schema behavior changed.

## 2026-07-29 — Catchii visual language refinement

- Replaced the generic Google-font direction with Satoshi, Cabinet Grotesk,
  and Geist Mono through one shared typography contract.
- Reworked the homepage around a large quiet `chm.lol` wordmark, concise
  daily-identity copy, a direct signup action, and the existing footer.
- Applied consistent capsule navigation/action controls and neutral near-black
  surfaces across supporting routes.
- Softened the profile atmosphere and identity card while retaining dynamic
  Chromadie color, the avatar-left layout, daily roll, archive, and earned
  expression.
- No profile data, authentication, gameplay, RLS, RPC, or schema behavior
  changed.

## 2026-07-29 — Homepage navigation and footer correction

- Restored the shared Profile / Discover / authenticated Studio navigation on
  the homepage while keeping profile pages in their reduced action mode.
- Made the existing legal/support footer paint above the atmospheric layer so
  it is visible at desktop and mobile viewport heights.
- No profile data, authentication, gameplay, RLS, RPC, or schema behavior
  changed.

## 2026-07-29 — Profile settings boundary and quiet color story

- Added `/profile/settings` for profile configuration, color-story visibility,
  social/privacy controls, account controls, and decoration-studio access.
- Removed the owner/story disclosure menus from the primary profile canvas.
- Hid the color story by default; owners can explicitly enable it from the new
  settings page. Visitor social controls remain available without a collapse
  menu.
- No migration was added while the linked Phase 13 database baseline remains
  drifted/NO-GO. Existing authentication, RLS, roll authority, scoring,
  rewards, inventory, social RPCs, and history behavior remain unchanged.

## 2026-07-29 — Phase 13 identity contract and canonical profile routing

- Added optional display names and bios through an additive,
  server-authoritative identity RPC. Existing profiles were not backfilled or
  deleted, and private account fields remain outside public projections.
- Added the owner-only identity editor to `/profile/settings` with bounded
  Unicode-aware validation, counters, draft persistence, accessible errors,
  and retry-safe saves.
- Rendered the published identity in the existing compact profile card with a
  username fallback and truthful missing-bio state. Plain text remains plain
  text.
- Added canonical root profile URLs, `/u/<username>` compatibility redirects,
  shared reserved-route validation, canonical profile metadata, share URLs,
  sitemaps, robots, and origin-safe auth helpers.
- Kept the approved profile composition, authentication, RLS, rolls, scoring,
  rewards, economy, inventory, cosmetics, achievements, history, social data,
  and mobile behavior intact.
- External Cloudflare domain attachment, legacy host forwarding, Supabase
  dashboard configuration, and email-template installation remain pending and
  are documented separately.

## 2026-07-29 — Phase 13A production database reconciliation held

- Audited the linked Supabase migration history and confirmed exactly five
  Phase 4–8 migrations are pending after the shared 59-migration baseline.
- Rehearsed the complete 64-migration chain locally; schema lint, database
  security, catalog parity, expected RPC grants/search paths, and RLS checks
  passed, with 82 local catalog items.
- Confirmed production remains drifted: 80 catalog rows with two missing
  decoration entries and missing Phase 4–8 RPCs.
- Recorded the exact release order, lock risks, backfill uncertainty,
  verification plan, and rollback procedure in the Phase 13A documents.
- Owner approval was received, but production was not changed because the
  linked database password, backup/PITR restore point, rollback owner, and
  complete row-count/lock checks were not available.
- Phase 13 identity work remains on hold; no display-name, bio, root-routing,
  canonical-domain, avatar, or music implementation was started.

## 2026-07-29 — Credentialed Phase 13A preflight completed

- Confirmed the owner-side CLI can connect to the linked production database.
- Confirmed the migration list and dry run contain exactly the five reviewed
  Phase 4–8 migrations and no unexpected pending work.
- Completed read-only schema diff, table-statistics, lock, and blocking checks.
  The expected destructive-looking diff output was not executed.
- Exact current production counts are 10 profiles, 71 scores, 80 shop items,
  and 5 meta rows. Production remains unchanged while backup/PITR,
  rollback ownership, and the release window are finalized.

## 2026-07-29 — Temporary Pages preview gate prepared

- Added a temporary Pages middleware that protects the live site with an
  encrypted `PREVIEW_PASSWORD` secret and signed one-hour preview sessions.
- The gate fails closed when the production secret is missing and can be
  removed after migration verification to restore public access.

## 2026-07-29 — Phase 13A production baseline reconciled

- Kept the live Pages site behind the temporary password gate during release.
- Corrected the unapplied profile-story and social migrations to qualify the
  remote `extensions.uuid_generate_v4()` function after the first push exposed
  the project-specific extension schema.
- Applied all five Phase 4–8 migrations to the linked production project.
- Verified 82 catalog items, both missing decoration entries, 81 story events,
  expected RPCs/search paths/grants, RLS, deletion cascades, and no blocking
  queries.
- Phase 13A is complete and Phase 13 may resume after gated browser smoke
  testing. Identity, avatar, music, and root-routing work was not started by
  this release.

## 2026-07-30 — Allow Cloudflare Pages domain validation through the preview gate

- Added a narrow GET/HEAD bypass for `/.well-known/acme-challenge/*` so Pages
  can validate `chm.lol` over HTTP while the rest of the site remains behind
  the temporary `PREVIEW_PASSWORD` gate.
- Added regression coverage proving the validation path is reachable while
  ordinary requests remain closed when the gate secret is unavailable.

## 2026-07-30 — Phase 13.1 username policy and performance certification

- Added the shared route/protected-username policy with exact normalized
  matching and hard/manual release categories.
- Added the additive reservation migration, server-side availability and
  write enforcement, reservation drift check, and blocklist/reservation RLS
  coverage. The migration remains local-only.
- Preserved the existing `Admin` staff profile through an explicit
  grandfathered profile identity; no other account can register `admin`.
- Removed obsolete compiled CSS and tightened the performance guard to 295 kB
  CSS, 625 kB JavaScript, and 12 kB HTML. The current build passes at 294.39,
  602.27, and 5.22 kB respectively.
- Kept the Cloudflare Pages password/maintenance gate active. Public cutover,
  external auth/email checks, browser evidence, and Phase 14 remain NO-GO.

## 2026-07-30 — Phase 14 optional profile expression

- Added optional uploaded avatars and backgrounds through owner-scoped Supabase
  Storage buckets. Images are validated, cropped/resized, converted to WebP,
  and removable from profile settings.
- Added server-validated Spotify track, playlist, and album embeds. The profile
  stores only the provider type and identifier and lazy-loads the official
  embed without autoplay.
- Capped stored profile media at 256 KiB per avatar and 1 MiB per background,
  with matching browser compression and Supabase Storage enforcement.
- Kept the existing identity card, full-viewport atmosphere, owner/visitor
  parity, initials fallback, and generated-color fallback intact.
- No production migration, deployment, public-gate change, Cloudflare media
  service, OAuth, hosted audio, or custom player was added.

## 2026-07-30 — Scrollable profile continuation

- Added an optional full-height profile continuation so the opening identity
  card stays sparse while roll, daily color, achievements, archive, audio, and
  story details remain available below the fold.
- Added a centered visitor daily-color treatment and an Explore profile cue
  that appears only when secondary content is configured.

## 2026-07-30 — Consolidate cosmetic editing in profile settings

- Added an owned-cosmetic appearance editor to profile settings with live
  profile, roll, and leaderboard previews.
- Reused the existing entitlement checks and authenticated equip/unequip RPCs.
- Converted the shop from a duplicated fitting room into a focused catalog and
  purchase surface that routes appearance management back to profile settings.
- Improved the isolated preview’s real identity rendering and compact mobile
  composition without changing the public profile design.

## 2026-07-30 — Strengthen the daily color reveal

- Added a chromatic lock-in sequence with spectrum cycling, deceleration, final
  color impact, and rarity-scaled motion.
- Let presentation-only preview colors move through the profile atmosphere
  without changing server-authoritative roll behavior.
- Reorganized completed results around the color identity: hex and rarity,
  unified EP score, leading conditions, and a quieter score breakdown.
- Lengthened the reveal to roughly 7.5 seconds and added an explicit Spectrum →
  Signal → Lock tracker.
- Fixed score breakdowns closing themselves during countdown updates.
- Added a staff-only presentation replay for repeatedly testing the reveal
  without another roll RPC or database write.
- Added reduced-motion coverage and kept the approved profile layout intact.

## 2026-07-30 — Balance completed-result typography

- Added a restrained earned-gold text token for EP and condition point values.
- Kept the daily color label and rarity tied to the canonical roll accent, with
  no changes to the background, roll object, scoring, or result data.

## 2026-07-30 — Animate score conditions into the reveal

- Score breakdowns now open by default and can be collapsed after the result is
  understood.
- Server-reported score conditions appear one by one during the final lock
phase, with an immediate reduced-motion equivalent.

## 2026-07-30 — Share the roll from its result

- Removed the global header share action.
- Added `Share roll` to the completed result action row using the existing safe
  native-share/clipboard pattern.

## 2026-07-30 — Promote the roll share action

- Moved `Share roll` above the result breakdown so it is visible without
  opening or scrolling through secondary details.
- Removed the leftover header separator from the old share action.

## 2026-07-30 — Align the header wordmark

- Updated `chm.lol` to use the same compact monospaced language as the header
  controls.

## 2026-07-30 — Add profile atmosphere effects

- Added Rainfall, Soft Snow, Fireflies, and Signal Scanlines as structured
  profile cosmetics.
- Effects render behind the composed profile and include shop/studio previews.
- Added reduced-motion behavior and a curated allowlist so catalog values never
  become arbitrary profile CSS.

## 2026-07-31 — Simplify the sitewide header mark

- Removed the bright rounded die icon from the shared header, leaving only the
  restrained `chm.lol` wordmark.

## 2026-07-31 — Add homepage profile claiming

- Replaced the generic signed-out homepage CTA with a `chm.lol/username`
  claim field.
- Prefills the existing signup modal while preserving server-side username
  availability and moderation checks.

## 2026-07-31 — Add a homepage Mythic roll showcase

- Added a fictional Mythic daily roll using the real roll preview renderer.
- Made conditions, EP, atmosphere, and leaderboard discovery visible before
  signup so the homepage demonstrates the product loop.
- Kept the showcase presentation-only and reduced-motion safe.

## 2026-07-31 — Refine the wordmark and leaderboard navigation

- Changed the homepage/header `.lol` suffix from gray to restrained lavender.
- Renamed the shared header’s `Discover` label to `Leaderboard` without
  changing its route or data behavior.

## 2026-07-31 — Clarify the homepage product statement

- Replaced abstract hero copy with a direct explanation of the daily color
  game, condition-based EP, profile effects, and leaderboard progression.
- Added a compact factual line so visitors can understand the loop at a glance.
- Clarified the showcase caption to connect a strong roll to profile discovery.

## 2026-07-31 — Stabilize homepage hero positioning

- Top-anchored the hero so claim helper text does not pull the wordmark upward.
- Reduced the dot contrast before the lavender `.lol` suffix.

## 2026-07-31 — Replace the signed-out profile lock

- Signed-out visitors opening Profile now see an onboarding surface with the
  local guest roll instead of the legacy “Profile Locked” card.
- Preserved the existing signup prompt and its account benefits: saved profile,
  EP, cosmetics, and leaderboard eligibility.
- Styled the guest roll presentation as a profile environment while preserving
  the existing local-roll authority.

## 2026-07-31 — Restore homepage hero placement

- Kept the claim form independent from the hero’s vertical anchor.
- Restored the giant `chm.lol` wordmark to its lower desktop composition.
- Kept the existing die logo for favicon, auth, homepage, and roll contexts.

## 2026-07-31 — Compose the homepage profile showcase

- Added a fictional public identity card with avatar, handle, bio, links, and
  leaderboard rank to the homepage preview.
- Positioned the Mythic daily roll inside that profile and labeled its
  equipped effects so the profile-as-game loop is visible at a glance.
- Removed the duplicate discovery rank and replaced it with a concise
  leaderboard visibility cue.

## 2026-07-31 — Stage profile onboarding and clarify result hierarchy

- Added a profile-first signed-out onboarding sequence: identity preview,
  customization explanation, then the daily roll.
- Preserved local guest roll authority and the existing account CTA after a
  result while removing the legacy roll-first presentation from onboarding.
- Standardized hex/rarity, score/EP, and condition-rail spacing across the
  homepage showcase, `TodayColor`, and integrated profile roll.
- The onboarding now uses the integrated profile-roll presentation with a
  fictional guest fixture instead of the legacy standalone roll screen.
- Forwarded roll lifecycle color/effect state into the onboarding atmosphere
  and expanded the reveal entry visual so it carries the same event weight as
  an active profile.

## 2026-07-30 — Keep roll conditions in the active reveal

- Condition chips now begin entering during the scan/lock animation as soon as
  the canonical response is available.
- The full-width application header retains its transparent visual treatment.

## 2026-07-30 — Full-width application header

- The shared site header now spans the full viewport across application routes.
- Existing inner padding and responsive navigation behavior are unchanged.
## 2026-07-31 — Profile appearance atmosphere controls

- Added explicit atmosphere choices to profile settings for the existing
  rain, snow, fireflies, and scanline cosmetics.
- Widened the fitting-room preview and kept unowned effects locked behind the
  existing shop/entitlement flow.
- Added `/terms` to the internal-link validation allowlist.

## 2026-08-01 — Profile settings studio redesign

- Replaced the crowded profile settings page with a focused section workspace.
- Added a compact editor rail for identity, expression, appearance, layout and
  links, privacy and social, and account controls.
- Kept a live profile preview visible on desktop and added mobile-friendly
  navigation, section stepping, public-profile shortcuts, and reduced-motion
  behavior.
- Preserved existing saves, drafts, publish flow, media handling, cosmetics,
  privacy settings, routes, and server-authoritative boundaries.
