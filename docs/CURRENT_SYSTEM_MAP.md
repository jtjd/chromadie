# Chromadie 2.0 — Current System Map

**Audit date:** 2026-08-16
**Application:** Svelte 5 + Vite SPA
**Backend:** Supabase Auth/Postgres/RPCs/Edge Functions
**Hosting:** Cloudflare Pages + Pages Functions
**Scope:** Current post-reset runtime and migration seams. Historical phase
records remain in their milestone documents; this map describes the supported
alpha systems rather than the removed cosmetic catalog.

## Runtime shape

`src/main.js` mounts the single `src/App.svelte` component. App owns the browser history bridge, route mode, navigation chrome, document metadata, and top-level component selection; standalone auth presentation is lazy-loaded as a route-owned page. The feature surfaces remain Svelte components in `src/lib/` rather than route files in SvelteKit.

The browser talks directly to Supabase through `src/lib/supabase.js`. Gameplay mutations and account mutations use guarded RPCs or Edge Functions. Public crawlers receive the static shell with route-specific metadata from Cloudflare Pages Functions, then the client loads the interactive state.

## Route map

| URL / input | Client interpretation | Primary owner | Server / metadata behavior | Access notes |
| --- | --- | --- | --- | --- |
| `/` | `view = home` | `App.svelte` → lazy `HomePage.svelte` | `functions/index.js` serves homepage metadata | Public landing page; signed-in users receive an owner-profile CTA |
| `/?view=game` | `view = game` | `App.svelte` → `Game.svelte` | Compatibility shell metadata remains canonicalized to `/` | Guest and authenticated daily roll |
| `/shop` | `view = profile-settings` after one-way alias normalization | `App.svelte` → Profile Studio Customize | Old bookmarks are redirected to `/profile/settings#customize-appearance`; no Shop surface or purchase UI is mounted | Authenticated Profile Studio route; existing auth guard remains authoritative |
| `/leaderboard` or `/?view=leaderboard` | `view = leaderboard` | `Leaderboard.svelte` | `functions/leaderboard.js` serves crawler metadata for `/leaderboard` | Public Today and This month roll rankings |
| `/leaderboard?tab=today|monthly` | Leaderboard period | `Leaderboard.svelte` | Tab is client state; route accepts only the two active values | Anonymous/authenticated public projection |
| `/profile` or `/?view=profile` | Owner profile when authenticated; otherwise guest lock | `ProfileShell.svelte` by default, including owner roll and owner-only profile configuration editor; `Profile.svelte` with `legacy=1` | Client metadata is profile-aware; private owner form is `noindex` when no public username is selected | Public username/id lookups are supported separately |
| `/u/<username>` | `view = profile`, `selectedProfileUsername` | `App.svelte` → `ProfileShell.svelte` | `functions/u/[[username]].js` validates the username, fetches minimal public metadata, sets OG/JSON-LD/noscript, and returns 404 for missing profiles | Public profile surface; only approved fields are used |
| `/u/<username>?legacy=1` or `/profile?legacy=1` | Same profile target with legacy renderer selected | `App.svelte` → `Profile.svelte` | Canonical remains the public profile URL; legacy query responses are `noindex,follow` | Temporary migration fallback for mood, badge, rival, and deletion controls |
| `/prototype/profile` | `view = prototype` | `App.svelte` → `ProfileCanvasPrototype.svelte` | `functions/prototype/profile.js` serves the fixture shell with `noindex,nofollow` metadata | Phase 1 fixture-only design prototype; no auth or backend data |
| `/?view=profile&profile=<uuid>` | Profile by id | `ProfileShell.svelte` by default; `Profile.svelte` with `legacy=1` | Client route only; metadata remains client-managed | Allows a public profile lookup without exposing a private owner query |
| `/c/<id>?from=<username>` | `view = game`, challenge state | `App.svelte` → `Game.svelte` | `functions/c/[[id]].js` and the `challenge-link` Edge Function provide challenge metadata/loading | Challenge lookup is authoritative and expires server-side |
| `/login` | Auth route, sign-in tab | `App.svelte` → lazy `AuthPage.svelte` → `Auth.svelte` | Non-indexable client metadata; optional bounded `next` destination | Public auth page; authenticated visitors redirect safely |
| `/signup` | Auth route, sign-up tab | `App.svelte` → lazy `AuthPage.svelte` → `Auth.svelte` | Non-indexable client metadata; optional bounded `next` and username draft | Public account creation; username remains database-authoritative |
| `/auth/callback` | Auth callback mode | `AuthCallback.svelte` | `functions` shell route is non-indexable | Auth/session handoff |
| `/reset-password` | Password reset mode | `ResetPassword.svelte` | Non-indexable | Authenticated recovery flow |
| `/privacy` | Static document mode | `PrivacyPolicy.svelte` | `functions/privacy.js` supplies metadata and fallback text | Public |
| `/how-to-play` | FAQ/how-to-play mode | `FAQ.svelte` | `functions/how-to-play.js` supplies metadata and fallback text | Public |
| Any other path | `not-found` | App 404 state | Noindex client metadata | No data load |

`src/lib/routes.js` now contains the pure parser used by App and tested independently. App still owns challenge loading, history mutation, and side effects. `syncRoute()` can also emit the public `/u/<username>` form after an in-app profile navigation. Auth route presentation is lazy-loaded through `AuthPage.svelte`; the shared `Auth.svelte` form remains the single authentication implementation.

## Component ownership map

| Component / module | Owns | Calls into / depends on |
| --- | --- | --- |
| `src/main.js` | SPA mount | `App.svelte` |
| `src/App.svelte` | Route mode, history, navigation, document title/description/canonical/robots/OG/Twitter metadata, keyboard skip target and route-content focus, mobile menu, global header/footer, challenge loading, lazy auth-route selection | Stores, Supabase, `loadChallengeLink`, cosmetics/ranks/a11y, all major surfaces |
| `src/lib/AuthPage.svelte` | Standalone login/signup shell, auth-route value proposition, focus, safe authenticated redirect, responsive/reduced-motion presentation | `Auth.svelte`, auth stores, bounded auth URL helpers, canonical profile route contract |
| `src/lib/Game.svelte` | Guest daily-roll persistence, authenticated daily-roll restoration, readiness, roll animation, canonical result presentation, reroll lock, share text/image, percentile display | `rollService.js`, `roll_die`, `get_my_daily_roll`, `get_score_percentile`, stores, `rollState.js`, `rollPresentation.js`, challenge creation |
| `src/lib/ProfileShell.svelte` | Live profile-shell rendering, identity hero, owner/visitor presentation, public stats/history/badges/cosmetics, loading/error/empty states, rival CTA, legacy controls CTA, owner roll placement and refresh boundary, configured module/link rendering, timeline/collection composition, social module placement and refresh boundary | `profileData.js`, `ProfileRoll.svelte`, `ProfileTimeline.svelte`, `ProfileCollection.svelte`, `ProfileSocial.svelte`, `profileConfig.js`, `profileStory.js`, `profileSocial.js`, foundation components, public profile/social RPCs, profile configuration RPCs, cosmetics/ranks/badge registries, stores |
| `src/lib/ProfileRoll.svelte` | Authenticated owner restoration, daily-roll readiness, canonical roll presentation, server-reported conditions/rewards, no-navigation profile refresh, reroll UX guard | `rollService.js`, `get_my_daily_roll`, `get_score_percentile`, `roll_die`, `rollState.js`, stores, `RollPreview.svelte` |
| `src/lib/ProfileSettings.svelte` / `src/lib/ProfileStudioWorkspace.svelte` | Authenticated Profile Studio route adapter, one staged configuration/identity/cosmetic preview authority, dirty-state aggregation, validation, and explicit publish/reset actions | `profile-studio/draftModel.js`, `ProfileCustomizePage.svelte`, current section editors, `save_profile_configuration_v2`, `publish_profile_studio_v2`; no raw HTML/CSS or client authority |
| `src/lib/ProfileCustomizePage.svelte` | Active Customize composition for identity, appearance, media, expression, links, aliases, and the canonical Compact/Immersive/Framed layout editor | `IdentityEditor.svelte`, `ProfileAppearanceEditor.svelte`, `ProfileMediaWorkspace.svelte`, `ProfileCosmeticsEditor.svelte`, `ProfileLinksEditor.svelte`, `ProfileReferenceLayoutEditor.svelte`, shared draft patches |
| `src/lib/ProfileLinksEditor.svelte` | Structured HTTPS links, link style, and bounded share metadata editor with local validation and staged preview events | `profileConfig.js`, `profileLinkTypes.js`, `ProfileSettings.svelte`; no raw markup or direct persistence |
| `src/lib/ProfileTimeline.svelte` | Bounded public profile-created/roll event timeline with color, identity, rarity, date, and condition context | `profileStory.js`-normalized events; presentation only, no private achievement progress |
| `src/lib/ProfileCollection.svelte` | Lifetime condition collection showcase with safe metadata, rarity, discovery count, and first-seen date | `profileStory.js`-normalized public collection summary; presentation only |
| `src/lib/ProfileSocial.svelte` | Owner/visitor social controls: favorites, positive reactions, moderated guestbook, block/report actions, owner privacy settings, safe text rendering, mobile/focus/reduced-motion states | `profileSocial.js`, `supabase.js`, social RPCs; no direct social-table access, scoring, ranking, notification, or private-message path |
| `src/lib/Profile.svelte` | Temporary legacy owner/visitor renderer and controls: mood editing, pinned badges, rivals, deletion, plus legacy profile presentation | `profileData.js`, `get_my_profile`, public `profiles` read, `get_public_profile_scores`, achievement tables, profile metadata/badge RPCs, stores |
| `src/lib/Leaderboard.svelte` | Focused public roll leaderboard: Today and This month tabs, a featured top-three podium, framed lower-ranked rows, bounded pagination, and loading/error/empty states | `get_public_discovery`, `LeaderboardEntry.svelte`, route allow-list |
| `src/lib/LeaderboardEntry.svelte` | Public profile entry with podium and list variants, rank, avatar, username, score, and short roll details | `discoveryData.js`, profile media safety, `Leaderboard.svelte` |
| `src/lib/ProfileCustomizePage.svelte` / `src/lib/ProfileCosmeticsEditor.svelte` | Appearance, media, layout, and profile-expression controls; live preview state; equip/unequip actions | Profile Studio draft/publish state, validated cosmetic catalog, `equip_item`/`unequip_item`, shared leaf renderers |
| `src/lib/Auth.svelte` | Login/signup/password reset form, Turnstile, username moderation/availability checks | Supabase Auth, `is_username_allowed`, `is_username_available` |
| `src/lib/AuthCallback.svelte` | OAuth/email callback completion and redirect behavior | Supabase Auth/session utilities |
| `src/lib/ResetPassword.svelte` | Password update form and recovery session handling | Supabase Auth |
| `src/lib/AnalyticsPreferences.svelte` | Opt-in/opt-out control for the bounded product-event contract | `productAnalytics.js`; no network or database sink |
| `src/lib/GuestLock.svelte` | Explains account-required surfaces while preserving guest roll state | App auth state and login callback |
| `src/lib/ProfileAchievementCard.svelte` | Achievement presentation and owner progress display | Profile-provided achievement definitions/progress |
| `src/lib/ProfileCanvasPrototype.svelte` | Isolated Phase 1 responsive profile composition using fixture data | Foundation components and `profileFixture.js`; no stores, auth, or Supabase |
| `src/lib/foundation/Surface.svelte` | Token-based glass/panel surface primitive | `tokens.css` |
| `src/lib/foundation/Button.svelte` | Accessible link/button primitive with variants and focus states | `tokens.css`, motion tokens |
| `src/lib/foundation/Media.svelte` | Bounded aspect-ratio media wrapper, same-origin/HTTPS source normalization, async loading, load-error fallback, and stable layout box | `mediaSafety.js`, structured `src`/`alt`, and allow-listed aspect values |
| `src/lib/foundation/Module.svelte` | Responsive profile module frame with size/tone variants | `tokens.css`, profile canvas grid |
| `src/lib/RollPreview.svelte`, `ShopItemPreview.svelte`, `ProfileStudioPreview.svelte` | Reusable roll/cosmetic previews; Studio renders the bounded reference card from the canonical snapshot | Cosmetics safety, catalog state, and Profile Studio preview state |
| `src/lib/stores.js` | Auth/account hydration, profile/inventory/wallet/entitlement/reroll/badge/follow state, validated cosmetic-catalog cache, toasts | Supabase Auth, RPCs, public account tables, cosmetic safety |
| `src/lib/routes.js` | Pure browser route parsing | `App.svelte`; no network or navigation side effects |
| `src/lib/profileContract.js` | Allow-listed profile/score field mapping and owner predicates | `Profile.svelte`; no network side effects |
| `src/lib/profileData.js` | Shared request/ownership branch and mapped profile context for shell and legacy renderer, including owner draft/public published configuration projections | Supabase client, `profileContract.js`, `profileConfig.js`; no client authority over profile or publish state |
| `src/lib/rollState.js` | Roll account mode/readiness guards and bounded canonical result normalization | `Game.svelte`, `ProfileRoll.svelte`, `rollPresentation.js`; no network side effects |
| `src/lib/rollPresentation.js` | Shared authoritative badge selection and percentile display labels | `Game.svelte`, `ProfileRoll.svelte`; no scoring or reward authority |
| `src/lib/rollService.js` | Shared `roll_die` request wrapper and short-lived browser reroll lock | `Game.svelte`, `ProfileRoll.svelte`; server remains the eligibility/economy authority |
| `src/lib/profileFixture.js` | Immutable public-safe fixture model for the Phase 1 canvas | Prototype only; never used as canonical account state |
| `src/lib/profileConfig.js` | Version-1 configuration constants, safe defaults, canonical layout normalization, render normalization, visible module/link projections | `ProfileShell.svelte`, `ProfileStudioWorkspace.svelte`, Customize editors; server RPC remains the write/publish authority |
| `src/lib/profileStory.js` | Public story/collection normalizers and progressive story unlock thresholds based on server-owned roll totals | `profileData.js`, `ProfileShell.svelte`, `ProfileTimeline.svelte`, `ProfileCollection.svelte`; no scoring or grant authority |
| `src/lib/profileSocial.js` | Bounded social/reaction/settings normalizers and RPC invocation seam | `profileData.js`, `ProfileSocial.svelte`; rejects malformed public entries and keeps social writes server-authoritative |
| `src/lib/cursor-trail/CursorTrailLayer.svelte` | One bounded profile-scoped pointer-trail layer with reduced-motion, touch, visibility, and intersection guards | `ProfileShell.svelte`, `ProfileStudioPreview.svelte`, and shared cosmetic previews; decorative only |
| `src/lib/avatar-effect/AvatarEffect.svelte`, `AvatarParticles.svelte`, `public/avatar-effects/` | Shared avatar-local decoration wrapper; three authored raster plates plus one bounded texture-atlas compositor | Profile cards, discovery/leaderboard cards, and Customize previews; decorative only, selected/full-profile surfaces animate |
| `src/lib/profile-layout/profileLayouts.js` | Finite Compact/Immersive/Framed layout registry and resolution | `ProfileShell.svelte`, `ProfileStudioPreview.svelte`, and `ProfileReferenceLayoutEditor.svelte`; profile data and save authority remain unchanged |
| `src/lib/cosmetics.js` | Retained title display helpers; renderer-backed Name and Border registries own cosmetic interpretation | Live validated cosmetic catalog store, component renderers, and Studio expression controls |
| `src/lib/badgeData.js` / `balanceConfig.js` / `ranks.js` | Client display registries and thresholds | Profile, Game, Leaderboard, and bounded previews; server remains authoritative for grants/scoring |
| `src/lib/mediaSafety.js` | Safe media-source normalization for local and HTTPS assets | `Media.svelte`; rejects protocol-relative, HTTP, data, blob, JavaScript, control-character, and oversized sources |
| `src/lib/productAnalytics.js` | Consent state, event/property allow-list, redaction, bounded local adapter seam | `AnalyticsPreferences.svelte`, `main.js`, and existing flow call sites; no scoring, account, social, or network authority |

The largest ownership risk is concentration: `App.svelte`, `Game.svelte`, and
`Profile.svelte` still combine data loading, state transitions, rendering, and
interaction handling. Profile expression controls remain inside the bounded
Profile Studio surface rather than forming a second catalog application.

## Store and state map

| State | Source / owner | Meaning and important guards |
| --- | --- | --- |
| `session`, `authUser`, `isGuest`, `authInitialized`, `authEvent` | `stores.js` + Supabase Auth listener | Auth session lifecycle; the listener stays synchronous and defers account hydration to avoid Auth lock deadlocks |
| `profile`, `profileReady`, `profileLoading`, `profileLoadFailed`, `accountState`, `isAuthenticated` | `stores.js` | Authenticated account is usable only when hydrated profile id matches session user id |
| `guestProgressActive` | `stores.js` + Game | Indicates locally persisted guest progress; does not become an authenticated identity |
| `cosmeticCatalogItems`, `cosmeticCatalogLoading`, `cosmeticCatalogError` | `stores.js` | Versioned live catalog with validated 24-hour local cache; active profile-expression rows are exposed to Customize without client acquisition gates |
| `userInventory`, `equippedItems`, `walletBalance` | `stores.js` | Hydrated account inventory/equipped cosmetics/EP balance; refreshes after expression actions and rolls |
| `profileEntitlements` | `stores.js` + `get_my_profile_entitlements()` | Owner-only allow-listed entitlement keys; cleared on sign-out/session change; never public profile data or client purchase authority |
| `rerollShards`, `equippedBadges`, `followedUsers` | `stores.js` | Account progression and social state; loaded only for the current authenticated user |
| `selectedUserId` | `stores.js` + App | Query-string profile target; cleared on public username routes, challenges, and non-profile navigation |
| `toasts` | `stores.js` | Ephemeral global feedback |
| App locals (`view`, `routeMode`, `leaderboardTab`, `challengeData`, modal/menu state) | `App.svelte` | Route and shell state; route parser is pure, side effects remain in App |
| Profile locals (`targetProfile`, `targetScores`, timeline/collection story, achievements, `profileConfig`, `social`, `socialSettings`, `isOwnProfile`) | `profileData.js` consumed by `ProfileShell.svelte` and `Profile.svelte` | Request-keyed owner/visitor data; story and social are bounded public projections, owner receives draft plus published config and private social settings, visitors receive published-only config/social state; stale responses are ignored by each renderer's `loadRequestId` |
| Profile Studio preview state (`studioDraft`, `studioIdentityDraft`, `cosmeticPreviewLoadout`) | `ProfileSettings.svelte` → `createProfileStudioPreviewModel()` → `ProfileStudioPreview.svelte` | Owner-only in-memory staged preview; it survives editor remounts, is discarded on reload or after publish, and is never treated as public state |
| Game locals (`phase`, `loading`, `rollRequestId`, `initialStateKey`, presentation fields) | `Game.svelte` | Root daily-roll state; guest local persistence remains here, stale auth/roll responses are ignored, reroll requests are locally locked and server-checked |
| Profile roll locals (`phase`, `loading`, `rollRequestId`, canonical presentation, reward/condition display) | `ProfileRoll.svelte` | Authenticated owner profile roll state; no guest persistence, client scoring, eligibility, or reward calculation; stale session/roll responses are ignored |
| Customize expression locals (`previewLoadout`, selected slot, loading action) | `ProfileCosmeticsEditor.svelte` | Preview state remains separate from equipped account state until the existing equip/unequip RPC succeeds; the catalog is not a purchase surface |
| Leaderboard locals (`activeTab`, public profile items, page, `hasMore`, request id) | `Leaderboard.svelte` | Today and monthly public discovery reads are request-keyed and bounded; the UI has no client-side filters or owner/rival state |
| Social locals (`actionLoading`, guestbook/report forms, settings draft, notice) | `ProfileSocial.svelte` | Presentation/request state only; the database enforces authentication, blocks, privacy, text bounds, moderation status, deletion, and rate limits |
| `productAnalyticsConsent` and product-event adapter | `productAnalytics.js` + privacy page | Explicit browser-local `granted`/`denied` preference and page-local `CustomEvent` adapter; unknown/denied consent emits nothing, and no event record is persisted |

Authentication hydration loads the own profile, inventory, wallet, follows, and the owner entitlement projection in one guarded sequence. The cosmetic catalog is loaded by Customize when needed. `authEventId` prevents a previous session's asynchronous result from overwriting a newer session or sign-out. Entitlements are keys only; the browser cannot grant, purchase, or write them.

The launch-hardening slice adds no new canonical account state. `App.svelte`
keeps route focus in the browser only; `Media.svelte` keeps source failure and
fallback state local to the component; the performance budget reads built
assets from `dist/` and never affects runtime profile state. The product-event
contract is likewise observational: it is opt-in, redacted, page-local, and
not a Supabase/API write.

## Client-to-RPC/API map

### Auth and account hydration

| Client caller | Supabase surface | Purpose |
| --- | --- | --- |
| `Auth.svelte` | Supabase Auth sign-up/sign-in/reset/update methods | Account lifecycle |
| `Auth.svelte` | `is_username_allowed`, `is_username_available` | Server-side username moderation and uniqueness checks |
| `stores.js` | `get_my_profile()` | Owner profile projection and recovery-safe hydration |
| `stores.js` | `get_wallet_balance()` | Current wallet balance |
| `stores.js` | `inventory` public-row query filtered by current user | Owned item quantities |
| `stores.js` | `user_follows` query filtered by current user | Followed/rival ids |
| `stores.js` | `meta.shop_version`, `shop_items` | Versioned catalog fetch and cache invalidation |

The active username shape is 1–20 ASCII letters, digits, or underscores.
Client checks provide immediate feedback, while the profile trigger,
case-insensitive `username_key` index, moderation function, reservation table,
and signup advisory lock remain authoritative. The short application paths
`c`, `og`, and `u` are hard-reserved.

### Roll and challenge flow

| Client caller | Surface | Purpose |
| --- | --- | --- |
| `Game.svelte` / `ProfileRoll.svelte` | `get_my_daily_roll()` | Authenticated restoration of today's authoritative roll; guest restoration remains local to `Game.svelte` |
| `Game.svelte` / `ProfileRoll.svelte` | `get_score_percentile(p_score)` | Percentile for restored/result presentation |
| `Game.svelte` / `ProfileRoll.svelte` via `rollService.js` | `roll_die(p_is_reroll)` | Authoritative daily roll/reroll transaction and canonical result |
| `ProfileRoll.svelte` | `refreshProfileState`, `fetchInventoryState`, `fetchWalletBalance` | Guarded owner-state refresh after a successful canonical result; no navigation is required |
| `Game.svelte` | `challenge-link` Edge Function (`create`/`get`) | Create a challenge from the authoritative result or load an expiring challenge |
| `Profile.svelte` | `delete-account` Edge Function | Confirmed account cleanup and Auth deletion |

### Profile, achievement, and social reads/writes

| Client caller | Surface | Purpose / privacy boundary |
| --- | --- | --- |
| `profileData.js` via `ProfileShell.svelte` / `Profile.svelte` | `profiles` read with an explicit public column list | Visitor profile projection; owner path uses `get_my_profile` |
| `profileData.js` via `ProfileShell.svelte` / `Profile.svelte` | `get_public_profile_scores(p_user_id)` | Anonymous/authenticated bounded recent 30-day score projection |
| `profileData.js` via `ProfileShell.svelte` / `Profile.svelte` | `achievements` read | Public achievement definitions |
| `profileData.js` via `Profile.svelte` | `user_achievements` read filtered by the target owner id | Only loaded for the owner path; the new shell does not render private progress |
| `Profile.svelte` | `equip_badges`, `update_profile_meta` | Owner-only pinned badges and mood color mutations |
| `profileData.js` / `ProfileSettings.svelte` | `get_my_profile_configuration_v2()`, `save_profile_configuration_v2(jsonb)`, `publish_profile_studio_v2(...)` | Authenticated owner default/draft/publish lifecycle; server validates the versioned structured config and keeps the draft private |
| `profileData.js` / `ProfileShell.svelte` | `get_public_profile_configuration(uuid)` | Anonymous/authenticated published-only profile configuration projection; no draft or direct table access |
| `profileData.js` / `ProfileShell.svelte` | `get_public_profile_story(uuid)` | Anonymous/authenticated bounded public timeline and lifetime condition collection projection; no private achievement table access |
| `profileData.js` / `ProfileShell.svelte` | `get_public_profile_social(uuid)` | Anonymous/authenticated bounded favorites, reaction counts, viewer-safe reaction state, guestbook entries, and interaction/privacy flags; no reporter, moderation, email, or user-id fields |
| `profileData.js` / `ProfileShell.svelte` | `get_my_profile_social_settings()` | Owner-only interaction, guestbook, activity, and discovery settings projection |
| `ProfileSocial.svelte` | `toggle_profile_favorite(uuid)` | Authenticated favorite/save toggle with owner interaction checks, block checks, and rate limits |
| `ProfileSocial.svelte` | `toggle_profile_reaction(uuid,text)` | Authenticated allow-listed positive reaction toggle; no score, rank, EP, reward, or notification effect |
| `ProfileSocial.svelte` | `create_profile_guestbook_entry(uuid,text)`, `delete_profile_guestbook_entry(uuid)` | Authenticated bounded plain-text guestbook write and author/profile-owner deletion; URLs and direct table writes are rejected |
| `ProfileSocial.svelte` | `toggle_profile_block(uuid)` | Authenticated block/unblock mutation; blocks remove reciprocal follows/favorites/reactions and suppress social projections |
| `ProfileSocial.svelte` | `report_profile_social_content(uuid,uuid,text,text)` | Authenticated profile or guestbook report; moderation details remain in the protected report table |
| `ProfileSocial.svelte` | `update_my_profile_social_settings(boolean,boolean,boolean,boolean)` | Owner-only save for interaction, guestbook, activity, and discovery controls |
| `Profile.svelte` | `toggle_follow(p_target_id)` | Authenticated rival/follow mutation |
| `Profile.svelte` | `leaderboard_view` read for followed users | Owner rival cards; public fields only |

### Leaderboards and profile expression catalog

| Client caller | Surface | Purpose |
| --- | --- | --- |
| `Leaderboard.svelte` | `get_public_discovery(text,text,text,integer,integer)` | Anonymous/authenticated bounded projection for the Today and monthly best-roll surfaces; returns usernames and approved public profile fields, never `user_id` |
| No active browser surface | `purchase_item(p_item_key)` | Retained server-authoritative purchase/economy contract for a future acquisition surface; no Shop UI calls it |
| `ProfileCosmeticsEditor.svelte` | `equip_item(p_item_key)` | Server-authoritative cosmetic equip from the Customize expression controls |
| `ProfileCosmeticsEditor.svelte` | `unequip_item(p_slot)` | Server-authoritative cosmetic removal from the Customize expression controls |
| `stores.js` / profile settings | `get_my_profile_entitlements()` | Owner-only projection retained for future premium/progression boundaries; no direct table read |
| `ProfileCosmeticsEditor.svelte` | `refreshProfileState()` | Refresh after successful expression equip/unequip |

Premium expression grants use `grant_profile_entitlement(uuid,text,text)`, a service-role-only SECURITY DEFINER RPC. No browser caller uses this grant path, and `purchase_item` rejects premium rows before EP purchase logic. `equip_item` checks the entitlement inside the transaction; inventory remains the authority for earned items and free baseline items remain available without purchase.

### Product measurement and operations surfaces

| Client / operator surface | Boundary | Current behavior |
| --- | --- | --- |
| `App.svelte`, `ProfileShell.svelte`, `Game.svelte`, `ProfileRoll.svelte`, `ProfileCosmeticsEditor.svelte` | `trackProductEvent()` | Emits only the allowlisted, redacted product-event contract after explicit consent; events do not affect product state |
| `AnalyticsPreferences.svelte` / `PrivacyPolicy.svelte` | `localStorage['chromadie-product-analytics-consent']` | Browser-local opt-in/opt-out; no event history is stored |
| `main.js` | `createBrowserProductAnalyticsAdapter()` | Dispatches `chromadie:product-event` in the page only; no fetch, beacon, Supabase insert, or third-party product sink |
| Authorized operations tooling | Protected social tables/RPCs | Current social reports and guestbook states are stored behind RLS/service-role access; there is no moderation dashboard, queue, notification, or appeal workflow |

The event field contract is documented in `docs/ANALYTICS_CONTRACT.md`. The
social report, containment, and release boundary is documented in
`docs/MODERATION_OPERATIONS.md`.

The browser does not directly select from `scores`, `user_roll_best_candidates`, or other authoritative gameplay tables under the latest security migration. Public leaderboard views are intentionally bounded projection views with approved fields; the four owner-privilege views and their `security_barrier` setting are documented in `supabase/SECURITY.md`.

## Public-profile data flow

```text
browser /u/<username>
        │
        ├─ Cloudflare Pages Function: validate username, fetch minimal metadata,
        │  set title/OG/JSON-LD/noscript, then serve the Vite shell
        │
        └─ App parseRouteLocation()
              │
              └─ ProfileShell(profileUsername) [or Profile(..., legacy=1)]
                    │
                    ├─ validate username format
                    ├─ owner predicate: authenticated session + self id/name
                    │     ├─ owner: get_my_profile()
                    │     └─ visitor: public profiles select (allow-listed fields)
                    ├─ get_public_profile_scores(user id), bounded to recent history
                    ├─ achievements definitions for both paths
                    ├─ own user_achievements only for owner path
                    ├─ owner: get_my_profile_configuration() → draft + published config
                    ├─ visitor: get_public_profile_configuration(user id) → published config only
                    ├─ get_public_profile_story(user id) → bounded public events + lifetime condition collection
                    ├─ get_public_profile_social(user id) → bounded social projection
                    │     └─ owner: get_my_profile_social_settings() → private controls
                    ├─ owner: ProfileRoll restores/rolls today's server result,
                    │        refreshes profile state, and stays on the shell
                    └─ shell renders identity, rank, best roll, mood, cosmetics,
                       recent colors, pinned achievements, configured modules/links,
                       social signals, guestbook, safety controls, and owner/visitor CTA;
                       legacy renderer retains owner controls and private progress
```

`profileContract.js` centralizes the field allow-list and the owner predicates used by the live component. Public records cannot add private fields to the render model accidentally, and score records retain only the fields consumed by profile history/presentation. The route accepts a username or an id, but the public data boundary remains server-side.

## Leaderboard data flow

```text
browser /leaderboard?tab=<today|monthly>
        │
        ├─ App parses the Today or This month tab without changing the canonical /leaderboard URL
        │
        └─ Leaderboard
              ├─ public surfaces → get_public_discovery(surface, null, null, page, limit)
              │       └─ SECURITY DEFINER projection reads existing profiles/scores/views
              │           and returns bounded public score JSON without internal ids
              ├─ LeaderboardEntry renders rank, profile identity, score, and short roll details
              ├─ profile CTA → App history bridge → /u/<username> → ProfileShell
              └─ load more → next bounded public projection page
```

The discovery RPC caps pages at 20 and responses at 12 rows; the client displays
the bounded normalized rows and exposes “load more” rather than an unbounded
feed. Today uses the current daily score rows; monthly uses each player’s best
score in the current month.

## Social data flow

```text
profile target resolved by ProfileShell
        │
        ├─ get_public_profile_social(target id)
        │     ├─ public counts + viewer-specific favorite/reaction state
        │     ├─ at most 20 visible guestbook notes
        │     └─ block/privacy filtering; no user ids or moderation details
        │
        └─ ProfileSocial
              ├─ authenticated writes → SECURITY DEFINER social RPCs
              │     ├─ favorite / positive reaction
              │     ├─ bounded guestbook create/delete
              │     ├─ block/unblock and report
              │     └─ owner privacy settings
              └─ successful mutation → ProfileShell request-keyed reload
```

The social tables are RLS-enabled and have no `anon` or `authenticated` table
privileges. RPCs enforce authentication, interaction settings, reciprocal block
checks, fixed text/reaction allow-lists, per-action rate limits, report status,
and account-deletion cascades. Guestbook bodies are rendered through normal
Svelte text interpolation, with links rejected at the database boundary.

## Roll transaction flow

1. `authInitialized` gates the roll. The account mode is either authenticated (`session.user.id`) or guest; an absent session is never treated as an authenticated account.
2. `Game.svelte` restores state once per account key. Authenticated restoration uses `get_my_daily_roll`; guest restoration validates `localStorage['chromadie-roll']` for the current UTC date. The authenticated owner profile uses the same restore RPC through `ProfileRoll.svelte`.
3. The primary authenticated profile flow and the root game flow call `roll_die({ p_is_reroll })` through `rollService.js`. The database wrapper/implementation owns eligibility, row locking, UTC daily identity, reroll shard consumption, score calculation, rewards, achievements, best-roll updates, and stored presentation.
4. `calculate_roll_v2` and the final migration persist the authoritative `condition_ids`, `contributors`, `traits`, and `identity` alongside the score. Rerolls retain the server's transaction semantics and do not increment the normal daily total in the same way as a first roll.
5. The client animates only the already returned result. `rollState.js` normalizes server aliases/bounds and uses the authoritative badge ids; it does not calculate score, rarity, rewards, or eligibility.
6. After presentation, guest data is saved locally in `Game.svelte`. Authenticated data triggers guarded profile, inventory, and wallet refreshes; `ProfileRoll.svelte` then dispatches a local completion event so `ProfileShell.svelte` reloads the current profile projection without navigation. Stale responses are discarded if the session/roll request changed.
7. The browser's ten-second reroll lock is a duplicate-click guard. The RPC remains the security/economy authority.
8. If product-event consent is granted, the existing surfaces may emit a redacted `roll_ready` or `roll_completed` observation. The event adapter has no influence on the transaction and currently keeps the observation in the page only.

## Cosmetic, achievement, and profile-expression data sources

| Domain | Current source | Consumer / hazard |
| --- | --- | --- |
| Profile expression catalog | `public.shop_items` plus `meta.shop_version`; local cache; `supabase/seed.sql` and additive catalog migrations | `stores.js` validates the server-owned catalog; `ProfileCosmeticsEditor.svelte` exposes active Name, Border, Cursor, Avatar, Compact/Immersive Layout, Profile Motion, and Profile Atmosphere rows without acquisition UI |
| Premium expression entitlements | `public.profile_entitlements`, written only by service-role grant code and read through `get_my_profile_entitlements()` | RLS is enabled, browser roles have no table privileges, and `equip_item` rechecks the matching catalog entitlement server-side; no payment provider or client grant path exists in Phase 8 |
| Cosmetic rendering | Modern Name rows resolve through `src/lib/name/`; nine Profile Border rows resolve through `src/lib/profile-border/`; Cursor Trails, Avatar Effects, Compact/Immersive/Framed layouts, and Profile Motion resolve through finite registries/renderers; titles and utility use bounded text | Catalog values select finite code-owned renderers; no catalog CSS, HTML, JavaScript, URLs, or arbitrary effects are accepted |
| Badges and achievement labels | `src/lib/badgeData.js` for client labels/icons/points; database seeded definitions and SQL achievement checks | Display metadata can drift from server ids; `check:balance-drift` and tests protect the registry/seed relationship |
| Scoring and roll conditions | Authoritative SQL `calculate_roll_v2`/`roll_die_impl`; `src/lib/scoringCandidate.js` mirrors deterministic parity for checks | Never move scoring or grant decisions to client code; `check:scoring-parity` requires local PostgreSQL |
| Ranks | `src/lib/ranks.js` and `src/lib/balanceConfig.js` for display thresholds | Must remain aligned with product/economy docs; rank is display state, not an authority for grants |
| Profile cosmetics | `profiles.equipped_cosmetics`, read via owner/public projections and refreshed after equip | Public render uses structured configured slots; private account data is not needed for visitor rendering |
| Pinned badges | `profiles.equipped_badges` plus public profile projection; owner mutation through `equip_badges` | Badge ids must remain validated and non-pinnable system exceptions preserved |
| Profile configuration | `profile_configurations.draft_config` and `.published_config` through owner/public RPCs; `src/lib/profileConfig.js` mirrors the safe render contract | The active layout contract is `compact`, `full-bleed`, or `framed`; the normalized envelope retains bounded modules, typed HTTPS links, and structured V2 content. Raw markup, CSS, arbitrary URLs, and hidden drafts are rejected or omitted |
| Profile story events | `profile_events` records public-safe profile-created and canonical score events through database triggers; `get_public_profile_story` exposes at most 40 timeline events | Trigger payloads are observational and idempotent; browser roles have no table grants. Account deletion cascades events with the profile |
| Condition collection | Lifetime `scores.condition_ids` grouped server-side by `get_public_profile_story`, enriched with public achievement labels where available | Collection counts are public roll-derived presentation, bounded to 30 conditions, and never sourced from private `user_achievements` progress |
| Social graph and signals | `profile_favorites`, `profile_reactions`, and existing `user_follows`; public counts/state come only from `get_public_profile_social` | Favorites/reactions do not affect scoring, rank, EP, rewards, achievements, or notifications; new follow writes pass the same block/interaction boundary |
| Guestbook and moderation | `profile_guestbook_entries`, `profile_reports`, `profile_blocks`, and `profile_social_rate_limits`; service/moderation roles retain protected table access | Guestbook entries are visible/hidden/removed rows, plain-text and bounded; report details/status are never in public projections; all account-owned rows cascade on profile deletion |
| Social privacy | `profile_social_settings` with interaction, guestbook, activity, and discovery controls | Missing rows resolve to safe public defaults; owner settings are RPC-only; activity privacy gates score/story projections and discovery privacy gates the existing bounded discovery RPC while direct profile links remain valid |

## Deployment and metadata flow

1. Vite builds the browser SPA into `dist/` with `npm run build`.
2. Cloudflare Pages serves the static assets. `public/_redirects` sends unmatched browser paths to `/index.html` for direct refresh; `public/_headers` supplies static security headers/CSP and immutable caching for hashed `/assets/*` files plus short-lived caching for stable brand assets.
3. Pages Functions provide route-aware HTML metadata: root, leaderboard, privacy, how-to-play, username profiles, challenges, OG profile/challenge SVGs, and paged profile sitemap output.
4. `_publicPage.js` rewrites the shell's title, description, robots, canonical, Open Graph/Twitter tags, and safe noscript/JSON-LD where needed. It hashes inline scripts for CSP rather than enabling unrestricted inline JavaScript and accepts an explicit cache policy per public route.
5. `App.svelte` repeats the metadata update after client hydration so in-app navigation keeps document metadata synchronized. This intentional duplication is a migration hazard.
6. `public/robots.txt`, sitemap index/core files, `site.webmanifest`, icons, and `llms.txt` complete the public acquisition/metadata surface.
7. Supabase migrations/seed and Edge Functions deploy separately from the Pages bundle. Production follows Cloudflare Pages from GitHub `main`. The 2026-08-08 linked-project audit found local and remote migrations aligned through `20260808120000_short_usernames.sql`, with the short-username migration applied before the standalone auth route release. External Pages/domain/Auth/email/browser/performance gates remain independent launch blockers.

The Phase 4 configuration is intentionally not part of the crawler metadata contract. `/u/<username>` metadata remains username/profile-projection based; the browser fetches one bounded published configuration RPC after hydration. Adding configuration to OG/JSON-LD or the sitemap would couple structured profile editing to the Pages Function metadata path and is deferred.

Phase 5 story data follows the same rule: the Pages Function metadata contract remains unchanged, while the interactive client fetches one bounded public story RPC after profile hydration. Timeline and collection content do not expose private achievement progress or alter crawler indexing.

Phase 6 keeps `/leaderboard` as the canonical acquisition URL but changes its
metadata description to discovery language. The interactive hub owns tab
labels and filters after hydration; profile cards still link to the existing
canonical `/u/<username>` route, whose Pages Function remains responsible for
profile OG/JSON-LD/noscript metadata. Discovery card sharing uses that same
validated public path and does not create a second share URL contract.

Phase 7 keeps the metadata and share URL contract unchanged. Social counts,
guestbook notes, blocks, reports, and owner privacy settings load only after
the interactive profile shell hydrates. `discoverable=false` removes a profile
from the existing discovery RPC, while `/u/<username>` remains link-accessible
and its Pages Function does not expose social or moderation data.

Phase 9 public HTML caching is bounded by route and privacy state. Root,
leaderboard, legal, and help shells use short public edge-cache windows;
existing public profiles use a 60-second browser/300-second edge policy;
missing profiles and `legacy=1` responses remain `no-cache`. Public profile OG
SVGs retain their separate five-minute/browser and fifteen-minute edge cache.
No owner draft, private activity, entitlement, or social-control data enters a
cacheable response.

The retired Shop was an authenticated, non-public account route. `/shop` now
only aliases into Customize; the live preview is snapshot-driven and performs
no independent profile/network/social/owner-control loads. Free profile
expression is available to every account during this interim phase, while
future progression or premium acquisition remains a server-side decision.

The Phase 1 prototype has a separate Pages Function at `/prototype/profile`. It uses the same shell/security headers, is explicitly `noindex,nofollow`, and is not included in public profile discovery or sitemap data. The Phase 2 legacy profile query is also `noindex,follow` while canonicalizing to the public profile URL.

## Known coupling and migration hazards

- Manual routing is split between `App.svelte`, `routes.js`, Cloudflare Pages redirects, and Pages Functions. Removing or replacing a route requires direct-refresh, metadata, canonical, and share-link checks together.
- App metadata has both server-shell and client-hydration implementations. A new profile renderer must preserve canonical `/u/<username>` URLs, robots behavior, OG images, sitemap membership, and challenge metadata.
- `Game.svelte`, `Profile.svelte`, and the Profile Studio shell combine data
  access with substantial rendering. Extracting pieces must preserve
  request-id/session guards, loading/error states, and event contracts.
- Profile data is intentionally split across a public base-table projection, an owner-only RPC, public score RPC, public leaderboard views, and owner achievements. Broadening a select for convenience risks private-field exposure or RLS regressions.
- The four leaderboard views are intentional `SECURITY DEFINER`/owner-privilege projection boundaries with approved public columns. The Supabase advisor warning is known and must not be “fixed” by granting base-table access.
- The database stores authoritative roll presentation. Any client display model must preserve `condition_ids`/badges, contributors, traits, identity, and bounds without re-scoring or inventing rewards.
- SQL and JavaScript scoring/rarity/achievement definitions have parity checks but remain separate implementations. Changing one without the other creates historical and launch-economy drift.
- Auth hydration is asynchronous and guarded by `authEventId`; new account consumers must not read an old session's profile, inventory, wallet, or follows after sign-out/sign-in races.
- Guest progress is UTC-date keyed local storage. It is deliberately separate from account state and must not be silently migrated into an account or treated as proof of a server roll.
- Profile expression controls are live-catalog driven and use structured
  cosmetic slots plus cached validation. Catalog keys, slots, and renderer
  safety are shared coupling points; the browser has no purchase authority.
- Daily eligibility, rerolls, streaks, totals, achievements, EP, purchases, and best-roll state are server-owned. Client readiness and local reroll locks are UX guards only.
- Public profile loading and leaderboard loading are bounded, but the current profile and leaderboard components still assume the existing response shapes. Field aliases (`hex_code` versus `hex`, `condition_ids` versus `badges`) are compatibility hazards. `profileData.js` is now the shared seam for the live shell and legacy renderer.
- The latest audit migration is additive/reconciling existing data and has an intentional pending working-tree comment change. Phase 0 introduced no schema migration and did not alter production data semantics.
- The Phase 1 prototype remains fixture-only. The live Phase 2 shell is a separate renderer backed by the shared profile contract; it must not import fixture data or bypass the public/owner query split.
- The current schema has no public `bio` or avatar field. Phase 2/4 uses a safe monogram plus the existing logo mark and does not invent profile content. Adding a configurable bio/avatar belongs to a later milestone and requires a separate migration/privacy review.
- There are now two client presentation surfaces for the same authoritative roll contract: root `Game.svelte` preserves guest/local/share behavior, while owner `ProfileRoll.svelte` provides the primary no-navigation profile flow. They must continue to share `rollService.js`, `rollState.js`, and server response aliases.
- Profile configuration has two intentionally different projections: owner reads include a private draft, while public reads expose only the published JSON. A new configuration field must be added to the server normalizer, the client safe normalizer, editor controls, and security assertions together.
- `profile_configurations` is a new protected table with no browser table grants. The RPCs are security-definer boundaries; changing `search_path`, grants, default publication, or the profile-delete cascade can expose drafts or create an unpublishable account state.
- The editor's preview is local and temporary. Treating it as persisted state, rendering links without the HTTPS/label normalizer, or making module visibility client-authoritative would create XSS, phishing, or public/private parity hazards.
- The roll module is forced visible in both SQL and JavaScript because Phase 3 established it as the primary owner profile transaction surface. Changing that rule requires a separate roll-discovery/eligibility design.
- Story triggers observe profile and score writes but must remain idempotent and must not be added inside scoring code paths. Any new event type needs a public/private decision, bounded payload, deletion behavior, and RPC test before rendering.
- `profile_events` intentionally does not mirror `user_achievements`; the latter remains owner-private while public accomplishments continue through pinned badges and canonical roll-derived conditions.
- Progressive story visibility currently uses server-owned `profiles.total_rolls` as a display gate: the timeline starts with the profile origin and expands with activity, while the collection showcase opens at ten rolls. It is not an entitlement or reward authority.
- Phase 6 discovery has two public-read contracts: the new `get_public_discovery` projection intentionally omits internal profile ids, while the existing authenticated rivals RPC retains its id only for the pre-existing follow mutation. Do not copy that compatibility exception into new public surfaces.
- Discovery ordering is split across indexed date/score/profile queries and a bounded deterministic hash order for the random surface. Adding a new surface requires a defined ranking meaning, public-field review, page/response bound, and index or planner check before exposing it.
- Discovery card cosmetics still resolve through the live catalog and `cosmetics.js`; a card must never render RPC-provided CSS strings directly or treat a public profile card as an authority for follows, rank, scoring, or rewards.
- The profile-expression catalog remains in `shop_items` as a server-owned
  registry with retained legacy rows. New catalog keys must be added
  consistently to the table, seed, additive migration, renderer registries,
  cache validation, and drift checks. Customize currently exposes all active
  profile-expression rows without a client acquisition gate; future
  progression/premium rules remain server-side decisions.
- `profile_entitlements` is intentionally service-owned. Browser roles have no table grants and the owner client receives only bounded keys through `get_my_profile_entitlements`; introducing payment/webhook integration must preserve the service-role-only grant boundary, account-deletion cascade, and idempotent key upsert.
- `purchase_item` remains a server-side future-acquisition contract, while
  `equip_item` must continue to validate the active catalog row and any
  entitlement server-side. Never model a premium key in browser state as proof
  of purchase or move grants into the Customize editor.
- `ProfileStudioPreview` must remain a bounded, snapshot-driven card isolated
  from social/owner controls. Changes to ProfileShell data loading or CSS must
  not turn the live preview into a profile mutation/read surface.
- Phase 7 social state is split across seven protected tables and one existing follow table. Any new social action must use the RPC boundary, preserve fixed `search_path`, and add authenticated-owner/other/anonymous tests before being exposed in the client.
- `get_public_profile_social` includes an opaque guestbook entry reference so an author/profile owner can delete or report a note; it must never be changed to expose author ids, reporter ids, report details, moderation status, or email.
- Block cleanup currently removes reciprocal follows, favorites, and reactions while guestbook rows remain protected and hidden from the blocked projection. Changing that retention choice affects moderation/deletion semantics and needs a separate decision.
- The Phase 0 performance policy uses the Vite manifest to block regressions in
  initial assets, the largest lazy assets, HTML, and the auth, homepage, public
  profile, and dashboard route payloads. The complete generated catalog is an
  advisory 800 kB JavaScript / 400 kB CSS trend because mutually exclusive lazy
  routes are not one user-facing download.
- Route focus is intentionally attached to the app content region after programmatic navigation. New overlays must preserve the existing opener/focus restoration contracts and must not steal focus from an active dialog.
- `Media.svelte` currently has no user-upload or remote-media backend source. Future media/embeds must retain the local/HTTPS allow-list, load-error fallback, intrinsic layout reservation, CSP review, and entitlement/privacy decision; do not broaden it to arbitrary URLs as a convenience.
- Cloudflare Web Analytics remains a separate shell-level service, while the optional product-event contract is explicit, redacted, and page-local. There is no product-event sink, retention job, or analytics database; a future provider must preserve consent, deletion, retention, and operational ownership boundaries documented in `docs/ANALYTICS_CONTRACT.md`.
- Social reports have protected statuses and rate limits but no moderator identity/audit fields, dashboard, queue, notification delivery, or appeal workflow. Any moderation tooling must use a new least-privilege service boundary and additive privacy-reviewed migration rather than reading protected tables from the browser.
- `legacy=1` remains the compatibility renderer for mood, pinned badges, rivals, and deletion. Phase 9 launch hardening does not remove it; retiring it requires equivalent owner controls, redirects/canonical behavior, and a rollback plan.
- Social rate limits are per-account action windows in `profile_social_rate_limits`; they are not a replacement for abuse review, and adding notifications would require deduplication, mute controls, and a new spam audit.
- Activity privacy gates the bounded recent-score/story/discovery projections. The public profile identity and direct link remain available, so changing the meaning of “private profile” requires a separate route/metadata/sitemap decision.
- The current branch and linked Supabase project were read-only verified as schema/catalog aligned on 2026-08-08. Do not add a client fallback or browser-only catalog exception; future drift must still be reconciled through an authorized additive migration/seed deployment with backup/PITR and rollback evidence.
- `supabase db diff --linked --schema public` is a read-only drift diagnostic only. Its 2026-07-25 output warned about unexpected drops involving Phase 4–8 objects, so generated SQL must not be applied as a rollback plan. Use `supabase migration list --linked` plus the reviewed migration sequence as the deployment boundary.

## Milestone boundary

Phases 0–3 made no database migration, RLS change, scoring/economy change, reward change, route deletion, SvelteKit migration, or production data write. Phase 0 added pure contracts and regression tests; Phase 1 added isolated foundations and a fixture canvas; Phase 2 added the live profile shell, shared profile hydration, and the explicit legacy fallback; Phase 3 added the owner roll module and shared client request/presentation seams. Phase 4 adds one additive protected configuration table and four narrowly scoped configuration functions/RPC grants; it does not alter existing scoring, economy, rewards, RLS semantics, or historical data.

Phase 1 adds design-token CSS, motion/foundation primitives, a noindex fixture route, and an isolated responsive canvas. Phase 2 adds the live `ProfileShell`, shared profile hydration, and a query-preserving legacy fallback. Phase 3 adds an authenticated owner `ProfileRoll` inside the shell, reuses the secure RPC path, updates the shell projection in place, and preserves the guest root flow. Phase 4 adds a versioned, server-validated profile configuration with an owner draft editor, local preview, explicit publish, ordered modules, safe links, and visitor published-only rendering. Phase 5 adds durable public-safe profile/roll story events, bounded lifetime condition collection, visual timeline/collection showcases inside the existing profile modules, and progression-gated story depth. Phase 6 adds a bounded public discovery RPC, indexed discovery ordering, profile cards, public CTAs/sharing, filters, pagination, and new discovery surfaces while preserving the existing route and rivals compatibility path. Phase 7 adds protected favorites, positive reactions, moderated guestbook entries, blocks/reports, social rate limits, owner social privacy settings, and a profile-shell social module. Phase 9 adds browser audit evidence and rollback/deployment boundaries; it does not change scoring, economy, rewards, private achievement access, roll authority, SvelteKit, metadata URLs, or unrelated refactors.
