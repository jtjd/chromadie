# Chromadie 2.0 Decisions

Use `08_DECISION_LOG_TEMPLATE.md` for new entries.

## 2026-07-31 — Make the public profile the homepage conversion promise

**Status:** accepted and implemented

The homepage explains the profile-first loop directly and uses a curated,
structured demo-profile projection rather than a score dashboard. The existing
auth, username policy, route, and roll boundaries remain the authority. The
homepage conversion events are added to the existing consent-gated analytics
allowlist with no identity payloads.

## 2026-07-30 — Keep secondary profile data on an intentional second page

**Status:** accepted and implemented

The opening profile remains a focused identity card. When a profile has
secondary content enabled, an Explore profile cue leads to a centered,
full-height continuation containing the roll, archive, expression, and deeper
profile data. Profiles without secondary content do not show the cue.

## 2026-07-30 — Keep hosted profile audio staff-only during alpha

**Status:** accepted and implemented

Profile audio uses the existing Supabase Storage stack with one MP3 per staff
profile and a 5 MiB file limit. The player
attempts autoplay and loops by default, while native controls and browser
autoplay fallback preserve visitor control. Public profile composition gains
no new primary region. Future paid access must introduce an entitlement-aware
boundary rather than weakening the staff check.

## 2026-07-30 — Remove the profile hydration waterfall

**Status:** accepted and implemented

Independent profile projections now start together instead of waiting for
social data, scores, story, configuration, and achievements one at a time.
The static achievement catalog is cached for the lifetime of the browser
session, while owner-only data remains owner-scoped and server-authoritative.

## 2026-07-30 — Let owners hide the daily roll from visitors

**Status:** accepted and implemented

The daily roll remains available to the owner for gameplay, while profile
settings can hide the visitor-facing daily-color surface. The existing module
visibility contract is extended additively and remains server-normalized.

## 2026-07-30 — Use username as the public display name

**Status:** accepted and implemented

The account username is now the sole public display name. Profile settings
continues to support an optional bio, but no longer offers a display-name
editor. Existing display-name values are normalized to the username by an
additive migration, and the identity RPC preserves that invariant.

## 2026-07-25 — Preserve live boundaries during Phase 0

**Status:** accepted

**Context**

Phase 0 needed regression protection around the existing SPA route, profile, and roll contracts before any profile-first redesign work. The current implementation has intentional security and authority boundaries: authenticated profile hydration, public profile projections, server-authoritative roll RPCs, bounded leaderboard views, and structured cosmetic data.

**Decision**

Keep the current Svelte/Vite SPA, route URLs, Supabase RPC surface, RLS/projection boundaries, scoring/economy semantics, and deployment flow stable. Extract only pure contract helpers for route parsing, profile field/ownership mapping, and roll readiness/canonical presentation, and wire them behind the existing components. Use focused native Node tests to lock the current behavior.

**Alternatives considered**

- Rewriting the application or introducing SvelteKit during the audit: rejected because it would expand scope and create route/auth/metadata migration risk.
- Moving profile or roll decisions into client state: rejected because ownership, eligibility, scoring, rewards, purchases, and prestige must remain server-authoritative.
- Broadening public selects or weakening RLS to simplify profile rendering: rejected because public profile links are an acquisition surface and private account data must remain protected.
- Waiting to add tests until the redesign: rejected because the existing behavior is the compatibility contract the redesign must preserve.

**Consequences**

Phase 0 produces a system map and regression seam without changing product behavior or requiring a schema migration. The large feature components and duplicated server/client metadata paths remain known hazards. The local Supabase parity/security checks were initially blocked by a stopped container, then passed after the project database container was restarted without a reset.

**Related files**

`docs/CURRENT_SYSTEM_MAP.md`, `docs/PHASE_0_REPORT.md`, `src/lib/routes.js`, `src/lib/profileContract.js`, `src/lib/rollState.js`, `test/phase-0-contracts.test.js`, `src/App.svelte`, `src/lib/Profile.svelte`, `src/lib/Game.svelte`.

## 2026-07-25 — Isolate Phase 1 foundations from the live profile

**Status:** accepted

**Context**

The current profile component combines data loading, ownership rules, cosmetics, achievements, and rendering. Phase 1 needs a coherent visual system and a responsive profile composition without creating a second source of truth or risking live profile behavior.

**Decision**

Add token CSS, explicit motion primitives, and small reusable `Surface`, `Button`, `Media`, and `Module` components. Build the first profile composition with immutable fixture data at `/prototype/profile`, served with `noindex,nofollow` metadata. Keep the prototype disconnected from stores, Supabase, auth, scoring, rewards, and live profile rendering.

**Alternatives considered**

- Replacing `Profile.svelte` immediately: rejected because live owner/visitor behavior needs a separate Phase 2 migration and parity plan.
- Adding profile configuration tables: rejected because Phase 1 has no backend deliverable.
- Styling only the existing global classes: rejected because it would deepen coupling and make the new system difficult to migrate incrementally.

**Consequences**

The prototype gives desktop/mobile composition and foundation primitives a concrete review surface while preserving rollback to the live app. It adds one explicitly non-indexable route and a Pages Function metadata path. Future live integration must adapt canonical profile data into the module contract rather than importing the fixture.

**Related files**

`src/styles/tokens.css`, `src/styles/foundations.css`, `src/styles/motion.css`, `src/lib/foundation/`, `src/lib/profileFixture.js`, `src/lib/ProfileCanvasPrototype.svelte`, `functions/prototype/profile.js`, `test/phase-1-foundations.test.js`.

## 2026-07-25 — Migrate the profile route through a shared live shell seam

**Status:** accepted

**Context**

Phase 2 needs the Phase 1 profile composition to render real current account and public profile data without duplicating the owner/visitor security branch or removing working owner controls. The current schema has no public bio or avatar field, and the existing `Profile.svelte` still owns mood editing, badge pinning, rivals, and deletion.

**Decision**

Extract the existing profile hydration into `src/lib/profileData.js`, preserving the explicit `get_my_profile` owner branch, allow-listed visitor profile select, bounded public score RPC, public achievement definitions, and owner-only achievement progress. Integrate a new `ProfileShell.svelte` at the existing profile routes. Keep the current renderer behind `legacy=1`, with canonical public URLs and `noindex,follow` fallback metadata during migration. Use a safe username monogram plus the existing brand mark where the current schema has no avatar field.

**Alternatives considered**

- Duplicate the data loader in the shell and legacy component: rejected because ownership/privacy drift would become likely during the migration.
- Replace the large legacy profile in place: rejected because it would remove a safe rollback path for mood, pinned badges, rivals, and account deletion.
- Add bio/avatar/profile-configuration columns now: rejected because that belongs to Phase 4 and would require a separate schema, privacy, validation, and migration review.
- Integrate today's roll into the new shell: rejected because roll presentation and no-navigation updates are Phase 3 deliverables.

**Consequences**

Current `/u/<username>`, `/profile`, and profile-id routes use the live shell while preserving the existing URL and Supabase boundaries. The shell renders public profile identity, rank, stats, best roll, recent colors, pinned badges, and sanitized cosmetics; owner controls remain reachable through an explicit temporary fallback. Phase 2 adds no schema migration and does not change scoring, economy, rewards, RLS, or production data semantics.

**Related files**

`src/lib/profileData.js`, `src/lib/ProfileShell.svelte`, `src/lib/Profile.svelte`, `src/lib/routes.js`, `src/App.svelte`, `functions/u/[[username]].js`, `test/phase-2-profile-shell.test.js`, `docs/PHASE_2_REPORT.md`.

## 2026-07-25 — Integrate the authenticated roll into the profile shell

**Status:** accepted

**Context**

Phase 3 needs today’s roll to feel like an event in the owner’s profile while preserving the existing guest flow, server-authoritative transaction, and public profile boundary. The existing `Game.svelte` contains useful roll behavior but also owns guest persistence and share presentation, so replacing it or duplicating its RPC/lock logic would create compatibility risk.

**Decision**

Add an owner-only `ProfileRoll.svelte` inside `ProfileShell.svelte`. Route both the existing game and the new profile module through `rollService.js`, `rollState.js`, and the shared percentile presentation helper. Reuse `get_my_daily_roll`, `get_score_percentile`, and `roll_die`; animate and display only bounded server-returned fields; refresh the existing profile, inventory, and wallet stores after success; and reload the shell projection without navigation. Keep guest/local persistence, challenge/share actions, and the legacy renderer on their existing paths.

**Alternatives considered**

- Move all roll UI into the profile shell and remove the root game path: rejected because guest/local behavior and existing share/challenge flows need to remain stable.
- Compute score, rarity, eligibility, or rewards in the new component: rejected because the SQL RPC and its RLS/security boundary remain authoritative.
- Add a new roll table or alter the scores schema: rejected because the existing canonical roll RPC and stored presentation already supply the Phase 3 data.
- Reuse `Game.svelte` directly inside the profile shell: rejected because its guest persistence, share modal, and large component ownership would make profile integration harder to guard and test.

**Consequences**

Authenticated owners get a no-navigation roll experience in the live profile. Public visitors do not receive owner controls, guests retain the root local-only flow, and both client surfaces share the same request/canonical/lock seams. The new module adds no schema, RLS, scoring, economy, reward, route, metadata, or production-data changes. Phase 4 remains responsible for structured profile configuration, links/discovery, and any separately reviewed migrations.

**Related files**

`src/lib/ProfileRoll.svelte`, `src/lib/ProfileShell.svelte`, `src/lib/rollService.js`, `src/lib/rollPresentation.js`, `src/lib/Game.svelte`, `test/phase-3-profile-roll.test.js`, `docs/PHASE_3_REPORT.md`.

## 2026-07-25 — Add a versioned profile configuration boundary

**Status:** accepted

**Context**

Phase 4 needs to make the live profile more personal without turning profile
customization into unrestricted user-authored markup or exposing private draft
state. The existing `profiles` table is a protected account projection, and
the roll module remains the primary owner transaction surface established in
Phase 3.

**Decision**

Add one additive `profile_configurations` row per profile with version-1
`draft_config` and `published_config` JSONB projections. The server normalizes
signature color, layout variant, module ids/order/visibility/size, and up to
six typed HTTPS links. Browser roles have no table grants; owner reads/writes
and public published reads use narrowly granted security-definer RPCs. Saving
never changes public rendering; an explicit publish promotes the validated
draft. The roll module is always visible. The client mirrors the contract only
to render safely and provides an owner-local preview; it does not decide
ownership, validation, publication, scoring, rewards, or economy state.

**Alternatives considered**

- Adding many nullable customization columns to `profiles`: rejected because
  it would widen a security-sensitive account projection and make future
  module evolution harder.
- Storing HTML/CSS or arbitrary URLs: rejected because profile links are a
  public acquisition surface and customization must remain structured,
  validated, and safe.
- Applying drafts immediately on save: rejected because owners need a private
  composition space and visitors need a clear published boundary.
- Allowing the owner to hide the roll module: rejected for this phase because
  the Phase 3 profile roll is the primary authenticated daily transaction and
  must remain discoverable.
- Adding configuration to Pages Function metadata/JSON-LD now: rejected
  because metadata remains username/profile based and should not depend on an
  interactive configuration RPC.

**Consequences**

Owners can configure signature color, layout, module order/visibility, and
safe links with a local preview and explicit publication. Visitors receive
only the published projection. The migration adds one protected table and four
RPC boundaries, preserves account deletion via cascade, and leaves existing
auth, routes, profile field allow-lists, roll authority, scoring, economy,
rewards, and metadata semantics intact. Future configuration versions must
update the SQL normalizer, client normalizer, editor, public projection, and
security tests together.

**Related files**

`supabase/migrations/20260725100000_profile_configuration.sql`,
`supabase/SECURITY.md`, `src/lib/profileConfig.js`,
`src/lib/profileData.js`, `src/lib/ProfileEditor.svelte`,
`src/lib/ProfileShell.svelte`, `test/phase-4-profile-config.test.js`,
`docs/PHASE_4_REPORT.md`.

## 2026-07-25 — Add durable public story projections without changing the config contract

**Status:** accepted

**Context**

Phase 5 needs profiles to accumulate visible history and collection meaning.
Canonical scores already contain safe public color/condition/presentation data,
but the live shell only reads a bounded recent-score window. `user_achievements`
is intentionally owner-private, and Phase 4 configuration rows use an exact
version-1 module shape that should not be invalidated by speculative module
versioning.

**Decision**

Add an additive `profile_events` projection with idempotent database triggers
for profile creation and canonical score insert/update, plus an idempotent
historical backfill. Expose it and a lifetime condition summary through one
bounded `get_public_profile_story(uuid)` RPC. Compose the timeline and
collection showcase inside the existing configurable `recent` and
`achievements` modules instead of changing the Phase 4 configuration schema.
Use server-owned `total_rolls` only to reveal more story depth and unlock the
collection showcase; it is presentation gating, not an entitlement or reward
authority.

**Alternatives considered**

- Deriving the entire timeline directly from `scores` on every read: rejected
  because durable event identity and future event types need a stable history
  projection.
- Mirroring every `user_achievements` row into public events: rejected because
  achievement unlock progress remains owner-private; pinned badges and
  canonical roll conditions are the public accomplishment surfaces.
- Extending the version-1 configuration module set immediately: rejected
  because existing saved eight-module layouts could be invalidated without a
  concrete version migration. Story sections can use the existing recent and
  achievement modules for this vertical slice.
- Adding event writes to scoring/roll calculation code: rejected because the
  triggers observe committed canonical rows and keep authority boundaries
  separate.

**Consequences**

Old and new profiles receive a durable origin/roll story, lifetime condition
collection, and progressive story depth without route or metadata changes.
Public responses are bounded, safe-normalized, and available to anon and
authenticated visitors through one RPC; browser roles cannot read the event
table. The migration adds trigger work to score/profile writes and a bounded
aggregation query, so future event types must include privacy, payload,
indexing, and deletion reviews. Scoring, eligibility, rewards, economy,
private achievements, auth, and existing configuration semantics remain
unchanged.

**Related files**

`supabase/migrations/20260725110000_profile_story.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/profileStory.js`, `src/lib/ProfileTimeline.svelte`,
`src/lib/ProfileCollection.svelte`, `src/lib/profileData.js`,
`src/lib/ProfileShell.svelte`, `test/phase-5-profile-story.test.js`,
`docs/PHASE_5_REPORT.md`.

## 2026-07-25 — Turn the leaderboard into a bounded public discovery hub

**Status:** accepted

**Context**

Phase 6 needs ranking and browsing to lead people into public profiles. The
existing leaderboard reads safe projection views, but its rows are weak
profile entry points and it has no public pagination or discovery surfaces.
The profile route, metadata path, and authenticated rivals behavior are
already compatibility contracts.

**Decision**

Add one additive `get_public_discovery(text,text,text,integer,integer)`
SECURITY DEFINER read projection with explicit surfaces for today, weekly,
monthly, all-time, recent exceptional, rising, new, and deterministic daily
random discovery. Validate the surface, rarity, username prefix, page, and
limit in the function; cap pages at 20 and returned rows at 12. Return only
public card fields and the validated username, never an internal `user_id`.
Add the supporting date/best-roll/recent-player indexes.

Replace the leaderboard presentation through small
`DiscoveryHub.svelte` and `DiscoveryCard.svelte` components while retaining
`Leaderboard.svelte` as the route entry point. Keep the existing rivals RPC
and follow control as a compatibility path because that mutation currently
requires its target id. New public cards navigate and share through the
existing `/u/<username>` route.

**Alternatives considered**

- Keep extending the existing large `Leaderboard.svelte`: rejected because
  filters, pagination, profile cards, and several ranking meanings would
  deepen a coupled component rather than establish a migration seam.
- Query `scores` or `profiles` directly from the browser: rejected because
  authoritative score tables and broad profile fields must remain behind
  explicit public projections.
- Return profile ids from every discovery surface: rejected because the
  public profile URL already has a validated username contract and discovery
  does not need internal identifiers.
- Use client-side randomization or ranking: rejected because ordering and
  boundedness belong to the server projection; random discovery uses a stable
  daily server hash.
- Add follow/reaction/guestbook writes: rejected because those are Phase 7
  social-layer deliverables; only the existing rivals compatibility behavior
  remains.

**Consequences**

The canonical `/leaderboard` URL now opens a public discovery hub with strong
profile cards, exceptional/rising/new/random surfaces, username/rarity
filters, bounded load-more pagination, and Web Share/clipboard profile links.
Today/weekly/monthly/all-time rankings and rivals remain available. The new
RPC and indexes are additive; scoring, eligibility, rewards, economy, RLS
policy semantics, roll transactions, historical data, and profile metadata
URLs remain unchanged. The random surface is exploratory rather than a
competitive ranking, and its daily hash ordering is intentionally separate
from indexed score ordering.

**Related files**

`supabase/migrations/20260725120000_public_discovery.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/discoveryData.js`, `src/lib/DiscoveryHub.svelte`,
`src/lib/DiscoveryCard.svelte`, `src/lib/Leaderboard.svelte`,
`src/lib/routes.js`, `functions/leaderboard.js`,
`test/phase-6-discovery.test.js`, `docs/PHASE_6_REPORT.md`.

## 2026-07-25 — Put the first social layer behind protected profile RPCs

**Status:** accepted

**Context**

Phase 7 needs profiles to create safe reasons to revisit one another without
introducing private messaging, notification spam, or browser-authoritative
moderation state. The existing social surface is the authenticated five-rival
`user_follows` graph and its `toggle_follow` RPC. The public profile shell and
discovery RPC already provide the stable read and URL seams for a social slice.

**Decision**

Add an additive social schema in
`supabase/migrations/20260725130000_social_layer.sql` with protected tables for
profile social settings, favorites, positive reactions, guestbook entries,
blocks, reports, and per-account rate-limit windows. Keep all new tables RLS
enabled with no browser table privileges. Expose only fixed-search-path
SECURITY DEFINER RPCs for public social reads, authenticated writes, owner
privacy settings, block/report actions, and guestbook deletion. Extend the
existing follow toggle with the same block and interaction checks while
preserving its five-rival cap and return contract.

Use three non-competitive reaction types (`spark`, `glow`, and `cheer`), a
bounded plain-text guestbook with no URLs, and owner controls for interactions,
guestbook availability, recent activity, and discovery inclusion. Enforce
blocks and settings inside each mutation, rate-limit each action server-side,
retain moderation details outside public projections, and cascade social rows
with account deletion. Integrate one `ProfileSocial.svelte` module through
the existing `ProfileShell`/`profileData.js` seam; successful writes reload the
bounded projection rather than inventing optimistic authority.

**Alternatives considered**

- Add direct browser policies to each social table: rejected because a single
  projection/RPC boundary makes privacy, blocks, validation, and rate limits
  auditable and avoids exposing internal account relationships.
- Start with guestbook before blocks/reports: rejected because guestbook and
  reaction writes require abuse controls before public release.
- Add notifications or private messages: rejected because notification spam
  and message moderation are separate systems and are explicitly deferred.
- Reuse `user_follows` as favorites: rejected because rivals are a capped
  competitive compatibility feature; save/favorite is a separate expressive
  signal and must not change the existing rivals semantics.
- Store profile privacy in client configuration JSON: rejected because
  activity/discovery visibility must be enforced by the public score/story/
  discovery projections, not by a render hint.

**Consequences**

Visitors can read bounded positive social signals and guestbook notes; only
authenticated users can mutate them. Owners control interaction, guestbook,
activity, and discovery visibility. Blocks remove reciprocal follows,
favorites, and reactions and suppress the social projection. Guestbook text is
escaped by normal Svelte interpolation and validated again in SQL. Social
signals do not affect scores, rarity, ranks, EP, rewards, achievements, shop
state, or notifications. The public `/u/<username>` URL, Pages metadata,
discovery URL, legacy profile fallback, and no-private-message boundary remain
unchanged.

The current block action leaves guestbook rows protected for moderation and
hides them from the blocked projection; changing that retention behavior is a
future moderation decision. Notifications, visitor counts, comparisons, and
broader profile visibility remain outside this milestone.

**Related files**

`supabase/migrations/20260725130000_social_layer.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/profileSocial.js`, `src/lib/ProfileSocial.svelte`,
`src/lib/profileData.js`, `src/lib/ProfileShell.svelte`,
`test/phase-7-social.test.js`, `docs/PHASE_7_REPORT.md`.

## 2026-07-25 — Keep decoration expression additive and entitlement-gated

**Status:** accepted

**Context**

Phase 8 needs the shop to feel like a profile decoration studio while
preserving the existing live catalog, EP economy, inventory ownership, and
server-authoritative equip boundary. The current shop fitting room used a
compact mock profile preview and had no explicit distinction between earned
items and future premium expression.

**Decision**

Keep `/shop` and `Shop.svelte` as the compatibility entry point, add a small
`DecorationStudio.svelte` wrapper, and render the fitting-room profile hero
through the existing `ProfileShell.svelte` in a network-free isolated preview
mode. Show explicit free-baseline, earned, and premium-expression labels. The
free baseline remains complete for every profile; existing earned items keep
their current EP/inventory behavior.

Add an additive `profile_entitlements` table with RLS enabled, no browser
table grants, a fixed-search-path owner projection RPC, and a service-role-only
idempotent grant RPC. Add `access_tier` and `entitlement_key` metadata to
`shop_items`, with two premium expression examples. Premium catalog rows are
not purchasable with EP; `equip_item` checks the matching entitlement inside
the server transaction. Account deletion removes entitlement rows.

**Alternatives considered**

- Treat premium rows as zero-cost shop items: rejected because cost `0` would
  make browser-visible catalog state look like an earned purchase and would
  bypass an explicit monetization boundary.
- Grant or equip premium items from the client: rejected because entitlement,
  purchase, and expression ownership are server-authoritative account state.
- Add a payment provider/webhook in this milestone: rejected because it would
  introduce external credentials, billing semantics, and operational failure
  modes before the entitlement boundary is audited.
- Create a second profile renderer for the studio: rejected because it would
  duplicate cosmetics safety, profile mapping, and future profile layout
  behavior. The existing shell now has a deliberately isolated preview mode.
- Make free profiles sparse to increase premium conversion: rejected because
  the product north star requires a beautiful, personal identity at the free
  baseline; premium is expression, not social access or gameplay power.

**Consequences**

The shop now communicates the access model and previews the actual profile
hero. Entitled premium keys can appear in the owner fitting room and be
equipped only after the RPC rechecks the entitlement; unentitled premium rows
remain preview-only. No score, rarity, rank, EP, reward, achievement, roll,
RLS, public URL, metadata, or historical data semantics changed. The local
reset caught and corrected closed catalog CASE coverage in the snapshot and
reprice migrations, and the security audit covers grants, fixed search paths,
premium gates, and account deletion.

Payment/webhook issuance, entitlement administration, receipts, refunds,
subscription lifecycle, notifications, and Phase 9 product work remain
deferred.

**Related files**

`supabase/migrations/20260725140000_decoration_entitlements.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/DecorationStudio.svelte`, `src/lib/Shop.svelte`,
`src/lib/ShopStudioPreview.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/shopCatalog.js`, `src/lib/stores.js`,
`test/phase-8-decoration.test.js`, `docs/PHASE_8_REPORT.md`.

## 2026-07-25 — Harden launch surfaces behind bounded runtime contracts

**Status:** accepted

**Context**

Phase 9 begins with launch polish, but the current application has several
distinct production-readiness gaps: the Vite bundle remains a single chunk
above the default warning threshold, programmatic navigation has no shared
content focus target, structured media has no load-error fallback, and public
HTML responses do not distinguish cacheable published profiles from private or
legacy responses. Product analytics and legacy-renderer retirement also need
privacy and compatibility decisions before implementation.

**Decision**

Add a narrow launch-hardening slice without changing canonical account or
gameplay state:

- define a `check:performance` asset budget of 650 KiB JavaScript, 300 KiB CSS,
  and 12 KiB HTML;
- add a keyboard-visible skip link and focus the `#main-content` region after
  programmatic and browser-history navigation while preserving dialog/mobile
  focus restoration;
- normalize media sources to same-origin paths or HTTPS, reserve the existing
  aspect-ratio box, and render an accessible fallback after invalid or failed
  loads;
- apply short public cache windows to published public HTML and immutable
  caching to hashed assets, while keeping missing, owner/private, and
  `legacy=1` profile responses no-cache;
- lock the behavior with focused native tests and retain the existing full
  validation suite.

Do not add an analytics sink, payment/webhook flow, arbitrary media/embeds,
SvelteKit, or legacy-route removal in this slice. Cloudflare Web Analytics
remains shell-level measurement only until consent, event redaction, retention,
and operational ownership are defined.

**Alternatives considered**

- Hide or raise the existing Vite chunk warning without a budget: rejected
  because a launch gate should expose regression pressure rather than conceal
  it. Code-splitting requires a measured follow-up.
- Cache every profile response: rejected because owner/private and legacy
  responses can carry migration/control state and must remain non-cacheable.
- Allow arbitrary HTTPS/HTTP/data media: rejected because future media must
  remain safe, CSP-compatible, and predictable on mobile; only local and HTTPS
  sources are currently needed.
- Add browser analytics directly to Supabase: rejected because this would
  create a new behavioral-data and retention surface without a consent or
  moderation/operations decision.
- Remove `legacy=1` now: rejected because mood, pinned badges, rivals, and
  deletion still depend on that compatibility renderer.

**Consequences**

The application has explicit launch regression guards and a safer public
acquisition surface. These changes are presentation/HTTP behavior only; they
do not alter auth, RLS, scoring, roll eligibility, rewards, economy,
entitlements, social records, public profile fields, or historical data. The
current bundle warning remains visible and is recorded as a separate
optimization boundary. Analytics instrumentation, browser/device audit,
moderation operations documentation, deeper code-splitting, and legacy cleanup
remain the next Phase 9 slices.

**Related files**

`scripts/check-performance-budget.mjs`, `package.json`,
`src/lib/mediaSafety.js`, `src/lib/foundation/Media.svelte`, `src/App.svelte`,
`functions/_publicPage.js`, `functions/u/[[username]].js`,
`functions/index.js`, `functions/leaderboard.js`, `functions/how-to-play.js`,
`functions/privacy.js`, `public/_headers`,
`test/phase-9-launch-polish.test.js`, `docs/PHASE_9_REPORT.md`.

## 2026-07-25 — Keep product events opt-in, redacted, and provider-neutral

**Status:** accepted for the Phase 9 continuation slice

**Context**

The application already has Cloudflare Web Analytics at the shell level, but
it had no product-event contract. Adding a provider or database sink directly
would create a new behavioral-data surface without an agreed consent model,
retention period, deletion path, redaction policy, or operational owner.

**Decision**

Add a small client-side event seam in `src/lib/productAnalytics.js` with:

- explicit `granted`/`denied` consent from the privacy page, stored only in
  browser local storage;
- a fixed list of coarse route/profile/roll/share/shop event names and
  property keys;
- control-character stripping and bounded strings, with no usernames, emails,
  ids, scores, colors, draft configuration, entitlements, guestbook content,
  reports, or moderation state;
- a page-local `CustomEvent` adapter and memory adapter for tests, with no
  network or Supabase write;
- call sites attached only to existing route/readiness/success transitions,
  never to gameplay or account authority.

Document the current social moderation boundary separately. Protected report
and guestbook tables, RLS, RPC validation, blocks, rate limits, and deletion
cascades are the current safety controls; a dashboard, notification queue,
appeal workflow, moderator identity audit, and global freeze remain future
operational work.

**Alternatives considered**

- Insert events directly into Supabase: rejected because it would establish
  durable behavioral-data retention and access semantics prematurely.
- Send events to Cloudflare or a third-party provider immediately: rejected
  because shell analytics and product analytics have different consent,
  redaction, and ownership requirements.
- Emit usernames, profile ids, roll values, or moderation fields: rejected
  because the current funnel does not need identity or private-content data.
- Add a moderation UI in this slice: rejected because it would require a
  privileged operator identity, audit trail, queue semantics, and deployment
  surface beyond the current protected RPC boundary.

**Consequences**

Product flows can be measured in a future-approved way without coupling
delivery to gameplay, profile publication, shop authority, or social writes.
With the current adapter, events disappear with the page and revoking consent
stops future delivery. A future sink must preserve this contract and obtain an
assigned owner, retention/deletion process, access controls, and incident
response approval before activation.

**Related files**

`src/lib/productAnalytics.js`, `src/lib/AnalyticsPreferences.svelte`,
`src/main.js`, `src/App.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/Game.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/DiscoveryCard.svelte`, `src/lib/Shop.svelte`,
`test/phase-9-analytics.test.js`, `docs/ANALYTICS_CONTRACT.md`,
`docs/MODERATION_OPERATIONS.md`.

## 2026-07-25 — Treat linked schema/catalog drift as a launch blocker

**Status:** accepted for the Phase 9 browser-audit boundary

**Context**

The Chromium audit passed the local critical flows, but the configured linked
Supabase project is behind the branch. `supabase migration list --linked`
shows the remote ending at `20260712200000_launch_audit_remediation`, while
the local Phase 4–8 migrations remain pending. Read-only RPC probes return
`PGRST202`/HTTP 404 for discovery, profile configuration/story/social, and
owner entitlement/settings surfaces. The remote catalog comparison also lacks
two local shop keys.

**Decision**

Treat the drift as a deployment/launch blocker. Do not add a client fallback to
older profile/discovery queries, do not make a browser-only catalog exception,
and do not push migrations implicitly. Require an authorized release/DB owner
to confirm the target project, backup or point-in-time recovery ownership,
ordered migration review, post-push RPC/catalog checks, and rollback plan
before deployment.

Record the browser evidence and recovery boundary in
`docs/PHASE_9_BROWSER_AUDIT_REPORT.md` and
`docs/ROLLBACK_AND_RECOVERY.md`. Keep scoring, roll eligibility, rewards,
economy, entitlements, RLS, public privacy, and historical data semantics
unchanged while the drift is resolved.

**Consequences**

The local frontend can be reviewed independently, but Phase 9 launch
certification cannot be declared until remote schema/catalog parity is
verified. A matching frontend deployment must follow, not precede, the
server-side RPC boundary. The first remediation action is operational and
requires explicit authorization; it is not a UI redesign or compatibility
refactor.

**Related files**

`docs/PHASE_9_BROWSER_AUDIT_REPORT.md`, `docs/ROLLBACK_AND_RECOVERY.md`,
`supabase/MIGRATIONS.md`, `supabase/migrations/20260725100000_profile_configuration.sql`,
`supabase/migrations/20260725140000_decoration_entitlements.sql`,
`test/phase-9-browser-audit.test.js`.

## 2026-07-25 — Reconcile the live profile around identity first

**Status:** accepted for Phase 10

**Context**

The Phase 0–9 infrastructure was complete and protected, but the live
`ProfileShell` still presented identity, roll, stats, history, achievements,
social, owner controls, and boundary explanations as an equal-weight game
dashboard. The product direction now requires the public profile to feel like
a composed personal website before the visitor understands the game.

**Decision**

Keep the existing live data/authority seams and project their stored v1
configuration into at most four primary regions: identity, roll/latest result,
expression, and one featured story/accomplishment. Make the authenticated bare
root resolve to the owner profile while keeping explicit `/?view=game` as the
direct roll route. Collapse secondary history, stats, social, configuration,
and owner compatibility surfaces behind native detail/owner sections. Remove
the visible public-boundary explanation and redundant primary calls to action.

Use `src/lib/profileComposition.js` as a presentation projection only. Keep
`ProfileEditor`, `ProfileSocial`, the secure `ProfileRoll`, the legacy
`legacy=1` renderer, the profile configuration normalizer, all RPCs, and all
stored data intact. Use real mapped profile data in production and a stable
public account only for screenshot inspection.

**Alternatives considered**

- Rewrite the profile and remove legacy/configuration paths: rejected because
  it would discard working controls, stored configurations, and rollback
  safety.
- Add a new profile schema or bio/avatar/media system: rejected because Phase
  10 is a visual reconciliation, not a data-model or media milestone.
- Hide secondary data entirely: rejected because the profile’s history,
  achievements, social, and account features remain important attachment and
  compatibility surfaces.
- Leave the root as Roll and add a separate profile home: rejected because it
  preserves the dashboard-first product impression and makes the profile
  secondary to the game.

**Consequences**

The public profile reads as identity and expression first, with the latest
color visible before the detail history. The primary composition fits the
desktop gates and leads with identity/roll on mobile. Secondary content adds
intentional disclosure instead of competing for initial attention. The global
footer remains normal site navigation, while legacy/configuration/RPC data
remain available for compatibility.

The linked Supabase project still has the Phase 9 documented migration/catalog
drift. Phase 10 does not push migrations, add client fallbacks, or claim launch
certification; remote reconciliation remains an authorized release action.

**Related files**

`src/lib/profileComposition.js`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileExpression.svelte`, `src/lib/ProfileFeatured.svelte`,
`src/lib/ProfileRoll.svelte`, `src/App.svelte`, `src/lib/routes.js`,
`src/lib/foundation/Surface.svelte`, `test/phase-10-profile-first.test.js`,
`docs/11_PRODUCT_DIRECTION_ADDENDUM.md`,
`docs/milestones/PHASE_10_VISION_RECONCILIATION.md`,
`docs/PHASE_10_REPORT.md`.

## 2026-07-26 — Treat minimalism as a composition constraint, not a card count

**Status:** accepted as the Phase 11 workflow boundary

**Context**

The Phase 10 profile reduced the number of visible regions, but the result
still retained the visual grammar of an AI-designed dashboard: a large hero
followed by separate cards and repeated module chrome. The intended reference
is a simple personal page whose identity, mood, links, and daily color ritual
feel authored as one surface.

**Decision**

The next workflow will evaluate and implement a continuous profile composition,
not another pass that merely removes or collapses cards. Identity and roll are
one central moment. Links and story are quiet continuation. Cards, borders,
eyebrows, repeated labels, and subsystem language are exceptional treatments,
not defaults. The screenshot review is a hard design gate: if the page reads as
a set of modules or needs explanation as a dashboard, the work fails review.

Keep the existing profile data, configuration, RPC, auth, RLS, roll, scoring,
rewards, economy, entitlements, history, cosmetics, social, moderation,
routes, and legacy compatibility boundaries unchanged.

**Consequences**

Phase 11 will begin with a visual contract and before/after screenshots before
component changes. The profile may become visually simpler even though the
underlying feature set remains intact. Detail surfaces can still expose the
full system, but the public first impression must communicate a person and a
mood before mechanics and statistics.

**Related files**

`docs/12_NEXT_PHASES_ROADMAP.md`,
`docs/milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md`,
`docs/PHASE_10_REPORT.md`.

## 2026-07-26 — Make identity and roll one authored opening composition

**Status:** accepted and implemented for Phase 11

**Context**

The Phase 10 four-region projection met the content ceiling but still looked
like a hero followed by three equal cards. The intended reaction is personal
website envy before game comprehension; card count alone could not create that
reaction.

**Decision**

Keep the four-region data contract as a ceiling, but render identity and the
latest/next color inside one continuous atmospheric opening canvas. Render
links, signature expression, and one story/accomplishment trace as quiet
typographic continuation. Reserve visible card treatment and repeated module
chrome for deliberate detail or owner surfaces. The owner roll gets an
integrated presentation mode that changes copy and framing only; its secure
request, canonical response, reroll guard, reward handling, and refresh seam
remain the same.

**Consequences**

The default public profile is materially simpler without deleting data or
feature access. The first viewport communicates a person, mood, and color
before stats, mechanics, or social subsystems. The supporting detail disclosures
remain available for users who want the full game/profile history. Screenshot
review is required evidence for this visual boundary.

The linked Supabase migration/catalog drift and Firefox/device certification
gap remain release blockers. This decision does not authorize remote writes,
schema changes, media integration, or later product expansion.

**Related files**

`src/lib/ProfileShell.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileExpression.svelte`, `src/lib/ProfileFeatured.svelte`,
`test/phase-11-continuous-profile.test.js`,
`docs/PHASE_11_VISUAL_CONTRACT.md`, `docs/PHASE_11_REPORT.md`.

## 2026-07-26 — Use the approved mockup as a composition contract

**Status:** accepted and implemented for Phase 10.2

The approved `design/reference/v0-profile-mockup/` is translated into Svelte
as a centered personal identity surface: a minimal profile header, canonical
daily color, one quiet collection trace, and one expression/music boundary.
The reference remains frontend-only inspection material. Its React/Next.js
architecture, literals, local roll simulation, placeholder socials, and fake
music behavior are rejected from production.

The live renderer uses the existing mapped profile/configuration/story/social
projections and the secure owner roll flow. Missing avatar, bio, and music
contracts use safe, quiet fallbacks rather than fabricated user content. A
local-only screenshot fixture can expose the same mapped public profile in
owner/pre-roll states for visual evidence; it is disabled in production
builds and cannot change roll authority.

**Consequences**

The first impression is a personal page rather than a game dashboard while
history, configuration, social, moderation, entitlements, account controls,
and `legacy=1` remain reachable through deliberate detail surfaces. Music
integration, richer identity fields, and media contracts remain Phase 11
boundaries. No schema, auth, RLS, route, scoring, reward, economy, or
deployment behavior changed.

**Related files**

`docs/APPROVED_MOCKUP_TRANSLATION.md`,
`checklists/APPROVED_MOCKUP_PARITY_GATE.md`,
`src/lib/ProfileAtmosphere.svelte`, `src/lib/ProfileModeHeader.svelte`,
`src/lib/IdentityCard.svelte`, `src/lib/TodayColor.svelte`,
`src/lib/FeaturedCollection.svelte`, `src/lib/ProfileMusic.svelte`,
`docs/PHASE_10_2_REPORT.md`.

## 2026-07-26 — Correct visual fidelity without expanding the data contract

**Status:** accepted and implemented for Phase 11.1

The approved mockup comparison showed that the live profile still read as a
small card on an empty canvas even after the Phase 11 composition work.
Correct the presentation at the CSS/component boundary only: use a
viewport-fixed atmosphere, readable essential type, upper-middle placement,
and an independently bottom-anchored optional expression surface. When no
production music/expression data exists, omit that surface and rebalance the
profile. Use a mapped color-history sentence or a designed first-chapter state
instead of generic placeholder bio copy.

Do not add public bio/avatar/music fields, media storage, playback, schema
changes, new routes, or gameplay behavior. The visual fixture remains local
and cannot settle a roll or introduce mock production content.

**Consequences**

The profile’s visual impact is now judged with repeatable 100%/dSF1 browser
captures and computed-style measurements, not source assertions alone. Missing
optional content remains honest without leaving a broken-looking control.
The owner/visitor distinction, secure roll authority, all compatibility
surfaces, and the Phase 12 boundary remain unchanged.

**Related files**

`src/lib/ProfileShell.svelte`, `src/lib/ProfileAtmosphere.svelte`,
`src/lib/IdentityCard.svelte`, `src/lib/ProfileMusic.svelte`,
`src/lib/ProfileRoll.svelte`, `scripts/audit-phase-11-1.mjs`,
`docs/PHASE_11_1_VISUAL_AUDIT.md`, `docs/PHASE_11_1_REPORT.md`.

## 2026-07-26 — Hold real identity work until linked schema reconciliation

**Status:** blocked at the Phase 13 database baseline gate

Phase 13 requires a new server-authoritative identity contract and a
canonical-domain transition, but the linked Supabase project is not at the
branch's Phase 4–8 schema boundary. `supabase migration list --linked` shows
the remote ending at `20260712200000_launch_audit_remediation`; the five local
profile configuration/story, discovery, social, and entitlement migrations
remain pending. The linked catalog also lacks `bg_prism_atmosphere` and
`name_prism_atelier`, while the local snapshot/seed pair contains 82 matching
items.

Do not create or apply the Phase 13 identity migration, restore the removed
legacy bio implementation, or change public-domain runtime behavior while the
production projection/RLS boundary is unverified. First obtain backup/PITR
confirmation, apply the five pending migrations in order through the reviewed
workflow, verify all RPCs/RLS/grants/catalog rows, and record the rollback
point. Then resume the additive identity/domain slice.

**Related files**

`docs/PHASE_13_PLAN.md`, `docs/PHASE_13_DATABASE_BASELINE.md`,
`docs/CHM_LOL_DOMAIN_CUTOVER.md`, `docs/PHASE_13_REPORT.md`.

## 2026-07-26 — Extend the approved profile language to supporting surfaces

**Status:** accepted and implemented for Phase 12

The approved profile composition is now the visual language for the rest of
the site. Non-profile routes use a shared atmospheric canvas and restrained
`SiteModeHeader`, while public and authenticated profile routes retain the
existing `ProfileModeHeader` and centered `ProfileShell` composition.

The default-entry semantics remain explicit rather than being inferred from
presentation: signed-out `/` opens the guest daily-roll surface;
authenticated `/` resolves to the owner live profile after session hydration;
and `/?view=game` remains the direct roll route. Explicit profile, discovery,
shop, help, privacy, challenge, and legacy routes retain their existing
meaning.

**Consequences**

Roll authority, authentication, RLS, scoring, rewards, economy, entitlements,
history, cosmetics, social/moderation boundaries, direct refresh, and old
profile URLs are unchanged. The sitewide extension changes the visual shell
and navigation affordances only. It does not fabricate an unauthenticated
profile, add identity fields, or turn supporting pages into dashboard cards.

The captured evidence is under `artifacts/phase-12/` and the exact boundary
and validation results are in `docs/PHASE_12_REPORT.md`. The linked Supabase
schema/catalog drift remains a pre-existing release blocker and was not
modified.

**Related files**

`src/lib/SiteModeHeader.svelte`, `src/lib/ProfileAtmosphere.svelte`,
`src/App.svelte`, `src/styles/layout.css`,
`test/phase-12-sitewide-profile-entry.test.js`,
`docs/milestones/PHASE_12_SITEWIDE_PROFILE_ENTRY.md`,
`docs/PHASE_12_REPORT.md`.

## 2026-07-27 — Use one profile language across supporting surfaces

**Status:** accepted and implemented as a visual refinement

**Context**

The Phase 12 shell extended the profile atmosphere to the rest of the site,
but the supporting routes still exposed parts of the older dashboard skin:
the application header had a different chrome treatment, Roll controls used a
legacy spectrum button, and Discover/Studio/help surfaces carried competing
surface, radius, and accent rules.

**Decision**

Keep `ProfileShell` and its composition as the visual source of truth. Align
`SiteModeHeader` and `ProfileModeHeader` around the same transparent brand,
mark, typography, spacing, and slash-separated navigation language. Add one
sitewide stylesheet that projects the profile surface, border, radius, text,
control, responsive, and reduced-motion tokens onto non-profile routes while
leaving each route's information architecture and domain components intact.

Do not rewrite Roll, Discover, Studio, help, privacy, or guest-lock content
into profile modules. The shared layer changes presentation only; existing
authentication, route handling, server-authoritative gameplay, catalog,
privacy, social, and legacy boundaries remain the authority.

**Consequences**

Supporting routes now read as rooms around the profile: the same atmospheric
canvas, quiet translucent surfaces, mono labels, accent-led focus states, and
profile-like primary actions appear across the site. Discovery's grid and the
Studio catalog remain intentionally domain-specific, but no longer introduce a
separate black/purple skin. The refinement adds no schema migration, backend
write, route change, or production data dependency.

**Related files**

`src/styles/site.css`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileModeHeader.svelte`, `src/main.js`,
`test/sitewide-profile-cohesion.test.js`.

## 2026-07-28 — Let the canonical roll animate the profile composition

**Status:** accepted and implemented as a presentation refinement

**Context**

The owner roll already lived inside the profile identity surface and reused
the secure roll path, but the rest of the profile only noticed the result
after the color value changed. The ritual still read like a control embedded
in a static page instead of an event that changed the identity.

**Decision**

Keep `ProfileRoll.svelte` responsible for the existing server-authoritative
transaction and emit only bounded lifecycle signals (`rollstart`,
`rollcancel`, and the existing canonical `colorchange`/`rollcomplete`
events). Let `ProfileShell` own transient presentation state. While the
canonical result is resolving, the identity recedes and the roll stays focal;
when the server result arrives, the canonical color drives a short atmosphere,
identity, and collection response. CSS owns the effect and includes a reduced-
motion equivalent.

No result, score, rarity, reward, eligibility, inventory, or profile data is
computed by the effect layer, and no durable roll-effect state is stored.

**Consequences**

Rolling now changes the profile in place: the atmosphere intensifies, the
identity quiets during resolution, and the new color settles through the
profile surface before the page returns to rest. Visitors remain read-only;
the owner-only roll and all existing RPC, RLS, scoring, reward, route, and
historical-data boundaries are unchanged.

**Related files**

`src/lib/ProfileRoll.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileAtmosphere.svelte`, `src/lib/IdentityCard.svelte`,
`test/profile-roll-effect.test.js`.

## 2026-07-29 — Make the roll a profile ritual and reduce identity-surface noise

**Status:** accepted and implemented as a separately scoped visual refinement

**Context**

The profile response effect made a completed roll influence the surrounding
composition, but the owner action still read as a small utility control and
the identity card combined person, game result, story copy, and collection
metadata in one dense surface. The current public schema still has no
authoritative personal bio/avatar contract, so the refinement must improve
hierarchy without inventing identity content or adding a migration.

**Decision**

Keep one centered identity surface with only the person, handle, optional
validated links, and the integrated roll. Move the color archive to a quiet
featured trace outside the card. Present the owner roll as a short ritual:
open the color field, read and lock the server-returned signal, count up the
canonical score, reveal returned conditions, and let the player skip the
presentation after initiation. Use reduced-motion equivalents and preserve
the existing visitor result path.

The animation layer may stage and count canonical values for presentation,
but it may not determine eligibility, score, rarity, rewards, purchases, or
prestige. The existing `roll_die` RPC and client request/lock seam remain the
only gameplay authority exposed to the UI.

**Alternatives considered**

- Add more profile widgets or persistent statistics to make the page feel
  richer: rejected because the problem is competing hierarchy, not missing
  information.
- Recreate a literal slot-machine or lever interaction: rejected because the
  daily roll should feel like a color ritual attached to identity, not a
  casino mechanic or a second game implementation.
- Add personal bio/avatar fields during this pass: rejected because Phase 13's
  linked database baseline is blocked and identity data needs its own additive
  privacy/validation milestone.

**Consequences**

The initial viewport has fewer competing facts and a clearer primary action;
the profile remains recognizable as a personal page before its game details
are opened. The archive and detailed roll conditions remain reachable, while
owner, visitor, guest, private, and historical data boundaries continue to be
handled by the existing adapters and disclosure surfaces. No schema or
backend deployment work is required.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileShell.svelte`, `test/profile-ritual-refinement.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Surface scoring conditions without restoring the dashboard

**Status:** accepted and implemented as a visual follow-up

The compact owner result hid the most meaningful proof of a roll—its scoring
conditions—inside a collapsed details panel. At the same time, the centered
profile composition underused desktop width compared with the spacious,
identity-first layouts reviewed across current guns.lol profiles.

Keep the condition data server-reported and display only a bounded rail of
active contributors, score awards, and an overflow count in the primary result.
Leave the complete traits, contributor, badge, reward, and reroll record in the
existing expandable details surface. Widen the approved profile canvas to a
single two-column identity/roll surface above the archive, with a CSS breakpoint
that returns to the existing stacked mobile composition.

Do not add a profile schema, duplicate scoring logic, infer conditions in the
browser, or turn the profile back into an equal-weight results dashboard.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileRoll.svelte`, `test/profile-ritual-refinement.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Separate identity from the game on the same profile page

**Status:** accepted and implemented as the simpler profile boundary

The two-column identity/roll surface still made the profile card feel like a
game dashboard. A profile should first communicate one person, while the
daily game can remain close by without competing with that identity.

Render the identity card with only avatar, name, handle, optional validated
links, and the small earned badge. Move the daily roll into a quiet sibling
layer below the card on the same page. In that profile mode, show only the
daily color/result summary and a details disclosure; keep the full scoring
conditions, rewards, countdown, and reroll controls available inside the
disclosure and on the direct game route. Keep the archive outside the card as
a low-contrast progression trace.

This is a presentation boundary only. The same `ProfileRoll` request, secure
RPC, canonical server result, eligibility guard, refresh behavior, and
visitor-read-only path remain in force. Mobile uses the same stacked flow.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/TodayColor.svelte`,
`test/profile-ritual-refinement.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Use one typography contract for the shared header

**Status:** accepted and implemented as a cohesion correction

The shared header used separate typographic treatments for primary navigation,
profile actions, account controls, and the mobile menu. Although the component
was shared across routes, inherited fonts and mismatched sizes made each state
look like different navigation chrome.

Use the body typeface for every interactive header control at one 0.78 rem,
600-weight scale with restrained letter spacing and title case. Apply the same
contract to desktop navigation, Share/Edit, account actions, the mobile Menu
trigger, and every mobile-menu action. Keep the compact brand wordmark as the
only intentional typographic exception.

**Related files**

`src/lib/SiteModeHeader.svelte`, `test/sitewide-profile-cohesion.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Give the bare root a minimal public homepage

**Status:** accepted and implemented as an acquisition and orientation surface

The bare root previously changed meaning by session: guest Roll when signed
out and owner profile after authentication. That left no stable place to
explain ChromaDie, offer account creation, or return when the logo was
activated.

Make `/` a session-independent landing page with one concise explanation of
the daily color identity loop, one signup CTA for visitors, an owner-profile
CTA for signed-in players, a quiet abstract color composition, and the shared
legal/support footer. Keep the homepage header minimal with brand and account
actions only. The header logo always navigates to `home`.

Preserve gameplay and share compatibility: `/?view=game` remains the direct
Roll route, `/c/<id>` remains the challenge route, `/u/<username>` remains the
public profile route, and clean Discover/Studio/legal routes retain their
meaning. The direct game route is non-indexed so `/` is the canonical
acquisition surface. No auth, roll, scoring, reward, RLS, or schema behavior
changes.

**Related files**

`src/lib/HomePage.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/routes.js`, `src/App.svelte`, `test/home-page.test.js`,
`test/phase-10-profile-first.test.js`,
`test/phase-12-sitewide-profile-entry.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Keep primary destination navigation off profile pages

**Status:** accepted and implemented as a profile-simplicity refinement

The profile is the product’s identity surface and already contains its owner
gameplay. Repeating Profile, Discover, and Studio in the middle of the profile
header adds application chrome to an intentionally sparse public page.

In profile mode, retain the ChromaDie brand, Share, owner Edit, and account
controls, but omit the primary destination navigation on desktop and from the
mobile menu. Keep Profile, Discover, and Studio available through the same
shared header on non-profile routes. Preserve the header grid with a
non-interactive spacer so contextual actions remain aligned consistently, and
label the profile mobile menu as profile actions.

**Related files**

`src/lib/SiteModeHeader.svelte`, `test/sitewide-profile-cohesion.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Use one navigation shell across profile and application routes

**Status:** accepted and implemented as a sitewide cohesion refinement

The profile route had a minimal profile-only header while Roll, Discover, and
Studio used a separate application header. That made the site feel like
several products and left the profile without an obvious way to reach core
surfaces.

Render one `SiteModeHeader` on every application and public-profile route. The
header owns the shared Profile / Discover / Studio navigation, active
states, account controls, and responsive mobile menu. Profile Share and owner
Edit remain available as contextual actions in the same header rather than a
second navigation system.

This is a presentation and navigation-boundary change only. Existing route
parsing, public profile URLs, auth/session behavior, share analytics, owner
editing, and secure gameplay services remain unchanged. The former
`ProfileModeHeader` remains available as an unused compatibility component;
the application no longer renders it.

**Related files**

`src/App.svelte`, `src/lib/SiteModeHeader.svelte`,
`test/phase-10-2-approved-mockup.test.js`,
`test/phase-12-sitewide-profile-entry.test.js`,
`test/sitewide-profile-cohesion.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Absorb Roll navigation into the profile and suppress fast-load interstitials

**Status:** accepted and implemented as a profile-first navigation refinement

The owner roll already lives inside the profile, so a primary Roll tab
duplicated the same product action and weakened the principle that the profile
is the game. Profile requests also replaced the page immediately with a
text-heavy loading panel, producing a distracting flash during ordinary fast
loads.

Remove Roll from desktop and mobile primary navigation. Keep the existing game
route as a compatibility boundary for signed-out guest play, shared challenges,
and old direct links; do not alter roll authority or route parsing. Profile and
account hydration remain non-visual: keep the atmospheric canvas stable, expose
loading state through `aria-busy`, and render content when it is ready. Do not
show account banners, header labels, profile cards, or silhouettes for routine
loading. Error and unavailable-profile states remain explicit because they
require user action.

**Related files**

`src/App.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/Profile.svelte`,
`test/phase-12-sitewide-profile-entry.test.js`,
`test/profile-ritual-refinement.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Preserve transient view state without publishing drafts

**Status:** accepted and implemented

Navigation should not discard work a player has started, but transient UI state
must not become a second source of truth for published profile data or gameplay.

Store bounded, allowlisted drafts and view preferences in a small session-scoped
client layer. Scope profile drafts by profile id and Shop state by account id;
keep Discovery state global to the current tab. Restore on remount, clear a
profile draft after an authoritative save/publish, and clear all transient view
state when local account cache is cleared. Use memory as a fallback when browser
storage is unavailable.

This preserves in-progress editing across navigation and same-tab reloads while
leaving server-authoritative save/publish, authentication, RLS, roll, scoring,
reward, inventory, and published-profile boundaries unchanged.

**Related files**

`src/lib/viewState.js`, `src/lib/ProfileEditor.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/DiscoveryHub.svelte`,
`src/lib/Shop.svelte`, `src/lib/stores.js`, `test/view-state.test.js`.

## 2026-07-29 — Keep the default identity card horizontal and identity-first

**Status:** accepted and implemented

The default profile should read like a compact identity card rather than a
stacked dashboard. Keep the avatar as the visual anchor, place the name and a
small bounded set of earned badges beside it, and place public links beneath
the identity copy. Preserve the existing roll and archive as separate regions
below the card.

Use the existing public `equipped_badges` projection, show no more than three
secondary badges in the opening card, and keep badge labels available through
accessible names and titles. Continue rendering links as validated structured
values; do not add custom markup or a new profile data contract.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileShell.svelte`,
`test/profile-ritual-refinement.test.js`.

## 2026-07-29 — Use a typographic personal-site language across the app

**Status:** accepted and implemented as a visual-system refinement

The previous Google-font and saturated-glass combination made Chromadie read
like a generic generated dashboard. Adopt the reference qualities observed on
catchii.de without copying its content or replacing Chromadie’s identity:
Satoshi body copy, Cabinet Grotesk display type, Geist Mono labels, near-black
canvas, thin rules, quiet capsule controls, restrained surfaces, and subtle
grain/radial light.

Keep the profile’s signature color as the game-specific differentiator. The
visual pass changes typography, surfaces, navigation treatments, homepage
composition, and atmosphere intensity only. It does not add a profile region,
alter profile data, move roll authority, change authentication, or change
database/RLS behavior. Font loading uses swap-safe fallbacks and explicitly
allowlisted font origins in the deployed CSP.

**Related files**

`src/styles/fonts.css`, `src/styles/tokens.css`, `src/styles/site.css`,
`src/lib/HomePage.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileAtmosphere.svelte`, `src/lib/IdentityCard.svelte`,
`test/reference-visual-language.test.js`.

## 2026-07-29 — Move profile disclosures into a dedicated settings surface

**Status:** accepted and implemented

The public profile should remain a small identity, roll, and archive surface.
Owner editing, social/privacy controls, account compatibility controls, and
the optional color story now live at `/profile/settings`. The public story is
off by default and is rendered only after the owner explicitly enables it.
Visitor social controls remain available as a non-collapsible continuation so
moving owner settings does not remove public interaction behavior.

The linked production database is still marked drifted/NO-GO in the Phase 13
baseline, so this change does not add a migration. The existing configuration
slot that is excluded from the approved composition stores the story opt-in as
a compatibility bit; a future approved additive migration can promote that to
an explicit `storyVisible` field without changing the UI contract.

**Related files**

`src/lib/ProfileSettings.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileEditor.svelte`, `src/lib/profileConfig.js`, `src/lib/routes.js`,
`test/phase-10-profile-first.test.js`.

## 2026-07-29 — Reconcile the production Phase 4–8 baseline before Phase 13

**Status:** approved by owner, execution blocked by release gates

The linked Supabase project is behind and drifted relative to the local chain.
The safe reconciliation is the exact five-migration timestamp order documented
in `docs/PHASE_13A_RELEASE_PLAN.md`. Do not stack identity work on the unknown
production state, edit applied migrations, use migration repair, execute a
generated destructive diff, or reset the linked database.

Owner approval authorizes the reviewed release only after read-only preflight,
backup/PITR confirmation, named rollback ownership, and lock/row-count review.
Because the database password, backup/PITR point, rollback owner, and complete
remote counts were unavailable on 2026-07-29, no production write was made.

**Related files**

`docs/PHASE_13A_RELEASE_PLAN.md`,
`docs/PHASE_13A_RECONCILIATION_REPORT.md`,
`docs/ROLLBACK_AND_RECOVERY.md`.

## 2026-07-29 — Credentialed Phase 13A preflight passed, release still held

The owner-side CLI can now connect to the linked database. The migration list
and dry run confirm exactly the five reviewed migrations are pending. The
linked schema diff is informational only: its broad reverse operations reflect
the known remote/local drift and must not be executed. Read-only table stats
confirm 10 profiles, 71 scores, 80 shop items, and 5 meta rows; no application
blocking query was observed.

Do not push until exact counts, backup/PITR restore point, named rollback owner,
and the low-traffic window are recorded.

## 2026-07-29 — Use a temporary Pages secret gate for live rehearsal

Cloudflare Zero Trust Access was not selected because its onboarding requires
billing setup for this account. The temporary Pages middleware is the
no-cost, repository-native alternative: it protects the existing production
domain with an encrypted `PREVIEW_PASSWORD` secret and a signed short-lived
cookie, without placing credentials in source control. It must be deployed
only for the approved rehearsal and removed afterward.

## 2026-07-29 — Complete Phase 13A reconciliation after explicit risk acceptance

The owner accepted that the Supabase Free plan provides no managed backup/PITR
and authorized the live reconciliation behind the temporary Pages gate. The
first push stopped on the remote UUID extension schema mismatch. The failed
unapplied migrations were corrected to call
`extensions.uuid_generate_v4()` explicitly, locally rehearsed, and retried
once. All five migrations are now recorded remotely.

This decision does not authorize identity, avatar, music, or root-routing work
by itself. Phase 13 may resume only after the owner completes the gated browser
smoke checks and the release report is retained with the exact remote results.

## 2026-07-29 — Add the bounded Phase 13 identity contract after reconciliation

**Status:** accepted and implemented; external domain cutover remains pending

After Phase 13A aligned the linked production migration baseline, add the
smallest additive identity contract: nullable display name and bio fields,
Unicode-aware normalization, a server-authoritative `auth.uid()` update RPC,
and explicit bounded public projections. Existing profile rows remain intact
and identity values are not backfilled. Owner editing belongs in the existing
settings surface, while visitor rendering remains visually equivalent to the
owner's published identity.

Canonical profile URLs are root `/<username>` paths. `/u/<username>` remains a
temporary compatibility route, reserved application paths share one definition
across client/server/tests, and legacy origins are normalized through the
shared origin helper. Cloudflare host attachment, redirect rules, Supabase
dashboard settings, and email-template installation are separate operator
steps and are not implied by the repository implementation.

Related files: `supabase/migrations/20260725150000_profile_identity.sql`,
`src/lib/profileIdentity.js`, `src/lib/IdentityEditor.svelte`,
`src/lib/routeContract.js`, `src/lib/siteOrigin.js`,
`docs/CHM_LOL_DOMAIN_CUTOVER.md`.

## 2026-07-30 — Make username reservation exact, authoritative, and grandfather-safe

**Status:** accepted and implemented locally; production release pending

Username routing and username protection are separate contracts. Route
segments protect application endpoints, while a focused reservation table
protects exact normalized usernames by category and release policy. The
database is authoritative through the availability RPC and a profile-write
trigger; browser checks remain convenience feedback and cannot bypass the
policy. Reserved words are never rejected by substring match, so ordinary
creative identities remain available.

The existing confirmed staff account `Admin` is an approved grandfathered
exception. The migration records its profile identity on the `admin` row,
preserving the historical profile and URL while preventing every other
profile from claiming that normalized key. No automatic rename or historical
data deletion is permitted.

The reservation migration is additive and currently local-only. The linked
production project must not receive it until the collision, backup/recovery,
low-traffic, and verification gates are reviewed again. The temporary Pages
gate remains active during certification.

## 2026-07-30 — Keep Phase 14 expression bounded and settings-only

**Status:** accepted and implemented; expression and storage-size migrations
applied to linked project; public gate remains active

Phase 14 uses the existing Supabase stack for the smallest optional expression
surface: two owner-scoped WebP Storage buckets and four nullable profile
configuration columns. Browser image files are resized/cropped and converted
before upload. Stored output is capped at 256 KiB for avatars and 1 MiB for
backgrounds in both the browser processor and Storage buckets. Spotify URLs
are validated by both the client convenience layer and the authenticated
server RPC, which stores only a supported entity type and bounded identifier.

Avatar and background references are exact owner-shaped paths, Storage writes
are restricted to the matching authenticated user path, and profile deletion
removes the owned objects inside the existing deletion boundary. Public
rendering uses the existing identity card and atmosphere, with initials and the
generated daily-color background as fallbacks. Music is a lazy official embed
with no autoplay and no custom player.

All management controls remain in `/profile/settings`; the visitor/owner
profile composition is unchanged. The migration is local-only until a separate
release review authorizes a linked push. No Cloudflare media service, arbitrary
HTML/CSS, OAuth, hosted audio, or additional profile widgets were introduced.

## 2026-07-30 — Separate cosmetic shopping from profile appearance management

**Status:** accepted and implemented

The shop is the catalog and purchase surface. Profile settings is the single
owner surface for previewing and equipping owned cosmetics. The appearance
editor groups cosmetics by the surface they affect—profile, roll, or
leaderboard—and renders the existing profile canvas beside the controls.

This adopts the useful information architecture of mature profile-customization
sites without copying their visual design or introducing unrestricted CSS.
Equip and unequip operations continue through the existing authenticated RPCs;
the public profile composition and visitor rendering are unchanged.

## 2026-07-30 — Make the daily reveal a chromatic lock-in

**Status:** accepted and implemented

The profile roll uses a deterministic presentation sequence after the
server-authoritative result returns: spectrum charge, chroma scan, decelerating
lock, final-color impact, and score settlement. Candidate colors are visual
only and may tint the profile atmosphere; they never affect scoring, rewards,
eligibility, or the canonical result.

The completed result keeps the orb, hex, rarity, and EP in one aligned group.
The strongest scoring conditions remain visible in the collapsed state, while
the complete server-reported record stays behind a quiet score-breakdown
disclosure. Motion intensity scales with rarity and collapses to a static,
immediate result under reduced-motion preferences. The compact disclosure owns
its open state so the live countdown cannot override the reader's choice.

Staff owners may replay that stored presentation from the score breakdown.
Replay is deliberately client-only: it reuses the canonical result already
returned for the account and never calls a roll, reward, history, inventory, or
profile-refresh boundary.

## 2026-07-30 — Give earned result values a restrained warm counterpoint

**Status:** accepted and implemented

Completed daily-color results keep the rolled color as the identity accent for
the label and rarity. Earned EP and per-condition point values use a shared
soft-gold `--color-earned` token so reward text is visually distinct from both
the roll color and neutral descriptive text. The counterpoint is limited to
earned typography; it does not recolor the atmosphere, roll object, surfaces,
or canonical color identity.

## 2026-07-30 — Make score conditions part of the reveal

**Status:** accepted and implemented

The completed score breakdown opens by default so the result explains itself
without an extra interaction. During the final lock phase, the already
server-reported condition list enters progressively before the result settles;
this is presentation-only and does not calculate, reorder, or award any
condition client-side. The native disclosure remains available so players can
collapse the detail after reading it. Reduced-motion users receive the same
conditions immediately with no staged animation.

## 2026-07-30 — Put sharing at the roll result

**Status:** accepted and implemented

Profile sharing belongs beside the canonical result it describes, not in the
global header. The header now stays focused on navigation, account, and owner
editing controls. Completed owners’ rolls expose a styled `Share roll` action
that uses native share when available and copies a bounded text-and-URL
fallback otherwise. The share text is derived from the server-reported result
and leading conditions; it does not create a roll or mutate gameplay state.

## 2026-07-30 — Keep roll sharing in the primary result hierarchy

**Status:** accepted and implemented

The `Share roll` action sits immediately after the visible result conditions
and before the expandable breakdown. This keeps the action attached to the
daily color moment instead of burying it among secondary reward controls.

## 2026-07-30 — Set the chm.lol wordmark in the header type language

**Status:** accepted and implemented

The header wordmark uses Geist Mono, lowercase treatment, and the same compact
letter spacing family as its navigation controls. The logo mark remains the
brand anchor, while `chm.lol` now reads as a quiet navigation label rather than
a separate display-style lockup.

## 2026-07-30 — Keep reveal conditions visible through the scan phase

**Status:** accepted and implemented

Canonical condition metadata is primed as soon as the secure roll response is
received, before the presentation-only spectrum loop completes. This lets the
condition rail animate during the visible scan and lock stages rather than
waiting for the result state. The canonical score, rewards, and final color
still settle only through the existing server-authoritative presentation path.

## 2026-07-30 — Let the shared header span the viewport

**Status:** accepted and implemented

The sitewide application header is a viewport-level shell, not a content
column. Its outer width is now 100% across routes, while the existing
responsive horizontal padding keeps controls readable and touchable. Profile,
roll, discovery, studio, and settings content retain their own intentional
max-widths beneath the header.

## 2026-07-30 — Keep profile atmosphere effects curated

**Status:** accepted and implemented

Profile effects are catalog-backed but rendered from a small code-owned
allowlist (`rain`, `snow`, `fireflies`, and `scanlines`). This preserves safe
structured customization and lets effects live across the full profile canvas
without accepting arbitrary CSS or executable content. Every effect has a
reduced-motion fallback.

## 2026-07-31 — Simplify the sitewide header mark

**Status:** accepted and implemented

The sitewide header now uses only the compact `chm.lol` wordmark instead of a
graphic mark. The die remains available in game, homepage, auth, and favicon
contexts where its literal game signal is useful; the profile-facing header
stays quiet and typographic.

## 2026-07-31 — Make profile claiming the homepage CTA

**Status:** accepted and implemented

Signed-out visitors can enter a bounded username directly in a `chm.lol/`
claim field. Submission opens the existing account flow with that username
pre-filled; availability, moderation, and account creation remain enforced by
the existing authentication and server RPCs.

## 2026-07-31 — Show the product loop on the homepage

**Status:** accepted and implemented

The landing page now demonstrates a fictional Mythic roll using the existing
roll renderer, scoring conditions, and a lightweight discovery/profile cue.
This is presentation-only fixture content: it never calls the roll RPC,
changes eligibility, or implies a visitor has earned the displayed result.

## 2026-07-31 — Use lavender for the `.lol` suffix and name the destination

**Status:** accepted and implemented

The homepage and shared header use a restrained lavender `.lol` suffix instead
of gray, which reads as disabled. The primary nav calls the leaderboard
`Leaderboard` rather than `Discover`; the route and discovery implementation
remain unchanged.

## 2026-07-31 — Make the homepage explain the game before the brand

**Status:** accepted and implemented

The landing hero now names Chromadie as a daily color game and states the
actual loop—one roll, condition-based EP, profile effects, and leaderboard
progression—before the fictional Mythic showcase demonstrates it.

## 2026-07-31 — Anchor the homepage hero independently from the claim form

**Status:** accepted and implemented

The homepage hero is independently top-anchored with a deliberate lower
desktop offset rather than bottom-aligned. This prevents the username claim
helper text from shifting the giant wordmark upward while preserving its
original lower composition. The dot in `.lol` is also dimmed slightly to make
the transition into the lavender suffix easier to read.

## 2026-07-31 — Replace signed-out profile lock with guest onboarding

**Status:** accepted and implemented

The signed-out `/profile` destination now opens the existing local guest roll
inside an onboarding profile surface. The legacy “Profile Locked” card is
removed from this path; the roll’s existing signup prompt explains that an
account is required to save progress, earn account EP, unlock cosmetics, and
enter leaderboard competition.

The guest roll is presented with a profile-mode surface and copy, while the
existing Game component remains the authority for local roll persistence and
guest scoring.

## 2026-07-31 — Guide signed-out visitors through the profile before the roll

**Status:** accepted and implemented

The signed-out profile route now opens a three-step profile-first onboarding:
the visitor sees a representative identity card, learns that rolls unlock
profile expression, and then advances into the existing guest roll. The roll
remains local and server-compatible through `Game`; the onboarding only owns
presentation and progression, and the existing post-roll account CTA remains
the save/compete boundary.

The homepage, `TodayColor`, and integrated `ProfileRoll` now share the same
result hierarchy: hex and rarity identify the color, score and EP are one
lockup, and conditions occupy a distinct rail beneath them.

The onboarding roll uses `ProfileRoll` in a bounded guest fixture mode rather
than mounting the legacy `Game` screen. This preserves the active-profile
presentation while keeping the fictional result local and presentation-only.

The onboarding also forwards `ProfileRoll` lifecycle events into
`ProfileAtmosphere`, so guest previews receive the same rolling flare, ring,
color wash, and settled impact as an active profile.

## 2026-07-31 — Make the homepage preview a composed profile surface

**Status:** accepted and implemented

The fictional homepage example now follows the profile-first product model:
an identity card with handle, bio, links, and rank leads into the daily roll.
The roll is explicitly presented as living inside that profile, followed by
equipped effects and a leaderboard/discovery cue. This makes the product loop
legible without presenting the roll as a disconnected color widget.
## 2026-07-31 — Keep atmosphere selection visible but entitlement-safe

Profile settings now shows the curated animated atmosphere catalog directly,
including locked entries, so owners can discover the rain, snow, fireflies, and
scanline effects without weakening the existing server-authoritative equip
boundary. The preview and controls use a two-column layout on wide screens and
stack on small screens.

## 2026-08-01 — Rebuild profile settings as a focused studio workspace

**Status:** accepted and implemented

The owner-only `/profile/settings` surface now presents one active editor at a
time inside a three-zone workspace: a section rail, the selected editor, and a
sticky live profile preview. Identity, expression, appearance, layout/links,
privacy/social, and account controls remain available through the rail and
mobile horizontal navigation. This reduces repeated module chrome and long
scrolling while keeping each existing editor responsible for its own validation,
draft restoration, save/publish behavior, and server-authoritative RPCs.

The redesign is presentation-only. It does not change profile configuration,
media, social, cosmetics, authentication, RLS, routes, or public-profile
rendering. Section state is hash-addressable for refreshable navigation, and
the reduced-motion contract covers the new navigation and preview transitions.

## 2026-08-01 — Use direct instructional copy in owner settings

Profile settings uses concise, task-oriented labels and descriptions. Copy
should tell the owner what a control changes, avoid aspirational or poetic
language, and preserve vertical space for the configuration itself. Redundant
profile links stay out of the editor body when the shared header already
provides the primary profile action.

The editor also gives primary fields the available width and uses themed media
controls for owner previews. Native browser audio chrome is not part of the
settings visual language when a bounded custom control can provide the same
playback and seeking behavior accessibly.

The settings rail is the sole section context. Do not repeat the selected
section number, title, description, or local utility header above the editor.

## 2026-08-01 — Make layout edits visible in the real draft preview

**Status:** accepted and implemented

The layout and links editor now sends its normalized draft configuration to the
shared right-hand profile preview on every edit. The preview renders the
identity card, signature color, links, style, and a compact ordered section map
from that draft, so visibility and reorder controls have immediate, legible
feedback.

The old abstract module-chip diagram and its separate preview toggle were
removed because they described the configuration without showing the profile it
actually changes. Draft preview state is local to the settings surface; save
and publish still use the existing server RPCs and visitors only receive the
published configuration.

## 2026-08-01 — Keep the daily roll inside the profile language

**Status:** accepted and implemented

The owner preroll is a profile module, not a promotional hero. Its ready state
uses direct copy, a restrained square signal mark, and the existing daily reset
timer. The countdown creates a light reason to act while remaining secondary to
the profile and disappearing as a marketing device once the daily roll is
complete.

The server-authoritative roll flow, reveal animation, result details, and UTC
reset calculation remain unchanged. The visual update removes the decorative
orb, orbit, and oversized glow that made the action feel disconnected from the
rest of the profile surface.

## 2026-08-01 — Separate full-page atmosphere overlays from card backgrounds

Weather effects such as rain, snow, fireflies, and scanlines now use their own
`profile_atmosphere` cosmetic slot. They render through the existing fixed,
viewport-sized `ProfileAtmosphere` layer, so the effect covers the public page
and can coexist with a separate card background.

The migration keeps existing item keys, ownership, and entitlements, backfills
legacy equipped weather effects, and retains a client compatibility fallback.
Only curated effect keys map to code-owned CSS layers; profile data cannot
provide arbitrary HTML, JavaScript, or CSS.

## 2026-08-01 — Use procedural canvas layers for atmosphere effects

The tiled CSS patterns made rain, snow, fireflies, and scanlines visibly
repetitive. Atmosphere effects now use a seeded 2D canvas renderer with shared
resize, density, depth, color, and reduced-motion behavior. The renderer is
also used by owner previews and shop cards, so future effects can be added as
curated drawing recipes without accepting user HTML, JavaScript, or CSS.

## 2026-08-01 — Make the cosmetics shop a visual atelier

The shop and profile editor remain separate surfaces with separate jobs. The
shop is now a discovery and acquisition surface: it presents a large live
profile canvas, a compact featured collection, direct catalog filters, and a
selected-item panel. The profile editor remains the permanent equip surface.

Selecting a cosmetic creates a temporary try-on loadout and never writes
equipped state. Purchasing calls the existing `purchase_item` RPC only; the
shop does not auto-equip the item. Owned cosmetics link back to profile
settings, where the existing `equip_item` and `unequip_item` authority stays
unchanged. The redesign is presentation-only and requires no schema or
entitlement migration.

## 2026-08-01 — Keep app navigation inside the authenticated shell

Same-origin links for app and legal routes are intercepted by the existing SPA
router and resolved with `history.pushState`. This keeps the current Supabase
session and shared shell mounted while the destination view changes, avoiding
the false signed-out state that appeared during a full document reload.

Protected routes render the guest lock only after the account state is known to
be signed out. Profile settings also seeds its editor from the already-loaded
account profile while deeper configuration and social data refresh, so normal
shop/editor navigation does not show an auth lock or a loading interstitial.
Direct refreshes and real profile/account errors retain their existing auth and
retry boundaries.

## 2026-08-01 — Compose additive catalog migrations in drift checks

The catalog drift checker now treats the versioned live snapshot as the base
catalog and composes explicitly listed additive catalog migrations on top of
it. It also parses every `shop_items` insert block in `seed.sql`, so newly
added catalog rows are compared without editing an already-applied snapshot
migration. The atmosphere catalog migration remains the source for the four
weather effect rows that are present in the live catalog.

## 2026-08-01 — Prototype a restrained game-native homepage

The homepage is the isolated proving ground for a less generic visual
language. Keep the approved shared header unchanged, but remove the route-wide
purple/cyan atmosphere from `/` and give the page a flat warm-black canvas.
Use homepage-scoped Spline Sans and IBM Plex Mono so the prototype can test a
geometric game identity without changing profile or application typography.

The opening composition combines a direct product statement, the existing
claim/profile actions, and one static profile-and-roll specimen. The specimen
reuses the production `IdentityCard` so it stays faithful to the public profile
instead of inventing a parallel marketing mockup. A compact daily result sits
below it as secondary status. It remains presentation-only: no sample roll,
score, reward, or countdown becomes client authority.
