# Chromadie 2.0 Progress

## Current-roll color and composition correction — 2026-08-20

- Progression now consumes the server-owned `get_my_daily_roll()` color, so
  the streak chip, Rank hero, preview data, and restrained halo match the
  color shown by Roll instead of the profile's saved mood preference.
- Kept the page neutral before a roll and when the authenticated daily read is
  unavailable; the progression record remains usable without a fabricated
  accent.
- Top-anchored the left narrative rail against the tall glass board to remove
  the large empty upper-left gap on desktop while preserving the mobile stack.
- Added client coverage for the daily-roll boundary and rechecked the browser
  route, reduced-motion behavior, and performance budget.

## Roll-aligned Progression composition — 2026-08-20

- Recomposed the authenticated page as a Roll-like split: a compact left rail
  for identity and the daily action, plus one tall glass progression board for
  Rank, metrics, weekly focus, paths, unlocks, and History.
- Kept the visible copy intentionally short and made the saved profile color a
  restrained accent for the Rank hero, streak swatch, CTA sheen, and page halo;
  structural state remains grayscale.
- Preserved the existing owner RPC and presentation semantics, including
  loading/guest/error states, one-at-a-time path accordions, canonical reward
  thumbnails, mobile layout, and reduced-motion behavior.

## Progression density and accordion pass — 2026-08-20

- Removed the dedicated-route breadcrumb/eyebrow clutter and the stray color
  chip from the Rank label. The daily roll color now appears only beside the
  streak strip, while Rank remains a neutral progress metric.
- Made the Rank block the focal hero with a grayscale SVG ring, compact
  display-scale XP, exact-value title text, and abbreviated secondary metrics.
  Weekly color is a single swatch-and-bonus line.
- Collapsed Rank, Ritual, and Discovery into keyboard-accessible, mobile-sized
  accordion rows. Expansion is synchronous, one lane at a time, and retains
  canonical reward thumbnails plus completed/future disclosures.
- Rechecked the grayscale vignette, glass-card glow, CTA sheen, and reduced-
  motion fallbacks. No schema, RPC, scoring, eligibility, inventory, or RLS
  changes were needed.

## Progression visual polish — 2026-08-20

- Split structural state from data color with neutral active-card tokens; the
  daily roll and weekly target remain actual swatch chips only.
- Added the grayscale vignette, glass-panel card treatment, neutral CTA glow/
  sheen, and a responsive Rank hero with an SVG progress ring and display-scale
  EP count. Journey paths now use the arc, pip-trail, and faceted glyphs.
- Reward slots eagerly load the canonical expression renderer and dim locked
  rewards instead of showing “Preview reward.” Browser smoke now verifies the
  ring, canonical thumbnails, no placeholder copy, vignette, mobile overflow,
  and reduced-motion behavior.
- No schema, RPC, scoring, eligibility, inventory, or RLS changes were needed.

## CI usage controls — 2026-08-20

- Split the fast application gate from the database/browser gate so ordinary
  `main` pushes no longer start local Supabase and browser infrastructure.
  Pull requests still receive the full gate, while schema- and browser-sensitive
  pushes and manual dispatches retain direct coverage.
- Added concurrency cancellation plus ten- and fifteen-minute job ceilings,
  and replaced the network-dependent Chromium package installation with hosted
  runner browser discovery.
- Restricted browser artifacts to failure-only screenshots, JSON, and logs with
  three-day retention. Removed the previously retained Actions evidence set,
  which contained disposable browser profiles and caches.

## Progression comprehension pass — 2026-08-20

- Reworked the shared progression presentation around one clear “Today's
  direction” action, profile-derived accent rules, and plain-language rank,
  streak, reward, and pacing copy while keeping the existing dark site shell.
- Reduced each journey lane to a featured goal first, with additional active
  goals and future goals available behind explicit controls. Discovery keeps
  its independent-find meaning, and the weekly color is labeled as a
  secondary challenge.
- Replaced misleading empty metrics and “No history yet” states on the
  dedicated route with server-truthful goal/earned-expression summaries and a
  bounded history handoff. Reward previews now wrap long names safely on
  narrow screens.
- Added source-contract coverage and updated the authenticated progression
  browser smoke for the new hierarchy, mobile layout, reduced-motion behavior,
  future-goal control, and no-overflow contract. No database or authority
  changes were required.

## Progression Core System — 2026-08-20

- Completed the research-backed progression core: **Rank** remains mastery,
  **Ritual** remains sustained daily play, and **Discovery** remains the
  independent stochastic color story. XP/currencies, seasonal pressure, and a
  fourth progression bar remain out of scope. See
  [PROGRESSION_RESEARCH.md](PROGRESSION_RESEARCH.md).
- Kept the authored `progression_milestones` manifest, the durable
  `user_progression_milestones` ledger, and server-authoritative eligibility
  and acquisition. `grant_progression_milestones()` remains inside the roll
  transaction; the service-only `reconcile_progression_account()` repairs
  historical accounts and inventory; `get_my_progression()` is the owner read
  boundary; owner-only presentation and acknowledgement RPCs close the live
  unlock state; public story proof remains bounded.
- Published progression rewards are real zero-cost `earned` items backed by
  active canonical renderers. The free baseline and Premium expression
  boundaries remain intact. The 730- and 1,095-roll Ritual capstones are
  earned; greyscale remains historical but is retired from the published
  journey because of its approximately 179-year expected wait.
- Kept `/progression` narrow and lazy, loaded the canonical preview only on
  demand, and shared one restrained unlock queue across both roll surfaces.
  Unlocks can hand off directly to Profile Studio's `#customize-effects`, and
  public profiles expose only bounded recent proof. Corrected future-goal and
  Discovery visibility so deterministic future goals remain future while
  stochastic finds remain independently unfound rather than sequentially
  hidden.
- Aligned the progression analytics contract with the client and final SQL:
  authenticated-only daily aggregates, explicit goal/presentation/preview/
  equip/acknowledgement/completion/CTA semantics, no hover proxy or raw
  identifiers, local presentation dedupe only, and scheduled retention rather
  than hot-path cleanup. See [ANALYTICS_CONTRACT.md](ANALYTICS_CONTRACT.md).
- Local acceptance evidence is executable: 436 Node tests; `npm run build`,
  `npm run check`, full `npx eslint src/`; links, CSP, performance, responsive
  build, profile certification, and `npm audit --audit-level=high`; database
  reset/lint, database security, progression database, and scoring parity;
  progression browser smoke; R2 local smoke; and production browser smoke.
  The ordered `20260819150000`–`20260820000000` migration chain was then
  applied to the linked Supabase project; its migration ledger is aligned and
  the 76-item remote catalog matches the seed. Application-hosting deployment
  remains separate from this database migration record.

## Progression visual-system correction — 2026-08-19

- Rebuilt the dedicated /progression shell around the existing supporting
  route language: centered heading, shared type scale, narrow responsive
  content width, neutral panels, and standard site controls.
- Removed the bespoke ambient gradient, split marketing hero, rank-colored
  signal, decorative status glyphs, and progression-specific arrow actions.
- Flattened progression rank, journey, weekly-focus, and history treatments to
  the neutral system palette while preserving actual roll colors as plain
  swatches.
- Removed decorative arrows from the Roll, Studio overview, and owner-profile
  links that point to Progression. Updated presentation assertions and checked
  desktop/mobile guest rendering locally.

## Dedicated progression destination — 2026-08-19

- Promoted progression from a Profile Studio account subsection to the
  dedicated, lazy-loaded `/progression` route with the normal site shell.
- Added a responsive owner page around the existing server-backed journey:
  rank/EP context, ritual and discovery tracks, weekly focus, recent unlocks,
  empty/loading/error/account-unavailable states, and reduced-motion support.
- Kept Profile Studio focused on expression editing and publishing. Shared
  navigation, Studio's More menu, roll context, and owner-profile proof now
  point to Progression; legacy `#progression` bookmarks redirect safely.
- Reserved the clean path from username routing and added the `progression`
  aggregate analytics surface without widening privacy, retention, or
  server-authority boundaries.
- Added route/component/browser-contract coverage and a dedicated milestone
  record in `docs/milestones/PROGRESSION_DESTINATION.md`.

## Progression identity journey — 2026-08-19

- Added an additive server-published journey manifest with two lanes: ritual
  milestones for roll count/streak and discovery milestones for rare, Mythic,
  and palindrome outcomes. The original five EP rank milestones remain
  unchanged.
- Backfilled eligible accounts through idempotent milestone and inventory
  inserts, then extended the authoritative roll grant path to return dynamic
  track metadata and new expression unlocks.
- Added owner-only progression state for total rolls, current streak, weekly
  Color of the Week focus, journey progress, and recent unlocks. Public story
  responses expose only current-safe proof with two recent unlocks maximum.
- Added dedicated progression/profile roll result proof and a contrast-safe
  guest claim path that discards the local preview at signup. The progression
  journey initially lived in Studio and was promoted to its own destination in
  the follow-up above.
- Added consent-gated, anonymous daily progression aggregates with service-only
  storage and 90-day cleanup. No raw product-event records or account-linked
  progression analytics are stored.
- Added `docs/milestones/PROGRESSION_IDENTITY_JOURNEY.md` and regression
  coverage for normalization, migration contracts, privacy boundaries, and
  guest handoff behavior.
- Final local validation passed: build, Svelte check, ESLint, 417 tests, link
  and CSP checks, database reset/lint/security, scoring parity, username,
  balance, and catalog drift checks. Route performance budgets pass; the
  existing advisory all-assets catalog remains above its aggregate JavaScript
  and CSS targets.
- The local Profile Studio browser smoke passed homepage, auth, direct-refresh,
  stale-state, alias, and preview checks, then stopped at its existing R2
  upload-persistence step because local R2 control-plane configuration is not
  available. No progression assertion failed.

## Roll balance and reveal audit — 2026-08-19

- Raised only the rare server-reported `condition_supernova` payout to
  10,000,013 points. The ordinary distribution is otherwise unchanged: the
  deterministic 100,000-roll audit observes a 10,737 floor, a 10,676,019
  upper sample, a 64,709.94 average, and 0.112% Mythic rolls; a two-million
  sample reaches 10,776,026. Pure black and white canonical rolls are now
  12,321,090 and 12,335,008 respectively.
- Replaced the shared Game’s static progress bar and random 60 ms scramble
  interval with one six-stage reveal: signal sampling, three channel locks,
  condition-by-condition discovery, rarity assessment, continuous score
  counting, and a final settle. Ordinary rolls take about 15.6 seconds, with
  stronger rarity/score bands extending the event to roughly 18–23 seconds;
  the score-aware duration is spent on visible discoveries rather than a
  single delayed spinner.
- Applied the same outcome-aware timeline to the authenticated profile roll,
  with the canonical result held in the rolling state until the score has
  finished counting. Dedicated context and result cards settle atomically;
  reduced-motion is immediate and `Skip reveal` bypasses the remaining beats.
- Browser timing checks cover a real guest roll and a Mythic profile fixture,
  including intermediate signal rows, rarity copy, live score values, and the
  final result state.
- Added reduced-motion handling, guest jackpot persistence coverage, SQL/client
  score parity coverage, and deterministic balance range assertions. Local
  database reset and schema lint both pass for the additive tuning migration.

## Direct route startup and site font boundary — 2026-08-19

- Initialized route state from the current browser URL before the first lazy
  outlet render, so direct refreshes do not briefly load the homepage tree.
- Scoped site-shell typography to Inter and Manrope while preserving Spline
  Sans and IBM Plex Mono for the profile renderer.
- A fresh 1440px production trace now shows `/pricing` at about 195 KB
  transferred and `/roll` at about 218 KB, with no `HomePage` chunk in either
  route. The homepage still loads its authored hero media and measured about
  360 KB on a cold visit.
- Right-sized the four authored homepage avatar fixtures to 512×512. The
  total avatar payload fell from about 205 KB to 94 KB without changing the
  rendered specimen at desktop or mobile sizes.

## Route startup and shared chrome cost — 2026-08-19

- Removed unconditional idle prefetching of the Roll, Leaderboard, Profile,
  and Auth route trees; existing header hover/focus intent prefetch remains.
- Removed two unused global font CSS imports, reducing the shared stylesheet
  from about 79.6 KB to 76.9 KB raw in the production build.
- Re-encoded the shared AM mark from a 667×540 PNG (~117 KB) to a 288×233
  alpha WebP (~8 KB), updating the shared header, footer, and Profile Studio.
- A production trace after the startup change showed no unrelated route
  chunks after 2.5 seconds; the current logo change removes roughly 108 KB
  from that same fresh-shell request set.

## Homepage media loading boundary — 2026-08-19

- Deferred the three below-the-fold photographic showcase backgrounds and
  avatars until the showcase approaches the viewport, while keeping a stable
  gradient card placeholder and the authored profile copy in the document.
- Converted the referenced showcase fixture pairs from oversized PNGs to
  optimized WebP assets and removed the obsolete copies.
- Added browser smoke coverage for the initial zero-showcase-media state and
  the bounded six-file load after the section is reached. A fresh browser trace
  now loads only the active hero media initially (~112 KB), then ~0.4 MB for
  the showcase instead of ~10.3 MB up front.

## Keep route chrome singular during lazy navigation — 2026-08-19

- Kept the homepage-owned header visible while a destination route is still
  loading, preventing the app-shell header from mounting beside it during
  homepage-to-Pricing navigation.
- Added settled and error route events so the shell releases the guard when the
  destination replaces the previous page or renders its error state.

## Keep the live preview label clear of the specimen — 2026-08-19

- Placed the desktop live-preview label after the profile specimen in the
  preview flow, leaving the framed avatar free to cross the card edge without
  obscuring the label.

## Contrast-aware Profile Studio chrome — 2026-08-19

- Changed the editable workspace heading, save state, tabs, and preview
  controls to use white-first difference blending so they invert against
  light profile imagery while retaining the existing dark treatment over
  darker atmospheres.
- Added explicit preview stacking so the profile specimen owns any remaining
  overflow while the live-preview label stays clear below it.

## Anchor Profile Studio footer on short desktop pages — 2026-08-19

- Changed the Profile Studio shell to a column flex layout and let the
  workspace consume remaining viewport space, keeping the footer at the
  bottom of short routes such as Premium.
- Preserved normal document flow for longer editors and the existing mobile
  sticky actions/footer behavior.

## Homepage leaderboard atmosphere — 2026-08-19

- Reworked the daily leaderboard into a sky-matched glass surface with
  translucent rows, backdrop blur, a restrained ambient glow, and a softer
  header hierarchy.
- Reduced the hero preview to two rows plus a `View full leaderboard` link,
  while keeping a signed-in player’s local entry visible when needed.
- Added a color-driven halo to the top-ranked avatar and lifted the desktop
  card to align with the profile identity cluster; stacked mobile layouts
  keep the card in normal flow.

## Centered Profile Studio header — 2026-08-19

- Matched the Profile Studio header’s inner geometry to the homepage shell so
  the AM mark and editor actions stay centered within the same desktop,
  tablet, and mobile content widths.
- Kept the Studio header full-width and opaque so editable profile backgrounds
  cannot affect editor legibility.

## Stable Profile Studio chrome — 2026-08-19

- Profile Studio now suppresses the global photo-overlaid site chrome while
  the dashboard route is active.
- The existing shell owns the dashboard header with the AM logo and mounts a
  full-width dark footer variant, keeping editor controls independent from
  user-editable profile atmosphere.

## Roll result contrast and color focus — 2026-08-19

- Scoped the homepage-style header’s bright navigation rule so the white
  `Claim handle` control retains explicit near-black ink.
- Added relative-luminance text selection to the dedicated roll result
  button, covering bright, dark, and white rolled colors.
- Tightened the card and swatch glow into saturated inner and soft outer
  layers driven by the rolled color, with a restrained breathing animation
  that is disabled for reduced-motion users.

## Homepage descriptor copy language — 2026-08-19

- Standardized secondary homepage copy around the profile descriptor treatment:
  soft white, medium-weight Inter, slight tracking, and no text shadow.
- Applied it to hero support copy, daily leaderboard context/reset text,
  section descriptions, loop steps, and claim/loading states while preserving
  the stronger display-heading and rolled-color hierarchy. Removed the
  remaining hero-copy shadows so the type matches the clean reference profile.
- Reversed the carousel control treatment to white by default and dark on
  interaction, keeping the controls legible without adding another accent.
- Gave the daily leaderboard a compact rounded surface and larger display
  heading so it carries comparable weight to the hero’s left column.
- Softened the claim field with a lighter translucent surface, lower shadow,
  and slightly clearer field metadata.
- Scoped the black-and-white hero headline treatment to the light Meilin scene
  so carousel examples remain readable against their own backgrounds.

## Framed identity typeface consistency — 2026-08-18

- Applied the selected Velocity family to Katt’s bio and secondary
  `Siberia · Russia` line as well as the name.
- Reused the bounded Name font registry and added browser-smoke assertions for
  all three rendered identity text faces.

## Full-page homepage atmosphere — 2026-08-18

- Moved the Katt snowfall layer from the centered hero shell to the homepage
  root so it covers the complete page without a dark square boundary.
- Kept fixture switching and local roll accent updates connected to the root
  atmosphere.
- Added browser bounds coverage for full-viewport atmosphere rendering.

## Katt Framed showcase treatment — 2026-08-18

- Changed the second hero identity to `katt` and added `Siberia · Russia`.
- Switched the name face to Velocity and passed Link size 2 / Glow 1 through
  the shared Framed renderer.
- Made the Framed card surface transparent, restored the intended larger
  overlapping avatar, and mounted the snowfall atmosphere on the specimen.
- Added browser-smoke assertions for the visible identity, font, link tokens,
  card transparency, avatar size, and atmosphere.

## Dedicated P2 homepage media — 2026-08-18

- Added a `p2/` fixture folder with the provided portrait and a snowy
  mountain background.
- Replaced the visible `Arcade` placeholder with `p2` while preserving the
  existing carousel slot and showcase ordering.

## Second homepage Framed specimen — 2026-08-18

- Changed the second hero carousel example to the Framed profile renderer.
- Added the active 3D Parallax avatar treatment and Silkscreen name face.
- Reused the existing perspective-tilt motion wrapper and covered the
  complete fixture switch in the homepage browser smoke.

## Fix Framed link glow clipping — 2026-08-17

- Removed the empty anchor background and shadow treatment from Framed icon
  links.
- Allowed the icon-level white drop-shadow to render outside the control,
  matching Immersive behavior.
- Added renderer regression coverage for transparent, overflow-visible link
  controls.

## Stronger homepage roll impact — 2026-08-17

- Increased the homepage roll burst to 20 larger, brighter accent-colored
  sparks with wider travel.
- Added a center flash and expanding ring so the result reads clearly against
  photographic backgrounds.
- Preserved reduced-motion suppression and added regression assertions for the
  new impact layers.

## Roll-reactive Meilin avatar — 2026-08-17

- Applied the animated Liquid Blob effect to the authored Meilin hero avatar.
- Mapped the blob fill and glow accent to the homepage roll state as it spins
  and settles, while keeping the behavior local to the homepage specimen.
- Added source and browser-smoke coverage for the effect key and computed
  color mapping.

## One-shot homepage roll and leaderboard invitation — 2026-08-17

- Limited the homepage preview to one roll, then changed the action into a
  `Claim your place` CTA that scrolls to the existing claim control.
- Added the local result to the hero leaderboard as a ranked, accent-highlighted
  `YOU` row alongside the real current-day public rows.
- Restored the leaderboard's dark rounded rows and increased the heading,
  username, and score typography to match the hero's visual authority.
- Kept the preview result local and covered animated, reduced-motion, CTA, and
  no-extra-network behavior in the homepage browser smoke.

## Make link styling visible across layouts — 2026-08-17

- Doubled the effect range of Link size while keeping its bounded three-step
  control.
- Reworked Glow into a visible white halo and applied both settings to the
  Immersive link renderer and its live Studio preview.
- Scoped icon-layout glow to the SVG pixels so links do not produce empty
  circular halos around their containers.
- Added renderer wiring regression coverage.

## Fix generic profile-link validation — 2026-08-17

- Fixed Website and Other links being rejected during publish because their
  unrestricted HTTPS marker was treated as a hostname.
- Added regression coverage for valid and invalid protocols so structured
  preview metadata can publish without changing link behavior.

## Simplify the Layout editor — 2026-08-17

- Removed the inert Link alignment and legacy Visible sections controls from
  Profile Studio Layout.
- Kept layout selection and structural module ordering intact while making the
  draft patcher preserve link-style settings as Links-owned data.
- Added regression coverage so the Layout editor stays limited to the active
  structural choices.

## Avatar Effect reference refresh — 2026-08-17

- Replaced the previous 18 active avatar effects with the four reference
  treatments: 3D Parallax Tilt, Glitch Slicer, Liquid Blob, and Cyber HUD.
- Kept the renderer image-aware and structured, with no catalog-provided CSS,
  HTML, JavaScript, URLs, raster plates, or particle atlas required.
- Added the additive catalog migration, cleared retired equipped selections,
  updated Studio/browser fixtures, and covered the four shapes plus reduced
  motion in regression tests.

## Framed profile layout — 2026-08-17

- Added the structured `framed` layout to the finite profile registry and
  Profile Studio selector.
- Reused the existing reference-card renderer for a left-aligned card with an
  overlapping rounded-square avatar, icon links, responsive sizing, keyboard
  focus states, and reduced-motion-safe behavior.
- Kept Framed’s daily roll in the existing below-fold continuation surface and
  added the additive free catalog row, seed entry, drift checks, and focused
  regression coverage.

## Lighten the leaderboard canvas — 2026-08-16

- Replaced the leaderboard's black canvas with a soft neutral background and
  dark readable type.
- Kept rank colors, the centered podium, framed lower rows, and all loading,
  empty, error, and reduced-motion states intact.

## Refine the leaderboard into a podium and framed list — 2026-08-16

- Replaced the wide score table presentation with a centered top-three podium.
- Moved rank 4+ profiles into simple bordered frames while keeping score and
  short roll details visible.
- Kept Today and This month as the only active periods and preserved the
  existing public RPC, pagination, safe navigation, and responsive states.

## Focus the leaderboard on two roll periods — 2026-08-16

- Reduced the public leaderboard to Today and This month views backed by the
  existing bounded `get_public_discovery` projection.
- Replaced the Studio-style discovery workspace with a compact ranked score
  surface: rank, avatar/profile identity, score, and short color/rarity/date
  details.
- Removed leaderboard filters, rival state, owner rank context, share actions,
  cosmetic row rendering, and the unused discovery period controls from the
  active leaderboard surface while keeping profile navigation and pagination.

## Leaderboard Studio redesign — 2026-08-16

- Replaced the old discovery-card/grid leaderboard presentation with a new
  Profile Studio-inspired board: structured controls, ranked profile rows,
  board context, public-visibility messaging, and an authenticated owner rank
  module.
- Kept `/leaderboard`, allow-listed tabs, bounded discovery pagination, public
  RPC projections, rival follow behavior, profile navigation, sharing, and
  reduced-motion behavior intact.
- Removed the unused `DiscoveryHub.svelte` and `DiscoveryCard.svelte` runtime
  surfaces and their duplicate site-level styling overrides. `Leaderboard.svelte`
  is now the behavioral and presentation owner, with `LeaderboardEntry.svelte`
  as the only row renderer.

## Shared homepage chrome — 2026-08-16

- Consolidated the homepage, application, and standalone auth/lifecycle footers onto one
  `SiteFooter` with the homepage’s constrained width, spacing, typography, and
  responsive stacking.
- Aligned the shared application/auth `SiteModeHeader` to the homepage’s
  transparent 88px desktop and 70px mobile geometry, brand treatment, nav
  spacing, account controls, and Claim handle CTA.
- Kept public-profile account chrome and Profile Studio controls as intentional
  specialized surfaces; they do not inherit the marketing/site header.

## Homepage hero Immersive example — 2026-08-16

- The first authored homepage profile example now uses the canonical
  Immersive (`full-bleed`) identity composition, including its avatar, bio,
  and icon links.
- The remaining homepage carousel examples retain the compact specimen, and
  the switch is fixture-driven so the homepage stays local and deterministic.

## Profile-wide Name Font scope — 2026-08-16

- Added one opt-in Profile Effects toggle that applies the selected custom
  Name Font across all public profile content; the Platform default keeps the
  toggle disabled.
- Kept the setting in normalized appearance configuration while the equipped
  font remains the cosmetic source of truth. The public renderer exposes a
  finite, safe family stack only when both inputs are valid.
- Wired the staged Studio preview, live profile snapshot, bundled font
  readiness request, and ProfileShell-scoped inheritance without changing site
  chrome or per-section editor complexity.
- Added an additive database normalizer/backfill and Name Font unequip guard
  that synchronizes V1 and V2 draft/published projections.
- Fixed public V2 hydration to unwrap the nested published payload before
  normalization, and applied the same scoped family to the live Studio stage.

## Profile Effects font catalog — 2026-08-16

- Replaced the active Name Font catalog with the Platform default baseline,
  Black Ops One, Permanent Marker, Satoshi, Fira Code, Poppins, JetBrains
  Mono, Array, Silkscreen, Velocity, and Outfit.
- Added pinned Fontsource packages for the local families, static Fontshare
  faces for Satoshi and Array, and an app-bundled WOFF2 for the supplied
  Velocity source.
- Preserved the sixteen retired font keys as legacy renderer mappings so
  existing equipped profiles remain visually stable while the active catalog
  and Profile Effects selectors stay focused.
- Added catalog/renderer regression coverage and a forward migration that
  reduces the active catalog from 97 to 89 rows without deleting historical
  inventory or equipped references.

## Customize cleanup and font readiness — 2026-08-16

- Removed the obsolete combined profile/template editor graph, including the
  template picker and unused content/widget editor loaders and components.
  Structured links now use a dedicated links editor while old dashboard hashes
  continue to redirect into the supported Customize tabs.
- Kept one staged Profile Studio authority for identity, configuration, and
  cosmetic preview loadouts. Tab changes now preserve pending expression
  choices instead of rehydrating from equipped state.
- Canonicalized layout state to `compact` and `full-bleed` at the client and
  database runtime boundaries. Existing legacy values are backfilled once;
  “Immersive” is the display label for `full-bleed`, not a second key.
- Name canvas rendering waits for the selected bundled font to be loaded and
  verified before hiding semantic text, then redraws the correct face in the
  existing Compact or Immersive mount when the loadout changes. Lazy
  composable renderer loading follows the same explicit reactive boundary;
  layout remounts are no longer required.
- Added focused source, font-readiness, migration, and browser-smoke coverage.

## Current profile presentation — 2026-08-15

- The active public-profile presentation has exactly two structural choices:
  `Compact` (`ProfileReferenceCard`) and `Immersive` (`ProfileFullBleedLayout`).
- Existing profiles, equipped layout values, and draft/published configuration
  are normalized through the additive reset migration. Obsolete presentation
  inventory and catalog rows are removed after their references are cleared.
- ProfileShell, ProfileMotionEffect, draft/publish state, media, roll/scoring,
  auth, RPC/RLS, and cosmetic leaf renderers remain the behavioral authorities.

## Shop surface retirement and expression catalog — 2026-08-15

- Removed the standalone Shop presentation, route loader, navigation surface,
  and obsolete Shop-only components. `/shop` now enters Profile Studio
  Customize as a one-way legacy URL alias.
- Customize now exposes every active profile expression without ownership or
  purchase gates and saves through the existing `equip_item`/`unequip_item`
  contracts. Server catalog/economy tables and RPCs remain dormant authorities
  for future progression or premium acquisition decisions.
- Added additive catalog/layout migrations: active expression rows are free
  during this phase, malformed border selections are cleared without removing
  valid border effects, and Compact/Immersive configuration markers stay
  paired through draft and publish.
- The shared card has a neutral no-border edge; a colored outline is emitted
  only by a valid selected Profile Border renderer.

Older layout-specific entries below are historical implementation records, not
active presentation guidance.

## Homepage navigation completion — 2026-08-15

- Homepage header now links to the real Leaderboard, Customize, and Pricing
  routes without duplicating the in-page How it works and Profiles anchors.
- Homepage footer now exposes the existing product, legal, support, and
  business destinations without changing auth or route contracts.

## Sitewide legacy shell alignment — 2026-08-15

- Replaced the legacy capsule/slash application header treatment with a flat,
  reference-aligned header: compact mark, Clash Display wordmark, Inter
  navigation, green active state, and quiet account controls.
- Reprojected leaderboard, pricing, help, legal, shop, game, and auth support
  surfaces onto the Profile Studio canvas and surface tokens without changing
  their routes, data loading, or auth behavior.

## Profile Studio Media tab reference-fidelity pass — 2026-08-15

- Replaced the obsolete three-column media workspace with the approved
  two-column media-card grid and full-width section rhythm.
- Removed colored status dots, click-to-upload helper chrome, and Catppuccin
  fallback styling from the compact media presentation while preserving the
  real upload, R2 selection, unequip, deletion, audio, cursor, and Spotify
  behavior.
- Added reference-aligned descriptions and action placement for image, audio,
  and cursor media, plus the existing compact Spotify editor and background
  treatment explanation.
- Updated source, responsive, and browser geometry contracts. Full unit tests,
  Svelte check, source lint, and build pass; the local browser smoke reaches
  the media geometry checks but remains blocked later by the known local R2
  persisted-upload fixture.

## Profile Studio reference-card replacement — 2026-08-14

- Removed the Studio preview's dynamic `ProfileShell`/legacy layout renderer
  and replaced it with a bounded reference card built from the canonical
  preview snapshot.
- Kept the selected R2-backed profile environment as the fixed page
  background, with the card itself remaining a centered glass surface rather
  than a scrollable public-profile canvas.
- Reused the same `ProfileReferenceCard` anatomy for the homepage hero and
  replaced the Customize Layout tab's five-template picker with the one
  approved reference-card composition.
- Updated presentation tests to assert the new ownership boundary while
  retaining public-profile layout, draft/publish, auth, media, and RPC tests.

## Profile Studio reference-first shell replacement — 2026-08-14

- Replaced the obsolete dashboard presentation with the approved versioned
  Profile Studio shell: selected-profile photographic environment, compact
  header menu, reference-width editor surface, and sticky live preview rail.
- Reused the existing ProfileSettings route adapter, editor sections,
  draft/publish orchestration, ProfileShell snapshot, media contracts, and
  destination routing without adding a compatibility presentation branch.
- Replaced the old nested preview chrome and Catppuccin dashboard framing with
  the shared glass IdentityCard presentation while preserving the five layout
  implementations and public-profile behavior.
- Retired inactive visual source files after import/reference checks; historical
  milestone records remain but no longer point to those files as authorities.

## Canonical profile motion layer — 2026-08-14

- Added the free `profile_motion_perspective_tilt` catalog item and the
  additive catalog/equipment migration without adding featured shop UI or new
  pricing behavior.
- Added the shared `ProfileMotionEffect` and controller. Public profiles and
  the homepage use viewport input; Profile Studio passes the preview stage for
  container input. Layout metadata selects a bounded identity/layout target so
  page backgrounds and continuation content never tilt.
- Removed homepage-only tilt state/listeners and separated motion-wrapper
  rotation from inner card roll scale. Added controller, catalog, render-model,
  editor, and integration regressions for the exact formula and interaction
  boundaries.

## R2 deletion lifecycle clarification — 2026-08-14

- Production forensic reads showed the canary avatar/background rows remained
  `active` with typed selections cleared and no cleanup jobs. The observed
  action was the existing unequip path, not permanent library deletion.
- Permanent R2 library deletion now routes by `storage_provider` even when the
  user-facing R2 rollout flag is disabled, preventing a rollback from sending
  an R2 asset through the Supabase-only deletion RPC.
- Studio labels distinguish `Unequip` from `Delete from library`, and the
  database security suite covers durable deleted-tombstone key retention and
  cleanup claiming after an external failure.

## Supabase modern key compatibility — 2026-08-13

- Browser Supabase initialization now prefers `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Pages Functions, scripts, and privileged Edge Functions now prefer
  `SUPABASE_SECRET_KEY` through shared credential/header helpers.
- Legacy key variables remain compatibility fallbacks for the two-phase
  production configuration change. Modern project keys are never synthesized
  into bearer credentials, while real user JWTs remain bearer tokens.
- Build, Svelte check, ESLint, full tests, security/profile gates, and the
  local disposable-R2 application smoke pass with the canonical variable names.

## Profile media R2 migration foundation — 2026-08-13

- Removed public ProfileShell timestamp cache busting and avoided mounting a
  full background image beside active background video.
- Added provider-neutral R2 media references, immutable-key metadata fields,
  ready/publication state, direct-upload control-plane endpoints, temporary
  private-to-public promotion, and R2-aware selection/deletion semantics.
- Added discovery/home/leaderboard/provider-preview projection support so R2
  avatars do not disappear outside the main profile route.
- Added idempotent active-selected Supabase→R2 migration tooling and a durable
  account-deletion cleanup queue with retryable service processing.
- R2 policy is Standard-only: no Infrequent Access, no automatic transition,
  and no paid media proxy. Production bucket/domain/CORS/secret provisioning,
  backfill, and zero-Supabase-read verification remain external gates.

## Profile Studio lifecycle cleanup — 2026-08-13

- Removed whole-profile session/view-state persistence and mount-time restores
  from Identity, Layout, Content, and Widget editors.
- ProfileSettings now passes the live canonical `studioDraft` into editor
  configuration props, while identity controls receive `studioIdentityDraft`;
  editor-local state cannot resurrect unpublished profile data after refresh.
- Customize no longer loads or mounts hidden legacy Content/Widget editors, so
  their stale state cannot make the preview dirty or block Publish invisibly.
- Retained view state only for UI preferences in Discovery and Shop. Added
  source and production-browser regressions for stale session injection,
  delayed mount stability, clean-state parity, and hidden-editor absence.

## Studio ownership cleanup — 2026-08-12

- Layout patches preserve all Link Style fields except alignment, preventing
  layout changes from resetting Link editor settings in either direction.
- Minimal and Portfolio disable surface color, opacity, and blur controls
  without clearing the configured values used when a surfaced layout returns.
- Removed unused whole-configuration editor getters, made continuation DOM
  order explicit (About/Projects → Links → Media), and removed the accidental
  root terminal-help output file.

## Studio appearance ownership hardening — 2026-08-12

- Split Media Background Treatment from the general Appearance patch scope;
  it now emits only background-treatment fields.
- The canonical Studio draft projector merges background treatment into the
  existing appearance without allowing stale surface color, opacity, blur,
  radius, or text values to overwrite it, and general Appearance patches keep
  the current background slice intact.
- Added a production browser regression crossing Appearance → Media →
  Appearance and checking the actual profile boundary's color, opacity, blur,
  and background-treatment state.

## Renderer consolidation — 2026-08-12

- Added `buildProfileRenderSnapshot()` as the single resolved profile model for
  public rendering and Studio Live Preview. It centralizes draft/published,
  expression-media, identity-preview, and cosmetic-preview precedence while
  preserving the current five layout renderer.
- Routed Studio and public `ProfileShell` instances through the same snapshot
  contract. Studio now waits for a complete renderable snapshot instead of
  briefly mounting a fallback profile, while keeping the readable physical
  desktop/mobile preview host and opening-centering behavior.
- Added unit/source contracts for rich public/Studio parity, public published
  precedence, incomplete V2 media envelopes, explicit media overrides, stable
  partial edits, and empty-profile continuation behavior.
- Extended production browser smoke to compare canonical render markers,
  layout/media/surface/name/cosmetic state, and opening geometry between Studio
  and public profile hosts. Fresh production evidence completed for the rich
  five-layout fixture.
- Corrected standalone audio deletion selection logic and verified unused
  asset deletion does not bump the profile configuration token. Local DB lint,
  reset, and security audit pass on the clean migration state.

## Focused profile polish — 2026-08-12

- Compact owner/visitor Daily Color now bounds the actual rendered color, not
  only its outer preview frame.
- Avatar, username, bio, metadata, and visible social glyph sizing received a
  modest readability pass without changing the five-layout footprint.
- About, Projects, custom Links, and rich integrations now share a centered
  continuation column with consistent quiet surfaces; custom links have no
  decorative northeast-arrow glyphs.
- Unused saved-media deletion no longer bumps the profile configuration token;
  selected media still clears its reference and returns the new token.

## Final profile correctness pass — 2026-08-12

- Immediate audio, rich-media selection/deletion, and cursor replacement RPCs
  now return the `profile_configurations.updated_at` token they changed.
- Existing Studio expression events propagate that token into the next
  optimistic Publish request, covering media mutation followed by a layout
  change without weakening conflict detection.
- Live Preview separates opening overflow from continuation overflow, keeping
  fitting openings centered while preserving top access for genuinely tall
  openings.
- Public continuation cues distinguish `Links ↓` from generic `More ↓` lower
  content, and focused browser coverage exercises media mutation followed by
  Publish.

## Profile publish and continuation correctness — 2026-08-12

- The Studio publish RPC now re-reads and returns the complete expression-aware
  V2 draft/published projection before the client clears preview overlays, so
  avatar/background and related media remain visible immediately after publish.
- Physical Studio preview centering now distinguishes fitting content from
  overflow; tall profiles remain top-accessible and scrollable without a
  virtual viewport or DOM transform.
- Studio shows the real continuation links for compact previews, and public
  compact layouts expose a quiet `Links ↓` cue only when lower content exists.
- Link partitioning classifies services before filling the bounded opening, so
  social links ordered after custom destinations still render in the opening.
- Background video is excluded from lower-content existence checks, preventing
  an empty `profile-more` region.
- Focused tests and the local dev browser smoke cover the publish boundary,
  media retention, continuation links/cues, category-first ordering, preview
  scrolling/centering, and the five-layout rich fixture.

## Focused profile-layout cleanup — 2026-08-12

- Draft layout edits now compare normalized state with the published baseline,
  so reverting layout or alignment changes returns Studio to clean state.
- Minimal page placement is owned by ProfileShell only, and empty lower profile
  sections are omitted unless real continuation/story/expression content or a
  Portfolio below-fold roll exists.
- Studio desktop preview has a taller, scrollable desktop-like stage with a
  visible continuation affordance; the physical readable preview and portrait
  mobile mode remain unchanged.
- Compact, Sleek, Modern, and Portfolio keep custom navigation links below the
  opening while social services remain icon-first; Minimal permits only a
  small opening custom-link set. Important profile metadata is slightly more
  readable without enlarging the profile surface.
- Added focused unit/source and browser-smoke assertions for dirty state,
  Minimal offsets, empty lower content, preview geometry, link partitioning,
  and duplicate prevention.

## Final profile-layout hardening — 2026-08-12

- Split the opening six links from continuation links and prevented cached
  layout drafts from publishing stale appearance/media/identity fields.
- Removed the default public-profile header reservation, scoped legacy quiet
  owner-roll rules away from compact profile presentation, and kept compact
  music from embedding the full Spotify surface.
- Added deterministic rich-profile browser coverage with a real uploaded
  637×311 background and active composed name effects across public and Studio
  paths, including direct refresh checks and owner/visitor roll coverage.
- Changed the Studio desktop environment to a readable 16:10 physical stage,
  kept mobile preview portrait-oriented, and removed the fake secondary device
  sample. Custom navigation links remain labeled while canonical social
  services use icon-first treatment.
- Consolidated superseded ProfileShell contracts and deferred nonessential
  below-fold social rendering so the Dashboard bundle retains measurable
  headroom without changing performance budgets.
- Hardened production surface CSS so cardless layouts do not retain the base
  backdrop blur after CSS compilation, and made the atomic Studio publish RPC
  use the exact locked-row timestamp rather than a JSON timestamp round trip.
- Fresh dev and production browser smoke both completed all 15 steps; each
  produced the five-layout public/Studio screenshot set from the same rich
  fixture.

## Profile layout renderer stabilization — 2026-08-12

- Removed the transformed 1440×900 Studio canvas. Live preview now uses a
  readable physical stage with explicit desktop/mobile rendering context and
  keeps the background/effects around the compact profile surface.
- Statically imported ProfileLayoutFrame and separated geometry ownership from
  ProfileBorderEffect surface ownership. Public profile pages and mobile
  layouts now retain full viewport height, while cardless Minimal/Portfolio
  avoid decorative card surfaces.
- Bounded NameEffectCanvas measurement to one logical coordinate system and
  shared layout-controlled name sizing. Compact owner rolls and compact music
  avoid browser-viewport desktop geometry and oversized Spotify embeds.
- Removed fake Sleek presence and Modern tab semantics, split Minimal social
  services from custom navigation links, and made mobile preview precedence
  explicit after layout-specific desktop rules.
- Added production browser assertions for physical preview size, structural
  layout differences, background bounds, computed public surface behavior,
  critical hashed CSS/JS failures, sane name canvases, and no stale 1440/scale
  preview path.

## Remove public-profile Share control — 2026-08-11

- Removed the standalone Share profile button and its lazy dialog mount from
  the public ProfileShell. Existing public profile URLs and discovery/roll
  sharing contracts remain unchanged.
- Removed the unused legacy profile-header Share action as well, and added a
  source contract preventing the profile renderer from reintroducing the
  standalone control.

## Public profile layout replacement — 2026-08-11

- Replaced the active novelty layout catalog with five compact structural
  renderers: Compact, Sleek, Minimal, Modern, and Portfolio. Compact is the
  safe default and no layout is entitlement-gated.
- Reused the public ProfileShell and Studio live preview renderer, with a
  shared IdentityCard and density-aware ProfileDailyRoll. Layouts leave the
  user-controlled background and equipped effects responsible for personality.
- Added monochrome allowlisted SVG service icons with accessible labels and
  removed the redundant `@username` identity line.
- Added additive migration
  `20260811150000_profile_layout_catalog_replacement.sql`, including legacy
  mapping, safe inventory quantity merging, equipped-layout migration, active
  catalog replacement, and configuration normalization. Historical layout rows
  remain retired rather than being deleted.
- Added five-layout Studio picker and production-browser assertions for shared
  bounded rendering, readable identity geometry, daily-roll presence, no
  redundant handle, and no clipped content.

## Profile Studio hardening — 2026-08-11

- Replaced the single Customize dirty flag with source-aware aggregate state,
  including a clean-on-revert Appearance signal and explicit Identity, Media,
  Layout, Links, Content, and Widgets sources. Studio no longer leaves a
  focusable hidden Save bio action in the aggregate workflow.
- Added the authenticated `publish_profile_studio_v2` transaction boundary so
  configuration, identity, and publication roll back together. Existing
  compatibility RPCs remain available; the new migration uses fixed search
  path, least-privilege execution, and database tests cover a failed publish.
- Reduced narrow-editor density by making the full Appearance picker
  collapsible, adding accessible saturation/brightness controls, clarifying
  immediately applied cosmetic equipment, and increasing common media and
  Roll interaction hit areas. Nested Background Treatment now responds to its
  own inline-size container.
- Added the performance budget and production-preview browser smoke to CI.
  Local production-preview smoke, build, checks, lint, unit tests, database
  reset/lint/security, scoring parity, links, CSP, and drift checks pass. The
  Dashboard remains within its current budget with limited headroom, so no
  budget increase was made.

## Profile Studio responsive and draft hardening — 2026-08-11

- Integrated the Customize Identity editor with the aggregate Studio draft:
  preview changes now mark the dashboard dirty, validate with the other
  editors, survive Reset, and publish through the existing owner-scoped
  identity boundary alongside the V2 profile configuration.
- Fixed compact Visual Effects specificity so the phone layout can override
  the four-column desktop grid. The grid uses two columns in narrow editors,
  horizontal rows on very small phones, and separate name-effect previews
  beside native selects.
- Added named inline-size containers to Appearance, Cosmetics, and Media so a
  narrow editor pane inside a desktop/tablet viewport receives the same useful
  layout as a narrow phone. Media action controls also meet a larger touch
  minimum.
- Added a persistent mobile Studio title and sticky tab row, Preview control, and
  conditional Publish bar with safe-area spacing; the preview gets an explicit
  relationship to its control and clears space above the publish bar.
- Extended source and browser-smoke coverage for identity publish requests,
  persistent mobile tab navigation, narrow effects/media geometry, and the
  480–576px container boundary class of regressions.
- The follow-up hardening adds one additive Studio publish migration and
  security coverage; gameplay, roll-authority, authentication, RLS boundaries,
  and commerce contracts remain unchanged.

## Restore responsive CSS in production builds — 2026-08-11

- Removed the incompatible post-build CSSO pass that deleted Vite's compiled
  `width <= ...` and `height <= ...` responsive media queries; Vite's built-in
  CSS minification remains enabled.
- Removed CSSO from the manifest and lockfile, and added
  `npm run check:responsive-build`, which requires the compiled width/height
  query families and a safety-floor count across `dist` CSS assets.
- Added a production-preview browser mode that builds, serves, and tests the
  bundle rather than relying only on the Vite development server. It verifies
  the 402×874 homepage header/hero geometry, authentication, Profile Studio
  geometry across phone/tablet/narrow-desktop widths, reduced motion, and a
  public-profile direct refresh.
- Added the compiled CSS gate to CI. The local preview harness uses a temporary
  loopback HTTPS proxy for local Supabase so production URL validation stays
  intact and no real credentials or certificates enter the repository.
- Final validation passed: production build, compiled responsive CSS gate (129
  width/height queries across 64 assets), Svelte check, 284 Node tests, ESLint
  with 0 errors, development and production-preview browser smoke, links, CSP,
  performance budgets, policy/balance/catalog drift, scoring parity, database
  security, and lockfile dry-run. The performance check retains its existing
  non-failing asset-catalog advisory. No data, migration, RPC, RLS,
  authentication, roll-authority, or commerce contracts were changed.

## Responsive and usability hardening — 2026-08-11

- Reworked the homepage Today's Color medium-width composition so the roll
  visual, result identity, and statistics keep usable columns from tablet
  through narrow desktop widths, with the existing one-column phone fallback
  preserved.
- Returned public-profile wheel and trackpad scrolling to normal browser
  behavior by removing the wheel interceptor and changing profile section
  snapping from mandatory to proximity.
- Made Profile Studio's mobile preview height-aware on short landscape
  screens, added safe-area padding to fixed preview surfaces and share dialogs,
  and enlarged key mobile controls.
- Added container-query stacking for narrow paid identity layouts and disabled
  the typewriter clipping treatment when the card cannot support a narrow
  single-line rail.
- Reduced Discovery's phone cards to the identity, latest color, score, and
  profile action hierarchy; lower-value streak/roll metadata is kept for the
  full profile, while filters, tabs, sharing, and profile actions gain larger
  touch targets.
- Simplified profile-mode mobile navigation by keeping Edit visible while
  moving account actions into the existing menu, and standardized editable
  mobile controls around a readable 1rem text size.
- Added source-contract coverage in `test/responsive-hardening.test.js` for
  the homepage, profile scroll behavior, Studio short-height bounds, identity
  cards, mobile header, share-dialog focus management, and mobile form sizing.
- No data, migration, RPC, RLS, authentication, roll-authority, or commerce
  contracts changed.
- Final validation passed: Svelte check, production build, ESLint, 282 Node
  tests, 8 responsive contract tests, local Profile Studio browser smoke,
  link/CSP/performance, policy-drift, catalog, scoring-parity, and database
  security checks.

## Correct small-screen Profile Studio composition — 2026-08-10

- Reproduced the dashboard at the supplied 414×896 phone size and a 1100px
  narrow-desktop/zoom-width equivalent instead of checking viewport bounds
  alone.
- Moved the narrow-desktop Live preview into a reserved grid rail so the
  appearance editor and color picker no longer sit underneath it.
- Added a 72rem Appearance fallback for the surface controls and a preview
  container-query fallback that stacks identity cards inside narrow docks.
- Kept the mobile navigation hidden until opened and verified the full-width
  preview drawer, sidebar state, profile card, and editor at 414×896.
- Captured authenticated browser evidence for the narrow-desktop and phone
  compositions alongside the existing destination and reduced-motion checks.

## Audit Profile Studio on smaller screens — 2026-08-10

- Audited Customize Appearance, Media, and Layout at 320, 360, 390, 600,
  768, 1024, 1100, and 1280px, including visible controls and nested editor
  bounds.
- Audited Overview, Links, Premium, Analytics, Notifications, Privacy &
  social, and Settings at phone and tablet widths; progression now has its own
  dedicated route.
- Fixed Appearance's intrinsic grid sizing so hex fields, picker rails, and
  surface sliders stay inside the editor at intermediate tablet widths.
- Kept the mobile Preview action available and bounded the fixed preview drawer
  to the viewport after inherited desktop margins are removed.
- Added authenticated browser geometry coverage for the width matrix,
  destination surfaces, mobile drawer, preview drawer, and document overflow.

## Recover cursor staging and avatar fitting — 2026-08-10

- Refresh the private rich-media library before cursor uploads choose between
  initial staging and transactional replacement, preventing an in-flight asset
  query from producing a false full-slot error.
- Remove expired staged rows before enforcing the cursor slot and retain the
  storage deletion guard required by Supabase's protected storage tables.
- Force compact avatar media to fill a fixed circular frame while preserving
  the existing uploaded asset path and object-fit behavior.
- Compact the Custom cursor into an asset/action row and let Background options
  keep its natural control height without decorative panel metadata or copy.

## Align the Profile Studio Media workspace — 2026-08-10

- Added a component-owned `ProfileMediaWorkspace` that flattens only the
  compact editor presentation into a stable reference grid: Background,
  Avatar, and Profile audio across the first row, with Custom cursor beside
  Background options on the second row.
- Replaced the oversized square avatar and width-driven media wells with
  bounded preview heights, circular avatar fitting, compact status dots, and
  reference-style Replace/Remove action rows for active assets.
- Added authenticated browser geometry assertions for row alignment, order,
  second-row pairing, and workspace bounds at the existing smoke viewport;
  upload, remove, waveform, treatment, draft, and RPC contracts remain in the
  existing child components.

## Stabilize Profile Studio previews and media — 2026-08-10

- Flattened the compact name/visual fitting room into its owning Appearance
  surface and normalized the three name controls around one progressive
  production loadout path. The canvas now tracks the incoming loadout
  reactively, so Font, Material, and Motion previews do not become stale after
  the dashboard has been open or after a sibling control changes.
- Replaced the cursor-card sketch with the production cursor-trail renderer in
  deterministic demo mode, retained transparent effect-card stages, and made
  avatar media wells round without changing stored media paths.
- Added bounded atmosphere recovery with lazy loading, visibility and viewport
  checks, retry limits, and poster fallback. This addresses long-lived tabs
  where a decorative atmosphere video stalls or a changed scene remains stuck.
- Added normalized background treatment controls for blur, image opacity,
  overlay color, and overlay opacity. The controls feed the existing draft
  projection and update Live preview without save/publish RPCs.
- Added a waveform-based compact audio player, balanced media-card order, and
  cursor replacement transactions that stage a new cursor before committing it
  and deleting the old storage object.
- Live preview now clips page background paint to a rounded profile card and
  gives mobile mode an explicit bounded phone/card geometry. Reduced-motion
  behavior remains respected by both atmosphere and cursor renderers.
- Fixed the Motion fitting-room preview to use the selected catalog `css_value`
  and its actual animated Name renderer, while keeping Font and Material still
  for comparison. Name, cursor, and atmosphere renderers now explicitly
  resume after hidden Customize tabs restore their geometry; transient video
  buffering no longer immediately strands an atmosphere on its poster.

## Component-owned Profile Studio dashboard — 2026-08-10

- Reduced `ProfileSettings.svelte` to the route/state adapter while preserving
  legacy hashes, direct refresh, save/publish, upload, equip, and account
  boundaries.
- Added owned shell/header, destination workspace, persistent Live preview,
  and dirty-prompt components, with a section registry for dashboard routing
  and lazy editor ownership.
- Added one internal draft/preview projection for identity, configuration,
  media, layout, and cosmetic drafts so editor changes reach Live preview
  immediately without invoking save or publish RPCs.
- Added explicit renderer contexts for live profiles, catalog cards, effect
  cards, and compact name controls; moved Customize-specific geometry into the
  owning editors while preserving standalone editor layouts.
- Added behavior/source contracts for routing, draft aggregation, renderer
  geometry, ownership boundaries, keyboard navigation, and preview composition;
  browser smoke now includes the Layout workspace geometry check.
- Refined the compact cosmetic fitting room with larger, readable controls
  and context-owned name preview sizing, overflow, and centering; the later
  stabilization flattened its extra card surface while retaining the owning
  Appearance card.
- Matched effect-card surfaces to the Mocha inset instead of the catalog
  canvas, normalized all name-control text metrics, and replaced the earlier
  bounded Pixel Wake sketch with the production cursor-trail demo renderer.
- The initial pass required no database migration; the stabilization adds only
  the additive normalized background fields and owner-authorized cursor
  replacement RPCs documented above.

## Replace cosmetic placeholders with live previews — 2026-08-10

- Replaced the four decorative effect sketches with selected catalog-item
  previews backed by the production Name, Avatar, Border, Cursor, and
  Atmosphere renderers.
- Added compact renderer output inside each Name selector.
- Removed the duplicate paid-layout selector from effects; Layout owns it.
- Fixed default-profile border suppression and kept every try-on temporary
  until Apply changes.
- Added authenticated browser proof that Permanent Marker and Celestial Border
  update both their cards and the persistent Live preview before saving.

## Link Profile surface controls and effect preview — 2026-08-10

- Moved Profile surface color out of the general color matrix and placed its
  swatch, native picker, and hex input beside opacity and blur.
- Kept the surface role connected to the shared HSV picker and immediate
  configuration preview path.
- Verified that name font/material/motion and every visible visual-effect
  selector dispatch a temporary cosmetic loadout to the persistent Live
  preview before Apply changes.
- Added authenticated browser coverage for surface placement and immediate
  surface-color rendering, plus source contracts for the complete effect path.

## Merge Effects into Appearance — 2026-08-10

- Reduced Customize to Appearance, Media, and Layout.
- Moved the renderer-backed visual-effect collection into Appearance beneath
  identity, profile colors, and surface controls.
- Preserved temporary cosmetic preview, Apply changes, entitlements, and the
  existing server-authoritative equip/unequip RPCs.
- Redirected legacy Effects, Collection, and Widgets hashes to Appearance.
- Added source and authenticated browser coverage for the three-tab contract
  and the visible effect controls inside Appearance.

## Audit Customize controls and unify live preview — 2026-08-10

- Audited every visible Customize control against normalized configuration,
  public rendering, media persistence, or cosmetic equip contracts.
- Removed local-only Surface tint and Border color roles, the fake Celestial/
  Plain/Glass surface selector, unsupported background fit/position controls,
  atmosphere-strength and animation controls, and layout width/navigation/
  mobile controls that had no saved or rendered effect. Persisted blur,
  image-opacity, overlay-color, and overlay-opacity treatment was subsequently
  restored as the normalized Background options group.
- Kept legacy normalized fields intact for backward compatibility while
  removing only their unsupported editor affordances.
- Made Profile colors and Profile surface use the same section surface as
  Profile identity, while inputs remain on the darker recessed layer.
- Removed the restored-draft status copy and made identity edits update the
  Live preview on input.
- Composed appearance, content, widget, layout, identity, and cosmetic try-on
  drafts into the persistent Live preview so one editor no longer overwrites
  another editor's staged state.
- Added browser coverage for immediate bio and profile-color preview updates,
  plus source-contract coverage preventing removed controls from returning.

## Focused default profile and live picker marker — 2026-08-10

- Fixed the HSV picker dependency so the saturation/brightness marker and hue
  handle react immediately to palette, hex, native color, keyboard, and drag
  edits without waiting for a role switch.
- Changed the new-profile Signal default to the focused identity composition:
  a generated deep-blue nebula/starfield texture, avatar above the name,
  metadata and bio in the center, and structured links anchored in a compact
  footer without a visible handle line.
- Removed the nested default border wrapper so the focused profile has one
  perimeter, matching the reference card instead of stacking an equipped
  border around the identity surface.
- Removed the live-preview-only shell frame and fixed-height canvas so the
  generated identity card ends with its content instead of an empty second
  panel beneath it.
- Made the fresh-profile page canvas transparent inside Profile Studio so the
  generated starfield card no longer sits on a visible blue rectangle.
- Kept authored backgrounds, atmospheres, saved layout variants, and server
  configuration authority unchanged; the default starfield is opt-in only
  while those custom surfaces are absent.
- Added source and contract coverage for picker marker positions and the
  default profile presentation.

## Recess Studio controls and wire the selected color picker — 2026-08-10

- Aligned the aggregate Customize profile action bar and Appearance/Media/
  Effects/Layout tab row with the editor-card gutter on desktop, with the
  existing mobile reset preserved.
- Recessed text inputs, selects, and textareas onto Catppuccin Crust while
  keeping range, color, file, checkbox, and radio affordances component-owned.
- Added one shared allow-listed profile-color role contract and functional
  HSV saturation/brightness, hue, palette, native color, and hex editing for
  the selected role, including keyboard controls and invalid-hex validation.
- Draft preview, dirty navigation, aggregate publish/reset, RLS, and profile
  rendering boundaries remain unchanged.
- Validation: 259 tests, build, Svelte check, ESLint, links, CSP, performance,
  username/balance/catalog drift, scoring parity, database security, and
  authenticated desktop/mobile/reduced-motion browser smoke all pass.

## Align Studio header and support animated cursors — 2026-08-10

- Increased the Chromadie Plus upsell text size and aligned the sidebar brand
  with the Profile changes action bar's top rhythm.
- Restored a visible Catppuccin-green hover outline for the custom cursor well
  after the dashboard's scoped border override masked it.
- Fixed cursor media URL parsing and added bounded `.ani` support for normal
  and pointer cursors, including Storage MIME/policy and profile path updates.
- ANI assets stay server-authoritative, use the existing 128 KB cursor limit,
  and receive a safe preview badge when browsers cannot render ANI as an image.

## Simplify Studio accents and cursor controls — 2026-08-10

- Removed the desktop sidebar divider and decorative dashboard gradients while
  retaining flat Catppuccin Mocha surfaces and the existing Manrope font.
- Enlarged Profile media icons, upload hints, and card labels for easier
  scanning.
- Added a server-authorized Remove action for an active custom cursor without
  deleting its reusable library asset.
- Removed the visible Profile colors heading, doubled the Plus banner height,
  and removed its trailing arrow.

## Tune Studio proportions and recessed controls — 2026-08-10

- Matched the reference’s 14rem sidebar, compact navigation rhythm, one-rem
  editor gutter, and wider media-card spacing.
- Darkened the workspace and controls with Crust-derived blue-black mixes and
  kept section borders on the supplied Surface0/S1 tokens.
- Reduced media well minimums and editor control heights so General, Color,
  and Effects sections keep the reference’s compact vertical cadence.
- Rechecked authenticated direct refresh, publishing, mobile drawer focus, and
  reduced-motion browser behavior.

## Match Profile Studio to the Mocha dashboard reference — 2026-08-09

- Rebuilt the Studio frame as a full-height Catppuccin Mocha workspace with a
  dedicated brand area, grouped line-icon navigation, and an owner profile card.
- Removed the redundant global header from Studio only, moved Overview into the
  Customize group, and omitted the theme switcher requested for this layout.
- Restyled action, media, general, color, and effects regions as layered
  Base/Mantle surfaces with recessed inputs, clearer borders, and restrained
  semantic status colors.
- Verified direct refresh, draft publishing, live preview, mobile drawer and
  focus behavior, reduced motion, and public-profile refresh in browser smoke.

## Invert Profile Studio depth for decisive contrast — 2026-08-09

- Moved the workspace to Catppuccin Crust and raised every large Studio section
  to Surface0 so section boundaries are visible before individual controls.
- Recessed inputs and media wells to Base and Mantle, with Surface1/Surface2
  borders and restrained semantic top edges.
- Kept the established Studio geometry, mobile layout, focus behavior, preview,
  and publishing flows intact.

## Give every Studio section a Crust surface — 2026-08-09

- Set the dashboard workspace to Catppuccin Base and every large section to
  Catppuccin Crust for one consistent, clearly separated depth layer.
- Kept Mantle and Surface0 for nested panels and form controls so inputs remain
  easy to identify against the darker section backgrounds.
- Preserved all dashboard layout, responsive, preview, and publishing behavior.

## Make profile card blur sample the page media — 2026-08-09

- Rendered the uploaded background as one real page-level image layer so the
  card's transparent backdrop-filter samples the same media the visitor sees.
- Removed the CSS background indirection and all duplicate card-local media
  copies; page media remains sharp outside the card while the translucent
  surface softens what is behind it.
- Preserved the standards-track backdrop filter through Vite's production CSS
  minification with a feature-query fallback, keeping the deployed card blur
  reliable without disabling the route performance optimizer.
- Extended browser smoke coverage to publish the maximum blur value, reload the
  public profile, and assert the card-only media boundary.

## Balance General Customization controls — 2026-08-09

- Made the Bio field span the Location/Timezone and Description/Entry rows so
  the textarea fills the full left side of the compact desktop editor.
- Tightened the right-side row gap and moved the visibility checkboxes beneath
  Bio, keeping the desktop composition balanced without changing save or
  presentation contracts.
- Reset the layout to normal flow at tablet and mobile widths so the editor
  remains readable and usable on narrow screens.

## Correct Profile Studio surface controls and card blur — 2026-08-09

- Moved Profile Surface into the Surface group beside its linked opacity and
  blur controls; the standalone Profile colors group now contains six colors.
- Added a card-scoped backdrop layer so surface blur samples the main profile
  background behind the identity card without blurring the page or roll UI.
- Removed the stale card-media and atmosphere filter paths that could blur the
  wrong layer; saved appearance data and the existing renderer contracts stay
  backward-compatible.

## Rebalance Profile Studio darkness and control contrast — 2026-08-09

- Added a Crust page gutter so the Base/Mantle editor sections read as lifted
  layers instead of blending into the surrounding canvas.
- Reduced accent border intensity and softened Surface0 control fills so form
  fields support the sections rather than becoming competing panels.

## Unify Profile Studio typography with Manrope — 2026-08-09

- Added a locally bundled Manrope variable font for Profile Studio UI text,
  headings, labels, controls, and buttons.
- Kept IBM Plex Mono for technical values, counters, statuses, and hex fields;
  homepage and public-profile typography remain unchanged.

## Simplify Profile Studio surface contrast — 2026-08-09

- Replaced the bright large-panel fills with alternating Catppuccin Crust,
  Mantle, and Base backgrounds.
- Reserved Surface0/Surface2 and the brighter palette colors for input fields,
  borders, labels, buttons, and semantic accents.

## Strengthen Catppuccin surface hierarchy in Profile Studio — 2026-08-09

- Separated the large Customize and dashboard action surfaces with Mocha
  Surface0/Surface1 roles instead of relying on nearly identical panel fills.
- Increased the existing semantic accent tint slightly so media, general,
  appearance, and other sections remain distinct without changing layout.

## Add semantic Catppuccin contrast to Profile Studio — 2026-08-09

- Kept the dashboard geometry unchanged while assigning the supplied Mauve,
  Sapphire, Pink, Teal, Green, Yellow, Peach, and Lavender accents to existing
  navigation, status, and workspace surfaces.
- Added restrained accent tinting to the media, general, color, and other
  customization surfaces so the Mocha neutrals have more visual separation.

## Catppuccin Mocha Profile Studio palette — 2026-08-09

- Scoped the Catppuccin Mocha palette to Profile Studio, mapping dashboard
  surfaces, text, borders, accents, status colors, and inputs to the reference
  tokens.
- Kept the existing dashboard layout, navigation, spacing, controls, mobile
  behavior, and reduced-motion behavior unchanged.

## Simplified color customization and profile publishing — 2026-08-09

- Reduced Color Customization to the seven profile palette colors plus surface
  opacity and blur; highlight, border, border-color, and background-gradient
  controls are no longer exposed in the dashboard.
- Kept legacy appearance values readable through the existing normalizers so
  historical profiles and rollback paths remain safe and compatible.
- Removed the repeated editor Reset, Save draft, and Publish footers. Customize
  and Links now share one dashboard action bar whose Reset and Publish profile
  controls operate on the assembled profile configuration.
- Publish uses the existing owner-authorized V2 save/publish RPC pair, while
  media uploads, identity bio saves, collection actions, and privacy settings
  retain their existing scoped authority boundaries.
- Added aggregate draft validation, conflict/error feedback, keyboard-safe
  mobile action layout, and reduced-motion coverage.

## Compact Customize workspace — 2026-08-09

- Reworked Customize into one continuous dark workspace based on the supplied
  dashboard reference: inline upload/preview cards, a Plus expression banner,
  and compact General, Color, and Other surfaces.
- Removed the page-level Customize toolbar and quick-jump rail so Profile media
  leads the page without redundant navigation chrome.
- Made the avatar, background, audio, and custom-cursor cards invoke the
  existing validated upload inputs directly and reflect the current media
  preview in place; full libraries and advanced settings remain behind one
  disclosure.
- Kept anchor targets for avatar, background, audio, Spotify, and rich-media
  controls so keyboard users and deep links can still reach the detailed
  editor without duplicating upload or entitlement logic.
- Preserved the lazy editor contracts, aggregate draft/publish behavior,
  media validation and RPC boundaries, and responsive/reduced-motion behavior.
- Updated focused dashboard coverage and verified the local desktop/mobile
  browser smoke flow plus the complete repository validation suite.

## Public site access switch — 2026-08-08

- Added the explicit `PREVIEW_PROTECTION=off` Cloudflare Pages environment
  switch so the temporary site-wide rehearsal gate can be lifted without
  deleting its middleware or changing Supabase account authentication.
- Preserved the fail-closed password gate when the switch is absent and added
  regression coverage for both public-release and protected behavior.

## Profile Studio readability pass — 2026-08-08

- Widened the desktop navigation and increased label/button sizing so the
  dashboard sections are readable without browser zoom; the mobile drawer
  keeps the same focus trap and inert behavior.
- Expanded the Customize workspace to the full editor column, simplified
  appearance/layout copy, and retained section-scoped save/publish controls.
- Reduced the inline preview to a compact identity card, hid daily-roll/story
  regions in preview mode, and kept draft appearance updates and public
  renderer behavior covered by browser smoke.
- Verified desktop, mobile, keyboard, reduced-motion, direct-refresh, and
  canonical public-profile smoke paths locally.

## Profile Studio navigation clarified — 2026-08-08

- Reorganized the owner dashboard around Customize, Links, Premium, and a
  clearly labeled Account group, with the active destination highlighted in a
  compact responsive sidebar.
- Added one expression workspace for identity, appearance, rich media, About,
  widgets, collection, and layout controls; separated public links, aliases,
  and sharing into their own destination.
- Added a Premium status/upsell surface that explains expression-only benefits
  and links to the existing $7.99 lifetime checkout without granting access.
- Preserved V1/V2 editor contracts and mapped legacy section hashes to the new
  destinations. Updated Studio shortcuts and focused navigation coverage.

## Restore rich-media uploads after a Storage policy collision — 2026-08-08

- Corrected the staged `profile_media` INSERT policy to compare the uploaded
  object's MIME metadata, not the similarly named staged asset JSON column.
- The correction covers all bounded rich-media kinds—background video, banner,
  audio, cursor, and pointer cursor—without changing the Plus/staff gate or
  quota accounting.
- Added source and database-security regression assertions; remote deployment
  follows local schema lint/reset and the required validation suite.

## Atelier expression restoration and dashboard guidance — 2026-08-08

- Restored the two original Atelier expression identities as structured,
  premium `chromadie_plus` rows: Prism Atelier Name under Name → Motion and
  Prism Atmosphere under Atmosphere. No raw CSS or retired catalog slot was
  reintroduced.
- Added a Plus-aware Collection guide with direct shortcuts to the name
  effect, atmosphere, and Atelier template controls. The guide distinguishes
  an authored atmosphere from an uploaded background in Media.
- Added additive migration, seed/drift contracts, database-security count
  updates, and focused source coverage for the catalog and dashboard path.

## Pricing surface refreshed — 2026-08-08

- Added Pricing to the shared desktop and mobile site navigation with route
  prefetching and active-state semantics.
- Recomposed `/pricing` around the homepage's authored canvas: quiet rules,
  restrained accent color, lifetime value framing, free/Plus comparison, and
  the earned-color promise.
- Preserved the secure checkout, restore, entitlement, and staff-authority
  contracts while keeping the free profile complete and expressive.
- Updated the Checkout slice for Stripe Managed Payments with the supported
  API version, hosted personal-use SaaS tax code, and explicit merchant-of-
  record opt-in before production billing deployment.
- Full repository validation passed: build, Svelte check, 247 tests, source
  ESLint, link/CSP/policy/balance/catalog/scoring/performance checks,
  database-security checks, and parity certification.

## Competitor parity Milestone 13 implemented locally — 2026-08-08

- Added reversible audience rollout flags for commerce, rich media, V2
  configuration, expanded analytics, and social depth, with staff → internal
  → cohort → all-user stages and independent pause switches.
- Preserved the free image/V1 fallback whenever a matching surface is paused;
  server RPC, entitlement, storage, scoring, and gameplay authority remain
  unchanged.
- Added the three-profile parity certification fixture and executable contract
  check, plus the service-owned operations dashboard/alert contract for Stripe,
  staged media, provider errors, analytics retention, and social reports.
- Full validation, local schema lint/reset, and Chromium smoke pass locally;
  desktop/mobile profile captures are recorded under
  `/tmp/chromadie-m13-public-0g`. Production enablement remains operator-
  controlled behind the documented rollout stages.

## Competitor parity Milestone 12 implemented — 2026-08-08

- Added privacy-safe dimensional profile insights for views, stable link and
  project clicks, device class, country, and normalized referrer host, with
  consent, owner opt-in, 90-day retention, 7/30/90 comparisons, top-entry
  summaries, and CSV export.
- Added independent public view-count visibility, edge-derived dimensions, and
  a same-origin analytics function without viewer identity, IP, raw user agent,
  exact timestamp, or complete referrer storage.
- Added one-level guestbook replies, positive likes, popular/oldest/newest
  sorting, three-note owner pins, deletion, reply reporting, and grouped
  owner-only notifications for social and authoritative reward events.
- Added additive migration, source/unit coverage, RLS/RPC security assertions,
  local schema reset, and database-security validation. Full repository
  validation remains the milestone completion gate.

## Competitor parity Milestone 11 implemented — 2026-08-08

- Added the additive `ProfileConfigurationV2` envelope with V1-readable
  backfill, owner/public RPCs, and normalized identity, metadata, links,
  content, widgets, and sharing fields.
- Added finite identity presentation controls, 25 stable-keyed HTTPS links
  with a quiet six-link opening, safe Markdown AST About content, premium/staff
  project capacity up to ten, and allowlisted GitHub/Twitch/Last.fm/Discord
  provider cards with four premium/staff slots.
- Added canonical/alias share dialog behavior with code-owned QR generation,
  copy/download actions, and server-rendered structured metadata selected only
  from validated media.
- Kept the public profile closure below its blocking route budgets by lazy-
  loading the optional identity card and QR dialog; aggregate JavaScript/CSS
  catalog totals remain advisory.
- Added Milestone 11 source/domain coverage. The complete required build,
  Svelte check, repository ESLint, 238-test suite, link/CSP/policy/balance/
  catalog/scoring checks, performance budgets, local schema lint/reset,
  database-security suite, and Chromium smoke pass. Browser evidence:
  `/tmp/chromadie-profile-studio-smoke-Cm71kZ`.

## Competitor parity Milestone 10 implemented — 2026-08-08

- Added bounded premium/staff rich media: three background videos, five MP3
  tracks, one WebP banner, and normal/pointer cursor assets within a 150 MB
  profile quota.
- Added staged owner uploads, Storage MIME verification, reusable selection,
  deletion, audio trim/order/shuffle/loop/volume controls, refund recovery,
  reduced-motion handling, and finite Enter-gated playback.
- Added the additive rich-media migration, browser-authority tests, database
  security coverage, local schema lint/reset, and the complete validation plus
  Chromium smoke suite. The inherited aggregate JS/CSS catalog warning remains
  advisory; all hard route and initial-load budgets pass.

## Competitor parity Milestone 9 implemented — 2026-08-08

- Added the public `/pricing` and authenticated `/pricing/success` surfaces for
  a fixed $7.99 USD lifetime Chromadie Plus purchase and restore status.
- Added authenticated checkout/restore Edge Functions and a raw-body Stripe
  webhook worker. Only the signature-verified webhook can invoke the
  service-only entitlement processor.
- Added `20260808200000_lifetime_premium_fulfillment` with private billing
  records, canonical `chromadie_plus` backfill, `atelier_plus` compatibility,
  staff synchronization, atomic idempotency, refund/chargeback revocation, and
  a 30-day recovery marker.
- Added signature, route, authority, retry, duplicate, refund, and database
  privilege coverage. Live Stripe test-mode fulfillment remains an operator
  deployment check requiring hosted secrets and webhook configuration.

## Dashboard parity Milestone 8 deployed — 2026-08-08

- Added owner-managed Profile Studio aliases with up to three alternate paths
  per profile. Each `/a/<alias>` path resolves to the existing canonical
  `/<username>` profile URL.
- Added the additive `20260808190000_profile_aliases` migration with RPC-only
  browser access, RLS, username-policy and canonical-collision checks, bounded
  public resolution, and profile-delete cascade cleanup.
- Added direct-refresh and Pages redirect coverage, mobile/reduced-motion
  settings states, and database-security assertions for limits, grants,
  resolution, deletion, and cleanup.
- Custom domains, API access, external cutover, and password-gate removal are
  still separate operator-authorized work.

## Dashboard parity Milestone 7 deployed — 2026-08-08

- Added three free structured templates—Signal Garden, Editorial, and Color
  Archive—plus the existing entitlement-gated Atelier expression preset.
- Template application changes only the validated composition section. Manual
  layout edits become an explicit custom composition; links, content,
  appearance, media, widgets, history, cosmetics, and gameplay remain intact.
- Added `20260808180000_profile_templates`, which backfills a bounded
  `templateKey`, keeps legacy layout configurations readable, and rejects
  Atelier persistence unless the authenticated owner already has
  `atelier_plus`. It does not grant entitlements or add purchase paths.
- Local reset, schema lint, database security, full validation, browser smoke,
  and linked migration deployment pass. The next handoff is aliases, domains,
  and API access as separately scoped work.

## Dashboard parity Milestone 6 deployed — 2026-08-08

- Added a lazy Profile Studio Insights surface with explicit owner opt-in,
  aggregate totals, active days, daily view bars, and loading/error/empty,
  mobile, keyboard, and reduced-motion states.
- Added a separate consent-aware public-view recorder. It requires the
  visitor's existing product-event consent and the owner's insights opt-in,
  then uses a browser-local profile/day key before calling the bounded RPC.
- Added and deployed `20260808170000_profile_insights`: daily-only aggregate
  storage, no browser table grants, owner-only reads/settings, a one-million
  daily bucket cap, and 90-day cleanup. Profile deletion cascades the rows.
- Product-event measurement remains page-local; this milestone does not add a
  raw event sink, visitor identity, export, moderation queue, or gameplay
  coupling. Local reset, schema lint, database-security, targeted contract
  tests, the linked migration, and the Chromium browser smoke pass. Evidence:
  `/tmp/chromadie-profile-studio-smoke-InKDJi`.

## Dashboard parity Milestone 5 deployed — 2026-08-08

- Wired the existing bounded social projection into public profiles so
  visitors can favorite, send positive reactions, leave moderated guestbook
  notes, block, and report without a second social implementation.
- Added owner-controlled positive social count visibility. Hidden counts do
  not disable reactions or favorites, and the visitor's own state remains
  available so controls stay understandable.
- Added the additive
  `20260808160000_profile_social_summary_visibility` migration with a defaulted
  setting and owner-only five-argument settings RPC overload. Existing social
  rows, four-argument callers, reports, and guestbook moderation remain
  compatible.
- Added public-shell, renderer, normalizer, migration, and safe-text contract
  coverage. Local schema lint has passed; reset and the complete validation
  suite and linked migration deployment pass.
- The Chromium smoke was attempted after deployment but stopped before the
  first hydrated homepage step because the local browser reported repeated
  `ERR_NETWORK_CHANGED` failures; the captured evidence is under
  `/tmp/chromadie-profile-studio-smoke-Fw9vsM`.

## Dashboard parity Milestone 4 deployed — 2026-08-08

- Added a bounded `widgets` projection with Spotify and YouTube video support,
  strict canonical HTTPS parsing, provider uniqueness, and a two-widget cap.
- Added a lazy Profile Studio Provider widgets editor with draft, publish,
  conflict reload, reset, validation, and fitting-room preview feedback.
- Public profiles now generate only fixed official provider embed URLs; public
  frames are lazy and preview frames require an explicit load action.
- Existing legacy Spotify configuration remains compatible through normalized
  projection, and the privacy-enhanced YouTube frame origin is in CSP.
- The next handoff is positive moderated social features.

## Dashboard parity Milestone 2 complete locally — 2026-08-08

- Restyled standalone `/login` and `/signup` around the shared homepage
  `SiteModeHeader`, canvas, typography, stage, and responsive/reduced-motion
  contract; added route regression coverage so future standalone additions do
  not drift into a separate visual system.
- Added the owner-scoped `profile_media_assets` library with Storage-bound
  WebP registration, private RLS reads, owner deletion, selected-reference
  clearing, and compatibility for legacy single-slot paths.
- Profile Studio Media now keeps multiple avatar/background assets, previews
  them, applies a saved asset to the existing expression contract, and removes
  assets through the server RPC.
- Local schema lint and reset pass. The next handoff is structured About /
  Projects content regions; provider widgets and broader social features remain
  later milestones.

## Auth hydration regression fix — 2026-08-08

- Fixed the shared Supabase transport so GoTrue initialization and refresh do
  not recursively await `auth.getSession()` through their own fetcher.
- Persisted or expired sessions now reach a resolved signed-out, authenticated,
  or profile-error state instead of leaving the header hidden on account
  loading and blocking account-dependent discovery data.
- Added a transport regression test; the full suite now passes with 208 tests.

## Dashboard parity Milestone 1B complete — 2026-08-08

- Replaced the homepage authentication overlay with standalone `/login` and
  `/signup` pages using the existing Supabase auth form and callback/recovery
  contracts.
- Added safe same-origin return navigation, bounded username carry-over,
  direct-refresh route metadata, announced errors, initial focus, mobile
  containment, and reduced-motion behavior.
- Replaced homepage, header, founder, guest, and claim auth entry points with
  route navigation and removed the obsolete modal focus/body-scroll machinery.
- The Chromium smoke covers route navigation, auth route switching, signup,
  authenticated safe-return redirect, Profile Studio, mobile keyboard behavior,
  and canonical public-profile refresh.

## Dashboard parity Milestone 1A complete locally — 2026-08-08

- Added a forward-only migration and shared client policy for available 1–20
  character ASCII usernames while preserving moderation, exact reservations,
  case-insensitive uniqueness, pending-account reclaim, and `Admin`
  grandfathering.
- Hard-reserved the newly valid `c`, `og`, and `u` application routes and
  updated profile, challenge, signup/recovery, public projection, route, drift,
  and database-security contracts together.
- Signup and homepage claim controls now expose the one-character minimum. The
  browser gate created a two-character account and passed canonical profile,
  desktop/mobile, keyboard, preview, and reduced-motion checks.
- Local reset and schema lint pass; the full required suite passes with 206
  tests. The linked short-username migration is applied and aligned with the
  local migration history.

## Dashboard parity Milestone 0 complete — 2026-08-08

- Reconciled current migration/catalog truth and separated database readiness
  from the still-open external launch gates.
- Added `npm run test:browser`, a loopback-only Chromium smoke for signup,
  authenticated Profile Studio refresh, inline draft preview, blur and
  page/card/roll boundaries, mobile keyboard behavior, reduced motion, and
  canonical public-profile refresh.
- Lazy-loaded the homepage, narrowed the Supabase browser transport, replaced
  the Storage SDK route chunk with covered upload/remove requests, removed
  retired global CSS, and added deterministic CSS asset restructuring.
- Replaced the legacy aggregate release blocker with manifest-backed initial,
  largest-lazy, HTML, auth, homepage, public-profile, and dashboard budgets.
  Every hard gate passes; the 770.01 kB JavaScript / 375.73 kB CSS generated
  catalog remains an advisory growth signal.
- The complete required suite passes with 205 tests and the eight-step browser
  smoke. Milestone 1A, short username support, remains planned and unstarted.

## Compositor-safe blur follow-up — 2026-08-08

- Kept page-wide public backgrounds and atmosphere plates unfiltered outside
  the identity card.
- Added a card-local copy of those media plates for direct blur fallback, with
  scale compensation so blurred edges do not reveal gaps.
- Kept the identity surface's translucent `backdrop-filter` for ordinary
  background content and added regression coverage for the media projection.

## Blur visibility follow-up — 2026-08-08

- Removed atmosphere-layer isolation in both public and dashboard renderers so
  the identity surface can sample visible effect pixels with `backdrop-filter`.
- Added regression coverage for the public page layer, preview card layer, and
  shared fitting-room selector.

## Surface compositor follow-up — 2026-08-08

- Removed the extra isolated backdrop root from profile-card border wrappers so
  `backdrop-filter` can sample page-wide profile media and effects.
- Kept border clipping and animations intact while making the blur control
  compositor-visible.

## Appearance paint-order follow-up — 2026-08-08

- Moved public atmosphere and cursor layers onto the full profile canvas while
  keeping dashboard preview layers card-scoped.
- Emitted the translucent surface as validated RGBA and retained card-level
  backdrop blur, making opacity and blur respond to the stored values.
- Applied the same bounded effect placement to the dashboard fitting-room
  preview.

## Appearance renderer follow-up — 2026-08-08

- Public uploaded backgrounds now fill the profile page; dashboard and
  fitting-room previews keep media inside the identity card for cleanliness.
- Surface fill, blur, text, and highlight controls now have visible consumers
  in both shared card renderers, including layout variants that previously
  overrode the surface.
- Added editor guidance describing what each surface boundary means and why
  blur requires a translucent surface with content behind it.

## Customization settings audit — 2026-08-08

- Fixed the Collection fitting room so draft appearance, avatar, and background
  changes are reflected immediately instead of showing the published theme.
- Shared the validated appearance-to-CSS projection between the fitting room and
  the public ProfileShell.
- Kept atmosphere scenes and cursor trails page-wide on public profiles while
  preview media/effects remain card-scoped. The daily roll uses fixed system
  tokens and a fixed wide layout.
- Exposed existing module-size controls for secondary profile sections and
  blocked incomplete links before save/publish.
- Compared the bounded surface with current guns.lol and Haunt offerings. Their
  template/widget/font/crop/analytics features remain a future structured
  configuration phase rather than unrestricted user-authored code.

## Card-only profile customization — 2026-08-08

- Scoped draft profile appearance variables to the identity card in the shared
  profile renderer.
- Kept the daily roll on the system presentation tokens while preserving the
  server-authoritative roll and profile data paths.
- Added a source-contract regression test for the card/roll boundary.

## Persistent Profile Studio preview — 2026-08-07

- Replaced the temporary live-preview drawer with a persistent named preview
  pane in the Profile Studio dashboard.
- Kept the real preview-mode `ProfileShell`, normalized draft configuration,
  bounded profile context, deferred media behavior, and server-authoritative
  editor/equip contracts unchanged.
- Added a responsive wide-screen split layout and a stacked narrow/mobile
  layout, with the preview continuously mounted while dashboard sections
  change.
- Added source-contract coverage for the persistent preview and removal of the
  old overlay path.

## Full-page appearance dashboard — 2026-08-05

- Replaced duplicate settings chrome with the shared homepage header and a
  compact grouped dashboard sidebar.
- Added bounded appearance v1 fields for exact theme colors, surface opacity
  and blur, gradients, and base borders, with independent daily-color rendering.
- Added additive SQL normalization/backfill and owner-only appearance/composition
  save and publish RPCs with stale-write protection.
- Added a lazy real-renderer preview drawer, Account deletion surface, and
  concise dashboard hierarchy while retaining Collection, Progression, Shop
  compatibility routing, auth, and server authority.

## Full-page Profile Dashboard and progression rewards — 2026-08-05

- Replaced the settings route’s generic site chrome with a full-page Profile
  Studio shell containing owner navigation, account controls, live-profile
  access, and a responsive mobile drawer.
- Kept the existing section editor and live preview behind the shell, with
  Overview and Progression as first-class dashboard destinations.
- Added an owner-only progression RPC and a server-authoritative, idempotent
  milestone grant path inside `roll_die_impl(boolean)`.
- Added five EP-rank rewards using existing catalog keys and inventory rows;
  existing profiles are deterministically backfilled for rewards already
  earned.
- Added additive `new_milestones` roll response data and a client unlock notice
  without moving any reward authority into the browser.
- Added dashboard/progression contract tests. Full validation is pending for
  this slice; the repository’s known performance-budget baseline remains a
  separate risk to report if unchanged.

## Profile Studio dashboard pass — 2026-08-05

- Added a real Studio Overview with live identity context, current rank/EP
  progress, recent color trace, roll/streak/achievement summaries, and direct
  anchors into Identity, Collection, Progression, and Layout.
- Made Studio the primary authenticated header destination and changed the
  settings route title/description to match the dashboard role.
- Hid Shop from primary navigation and dashboard CTAs while preserving direct
  `/shop` routing, purchase/equip contracts, and the legacy settings escape
  hatch.
- Removed catalog loading from authenticated account bootstrap. Shop and
  Collection now load the catalog only when those surfaces are entered.
- Added compatibility mapping for old `#appearance` and `#account` settings
  hashes.
- Documented the next progression handoff: extend the existing transactional
  roll/achievement path with idempotent milestone grants and canonical response
  data; no new currency or client-authoritative rewards yet.

## Profile Studio / Collection / Progression slice — 2026-08-05

- Established the owner-facing decision boundary: Studio is the primary
  dashboard, Collection owns expression/equip, Progression owns earned story,
  and Shop remains secondary acquisition.
- Replaced the settings catch-all Account panel with a progression workspace
  showing rank, EP-to-next-rank, daily rolls, streaks, achievements, story
  collection unlock state, and recent roll history from existing authoritative
  profile context.
- Renamed the settings appearance destination to Collection without changing
  its server-authoritative inventory/equip behavior.
- Preserved `/shop`, catalog loading, purchases, entitlements, inventory, RLS,
  and historical cosmetic keys. No new economy or reward grant was added.
- Validation: build, Svelte check, ESLint, all 186 tests, links, CSP, username,
  balance, catalog, scoring, and database-security checks pass. The existing
  performance-budget check remains red for Initial JS, Total JS, and Total CSS
  (the repository was already over budget before this slice).

## Name Motion curation — 2026-08-05

- Replaced the 24-item motion catalog with ten curated gestures: Ghost
  Frequency, Scramble, Color Wake, Dustfall, Type In, Filament Trace, Prism
  Fracture, Molten Rise, Voltage Arc, and Archive Bloom.
- Added five renderer-owned Canvas 2D motions with vivid spectral, thermal,
  archival, filament, and electrical treatments; Dustfall now has a denser,
  brighter particle field.
- Restored the missing player-facing Type In label and updated live featured
  and homepage previews to use retained motions.
- Added a compatibility alias map and additive catalog migration. Nineteen
  deprecated motion rows become legacy-only, while existing equipped and
  inventory references remain valid. The active catalog is now 97 rows with
  10 Name Motions, 7 Name Materials, and 35 paid Name layers total.
- Curated the material shelf to Raised Glass, Carbon Vein, Afterglow, Soft
  Black, Quarry Mark, Cathode Bloom, and Draftline; fifteen rejected material
  rows are legacy-only and keep historical loadouts renderable.

## Shop card contrast pass — 2026-08-05

- Set catalog cards and preview stages to black so media and renderer details
  carry the visual weight instead of muted gray card fills.
- Removed the repeated name specimen from Profile Border thumbnails while
  preserving names in the inspector and live profile preview.

## Atmosphere replacement quality pass — 2026-08-05

- Replaced the weak Night Pollen plate with a denser particle-tunnel loop and
  renamed it Starlight Tunnel while preserving the `night-pollen` renderer key.
- Replaced the ineffective Paper Shadow texture with a high-contrast colored
  light-trail loop and renamed it Chromatic Tangle while preserving the
  `paper-shadow` renderer key.
- Added v2 WebM/MP4 media and poster fallbacks, source manifests, catalog
  metadata updates, and an additive migration without changing ownership data.

## Shop fitting-room structure — 2026-08-05

- Rebuilt the Shop workspace as one fitting-room frame: a compact category
  rail, three-column Catalog gallery, and a right inspector for the live profile
  plus the selected cosmetic’s description, price, and purchase action.
- Made product cards compact visual specimens with neutral near-black stages,
  explicit Preview actions, and no purchase logic in each repeated tile.
- Kept the shared production renderers, temporary selection behavior, existing
  purchase confirmation/RPC boundary, Owned surface, responsive layout, and
  reduced-motion handling intact.
- Preserved one selection surface, temporary fitting-room preview behavior,
  purchase confirmation, ownership states, responsive layout, and reduced-motion
  handling.
- Simplified the fitting-room chrome by removing rail subcopy, replay/pause
  controls, and the layout-status badge. The inspector profile surface is now
  transparent so atmosphere plates remain visible behind the identity, and the
  title has a restrained lavender-to-blue contrast treatment.
- Reframed the default Catalog view as a curated Featured set, added
  color-coded rarity filters to the rail, and replaced shop-facing “piece”
  language with “cosmetic.” The EP balance is intentionally quiet again.
  Atmosphere cards now reveal their real video loop on hover or selection
  without specimen text or edge bars. Avatar cosmetics use the signed-in
  profile avatar when available, the unused dog placeholder is removed, and
  cursor cards use a recognizable pointer-and-trail specimen. Border previews
  now show only the border and name, while atmosphere media fills its card
  stage without a trailing black strip.

## Atmosphere replacement plates — 2026-08-04

- Added seven new authored video atmospheres sourced from Pexels: Silk Folds,
  Glass Caustics, Cinder Drift, Night Pollen, Paper Shadow, Smoke Spiral, and
  Lumen Flare.
- Processed each source into a black-backed, grayscale 960×540 plate with
  WebM/MP4 fallback, a forward/reverse native loop, and a representative
  poster. Screen blending keeps the user's uploaded profile background intact;
  reduced-motion and compact surfaces use the poster.
- Added the finite renderer keys, catalog/seed rows, additive migration, source
  manifests, and registry/catalog/security drift coverage. The active catalog is
  now 126 rows with 12 Profile Atmospheres.

## Atmosphere quality curation — 2026-08-04

- Retired the seven procedural SVG atmosphere presets after review: Signal
  Garden, Aurora Veil, Emberfall, Paper Archive, Prism Lens, Lunar Tide, and
  Color Memory.
- Kept the five authored video plates as the quality floor: Rain Window,
  Droplets on Glass, Dustlight, Ink Bloom, and Snowfall.
- Removed the retired renderer branches and deleted their catalog, inventory,
  and equipped references through a forward-only migration. The active catalog
  is now 119 rows with five Profile Atmospheres.

## Atmosphere expansion — 2026-08-04

- Added Dustlight, Ink Bloom, and Snowfall as three authored video atmospheres.
- Each has WebM/MP4 media, a reduced-motion poster, and an explicit
  tail-to-head crossfade so the native video loop has no hard reset.
- Added finite renderer keys, catalog rows, migration, seed synchronization,
  drift/security checks, and source notes without changing existing cosmetics.

## Droplets on Glass loop pass — 2026-08-04

- Replaced the static droplet plate with a full-frame Pexels window source.
- Authored a black-backed highlight treatment that preserves realistic droplet
  contours while keeping the user's profile background transparent.
- Added a 24-second WebM/MP4 loop with a crossfaded seam and a poster fallback
  for reduced motion and compact surfaces.

## Atmosphere split — 2026-08-04

- Rain Window now renders only the explicit seamless rain plate.
- Added Droplets on Glass as a separate Rare atmosphere with an authored
  windshield-droplet still and no fake animation reset.
- Added the ninth atmosphere catalog row, migration, renderer allowlist, seed,
  cache version, drift checks, and security-count coverage.

## Rain Window loop quality pass — 2026-08-04

- Replaced the crossfaded arbitrary rain clip with a Pexels source explicitly
  described as a seamless loop.
- Added a separate static windshield-droplet texture so the atmosphere keeps
  realistic glass depth without a visible texture reset at the loop boundary.
- Kept screen blending, responsive cropping, poster fallback, reduced motion,
  and compact static surfaces unchanged.

## Avatar effect quality pass — 2026-08-04

- Replaced the generic treatments for Prism Orbit, Ember Crown, and Ghost
  Double with three authored raster plates and one shared texture atlas. The
  bounded compositor uses authored fragments for all 18 avatar signatures
  without a per-card animation loop.
- Passed the real avatar source into the shared wrapper so Ghost Double can
  create a controlled image-aware offset; Shop cards now show the real local
  avatar fixture instead of a letter-only stand-in.
- Kept compact discovery, leaderboard, and unselected card contexts static;
  the selected Shop preview and full profile animate. The compositor pauses
  offscreen, stops on hidden tabs, caps DPR, and cleans up its observers and
  animation frame. Reduced motion renders a deterministic authored frame.
- No item keys, metadata, catalog rows, purchase/equip logic, slots, or
  database files changed. The three anchor plates are the first authored-art
  pass; the other signatures still need individual manual creative review.

## Launch cosmetic expansion — 2026-08-04

- Added the finite `cursor_trail`, `avatar_effect`, and `profile_layout` slots
  with 16 Cursor Trails, 18 Avatar Effects, and five paid Profile Layouts.
- Kept `immersive`, `editorial`, and `focus` free; paid layouts override the
  saved free fallback until unequipped, while Profile Settings keeps one save
  path for free-layout changes.
- Added a shared profile-scoped cursor canvas with bounded history, visibility
  and intersection pausing, touch/reduced-motion guards, and cleanup on unmount.
- Added a shared avatar-local effect wrapper for public profiles, settings and
  shop previews, with static signatures in discovery/leaderboard cards.
- Extended Shop/Owned filters and the contextual fitting room without restoring
  the removed legacy shop surfaces. Selection composes all temporary layers.
- Added the forward-only catalog migration, seed synchronization, cache-version
  bump, slot/RPC checks, focused renderer/layout tests, and benchmark notes.
- The current project still carries the pre-existing aggregate bundle-budget
  debt; initial/lazy caps are measured separately by the performance check.

## Sitewide header alignment — 2026-08-03

- Applied the homepage pill/header treatment to all supporting routes through
  the shared `SiteModeHeader`.
- Simplified the primary navigation to Leaderboard and Shop, removing the
  redundant Profile item and renaming Studio to Shop in desktop and mobile
  navigation.
- Kept profile mode's account-only header and all route/auth behavior intact.

## Shop live preview polish — 2026-08-03

- Reworked the fitting-room shell to match Profile Settings' Live profile /
  Draft preview treatment without importing its editable page sections.
- Restored safe visible profile links in the production preview and moved EP
  balance into the sticky preview panel.
- Matched shop action controls to the body type stack and strengthened the
  rail/preview panel surfaces and sticky behavior.

## Shop profile-studio workspace pass — 2026-08-03

- Replaced competing shop menus with a Profile Settings-inspired left rail
  for Catalog, Owned, category, and Name layer navigation.
- Kept product results in a focused center column and the production profile
  renderer in a persistent right-side live preview.
- Removed duplicate Browse/Collection navigation and preview context so the
  workspace has one clear information hierarchy.
- Preserved temporary try-on, purchase confirmation, inventory refresh,
  account boundaries, responsive behavior, and reduced-motion behavior.

## Shop scale and preview readability pass — 2026-08-03

- Widened the desktop catalog canvas and raised supporting type sizes.
- Replaced the verbose Name layers explanation with a compact layer selector
  while retaining descriptions for accessible labels and hover guidance.
- Enlarged the fitting-room identity surface, shortened its stage, and removed
  repeated Name labels from name-effect cards.

## Shop catalog context pass — 2026-08-03

- Removed the redundant Catalog headline, copy, and Today’s color band from
  Browse so the category rail and product tools arrive immediately.
- Moved Catalog/Owned navigation and the endpoint-backed Today’s color card
  into the existing shop header action row.
- Reduced the fitting-room stage height modestly to reclaim vertical space
  while keeping the live profile preview visible.

## Shop header and fitting-room reliability pass — 2026-08-03

- Removed the redundant Names headline and supporting copy so the category and
  layer controls arrive sooner.
- Made EP balance the prominent header account signal and renamed the
  secondary shop surface from Collection to Owned.
- Keyed the shared fitting-room renderer from the selected item and resolved
  loadout so Canvas, border, and motion selections visibly refresh together.

## Shop catalog density and name-layer navigation — 2026-08-03

- Changed Browse and Collection galleries to three cards per row on desktop,
  with two-column and single-column fallbacks at smaller widths.
- Replaced the understated Names subtype strip with a labeled Name layers
  menu that explains Font, Material, and Motion and shows each layer count.
- Kept active filtering, temporary preview selection, purchases, ownership
  states, keyboard semantics, and reduced-motion behavior unchanged.

## Shop profile-studio restructure — 2026-08-03

- Replaced the four-way Shop/Browse/Collection/Studio shop navigation with a
  focused Catalog and Collection model; legacy saved view state normalizes to
  Catalog without changing routes or account data.
- Removed the gameplay launch announcement from the shop route and tightened
  the shell so the first fold reaches catalog controls and the profile preview
  sooner.
- Made the fitting-room profile the dominant contextual surface, with a
  readable selected-item label, stable neutral catalog stages, and a compact
  daily-color context that waits for the live roll endpoint.
- Rebuilt product cards around one selectable effect surface, stronger
  collection contrast, one EP/state action, meaningful insufficient-balance
  copy, and an 18-item initial render with Load more.
- Simplified Collection categories and its empty state while preserving
  ownership, equipped state, profile settings, purchase RPCs, and inventory
  refresh behavior.
- Updated shop source-contract tests to cover the unified shell, preview
  selection, card states, bounded rendering, responsive targets, and launch
  banner boundary.

## Shop identity scale and card density pass — 2026-08-03

- Matched Canvas-rendered IdentityCard names to the readable semantic heading
  size so the visual effect no longer shrinks compared with the fallback text.
- Moved Buy, Owned, and Equipped actions into the rarity/collection row.
- Removed the card footer action band and shortened the preview stage to make
  the catalog denser without reducing effect clarity.
- Preserved detail selection, purchase confirmation, inventory state, and
  temporary preview behavior.

## Shop fitting-room readability pass — 2026-08-03

- Increased the name scale in catalog swatches and the contextual profile
  preview so the identity—not the surrounding chrome—gets the first read.
- Centered the fitting-room profile surface and changed its social links to a
  compact two-column grid with safe truncation at narrow widths.
- Moved the EP amount into the single Buy action and strengthened collection
  metadata contrast without changing the product detail or purchase flow.
- Added focused source-contract coverage for the visual hierarchy and kept
  the change limited to shop presentation surfaces.

## Shop visual composition pass — 2026-08-03

- Decoupled catalog swatches from the daily roll so product previews stay
  stable and the effect itself carries the visual focus.
- Converted Browse to a compact category bar, a three-column desktop gallery,
  and a narrower fitting-room rail with smaller, more legible cards.
- Removed repeated card descriptions and price repetition from purchase
  buttons while keeping product detail, purchase confirmation, and profile
  settings paths intact.
- Tightened the shop shell and daily edit panel to reduce dashboard-like dead
  space without changing catalog or account boundaries.

## Homepage endpoint-first hydration — 2026-08-03

- Delayed the localhost daily-roll fixture until the `today` discovery
  endpoint has answered, so it cannot flash before live data.
- Kept successful endpoint emptiness honest: the fixture is only a local
  fallback for an empty response; production remains live-data-only.
- Used a neutral loading accent instead of the default violet while the daily
  result is unresolved.
- Kept the homepage instance mounted while auth transitions and updated its
  props in place, preventing a brief signed-out claim surface for authenticated
  visitors.

## Shop product-first cleanup — 2026-08-03

- Removed redundant Browse copy and fixed the search control so only the
  actual search field is visible.
- Reduced Browse card and fitting-room stage heights so the effect, rarity,
  and price carry the visual weight instead of empty space.
- Removed per-card Details/Manage links; product names and previews open the
  existing detail flow, while Profile settings remains the equip destination.
- Tightened Shop Home around the daily edit and curated pieces, removing
  duplicate catalog links and repeated collection/status copy.
- Filtered unknown equipped badge IDs from the studio preview so stale data no
  longer appears as question-mark badges.

## Homepage first-frame loading — 2026-08-03

- Published the real `today` discovery rows and highest roll immediately
  after that surface resolves, before the richer profile hydration pass.
- Kept the existing daily roll and leaderboard content in place during later
  refreshes instead of clearing it back to an empty state.
- Replaced the visible leaderboard skeleton bars with an intentional textual
  loading state and gave the daily-color panel a distinct loading treatment.
- Preserved the existing no-public-roll state after loading completes, the
  localhost preview fixture, and all live discovery/profile boundaries.

## Shop readability and hierarchy pass — 2026-08-03

- Added a shared shop visual contract with larger readable typography, warm
  near-black surfaces, stronger controls, and the active daily color as the
  shop accent.
- Simplified Shop Home to one focused daily-color edit, a real profile avatar
  or monogram, and a compact featured effect stage whose product opens detail.
- Reworked Browse into a two-column desktop result grid with larger previews,
  no technical “same renderer” or count-chip copy, and the existing filters,
  contextual fitting room, and quick-buy boundary intact.
- Removed the default “Catalog item” card label and the hidden Preview cue;
  cards reserve their hierarchy for the effect, rarity, collection, meaningful
  ownership state, description, and Buy action.
- Product Detail now shows one primary preview at a time through Item / On
  your profile tabs. Purchase confirmation, try-on, related items, focus
  restoration, and Escape handling remain unchanged.
- No data or backend changes were made. Collection and Studio behavior remain
  in scope for a later pass, apart from inheriting shared shop tokens.

## Homepage daily-color identity signal — 2026-08-03

- Removed the redundant “View profile” microcopy; the avatar and username now
  speak for the existing clickable profile link.
- Replaced the repeated “Rarity earned” row with the winner’s current streak.
- Kept the rarity badge attached to the color so it remains visible once.

## Homepage highest-roll entry point — 2026-08-03

- Identified the live “Today’s color” result as the highest public roll today.
- Added the winner’s avatar, name, handle, and a clickable public-profile link
  to make the color personal and discoverable from the panel itself.
- Renamed the leaderboard action to “See today’s top rolls.”
- Kept the local fixture owner-neutral and left discovery, scoring, and backend
  authority unchanged.

## Homepage daily-color brand accent — 2026-08-03

- Propagated the validated homepage color from the live/preview directory to
  the shared site header.
- Applied it to the `.lol` wordmark segment and the “changes every day” hero
  phrase so the daily color reads as part of the brand system.
- Added a restrained glow/transition with a reduced-motion equivalent; no
  gameplay or backend authority changed.

## Homepage daily-color alignment — 2026-08-03

- Retitled the module “Today’s color” so the heading describes the visible
  subject rather than the roll mechanic.
- Centered the daily-color label, glyph, color, and rarity so the result reads
  as one balanced visual unit.
- Kept score and earned rarity as the secondary utility layer.
- Removed the “A new color joins the profile” sentence instead of replacing it
  with another abstract marketing line.
- Live featured rolls still show the public profile owner; local preview data
  stays neutral.

## Homepage daily roll presentation — 2026-08-03

- Removed the visible “example” framing from the localhost fixture so it uses
  the same product language as live homepage data.
- Reframed the card as a daily roll, with a featured profile owner shown when
  discovery data supplies one, and a neutral “one roll, every day” explanation
  for the local fixture.
- Grouped the color and earned rarity together, kept score explicit, and
  changed the discovery action to “See today’s public rolls.”
- Clarified the empty state as public rolls forming rather than a universal
  daily color being generated.

## Homepage daily-color preview clarification — 2026-08-03

- Replaced the opaque preview identity phrase with the readable hex color and
  explicit “Example daily color” context.
- Removed ambiguous position/rank from the hero preview, labeled the numeric
  value as a roll score, and labeled rarity as a property of the roll.
- Changed the preview’s discovery action to “Explore public profiles.”
- Local preview data now uses a Rare example rather than a Mythic showcase;
  production live-roll data remains unchanged.

## Homepage lower-section refinement — 2026-08-03

- Kept the real product screenshots and lightbox behavior, while preserving
  the stronger profile-first weighting between the public page and daily roll.
- Reworked “How it works” into a horizontal three-step rail so the explanation
  reads as one continuous sequence instead of a dashboard-like side panel.
- Reframed the leaderboard as a quieter discovery surface with line-based rows
  and a designed empty state that points to the existing leaderboard route;
  live discovery data and profile links remain unchanged.
- Gave the final claim section a restrained closing accent and atmospheric
  field while preserving its existing claim flow and responsive/reduced-motion
  behavior. No schema, RPC, auth, roll, scoring, or RLS changes were introduced.
- Full-page and responsive evidence is under
  `artifacts/homepage-lower-pass/` and
  `artifacts/homepage-lower-pass-viewports/`.
- The existing transitional performance gate remains red at 778.30/700 kB
  total JavaScript and 402.60/380 kB total CSS; initial and largest-lazy
  budgets still pass.

## Homepage first-viewport refinement — 2026-08-03

- Kept the Candidate 5.11 homepage structure and limited the first iteration
  to the header, ticker, hero, and unavailable-result state.
- Hid the recent-roll ticker when it has no real public events and replaced
  the duplicate signed-out Leaderboard navigation with an in-page How it works
  action.
- Tightened the hero copy and claim label, made the headline neutral, enlarged
  the profile focal crop, and restored the original 2553×1379 PNG so the hero
  does not lose detail to a lossy derivative.
- Let the profile fill the hero stage when no live roll is available. Desktop
  uses a compact overlaid status; mobile places the same status beneath the
  profile so it does not obscure the identity.
- Added a localhost-only daily-color fixture that renders by default for local
  visual testing; `?home_preview=empty` remains available to inspect the
  honest empty state. Live discovery remains the production source and wins
  whenever available.
- Added a compact, higher-contrast browser toolbar around the hero capture so
  the profile reads as an actual `chm.lol` page instead of a standalone image.
  Removed the redundant inset border/padding and extra state label; the frame
  remains responsive, preserves the original source asset, and now uses a
  complete Safari-style toolbar with traffic lights, navigation, privacy,
  locked URL, reload, share, new-tab, and tab controls.
- Updated focused source-contract tests and capture timing. Visual evidence is
  under `artifacts/homepage-candidate-5-11/` and
  `artifacts/homepage-full-preview/`; the latter renders the complete desktop
  page with lazy imagery and reveal states settled for a single review frame.
- Build, Svelte check, ESLint, all 165 tests, links, CSP, username policy,
  balance, catalog, scoring parity, and database security pass. The existing
  transitional performance gate remains red at 777.75/700 kB total JavaScript
  and 401.24/380 kB total CSS; initial and largest-lazy budgets still pass.

## Shop reference presentation pass — 2026-08-02

- Refined the existing Shop Home around the approved hierarchy: compact live
  balance/owned metadata, real category counts, Today’s color made wearable,
  one real editorial product, a four-item curated row, and concise Browse /
  Collection paths.
- Refined Browse and the Name view with a focused “More identity. Same
  renderer.” heading,
  real Font/Material/Motion counts, compact subtype tabs, the existing filters,
  and a shared contextual profile preview.
- Updated product cards so name and price lead, the renderer preview follows,
  and rarity, collection, ownership, and description remain readable. Earned
  catalog cards now include an inline Buy action that reuses the existing
  expensive-purchase confirmation and server-authoritative purchase flow.
- The profile preview now uses the signed-in account’s actual username,
  display name, avatar, links, badges, current roll, and equipped loadout.
  No catalog, purchase, inventory, entitlement, or equip behavior changed.

## Name catalog reference pass — 2026-08-02

- Matched the Name Browse workspace more closely to the approved catalog
  reference with a 1480px storefront canvas, a 510px contextual preview rail,
  compact 78px card previews, real 18/22/24 subtype counts, and restrained
  typography/spacing.
- Added visible inline Buy buttons to Home, Browse, and Collection cards;
  signed-out users receive the existing sign-in handoff, owned items remain
  manage-only, and expensive purchases still require the existing second
  confirmation.
- Added isolated/combined preview modes plus Replay, Pause, and Reset controls
  without adding a second renderer or changing temporary try-on persistence.
- The live preview continues to derive the current account’s display name,
  username, avatar, links, badges, roll color, and equipped loadout. The mock
  Admin identity from the reference is not used in production.

## Lean cosmetic reset — 2026-08-02

- Reduced the active catalog to 64 modern Name rows, nine Profile Border rows,
  one consumable, and the retained Founder title. Supported cosmetic slots are
  `name_font`, `name_material`, `name_motion`, and `profile_border`.
- Added one forward-only cleanup migration that removes obsolete catalog rows,
  obsolete inventory references, and obsolete equipped JSON keys without
  touching gameplay, wallets, rolls, scores, achievements, profile media,
  social links, rivals, or leaderboard behavior.
- Replaced the separate Border implementation with the shared finite
  `ProfileBorderEffect` component across profile, discovery, homepage,
  Collection, Shop, Studio, Product Detail, and Profile Settings previews.
- Removed legacy Name presets/parity tooling and obsolete cosmetic UI,
  client allowlists, preview branches, and stylesheet dependencies. Modern Name
  layers now use safe defaults independently.
- Normalized Border collections and prices to a 3,540,000 EP complete set;
  balance drift reports Signal at 160,000 EP and Celestial at 600,000 EP.
- Fresh local reset, schema lint, database security, client checks, tests,
  catalog drift, balance drift, scoring parity, links, CSP, and username
  policy checks are release gates. Remote destructive migration is not applied
  because production ownership could not be verified in this workspace.
- Build output improved from the D2 baseline of 806.28 kB JavaScript and
  431.81 kB CSS to 767.87 kB JavaScript and 388.92 kB CSS. Initial JavaScript
  is 431.36/450 kB and largest lazy JavaScript is 69.24/100 kB; initial CSS
  is 133.80/200 kB and largest lazy CSS is 47.69/75 kB. Font assets are
  215.32 KiB (220.49 kB in the build report). The transitional total caps
  still fail at 767.87/700 kB JavaScript and 388.92/380 kB CSS.

## Historical Phase D2 — Composable Name catalog activation — 2026-08-02

- Added the additive `catalog_status` lifecycle (`active`, `legacy`,
  `retired`) and marked all 29 existing `name_effect` rows as `legacy` without
  deleting keys, inventory, prices, entitlement identity, or equipped data.
- Added exactly 64 active renderer-backed rows: 18 Fonts, 22 Materials, and
  24 Motions. Plain and Still remain explicit defaults and are not purchasable
  rows. Stable item keys normalize registry hyphens to underscores while
  `css_value` retains the code-owned registry key.
- Extended the existing JSONB equipped-cosmetics contract with
  `name_font`, `name_material`, and `name_motion`. `equip_item` and
  `unequip_item` remain the server authority; Name conflict clearing is locked
  and atomic, and unrelated cosmetic slots are preserved.
- Added a SECURITY DEFINER `get_shop_catalog()` read boundary for active and
  legacy rows. Older direct table readers continue receiving only the old slot
  vocabulary during the rollout window, while the D2 client uses the versioned
  RPC and `shop_cache:v2` shape.
- Browse exposes Fonts, Materials, and Motion under the Name category;
  Collection exposes owned modern layers and clearly labels owned legacy
  presets. Studio and Profile Settings provide local/default choices and one
  combined preview while applying changes through the existing equip RPC.
- Balance/drift/security coverage reports 20,480,000 EP across the new set and
  uses the documented 54,182 average EP/day assumption for acquisition pacing.
  The D2 migration includes non-destructive recovery by status change only.
- Fresh local reset, SQL lint, RPC security assertions, full client checks,
  tests, catalog/balance/scoring drift, links, CSP, username policy, and
  authenticated Chromium width checks passed. Remote parity is skipped because
  linked Supabase credentials are unavailable.
- D1-to-D2 build output is JavaScript 794.07 kB → 806.28 kB (+12.21 kB) and
  CSS 430.09 kB → 431.81 kB (+1.72 kB). Initial JavaScript is 441.65/450 kB
  and largest lazy JavaScript is 77.28/100 kB; initial/largest-lazy CSS is
  165.34/200 and 48.94/75 kB. The known transitional total caps remain
  JavaScript 806.28/700 kB and CSS 431.81/380 kB; they are reported rather
  than raised or disabled. Font assets remain 220.49 kB with no new font
  dependency.

## Background image quality — 2026-08-01

- Raised the stored background WebP ceiling from 1 MB to 4 MB.
- Increased the background processing dimension cap to 3200 px and initial
  WebP quality to 0.9; avatar limits remain unchanged.
- Added an additive Storage limit migration so existing background objects and
  profile paths remain compatible.
- Profile cards now render the full six-link allowance and use dedicated
  Twitch, Instagram, and TikTok icons instead of generic link marks.

## Profile ambient color preference — 2026-08-01

- Added a persisted `colorEffectsEnabled` profile setting, off by default.
- When disabled, roll and signature colors stay in the identity card, links,
  badges, labels, and other data surfaces; they no longer tint the uploaded
  background, dim it with the atmosphere veil, add ambient layers, recolor the
  play/volume controls, or recolor profile navigation cues.
- Added the opt-in setting to profile editing and kept the neutral avatar
  fallback unchanged.

## Profile color boundary — 2026-08-01

- Removed daily-roll color propagation from the profile shell’s full-page
  atmosphere, opening surface, and avatar fallback. The roll result remains
  visible in the roll module and color data surfaces.
- Kept the configured signature color for links, badges, labels, and other
  profile data accents inside the card and supporting data surfaces.
- Preserved cosmetic background and atmosphere slots while preventing them
  from inheriting either the latest roll or signature color.

## Homepage screenshot showcase — 2026-08-01

- Replaced the homepage’s embedded profile previews and lower directory cards
  with four static WebP screenshot slots in an uneven desktop collage and a
  stacked mobile layout.
- Added the checked-in `homepageShowcase.js` manifest with only the approved
  capture fields; each capture links to its corresponding public profile route.
- Removed unavailable homepage metrics and kept the existing ticker component,
  discovery source, links, polling, and reduced-motion behavior unchanged.
- Added the reference-style daily-ritual explanation with a local sample roll;
  it never calls the server roll path.
- Added desktop/mobile capture support under
  `artifacts/homepage-screenshot-showcase/`.

## Homepage/live-surface cleanup — 2026-08-01

- Removed the invented horizontal recent-colors strip from the featured
  homepage preview.
- Kept color history in the actual live profile continuation, where the
  profile archive/story components render it.
- Updated homepage tests and visual documentation to keep the example limited
  to the live identity surface.

## Interface accent refinement — 2026-08-01

- Replaced the sitewide lime interface accent with a cool near-white token.
- Added cyan interaction cues for links, focus, the wordmark, and shop
  highlights.
- Kept signal lime scoped to daily-roll and reward semantics.

## Homepage first-viewport refinement — 2026-08-01

- Tightened desktop hero spacing, type scale, line height, claim field height,
  and showcase spacing so the featured profile card is visible at 1920×1080.
- Kept the mobile homepage stacked and readable without applying the desktop
  compression to its headline.
- Added a 1920×1080 homepage capture to the visual evidence set.

## Homepage/live-profile parity — 2026-08-01

- Replaced the homepage’s invented music card with the production floating
  play and expandable volume controls.
- Shared the audio-control component with live profile audio so the homepage
  demonstrates the actual interaction and placement without loading media.
- Moved controls outside the featured identity card and removed the invented
  today-color/rank strip from that card.
- Replaced the featured example’s warm Signal Garden treatment with existing
  cool-toned profile cosmetics and removed amber from the homepage demo layer.

## Homepage aspiration refinement — 2026-08-01

- Replaced the homepage slogan with direct product, customization, daily-roll,
  and visibility copy; the existing username validation and signup handoff are
  unchanged.
- Expanded the featured Mara specimen with the real dog avatar, profile music
  control, rank, and production cosmetics.
- Replaced the homepage leaderboard-style discovery cards with three distinct
  Minimal, Atmospheric, and Expressive profile specimens backed by centralized
  demo data. Each opens a full in-page example profile without intercepting
  public usernames or changing profile routing.
- Kept the daily loop compact with “Earn points”, “Climb the leaderboard”, and
  “Get discovered”, added a secondary leaderboard link, and added a final claim
  action that returns visitors to the hero input.
- Captured desktop, mobile, featured-profile, daily-roll, and example-profile
  evidence under `artifacts/homepage-game-prototype/`.

No schema, RLS, scoring, ranking, reward, authentication, or public discovery
logic changed in this homepage-only pass.

## Profile-forward leaderboard — 2026-08-01

- Added a compatibility migration that layers a bounded public profile preview
  onto the existing discovery projection: display name, bio, accent, and an
  owner-shaped avatar path.
- Rebuilt discovery cards around the person and their latest color instead of
  treating the score as the primary identity.
- Added avatar loading with an accent-initial fallback, short bio clamping,
  profile badges, responsive featured/compact layouts, and reduced-motion
  behavior.
- Preserved ranking semantics, filters, pagination, public route navigation,
  privacy settings, and server-authoritative scoring.

## Homepage product entry point — 2026-08-01

- Added an inline local sample roll to the homepage daily-roll result card.
- Reused the existing guest roll fixture and `ProfileRoll` reveal/result
  presentation; the sample never calls the roll RPC or persists state.
- Added a bounded “Today on Chromadie” rail backed by the existing public
  discovery projection with loading, retry, empty, responsive, and SPA
  navigation states.
- Added sample-roll and discovery screenshots under
  `artifacts/homepage-game-prototype/`.
- No schema, RLS, scoring, ranking, reward, or authentication behavior changed.

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
- New discovery JSON contains only public profile/card fields and validated usernames. The profile preview adds bounded display name, bio, accent, and exact public avatar paths; it does not contain internal profile ids, email, wallet state, private achievement progress, draft configuration, or direct score-table rows.
- Today, weekly, monthly, all-time, exceptional, rising, new, and random surfaces remain discovery presentation semantics. They do not create a second score, rarity, reward, eligibility, economy, or prestige authority.
- `Leaderboard.svelte` remains the route entry point. `DiscoveryHub.svelte` owns the new feed; the existing rivals RPC and follow mutation remain the only compatibility path that carries a target id.
- Cards navigate and share through the existing `/u/<username>` route. Pages Function metadata and direct-refresh behavior remain unchanged for profiles and `/leaderboard`.
- The discovery profile preview wraps the existing ranking projection rather than changing rank ordering, score semantics, or public discoverability rules. Missing avatars render as safe accent initials.
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

## 2026-08-01 — Make layout configuration immediately understandable

The layout and links editor now updates the shared live preview as controls
change. The preview reflects the draft signature color, profile style, public
links, color-story toggle, and visible section order. The misleading abstract
layout diagram and manual preview toggle were removed; draft/save/publish
boundaries remain unchanged.

## 2026-08-01 — Refine the daily roll entry point

The profile preroll now uses direct copy, a compact square signal mark, and a
live daily reset countdown. The previous floating orb, orbit lines, and heavy
glow were removed so the roll reads as a profile module with a clear action.

## 2026-08-01 — Simplify settings copy and viewport hierarchy

- Replaced poetic settings copy with direct instructional labels and task
  descriptions.
- Removed the redundant public-profile callout and duplicate live-profile
  shortcut from the editor body.
- Reduced intro spacing and widened the live preview column so configuration
  controls begin higher and remain easier to inspect.

## 2026-08-01 — Improve identity and audio editor density

- Expanded the bio field to use the full editor card width and placed its save
  row directly below the field.
- Replaced the staff audio browser controls with a compact themed player that
  supports play/pause, seeking, progress, and duration.
- Removed the large gap between the audio description, preview, and upload
  actions.

## 2026-08-01 — Remove redundant settings chrome

- Removed the repeated editor section header and local settings utility bar.
- Let the left rail provide the only section context and moved the active
  configuration surface into the first available editor row.
- Added a contract test for the new settings information architecture and
  reduced-motion styling.

## 2026-08-01 — Render profile atmosphere effects across the page

Separated weather cosmetics from card backgrounds with a new
`profile_atmosphere` slot. Rain, snow, fireflies, and scanlines now render via
the fixed full-viewport atmosphere layer on public profiles, while existing
background cosmetics remain card-scoped. Existing weather loadouts are migrated
without changing item keys or entitlement checks.

## 2026-08-01 — Replace tiled atmosphere previews with a shared renderer

Profile atmosphere effects now use a seeded canvas particle layer across public
profiles, settings previews, the decoration fitting room, and shop item cards.
The first recipes are rain, snow, fireflies, and scanlines. Reduced-motion mode
stops animation while preserving a static visual state.

## 2026-08-01 — Redesign the cosmetics shop as a profile atelier

The shop now uses a profile-first workspace with a larger live preview, compact
featured collection strip, department and filter rails, reusable item cards,
and a selected cosmetic panel. Temporary try-on changes the preview loadout
only, while purchase remains a server-authoritative `purchase_item` action and
owned items hand off to profile settings for permanent equip management.

No database, RLS, entitlement, or route contracts changed. Added source-level
coverage for the new shop composition and purchase-only boundary. Full
validation is recorded at handoff; the existing performance budget remains a
known baseline concern if the performance check reports the current bundle
size overage.

## 2026-08-01 — Keep page changes inside the live application shell

Internal same-origin links now use the existing client router instead of
reloading the document. Authenticated shop, profile, editor, discovery, and
legal navigation preserves the mounted session and shared atmosphere. The
profile settings surface renders an immediate draft from the hydrated profile
while its full context refreshes, and protected routes no longer show
`GuestLock` during auth hydration.

## 2026-08-01 — Reconcile additive shop catalog rows

- Updated `check:catalog-drift` to compose the atmosphere catalog migration
  with the base live snapshot.
- Updated the parser to read all catalog insert blocks and SQL booleans, so
  the four intentional weather rows no longer appear as unexpected remote
  items.
- Added contract coverage and documented the snapshot-plus-extension model;
  no database migration or catalog data change was required.

## 2026-08-01 — Build the homepage identity-game prototype

- Preserved the current header and isolated the new visual language to `/`.
- Replaced the ambient navy/purple canvas with warm black, faint grain, and a
  single sample roll color.
- Added homepage-scoped Spline Sans and IBM Plex Mono assets.
- Reused the production identity card in the homepage preview and added a
  dedicated daily-roll section below it, keeping the example faithful to live
  public profiles while explaining score, leaderboard position, and visibility.
- Added a warmer example identity, a short recent-color trail, and distinct
  profile-accent/current-roll colors so the specimen feels lived-in.
- Added a local anime-dog avatar and a catalog-backed cosmetic fixture using
  the real space background, rain atmosphere, chroma border, holo frame, and
  chroma name treatments.
- Consolidated the game explanation into the daily-roll section and retained
  the existing claim, authenticated profile, analytics, routing, and
  accessibility contracts.
- Captured 1440×900, 1280×720, 390×844, and daily-loop evidence under
  `artifacts/homepage-game-prototype/`.
- Build, checks, lint, tests, link, CSP, drift, scoring, and database security
  validation pass. The existing performance budget remains over its thresholds
  at 670.49 kB JavaScript / 625 kB and 348.34 kB CSS / 295 kB; HTML passes.

## 2026-08-01 — Adopt the homepage styling across the site

- Updated shared tokens and global typography to warm black, signal lime,
  Spline Sans, and IBM Plex Mono.
- Removed the default non-profile atmosphere mount so Roll, discovery,
  leaderboard, studio, settings, auth, guest, help, legal, and error surfaces
  share a quiet site shell.
- Restyled route-level cards, controls, banners, filters, previews, settings
  navigation, and authentication inputs without changing their behavior.
- Preserved atmosphere rendering in public profile and cosmetic-preview
  contexts, plus all existing authentication, RLS, RPC, catalog, scoring, and
  route contracts.
- Updated visual contract tests for the new shared shell and font loading.
- Svelte check, build, ESLint, 146 tests, links, CSP, username policy,
  balance, catalog, scoring parity, and database security checks pass.
- Performance budget remains over threshold: 670.45 kB JavaScript / 625 kB
  and 361.46 kB CSS / 295 kB; HTML passes. JavaScript matches the existing
  baseline overage, while the shared styling layer increases CSS from the
  previously recorded 348.34 kB.

## 2026-08-01 — Finish profile language reconciliation

- Added `CompactRollPreview` as the shared compact presentation boundary around
  the production `RollPreview`.
- Updated the homepage sample, discovery/leaderboard cards, and shop
  leaderboard preview to use the same cosmetic-aware orb and roll-effect
  rendering.
- Added the configured avatar to the shop leaderboard preview and preserved
  initials as the safe fallback.
- Kept the additive public-avatar projection migration unchanged; linked
  database application is still a deployment step, not a client-side fallback.

## 2026-08-01 — Refine discovery cards into profile tiles

- Reduced card chrome, nested separators, and generic leaderboard labels across
  the homepage discovery rail and full leaderboard.
- Made avatar, identity, score, and current color read as one profile snapshot.
- Suppressed unknown badge placeholders so stale or future badge ids do not
  surface as question marks.

## 2026-08-01 — Add the Signal Garden profile specimen

- Replaced the homepage sample's mixed cool-toned cosmetics with a restrained
  lime-and-amber `Signal Garden` build.
- Added catalog-backed background, border, frame, name, orb, and roll-effect
  items with an additive migration, matching seed/catalog extension, and safe
  CSS classes.
- Featured the collection in the shop so the preview demonstrates a look users
  can actually browse and build.
- Kept Fireflies as the full-page atmosphere and preserved reduced-motion,
  public rendering, ownership, and purchase boundaries.

## Route loading and initial bundle boundary — 2026-08-01

- Added explicit cached dynamic imports for game, studio, discovery, profile,
  settings, legal, auth, and prototype surfaces.
- Added a persistent route outlet that keeps the current destination mounted
  during client navigation and uses a compact inline state only for direct
  loads or a failed destination.
- Added idle and keyboard/mouse navigation prefetching without changing route
  parsing, authentication, profile compatibility, public URLs, or server
  authority.
- Reworked `check:performance` to separate initial assets, the largest lazy
  route assets, transitional total caps, and the HTML shell.
- The route split is validated by `test/route-loading.test.js`; final build
  measurements are 414.95 kB initial JavaScript, 182.03 kB initial CSS,
  72.57 kB largest lazy JavaScript, and 48.42 kB largest lazy CSS. Total
  assets remain within the transitional 700 kB JavaScript and 380 kB CSS caps.

## 2026-08-01 — Rebuild the homepage as a live profile directory

- Replaced the fictional homepage showcase and equal example cards with the
  approved uneven live-directory composition.
- Added a public-roll ticker sourced from bounded profile story events and
  refreshed through the existing public discovery/profile RPCs.
- Added a reusable bounded profile preview that reuses `IdentityCard`,
  `ProfileAtmosphere`, the canonical compact roll renderer, public links,
  badges, cosmetics, avatars, backgrounds, and deferred profile media.
- Kept empty, missing-field, loading, and unavailable states truthful; no
  fictional accounts or profile fields are rendered.
- Captured the homepage at desktop and mobile target sizes. Required checks
  pass except for the repository’s transitional total JavaScript and CSS
  budgets: total JavaScript is 704.75 kB / 700 kB and total CSS is 380.55 kB /
  380 kB.

## Homepage directory activity summary — 2026-08-01

- Matched the reference’s wider first-viewport rhythm with a full-width roll
  ticker, shorter hero copy, stronger daily-roll consequence, and two compact
  activity stats.
- Added the real daily public-roll count to the discovery projection and used
  the existing UTC daily reset boundary for the live countdown.
- Local validation includes schema lint and a clean database reset.

## Header treatment correction — 2026-08-01

- Restored the pre-migration transparent header shell, blurred pill controls,
  and account treatment.
- Scoped Satoshi to the header so the `chm.lol` wordmark matches its controls;
  retained signal lime only for `.lol`.
- Preserved route prefetch handlers and mobile navigation behavior.

## Candidate 5.11 homepage reconciliation — 2026-08-01

- Replaced the homepage showcase with the supplied Candidate 5.11 composition:
  live ticker, daily hero panel, product view, keyboard-accessible tabs, three
  live leaderboard rows, and the final username claim.
- Kept discovery data, public profile hydration, the canonical roll preview,
  authentication, routes, and username policy on their existing production
  interfaces. No database migration or mock production data was introduced.
- Added optimized responsive derivatives for the supplied reference assets and
  refreshed homepage interaction/source-contract tests.
- Browser captures are in `artifacts/homepage-candidate-5-11/`; the local
  environment may show the truthful public-data loading/empty state when its
  Supabase discovery endpoint is unavailable.
- Validation is green except for the repository’s existing transitional total
  asset caps: the current build reports 710.58 kB JavaScript / 387.18 kB CSS
  against 700 kB / 380 kB. Initial and largest-lazy asset budgets pass.

## 2026-08-01 — Complete homepage layout and interaction corrections

- Matched the centered 1380px homepage shell, header/ticker rhythm, and hero
  vertical allocation to the supplied 1907×942 reference.
- Added click/tap and keyboard-accessible enlarged previews for the profile and
  roll showcase images and the How it works result images.
- Connected “View today’s profiles” to the live leaderboard section with smooth
  scrolling that respects `prefers-reduced-motion`.
- Matched the homepage `.lol` wordmark accent to the hero lavender-blue.
- No backend, image source, authentication, username, or public-route changes.

The hero profile specimen was tightened with a small CSS-only crop adjustment;
the supplied asset and frame dimensions remain unchanged.

The How it works heading, subcopy color, and roll-preview fit now match the
reference composition.

The desktop hero now uses the original-resolution PNG source to avoid visible
quality loss from the previous downsampled WebP.

Product showcase images now use a shorter 235px desktop frame with their
existing focal positions; responsive mobile aspect ratios are unchanged.
The profile crop now zooms to the identity card, and the leaderboard heading,
kicker, and supporting copy now follow the reference typography and color
roles.
The Product showcase no longer uses the scroll reveal animation, preventing
the section from disappearing during interrupted scroll transitions.
The homepage’s default daily and leaderboard roll previews now use the
reference’s faceted SVG glyph and float motion. Existing orb-shape classes
also resolve to the same clean glyph in production roll previews while their
catalog keys and equipped-cosmetic data remain unchanged.

## 2026-08-01 — Supporting-route visual cohesion

- Removed the legacy equipped effect layer from reference compact roll previews;
  the clean four-facet glyph is now centered on its own.
- Applied the homepage visual baseline to daily roll, discovery, Studio,
  help/legal, auth, utility states, the supporting header, and footer.
- Kept public profiles and profile-specific rendering outside the new baseline;
  no data, auth, scoring, catalog, or route contracts changed.

Signed-out header navigation no longer links to the legacy guest profile
onboarding route; the public Explore/Leaderboard navigation remains available
on every signed-out supporting route.

## 2026-08-02 — Complete shop architecture reset

- Split the shop into live-data Home, Browse, Collection, Studio, and product
  detail surfaces using the existing catalog, preview, inventory, entitlement,
  wallet, profile, and daily-roll contracts.
- Added collection and ownership filter coverage plus structural tests for the
  temporary fitting-room and accessible product-detail flows.
- Validation complete: build, type checking, lint, tests, links, CSP, drift,
  scoring parity, and database security checks pass. The performance budget
  check still fails its transitional total JavaScript/CSS caps; initial and
  largest-lazy budgets pass.

## 2026-08-02 — Bring shop composition closer to approved reference

- Refined Home’s Today’s Edit stage, category strip, live profile/roll pathway
  cards, and spacing scale.
- Reworked Browse into a reference-style filter rail plus result toolbar,
  Collection into tabbed owned views, and Studio into a three-column workspace.
- Increased product visual/card proportions and retained readable blue inline
  EP pricing, real rarity/state labels, and existing preview components.

## 2026-08-02 — Phase A Name cosmetic migration foundation

- Read the root Name migration references and audited the existing catalog,
  CSS bridge, profile identity surfaces, shop previews, and profile settings
  preview before editing.
- Added the shared `src/lib/name/` renderer foundation: code-owned fonts,
  materials, motions, legacy presets/catalog, deterministic Canvas 2D frame
  generation, and one lifecycle-managed animation clock.
- Ported all 29 existing `name_effect` keys as legacy presets, including the
  premium `name_prism_atelier` entitlement identity and the fixed palettes of
  the legacy glow effects.
- Migrated only the internal Profile Settings live preview through the shared
  semantic Name canvas. Existing production surfaces and legacy CSS remain in
  place for parity validation.
- No catalog rows, prices, slots, schema, purchase/inventory/entitlement/equip
  contracts, or automatic grants changed. Phase B is intentionally not begun.

## 2026-08-02 — Complete Phase B Name cosmetic surface migration

- Audited and migrated the public profile shell, compatibility profile,
  profile settings preview, shop item/product previews, Studio, discovery,
  leaderboard, rivals, homepage directory, homepage leaderboard, and internal
  homepage examples through the Phase A shared Name renderer.
- Chose full animated mode for public profile/settings/large Studio identity;
  compact animated mode for visible shop item previews; and static-signature
  mode for repeated discovery, leaderboard, rival, and homepage rows/examples.
  Real latest-roll colors and available recent color history are passed without
  changing roll/history behavior.
- Added the internal un-routed 29-key legacy parity harness and production
  static checks proving production Svelte surfaces no longer apply legacy Name
  CSS classes, inline Name catalog styles, or `getNameEffect`.
- Legacy Name CSS remains available for parity and rollback. `name_void`,
  `name_matrix_rain`, `name_sunset_blur`, `name_prism_atelier`,
  `name_holographic`, `name_inferno`, `name_ocean_wave`, and
  `name_glitch_effect` are recorded as acceptable reinterpretations or needs
  refinement where old pseudo-elements, filters, or stacked shadows are not
  pixel-identical.
- Required validation passes except the pre-existing transitional total asset
  caps. Phase A baseline totals were JavaScript 762.72 kB/700 kB and CSS
  426.53 kB/380 kB; the Phase B build reports JavaScript 765.82 kB/700 kB
  (+3.10 kB) and CSS 426.70 kB/380 kB (+0.17 kB). Initial JavaScript
  424.66 kB/450 kB, largest lazy JavaScript 73.13 kB/100 kB, initial CSS
  165.34 kB/200 kB, largest lazy CSS 48.94 kB/75 kB, and HTML shell 5.60
  kB/12 kB remain within budget. The small increase comes from wiring the
  real homepage leaderboard into the shared renderer and does not duplicate
  renderer modules across chunks.
- No catalog, schema, purchase, inventory, entitlement, equip, RLS, auth, or
  seed behavior changed. Phase C/D work remains stopped.

## Supporting-page visual pass — 2026-08-01

- Restyled the leaderboard route toward the homepage's flat three-column row
  language while retaining all discovery tabs, filters, pagination, rank state,
  follow actions, share actions, and live public data.
- Unified Privacy and Terms under a shared homepage-derived document surface:
  large Instrument Sans headings, IBM Plex Mono labels, quiet borders, and
  muted body copy.
- Added source contracts for the shared leaderboard/document presentation and
kept public profile selectors outside the supporting-route baseline.

## Profile header and hero balance — 2026-08-01

- Applied the homepage header treatment to profile mode with a transparent
  canvas, lavender `.lol` accent, and account-only controls.
- Vertically centered the homepage Today’s Color result/details between its
  label and bottom profile-link action.
- Preserved profile navigation, auth behavior, public rendering, and reduced
  motion handling.

## 2026-08-02 — Phase C shop presentation refinement

- Simplified Shop Home to compact category navigation, a real catalog-backed
  Today’s Edit, the live profile/current-roll context, one curated row, and
  text-level Browse and Collection paths. Removed the redundant profile/roll
  continuation cards.
- Reworked Browse around a product grid, compact search/sort toolbar,
  accessible contained filters, and one sticky contextual fitting-room
  preview. Existing category, collection, rarity, ownership, affordability,
  search, and sort behavior remains live-data backed.
- Refined cards to keep product name/price, preview, rarity/collection,
  ownership state, description, and a detail affordance readable without
  repeating purchase buttons. Product Detail now presents as a desktop drawer
  and mobile bottom sheet while preserving confirmation, try-on, RPC, refresh,
  focus, and equip boundaries.
- Added owned-collection search and removed duplicate Studio reset/settings
  controls. No catalog, schema, pricing, seed, inventory, entitlement, RLS,
  Name renderer, or legacy CSS behavior changed.

## 2026-08-02 — Phase D1 composable Name renderer catalog

- Added the code-owned composable resolver and compatibility contract for
  explicit Font/Material/Motion loadouts while preserving legacy renderer-key
  resolution and semantic Name rendering.
- Completed all reference definitions: 18 Fonts, 23 Materials including
  Plain, and 25 Motions including Still. The 64 paid definitions are prepared
  in code only; no Supabase slots, catalog rows, products, prices, or live
  shop tabs were changed.
- Added bounded Canvas primitives and deterministic implementations for every
  paid Material and Motion. Daily color is used by Thermal Ink, Chroma Glass,
  Liquid Fill, Color Memory, and Daily Pulse; recent color history remains an
  explicit bounded input.
- Added an internal, unrouted composable catalog gallery with isolated layer
  previews and combined loadouts. It defaults repeated cards to static
  signatures and relies on the same shared clock/renderer when animation is
  requested.
- Kept the existing local font packages and added no font assets. Unsupported
  prototype families have documented system or bundled substitutions and
  trigger a bounded redraw when the browser reports font availability.
- Added deterministic registry, composition, fallback, motion-visibility,
  daily/history, reduced-motion, semantic, and lifecycle coverage. All 29
  legacy keys continue to resolve.
- Validation passes for build/check/lint/tests/links/CSP/username/balance/
  catalog/scoring/database security. Performance initial and largest-lazy
  budgets pass; the known transitional total caps remain at 794.07 kB JS/700
  kB and 430.09 kB CSS/380 kB. Font assets remain 220.49 kB (215.32 KiB in
  binary units).
- D2 remains deferred: additive database slots, catalog activation and rows,
  live shop subtype navigation, Profile Settings controls, equip conflict
  behavior, legacy product archiving, pricing, replacement grants, and legacy
  CSS removal.

## 2026-08-03 — Align Canvas name scale with profile text

- Fixed short Canvas-rendered names such as `Tjz` being visibly smaller than
  their accessible highlighted text in public profiles and fitting-room
  previews.
- The shared renderer now receives the semantic node's computed font size,
  uses proportional inline padding, and measures the loaded Canvas face before
  applying horizontal fitting.
- The semantic fallback now carries the active renderer's family, style, and
  weight, so browser text selection no longer reveals a different typeface.
- Added focused coverage for intrinsic short-name sizing; no catalog,
  entitlement, profile, or backend contracts changed.

## 2026-08-03 — Keep shop try-on in the persistent profile preview

- Removed the live Browse/Home/Collection Product Detail drawer path so item
  selection no longer hides or replaces the fitting-room profile.
- Lifted selected-item state into Shop and projected the selected cosmetic
  through the existing `tryOnShopItem` loadout contract and shared
  `ShopStudioPreview` renderer.
- Replaced the isolated/profile preview toggle with one truthful profile stage;
  Clear restores the equipped look and changes remain preview-only.
- Removed social links from the bounded shop profile preview so the name,
  avatar, bio, badges, and border have room to read cleanly.
- Added focused source contracts for persistent selection, loadout projection,
  no live modal mount, and link-free preview composition.

## 2026-08-04 — Focused Shop catalog quality pass

- Audited the 18 Fonts, 22 Materials, 24 Motions, and 9 Profile Borders with
  representative short/long names, dark/light color inputs, card/profile
  frames, and reduced-motion contracts.
- Kept all Font mappings and catalog metadata unchanged. Brightened only the
  four materials that were effectively unreadable on dark surfaces and added
  restrained readability rims where needed.
- Fixed Typefall’s dark-color blank frame and confined the affected border
  animations to border properties, removing content fades, wrapper hue filters,
  and whole-profile translation.
- Removed six unreferenced legacy Shop components and updated the system map;
  purchase/equip and database slot boundaries were not changed.

## 2026-08-03 — Homepage identity and story refinement

- Kept the approved hero/browser structure and original 2553×1379 profile
  source while increasing the readable profile focus through CSS.
- Propagated the validated live or localhost-preview daily color through
  decorative homepage accents with a light-mixed text treatment.
- Reframed the product proof around persistent profile history and replaced
  the hidden three-tab explanation with a static Roll/Evolve/Explore sequence.
- Added real hydrated public-profile fallbacks to the homepage directory.
  Today’s rolls, featured profiles, loading, failure, and legitimate empty
  states now render separately without invented rank or demo data.
- Updated the closing claim around the accumulating public-history promise.
- Added focused featured-profile mapping/state contracts and updated the
  reference visual-language tests.
- Reviewed the live daily-preview composition at 1440×900, 1280×720,
  430×932, and 390×844 plus focused desktop product/how and mobile
  discovery/claim captures. No new font, package, image, RPC, or migration was
  introduced.
- Build, Svelte check, lint, tests, links, CSP, username policy, balance,
  catalog, scoring parity, and database security pass. The pre-existing
  transitional total asset caps remain the only failing gate: JavaScript is
  777.63/700 kB and CSS is 401.80/380 kB. Initial and largest-lazy JavaScript,
  initial and largest-lazy CSS, and the HTML shell remain within budget.
## 2026-08-04 — Add authored profile atmospheres

- Added eight finite `profile_atmosphere` products: Signal Garden, Aurora Veil,
  Rain Window, Emberfall, Paper Archive, Prism Lens, Lunar Tide, and Color
  Memory.
- Added a shared SVG scene renderer with authored linework, veils, glass,
  embers, paper registration, lens planes, lunar orbits, and recent-roll color
  memory. Scenes pause when hidden, honor reduced motion, stay pointer-safe,
  and use static compact frames in catalog cards.
- Integrated the slot into Shop Catalog/Owned filters, fitting-room preview,
  Profile Settings preview, public ProfileShell, RPC allowlists, database
  constraints, seed, cache version, and drift/security checks.
- Existing uploaded profile backgrounds remain independent. Final active
  catalog count is 122 (eight atmospheres added to the existing 114).
- Removed the atmosphere tint/grain treatment that could darken uploaded
  backgrounds and strengthened each scene with authored particles, edges,
  frame details, and layered motion.

## 2026-08-03 — Differentiate the reference Name fonts

- Restored the real family names for Font products, including Cormorant
  Garamond, Archivo Narrow, Syne, Pirata One, Pixelify Sans, and Archivo Black.
- Added lazy local `@fontsource` assets for every Font renderer key so the
  Canvas previews use the intended faces rather than shared fallbacks.
- Kept the existing varied Material/Motion labels, item keys, pricing,
  ownership, equip, and purchase boundaries unchanged.
- Added coverage for real family labels, loader coverage, seed synchronization,
  and the additive live-row migration.

## 2026-08-04 — Rain Window pilot

- Replaced the Rain Window SVG placeholder with a transformed, locally served
  Pexels droplet plate (14-second crossfaded WebM plus MP4 fallback and poster).
- Kept the plate additive with `screen` blending; it does not apply an opaque
  wash or darken uploaded profile media.
- Public profiles and full fitting-room previews animate one video layer;
  cards, reduced-motion environments, and unsupported video use the poster.

## 2026-08-05 — Rebase Name Motion on Haunt reference behaviors

- Replaced the previous ten-effect motion shelf with Glow, Scramble, Type In,
  Particles, Rainbow, Gradient, Fuzzy, Reveal, Split Reveal, and Flash.
- Kept Type In and Scramble and rewrote the other eight as original, bounded
  Canvas 2D gestures based on the public Haunt username/profile behavior
  vocabulary. No competitor code, assets, CSS, or SVG treatments were copied.
- Added an additive migration that leaves the active catalog at 97 rows while
preserving deprecated motion rows as legacy history and resolving their old
renderer keys through finite aliases.

## 2026-08-05 — Repair Name Motion quality and uniqueness

- Reworked all ten active Canvas motions without changing their stable catalog
  keys or the historical alias map.
- Removed the repeated white sweep language from Glow, Rainbow, Gradient,
  Reveal, Split Reveal, and Flash.
- Added masked pulse, prism-slice, fluid-highlight, chromatic exposure, split
  seam, and baseline particle-trail treatments.
- Fixed Type In’s partial-text anchoring and cursor position, and confined
  Fuzzy’s scanline to the text mask so compact previews do not draw a frame.
- Added recording-context tests for the authored gestures and renderer safety.

## 2026-08-03 — Reconcile live shop catalog labels

- Applied the pending Name catalog label migrations and synchronized all 64 paid
  product names with the canonical seed, including the actual Font family
  names.
- Corrected the nine retained profile-border descriptions through an additive,
  idempotent migration.
- Made the intentional quantity-based `streak_freeze` behavior explicit in the
  seed and catalog check (`stackable = true`) rather than changing live
  purchase semantics.
- Remote `npm run check:catalog-drift` now passes: 75 items, 18 Fonts,
  22 Materials, 24 Motions, and 9 Profile Borders.
- Bumped `meta.shop_version` so existing browsers discard the pre-label
  `shop_cache:v3` snapshot and fetch the corrected names immediately.

## 2026-08-03 — Fix selected-item shop try-on projection

- Routed selected Name catalog rows through `css_value` when composing the
  temporary fitting-room loadout, so the shared profile renderer shows the
  chosen Font, Material, or Motion rather than the equipped/default layer.
- Simplified the persistent preview header to the profile name plus Replay,
  Pause/Play, and Clear controls; removed duplicated try-on copy, collection,
  and rarity chips.
- Kept try-on preview-only and left purchase, inventory, equip, and catalog
  contracts unchanged.

## 2026-08-05 — Dashboard follow-up complete

- Corrected dashboard order, canonical hashes, collapsible Profile navigation,
  history restoration, mobile drawer inertness, and duplicate account actions.
- Replaced Layout & links whole-config publishing with composition-scoped RPCs,
  conflict reload, dirty-state prompts, and bounded allowlisted patches.
- Fixed independent appearance defaults, invalid-hex blocking, preview media
  bounds/mutation guards, legacy account deletion reuse, and mounted dashboard
  copy.
- Validation: build, check, ESLint, 199 tests, links, CSP, all drift checks,
  scoring parity, database security, schema lint, and database reset passed.
Performance remains over inherited initial/total JS and total CSS budgets.

## 2026-08-08 — Profile Studio usability refinement

- Replaced the aggregate Customize form stack with persistent Assets, Identity,
  Appearance, Effects, Content, Widgets, and Layout category controls. All
  editors remain mounted for draft safety, while only one editor and action bar
  is visible at a time.
- Added above-the-fold Avatar, Background, Banner, Audio, and Cursors entry
  tiles that report configured and Plus states and open the existing bounded
  media manager.
- Replaced the duplicated Customize introduction with a compact workspace and
  direct Plus status/upsell strip.
- Made live preview opt-in. It docks on wide displays, uses an inspector overlay
  on ordinary desktops, and a bounded bottom sheet on mobile; the daily-roll
  region remains excluded from the dashboard preview.
- Reflowed Surface, Gradient, and Borders into responsive control cards and
  increased field/control legibility without changing appearance data.
- No schema, Storage policy, RLS, upload, entitlement, profile rendering, or
  section-scoped draft/publish contract changed.
- Full validation passes with 251 tests. The Chromium Profile Studio smoke
  covers collapsed/open/closed preview behavior, draft-only appearance updates,
  mobile navigation, reduced motion, and canonical public refresh.

## 2026-08-08 — Replace nested Customize navigation with a direct workspace

- Replaced the category-only Customize presentation with one continuous page;
  media, identity, appearance, content, widgets, effects, and layout are
  visible in a predictable scroll order.
- Kept avatar and background previews/actions inline and added active previews
  with direct replace actions for Plus video, banner, cursor, pointer cursor,
  and audio assets.
- Flattened nested module headers and made section action bars render in place,
  removing a second layer of navigation and reducing competing floating UI.
- Added source-contract coverage for the continuous sections and inline rich
  media previews. No database or authority boundary changed.

## 2026-08-08 — Add structured About and Projects regions

- Added the bounded `content` profile configuration contract: one plain-text
  About block and up to four HTTPS Projects.
- Added the owner About & projects editor with draft/publish, stale-version
  reload, dirty navigation protection, and live dashboard preview.
- Added the quiet public continuation renderer; incomplete rows and unsafe
  URLs never become public links, and no raw markup or arbitrary embeds are
  accepted.
- Added the additive content RPC migration and source/unit coverage. The full
  required validation suite, local schema lint/reset, and remote migration
  deployment pass. The existing browser smoke harness was attempted three
  times but stalled before the content step during authenticated route
  navigation with transient local 401/loader failures.

## 2026-08-08 — Add bounded rich profile media

- Added the additive rich-media library and `profile_media` bucket with staged
  upload, Storage MIME verification, active selection, deletion, cleanup, and
  per-kind plus 150 MB quota enforcement.
- Added premium/staff editor controls for background video, banner, normal and
  pointer cursors, and a five-track MP3 playlist with ordering, trim points,
  shuffle, loop, volume, autoplay intent, and visible controls.
- Added public muted-video/poster rendering, optional banner/cursor variables,
  reduced-motion suppression, and finite Enter-gated audio with keyboard and
  track controls. Free image expression remains unchanged.
- Added Milestone 10 source/unit and database-security coverage. Local schema
  lint/reset and database-security checks pass; the complete repository suite
  is run at the milestone boundary.
## 2026-08-10 — Profile Studio reference-dashboard convergence

- Reorganized Customize into Appearance, Media, Effects, and Layout tabs while
  keeping all child editors mounted for draft continuity.
- Made the real-renderer Live preview a persistent desktop companion and kept a
  responsive bounded preview treatment for smaller screens.
- Refined the dashboard shell with restrained Mocha panels and spacing, retained
  Manrope, avoided gradient accents, and added an accessible browser-local
  dark/light icon switch.
- Preserved aggregate Reset / Publish profile behavior, legacy hashes, direct
  profile links, and all owner-authorized RPC boundaries.
- Preserved rich-media uploads and animated `.ani` cursor support without schema
  or Storage-policy changes.
- Validation: build, Svelte check, ESLint, 256 unit/source tests, links, CSP,
  performance, username/balance/catalog drift, scoring parity, database
  security, and the authenticated desktop/mobile/reduced-motion browser smoke
  pass. The aggregate JavaScript/CSS catalogs remain advisory overages; every
  blocking route and asset budget passes.

The follow-up reference-convergence pass now places the aggregate action bar in
the shell top row, aligns editor and preview columns to the supplied desktop
references, and adds the preview device switcher and Plus card. Appearance
colors now include a selected-color picker/palette, while media, effects, and
layout use the same compact card geometry as the supplied tab screenshots.

The final visual pass also changed the action status to the reference's dot
indicator, kept disabled actions legible, broadened browser ANI MIME detection,
and kept the dashboard route under its explicit 528 kB blocking JavaScript
ceiling.

The Effects fitting room now matches the compact reference geometry: real
avatar, border, cursor, and atmosphere renderers are clipped to a short preview
stage, and the normal “Preview only. Apply the change” helper is removed. The
Apply changes button remains the only inline commit action; failures remain
announced accessibly and successful equips continue to use the existing toast.

The follow-up interaction pass forwards Collection cosmetic events through the
Customize shell, so atmosphere drafts now update the persistent Live preview as
well as their own card. Atmosphere renderer keys remount the finite media plate
when a scene changes, and name samples are right-aligned and vertically
centered in their controls.

The name-effects fitting-room row now follows the supplied compact reference:
it uses Font, Material, and Motion labels, short select controls, aligned
renderer samples, and separators between the three composable slots. Browser
smoke asserts the labels and rendered control heights so the row cannot regress
into the expanded dashboard control rhythm.

## 2026-08-10 — Mobile Profile Studio composition

The phone layout now has an explicit shell state instead of depending only on
desktop grid collapse. The sidebar is hidden and inert until opened as a
keyboard-safe drawer; the action bar, Customize tabs, editor surfaces, and
identity controls are bounded to the viewport; and the persistent preview uses
the existing bottom-sheet treatment. Browser smoke now measures every mobile
identity field and control at 414px and captures the resulting editor surface.

Validation for this pass: `npm run check`, `npm test` (274 passing), and the
authenticated browser smoke pass. The complete required validation list remains
the milestone handoff gate.

## 2026-08-11 — Discovery and reusable-media hardening

- Repaired the avatar contract across Studio, public Discovery normalization,
  and `get_public_discovery` for both legacy and UUID-backed media paths.
- Made ordinary avatar/background removal an unequip operation, verified
  persisted upload URLs before success, cleaned failed uploads, and expanded
  owner-prefix account cleanup for reusable media.
- Removed the legacy Discovery width cap and consolidated leaderboard geometry
  around route-owned grid items and an explicit card presentation variant.
- Changed Profile Studio preview config updates to preserve the mounted shell
  for ordinary edits while keeping full resets for profile-context changes.
- Added Discovery production-browser geometry/avatar smoke coverage at phone,
  tablet, narrow desktop, and wide desktop viewports.

Validation: production build, Svelte check, ESLint, 287 unit/source tests,
links, CSP, performance, drift/parity checks, database security, local schema
lint/reset, and production browser smoke pass. Live deployment verification and
remote catalog/database checks remain environment-dependent; the Shop was not
audited.

Follow-up defect found during live review: the V2 configuration read contract
omitted dedicated expression columns. An additive migration and client
compatibility merge now preserve avatar/background paths through Studio reload,
public profile rendering, Homepage Discovery, and Leaderboard consumers.

The follow-up render audit clarified that the homepage hero profile artwork is
static, while Today’s Color and homepage leaderboard are dynamic embeds. The
dynamic rows now recover a missing discovery avatar from the hydrated public
profile, and V2 hydration backfills expression fields from the legacy read
during a partial database rollout. Regression coverage covers the V2 owner and
public paths, Studio preview projection, and homepage discovery-row merge.

## 2026-08-13 — Close retained legacy-media cleanup gap

Added additive exact-path Supabase Storage cleanup for migrated R2 assets. The
explicit delete flow and durable account-cleanup queue now preserve and process
retained legacy paths alongside R2 private/public keys. Local database reset,
database-security assertions, targeted R2 tests, cutover audit, and clean npm
install pass; the live R2 integration remains skipped without disposable R2
credentials.

## 2026-08-11 — Replace layout names with layout renderers

- Implemented distinct structural frames for Compact, Sleek, Minimal, Modern,
  and Portfolio while keeping roll state, eligibility, scoring, and events in
  shared components.
- Made Studio preview background-first with a logical desktop viewport and an
  explicit mobile canvas; removed the narrow-preview rule that stacked every
  layout into the same identity card.
- Made `layoutVariant` config-only for public rendering and removed preview-time
  `profile_layout` unequip mutations. Corrected Story Stack inventory migration
  to Portfolio and applied template module ordering when selecting a template.
- Added canonical service definitions/icons, removed public filler bio copy and
  dead handle styles, and expanded browser smoke assertions plus per-layout
  desktop/mobile screenshot capture.

Validation: build, Svelte check, ESLint, `npm test` (301 passing), links, CSP,
performance, username/balance/catalog drift, scoring parity, database security,
schema lint/reset, and the authenticated desktop/mobile/reduced-motion browser
smoke all pass. The advisory aggregate JavaScript/CSS catalogs remain over
target, while every blocking route budget passes.

## 2026-08-12 — Consolidate Profile Studio draft ownership

- Replaced competing whole-configuration preview writes with one canonical
  `studioDraft` plus scoped editor patches for appearance, media, layout,
  links, content, widgets, and identity.
- Removed the duplicate `customizepreview` forwarding path and projected
  restored hidden-editor view state only into its owned fields.
- Applied resolved surface variables directly to the profile border/surface
  owner and strengthened browser assertions to inspect computed background and
  blur there, including persistence through unrelated edits.
- Simplified preview alignment by removing the timing-dependent opening
  overflow attribute; continuation scroll state remains an affordance only.
- Made V2 read selection depend on structural response validity rather than
  avatar presence.

The previous renderer-consolidation snapshot builder remains the shared path
for public profiles and Studio. This pass reduces Studio render-state writers
without changing the five layouts or the physical-size preview architecture.
## 2026-08-13 — Harden the staged R2 control plane

- Corrected canonical SigV4 header/query signing and added deterministic
  vectors plus an environment-gated live PUT/HEAD/GET/copy/delete smoke.
- Separated standalone audio migration from playlist-track migration and made
  selection updates locked, field-scoped, and rerunnable.
- Added exact Cloudflare purge retry state, abandoned private-upload cleanup,
  reclaimable account-cleanup leases, actual media-container checks, physical
  quota/count enforcement, and promotion destination verification.

The R2 feature flag, active backfill, public canary, and Supabase Storage
retirement remain disabled pending external Cloudflare/R2 and network audits.

## 2026-08-14 — Deploy R2 infrastructure with user uploads disabled

- Deployed commit `ad240a6` through the connected Cloudflare Pages production
  workflow with `VITE_CHROMADIE_FLAG_PROFILE_MEDIA_R2` absent.
- Applied the intended additive R2/profile-media migrations to linked Supabase;
  no media backfill or legacy-object deletion was run.
- Confirmed production R2 bucket names and the cleanup scheduler deployment.
- Kept the browser maintenance gate active; authorized cleanup scheduler POSTs
  now bypass only that gate and remain protected by the endpoint secret check.
- Normal live route smoke is still blocked by the existing maintenance gate, so
  the single-account canary remains a separate next step.

## 2026-08-14 — Add the isolated R2 production canary gate

- Added `VITE_PROFILE_MEDIA_R2_CANARY_IDS` as an R2-only UUID allowlist.
- With the allowlist populated, only the exact listed Auth UUID receives the
  R2 media path; the general rollout stage and unrelated flags are unchanged.
- Added regressions for disabled, allowlisted, non-allowlisted, anonymous, and
  unrelated-feature behavior.

The production canary variables were reverted to disabled after the gate build
was verified because no approved authenticated session was available to run
the live avatar/background lifecycle. No production media row or object was
created.

## 2026-08-13 — Final R2 correctness gate

- Guarded every legacy-path selection comparison with a non-NULL asset path and
  added database regressions for unused versus selected provider-native assets.
- Preserved `updated_at`, selection-change, and cleanup state through the delete
  API; finalized temporary private metadata after successful promotion and made
  complete/promote retries idempotent.
- Bound presigned uploads to the authorized byte length, added a real 15-minute
  cleanup scheduler Worker, and expanded scheduler retry observability.
- Local build, check, lint, unit tests, database reset/lint/security, link/CSP,
  responsive, drift, parity, and performance gates pass. The live R2 smoke was
  skipped because no R2 credentials were configured, so the production canary
  remains externally unverified.

## Global R2 new-upload rollout complete — 2026-08-14

- Production has verified direct R2 uploads, promotion, `media.chm.lol`
  delivery, and physical library deletion for native R2 profile media.
- Removed the remaining browser profile-media upload fallbacks to Supabase
  Storage. New avatar, background, audio, banner, cursor, and pointer-cursor
  uploads now use the existing R2 control plane or fail explicitly.
- Added the supported Supabase Storage API cleanup boundary for retained legacy
  paths. SQL retains exact identifiers and durable tombstones; it no longer
  performs a metadata-only `storage.objects` deletion.
- Reconciliation found four active legacy Supabase assets plus three expired
  staged rows. Active rows remain pending owner-level disposition; no
  generalized production backfill or destructive active-media cleanup was run.

## 2026-08-14 — Reconcile and narrow the remaining legacy Storage surface

- Processed the three expired staged profile-media rows through the scheduled
  cleanup control plane; the cleanup queue is now empty and no active legacy
  asset was deleted.
- The current production inventory remains four active Supabase-backed assets,
  seven legacy configuration path references, and nine legacy Storage objects
  totaling 4,570,273 bytes. These are preserved because their use or ownership
  is not proven disposable; no generalized backfill was run.
- Removed the unused browser Supabase Storage upload capability from the
  compatibility client. Provider-neutral legacy reads and precise legacy
  deletion remain only for the active compatibility window.

## 2026-08-14 — Harden the remaining legacy delete paths

- Corrected exact legacy Supabase Storage removal to use `DELETE` with the
  supported `prefixes` payload; missing objects remain idempotent success.
- Moved asset-less legacy staff-audio removal behind the server control plane:
  the exact path is physically deleted first, then an owner/path-guarded RPC
  clears configuration. Failed deletion leaves the configuration reference
  recoverable for retry.
- No remaining production legacy media was deleted in this pass.

## Homepage visual replacement — Phase 1 complete — 2026-08-14

- Replaced the root homepage presentation with the approved centered reference
  shell, a direct `HomepageProfileDemo` hero/showcase specimen, local
  photographic fixture assets, real claim/auth behavior, and live community
  discovery.
- Removed the superseded homepage presentation components, assets, scripts, and
  selectors after dependency/reference audit. Shared profile rendering,
  authentication, discovery contracts, and media behavior remain intact.
- Build, check, lint, unit tests, link/CSP/performance/security/drift gates,
  responsive checks, and the homepage browser smoke/capture pass completed.
- Profile Studio was not started.

## Homepage reference fidelity correction — 2026-08-14

- Removed the homepage dependency on `ProfileShell` and deleted the obsolete
  homepage renderer adapter.
- Restored the reference composition: centered glass profile anatomy, direct
  transparent claim control, photographic full-page environments, restrained
  context, and photographic lower showcase.
- Captured and checked 1440×900, 1280×800, 1024×900, 768×1024, 390×844, and
  375×812; full validation completed without changing public profiles, Studio,
  R2/media contracts, or backend behavior.

## Profile Studio reference-first replacement — 2026-08-15

- Replaced the Customize presentation with the approved dark reference shell:
  direct identity, colors/surface, effects, media, and Compact/Immersive
  presentation controls in one reference-style panel, with a bounded
  persistent live card on the right.
- Kept the selected profile environment behind the Studio surface and reused
  the existing editor/state/draft/publish contracts without mounting the old
  public-profile renderer in the preview.
- Deferred full profile hydration and loaded only the active Customize tab on
  entry/tab change. Removed the now-unused duplicate Studio action component
  after import/reference checks and updated browser/source regression selectors
  to the new presentation contract.
- `npm run check`, `npm run build`, targeted Studio tests, and the full unit
  suite pass. Production browser smoke reached authenticated Studio and stale
  session checks; its later alias step remained environment-flaky when the
  local account became unavailable.

## Profile Studio live-preview propagation — 2026-08-15

- Wired the bounded Studio reference card to the complete staged render
  snapshot so appearance tokens, name layers, avatar effects, profile borders,
  link styling, identity presentation, and motion-related settings update
  without leaving Customize.
- Reused the existing production leaf renderers for names, avatar effects, and
  profile borders. The preview remains a bounded reference card and does not
  mount the public-profile layout renderer.
- Added snapshot/source regression coverage; the full unit suite, production
  build, and authenticated browser smoke pass.

## Profile presentation reset — 2026-08-15

- Replaced the temporary multi-layout public presentation with the two active
  structural renderers: Compact (`ProfileReferenceCard`) and Immersive
  (`ProfileFullBleedLayout`).
- Normalized the active catalog, equipped layout values, draft/published
  configuration, and template markers through the additive reset migration;
  obsolete layout inventory is cleared before the protected catalog rows are
  removed.
- Removed obsolete IdentityCard/ProfileLayoutFrame presentation code and
  updated Studio, onboarding, fitting-room, browser smoke, source guards, and
  layout tests to the canonical renderers.
- Local schema reset, database lint/security, catalog/balance/scoring drift,
  performance, link/CSP, check, build, lint, and unit validation are passing.

## Immersive link spacing correction — 2026-08-15

- Reduced the Immersive name and bio scale to the reference proportions.
- Replaced viewport-scaled social-link spacing with compact fixed horizontal
  spacing and retained accessible link hit areas and responsive wrapping.
- Added focused source regression coverage for the typography and link-row
  contract.

## Customize Links integration — 2026-08-15

- Moved Links out of the Studio More menu and into the canonical Customize tab
  order: Appearance, Media, Links, Layout.
- Integrated the existing staged link editor and alias manager into the
  reference-style Customize surface, with live draft preview and aggregate
  publish/reset behavior unchanged.
- Retained old Links, alias, and layout hashes as safe Customize-tab aliases;
  the obsolete standalone Links workspace is no longer mounted.
- Updated route, responsive, browser-smoke, and source architecture coverage.

## 2026-08-14 — Close media egress and repeated-request paths

Removed the production Supabase Storage escape hatches from profile-media
resolution, public metadata rendering, editor uploads, deletion, account
cleanup, and active database functions. R2 object identity is now the complete
remote URL identity, so unchanged media never receives a render-time query
parameter. Local Blob previews remain available only for the newly selected
file and are revoked when replaced or destroyed.

Added source, resolver, database-security, homepage network-budget, and Studio
media-stability regression coverage. The homepage remains fixture-driven with
one bounded live discovery read, at most three provider-safe public avatar
media requests, and no polling.

## Homepage daily roll board — 2026-08-17

- Replaced the hero’s right-side profile context copy with a compact Daily
  highest roll board backed by the real `today` discovery surface.
- Added avatar rendering through the existing provider-safe profile media URL
  contract, canonical profile links, and bounded loading/error/empty states.
- Moved the local demo roll beneath the hero copy; it previews the interaction
  without writing a guest score or pretending to publish a real leaderboard
  result.
- Updated responsive browser smoke coverage, network-budget assertions, source
  tests, and the homepage validation suite.

## Sitewide homepage alignment — 2026-08-18

- Audited the route tree and aligned normal auth, application, discovery,
  pricing, guide, legal, gameplay, error/loading, and Profile Studio surfaces
  with the frozen homepage shell. Public user profiles were left unchanged.
- Reused the shared header/footer and added common state/button/surface
  treatments instead of preserving the legacy dark/light page variants.
- Removed the obsolete signed-out Profile Studio lock screen. Inaccessible
  Customize actions are hidden while signed out, and direct `/profile/settings`
  entry now uses the current login route with a safe return destination.
- Added source coverage for auth guards, route redirection, typography,
  canvas, surface, button, and reduced-motion contracts. The full unit suite
  passes (398 tests); check, build, lint, links, CSP, performance, policy,
  catalog, balance, and scoring checks pass.
- The local authenticated browser smoke reaches the shared Profile Studio
  shell and direct refresh successfully. Its later media-upload step reports
  the existing local “uploads temporarily unavailable” R2 fixture state. The
  database-security check remains blocked by the existing local test database
  state (`guest roll wrote a score`), not by this UI-only change.

## Roll horizon atmosphere — 2026-08-18

- Generated and stored a light companion atmosphere for normal site routes at
  `public/site/chromadie-roll-horizon.webp`, inspired by Chromadie’s daily color
  history rather than a CSS-only gradient.
- Applied the image through the shared app/auth/status shell, kept content-safe
  dark glass surfaces, and changed shared interface chrome from mint to the
  homepage lavender accent (`#D8A6FF`).
- Preserved actual roll/reward colors, homepage fixture composition, public
  profile rendering, auth/backend authorities, and profile media contracts.

## Dedicated Roll page — 2026-08-18

- Restored `/roll` as a canonical first-class destination and added Roll to the
  homepage, application, and footer navigation.
- Wrapped the existing authoritative Game surface in a generated-atmosphere
  page shell with a focused daily ritual heading, glass result surface, and
  responsive mobile treatment.
- Kept `/?view=game` compatible and retained challenge `/c/<id>` routing,
  server roll authority, guest-local behavior, rewards, and reroll semantics.

## Roll ritual UI — 2026-08-18

- Re-composed the dedicated game phases around a spectrum instrument, focused
  reveal state, and color-first result summary.
- Kept all score, reward, contributor, guest conversion, sharing, reroll, and
  Customize information visible while reducing legacy dashboard density.
- Added rarity-aware Roll presentation tokens, responsive detail modules,
  keyboard-friendly progress semantics, and reduced-motion fallbacks.

## Roll interaction refinement — 2026-08-18

- Replaced the animated orb with a static gradient spectrum tile and restrained
  scan marker; removed the unused chamber markup, CSS, and animation keyframes.
- Reduced pre-roll copy to the daily status, account-mode hint, Color of the
  Week reward, and a single `Roll` action.
- Changed completed/reveal color previews to quiet rounded tiles and ordered
  result actions into primary share, image preview, and rarity-accented reroll
  controls. Dedicated guest results avoid duplicate progress messaging.
- Rebalanced the completed result into a desktop color/score composition and a
  mobile-first stack; compacted score factors into accessible rows and limited
  live announcements to the concise result summary.

## Compact Roll reference pass — 2026-08-18

- Replaced the earlier oversized ritual composition with a compact centered
  result-card surface based on the supplied Roll reference.
- Added the shared card header states (`Daily Roll`, saved location, and guest
  or account mode), a reference-style `Roll For Today` CTA, rarity-aware result
  label, trait chips, score contributors, and `Total Earned`.
- Added a clean CSS/DOM color tile for pre-roll, rolling, and completed states;
  the complete card now owns the pointer parallax and reduced-motion fallback.
- Captured desktop and 390px mobile pre-roll/result states; source checks and
  focused Roll tests pass. Full validation passes except the existing local
  database-security audit failure (`guest roll wrote a score`).

The pre-roll card contains no fabricated score breakdown; it only invites the
player to reveal the daily color. Breakdown rows and total score are shown after
a result exists. The dedicated completed result ends after the claimed CTA and
guest conversion prompt; rank, countdown, sharing, and image actions remain
available only through the legacy embedded Game surface.

The dedicated pre-roll card no longer carries instructional trait chips. Its
post-roll reveal uses shortened client-only pacing, shows at most two visible
traits, and places the next-roll countdown in the result button.

The Roll route now shares the homepage navigation destinations and keeps signed-
out account access visible. Desktop composition pairs the card with a restrained
daily-color context block; mobile stacks the block above the card. The result
header keeps only the saved-device/profile status and removes the redundant
guest-mode badge.

## Homepage roll entry and personal leaderboard row — 2026-08-18

- Replaced the homepage’s presentation-only roll with a direct `Roll today`
  link to the canonical `/roll` page.
- Reduced the entry to a single `Roll today` button without arrow or repeated
  timing/instruction copy.
- Removed the fake homepage result, local score, particle impact, and claim-after-
  preview path; authored profile specimens remain deterministic and presentation-only.
- Added a bounded exact-username lookup to the existing public discovery feed so
  authenticated visitors see their actual name, avatar, color, score, rank, and
  profile link in the highlighted homepage board row.
- Kept signed-out board behavior, public profile links, server-authoritative roll
  behavior, and private account boundaries unchanged.

## State-aware Roll context — 2026-08-18

- Replaced generic dedicated-page context copy after a roll with the actual
  rolled identity, rarity, score, and profile-history day.
- Added authenticated-only streak and rank/EP progression details plus a
  direct progression/history destination.
- Kept guest context limited to verified local result data and preserved the
responsive desktop two-column/mobile stacked composition.

## Grayscale site chrome — 2026-08-18

- Applied the requested grayscale token set to normal route shells, shared
  surfaces, buttons, auth/status states, leaderboard, pricing, legal/help pages,
  and Profile Studio chrome.
- Started the Roll page with neutral pre-roll UI and let the verified rolled
  color take over only in the result state; the result swatch is a single clean
  color layer with card-level parallax.
- Replaced the duplicated homepage header implementation with a thin wrapper
  around `SiteModeHeader`, keeping navigation and account visibility consistent
  across routes while leaving public profile styling/data-driven color intact.

## Header mark replacement — 2026-08-19

- Added the supplied hand-drawn AM mark as a transparent `am-mark-v1.png`
  header asset.
- Brightened homepage-style navigation and account labels to white so the
  header remains readable over the hero image.
- Removed the old dot-plus-wordmark treatment from the shared application and
  Profile Studio headers without changing navigation or account behavior.

## Progression goal contract — 2026-08-19

- Audited the progression manifest, owner RPC, normalization boundary, Studio
  summary, dedicated destination, and current tests.
- Added server-described numeric progress sources/targets and expanded the
  authored ritual/discovery cadence with active catalog-backed rewards.
- Replaced verbose goal copy with short names and direct conditions. Roll and
  streak goals show real counters; discovery goals show `Not found yet` or
  `Complete` without a misleading progress bar.
- Added ready/partial/empty/unavailable journey states, hid empty lanes, and
  removed the `0/0` failure state from the progression UI and Studio summary.
- Added recent unlocks to the progression destination and kept all grants,
  inventory writes, and progress reads server-authoritative.
- Validation: `supabase db lint --local`, `supabase db reset`, build, check,
  ESLint, 417 tests, links, CSP, performance route budgets, username/balance/
  catalog/scoring drift, and database security all pass. The browser smoke
  stopped at its initial local homepage hydration because Chromium reported
  `ERR_NETWORK_CHANGED` while Vite HMR modules were loading; no progression
  assertion ran in that smoke attempt.

## Release audit remediation — 2026-08-19

- Restored exact-repository ESLint cleanliness and added regression coverage for
  canonical route mapping and single-entry history behavior.
- Made progression rewards actual earned catalog access while preserving free
  baseline expressions, premium Atelier expressions, and compatibility for
  currently equipped rewards.
- Corrected progression analytics semantics: goal impressions use a distinct
  bounded event, unlock events are reserved for unlock presentation, account
  mode is checked server-side, and retention cleanup is no longer on the hot
  event path.
- Added atmosphere media size budgets and a poster/static fallback for
  Save-Data and constrained connections.
- Local validation passed: build, Svelte check, full ESLint, 419 tests, links,
  CSP, performance, username/balance/catalog/scoring drift, database security,
  Supabase lint, and a fresh database reset. Advisory bundle headroom remains
  tight on Dashboard and public-profile routes; the media budget passes.
- Browser smoke reached the homepage, signup, authenticated Studio refresh,
  stale-draft, alias, and live-preview checks. The default dev smoke cannot
  exercise uploads because local R2 is intentionally disabled; the production
  smoke was blocked before media assertions by the external Turnstile test
  token. This remains an environment-dependent CI gate, not a claimed pass.
