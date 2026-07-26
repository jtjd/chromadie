# Chromadie 2.0 Decisions

Use `08_DECISION_LOG_TEMPLATE.md` for new entries.

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
