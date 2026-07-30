# Phase 10.2 — Pre-Implementation Plan

Date: 2026-07-26  
Branch: `redesign/profile-first-reconciliation`  
Reference: `design/reference/v0-profile-mockup/`

## 1. Current profile visual hierarchy

The default production profile currently has a global game-oriented shell
(`ChromaDie`, How to Play, Roll, Shop, Leaderboard, Home, wallet, rank, and
account controls), followed by an atmospheric opening with identity and an
integrated owner/latest-color region. A supporting expression region and one
featured story region follow. History, rank, stats, configuration, social
controls, and compatibility controls are collapsed below. When the linked
optional social/configuration RPCs are unavailable, the shell still exposes a
large `Profile interactions are temporarily unavailable.` warning above the
composition.

The existing data path is real and safe: `loadProfileContext()` maps the
public/owner profile contract, public scores, story, published configuration,
safe links, cosmetics, and social projection. Owners use the existing
`get_my_daily_roll`/`roll_die` path through `ProfileRoll.svelte`; visitors never
mount the owner roll module.

## 2. Approved mockup hierarchy

1. Full-viewport dark atmospheric canvas with restrained accent light.
2. Minimal `chm.lol` header with Discover, Share, and owner Edit only.
3. Centered identity surface: avatar, name, handle/URL, bio, earned status,
   safe social links, today’s color, and one compact collection trace.
4. One quiet music/expression bar at the bottom of the canvas.

The mockup is a personal bio page first. Game statistics, navigation, owner
tools, and social moderation are not part of the initial visual hierarchy.

## 3. Translation map

The complete element-by-element contract is in
[`APPROVED_MOCKUP_TRANSLATION.md`](APPROVED_MOCKUP_TRANSLATION.md). The
implementation will use real mapped production values, not the mockup’s
`profile`, `todayColor`, `collection`, `track`, or placeholder social values.

## 4. Expected components and files

- Add `src/lib/ProfileAtmosphere.svelte` for full-viewport accent light,
  vignette, grain, and reduced-motion-safe atmosphere.
- Add `src/lib/ProfileModeHeader.svelte` for the profile-only `chm.lol`
  header, share, Discover, and restrained owner Edit.
- Add `src/lib/IdentityCard.svelte` for the centered identity hierarchy and
  safe avatar fallback.
- Add `src/lib/TodayColor.svelte` for a visitor’s canonical latest result and
  quiet next-roll copy.
- Add `src/lib/FeaturedCollection.svelte` for one compact public collection
  treatment using real story data.
- Add `src/lib/ProfileMusic.svelte` for the expression-bar placement and the
  explicit disabled music boundary.
- Adapt `src/lib/ProfileShell.svelte` to compose those surfaces and derive
  atmosphere from the canonical daily/latest color.
- Adapt `src/lib/ProfileRoll.svelte` only to publish its already canonical
  color to the presentation parent; do not change roll authority or result
  semantics.
- Adapt `src/App.svelte` to use the profile-mode header only for the default
  renderer, preserving the legacy/global shell for other routes and `legacy=1`.
- Add focused Phase 10.2 contract tests and extend the repeatable screenshot
  capture tooling under `artifacts/phase-10-2/`.

## 5. Data gaps

- Public profile data has no avatar upload/source, display-name field, bio,
  location, view count, or music/track configuration.
- The production profile link contract is structured and HTTPS-only, so it can
  safely provide selected social/expression links without fabricated URLs.
- Earned status is represented by the existing `launch_edition` equipped badge
  and badge metadata; a broader founder contract is not invented here.
- The owner’s restored daily result is held inside `ProfileRoll`; a small
  presentation event will expose its canonical hex to the atmosphere without
  moving any authority into the shell.
- Story collection items are condition records with counts, not the mockup’s
  raw swatch array. The compact treatment will use the available record/icon
  and accent swatches without fabricating a total collection size.

## 6. Prototype behavior explicitly rejected

- Hardcoded profile, roll, collection, track, view-count, or social data.
- Client-generated random roll results or local result settlement.
- Fake local music playback presented as a production feature.
- Placeholder `#` social links.
- React, Next.js, Tailwind class copying, or prototype state structure.
- Mandatory tilt/parallax or technology-demo motion.
- Fixed-height/overflow clipping on mobile.
- Public owner tools, developer explanations, global dashboard navigation,
  EP/rank/currency framing, or redundant action clusters.

## 7. Test plan

- Preserve and rerun the Phase 0–9 contract suite plus the current Phase 10/11
  profile tests.
- Add tests for profile-mode header gating, canonical share URL construction,
  owner Edit access, identity fallback fields, safe links, atmosphere color
  source, disabled music feature flag, and no prototype literals/roll logic.
- Test visitor, owner, pre-roll, completed-roll, missing-avatar,
  missing-music, and reduced-motion source/browser states.
- Keep existing route, public/private, legacy fallback, secure RPC, anti-reroll,
  scoring, reward, and RLS tests untouched except where presentation contract
  expectations must be extended.

## 8. Screenshot plan

- Capture the current production profile before this phase and the approved
  mockup reference at identical stable viewports.
- Capture translated owner and visitor states at 1920×1080, 1440×900,
  1280×720, and 390×844.
- Capture pre-roll, completed-roll, reduced-motion, missing-avatar, and
  missing-music states from stable fixtures or explicit local query/test state;
  production rendering remains real-data based.
- Store all artifacts under `artifacts/phase-10-2/` and create a contact sheet
  plus a comparison document with scroll/overflow measurements.

## 9. Exact acceptance criteria

- The default public renderer visually follows the approved composition and
  the parity checklist passes at all required viewports.
- Authenticated bare `/` still resolves to the owner profile, while explicit
  `/?view=game`, public `/u/<username>`, direct refresh, old share links, and
  `legacy=1` remain valid.
- The default profile has no more than four primary visual regions, no visible
  public-boundary/developer explanation, no game-dashboard header, no repeated
  action cluster, and no primary owner tools.
- Real mapped profile, story, configuration, cosmetic, social-link, and
  canonical roll data drive production rendering.
- Identity leads; the canonical color follows immediately; collection and
  expression/music are quiet; secondary systems remain reachable in detail or
  compatibility surfaces.
- Desktop primary content fits without vertical scrolling at 1440×900;
  identity, canonical color, and expression remain visible at 1280×720.
- Mobile begins with identity and color, has no horizontal overflow or clipped
  content, and intentionally allows vertical scrolling.
- Reduced-motion, keyboard focus, owner/visitor, empty/loading/error, and
  optional-content fallback behavior are covered.
- All required validation commands and exact screenshot measurements are
  recorded in `docs/PHASE_10_2_REPORT.md`.

Implementation stops after these Phase 10.2 gates. No new Phase 11 feature
expansion is included.
