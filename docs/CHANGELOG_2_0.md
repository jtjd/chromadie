# Chromadie 2.0 Changelog

Document user-visible redesign changes by milestone.

## 2026-08-03 — Reframe the shop as a profile studio

- Replaced the competing Shop, Browse, Collection, and Studio navigation with
  a focused Catalog and Collection experience.
- Removed the launch announcement from the shop so the first view starts with
  profile expression instead of gameplay promotion.
- Made the live profile fitting room the dominant preview surface and added a
  small endpoint-backed Today’s color context without recoloring product
  cards.
- Rebuilt catalog cards around one selectable effect preview, readable rarity
  and collection metadata, and a single Buy/Owned/Equipped/Premium state.
- Replaced the repetitive “Need more EP” dead end with an explicit amount of
  EP still needed and bounded the initial catalog render with Load more.
- Simplified Collection categories and empty-state actions. Existing purchase,
  inventory, entitlement, try-on, profile settings, and server-authoritative
  boundaries remain unchanged.

## 2026-08-03 — Make names readable and cards denser

- Corrected Canvas-rendered profile names so they match the intended semantic
  heading scale in real profiles and previews.
- Put Buy, Owned, and Equipped states beside rarity and collection metadata.
- Shortened product previews and removed the redundant footer action band.

## 2026-08-03 — Match rendered names to their real scale

- Corrected short Canvas-rendered usernames appearing smaller than the
  selectable text in profile cards.
- Kept the accessible semantic name as the sizing source while measuring the
  loaded face for accurate visual fitting.
- Matched the semantic fallback's font family, style, and weight to the active
  cosmetic so selecting a username does not expose a different typeface.

## 2026-08-03 — Make the shop preview feel finished

- Enlarged the name treatment in product swatches and the fitting-room profile
  so the identity is readable at a glance.
- Centered the preview card and laid out social links in a clean responsive
  grid, preventing labels from stacking or colliding.
- Put each product’s EP cost beside its Buy action and raised collection-label
  contrast for faster scanning.

## 2026-08-03 — Give the shop a cleaner visual system

- Removed daily-color gradients from catalog product stages; previews now use
  a stable neutral surface so each effect reads clearly.
- Reworked Browse into compact category navigation, a three-column product
  gallery, smaller cards, and a balanced fitting-room preview rail.
- Removed repeated descriptions and duplicated prices from card actions, while
  preserving the existing detail sheet and purchase boundary.
- Tightened the shop header and Today’s Edit panel so the route feels like a
  focused catalog instead of a collection of empty dashboard panels.

## 2026-08-03 — Make homepage hydration endpoint-first

- Stop the local daily-roll fixture from appearing before the public `today`
  endpoint responds.
- Use a neutral loading accent instead of presenting the default color as a
  real daily result.
- Keep the homepage mounted across auth resolution so signed-in visitors do
  not briefly see signed-out claim controls or a remounted stale view.

## 2026-08-03 — Make the shop product-first

- Removed redundant Browse copy and corrected the search field’s visual label.
- Made catalog cards shorter and effect-led, with product titles opening the
  existing detail sheet instead of separate Details/Manage actions.
- Tightened the daily edit, curated row, and fitting-room preview to remove
  dead space and repeated collection/status copy.
- Kept Profile settings as the single path for equipping owned cosmetics and
  hid unknown badge placeholders from the preview.

## 2026-08-03 — Make the homepage first frame feel finished

- Show the latest real daily roll as soon as the public “today” surface
  responds, without waiting for every featured profile detail to hydrate.
- Keep the current roll and leaderboard rows stable during refreshes.
- Replace visible placeholder bars with quiet loading copy, while preserving
  the honest “still forming” state when no public rolls exist yet.

## 2026-08-03 — Improve shop readability and product focus

- Increased shop typography, control sizing, contrast, and effect-stage space
  while keeping the existing homepage visual language and font system.
- Simplified Shop Home around one daily-color edit, a real current-profile
  identity strip, a larger featured preview, and one clear Product Detail path.
- Made Browse cards effect-first in a two-column desktop grid, removed tiny
  technical/count labels, and retained the existing inline quick-buy flow.
- Replaced the stacked Product Detail previews with an Item / On your profile
  toggle so only one context is shown at a time.
- Preserved the catalog, purchase RPC, confirmation, inventory, entitlement,
  temporary fitting-room, route, and accessibility boundaries. No schema or
  backend changes were introduced.

## 2026-08-03 — Reduce daily-color repetition

- Removed the extra “View profile” instruction from the clickable winner
  identity block.
- Replaced the duplicate “Rarity earned” stat with the winner’s current streak.

## 2026-08-03 — Connect today’s color to its highest roll

- Clarified that the live homepage color is today’s highest public roll.
- Added the winning profile’s avatar and a direct link to its public profile.
- Renamed “See today’s public rolls” to “See today’s top rolls” to match the
  leaderboard destination.

## 2026-08-03 — Tie the wordmark to today’s color

- The homepage `.lol` wordmark segment now follows the active daily color.
- The “changes every day” hero phrase uses the same color, keeping the brand
  accent and daily-color preview synchronized.
- Added a restrained transition and reduced-motion handling.

## 2026-08-03 — Balance the homepage daily color

- Renamed the module “Today’s color” so its heading describes what visitors
  are seeing.
- Centered the color’s glyph, color value, rarity, and heading to match the visual
  center of the browser stage.
- Retained score and earned rarity as supporting rows.
- Removed the “A new color joins the profile” copy entirely.

## 2026-08-03 — Make the homepage daily roll feel native

- Removed the cheesy visible “example” treatment from the local homepage
  fixture; it now shares the live result presentation.
- Reframed the panel as a daily roll, identifying the featured public profile
  when live discovery data is present.
- Presented the color, earned rarity, and score as one roll result, and renamed
  the destination to “See today’s public rolls.”
- Clarified that rarity is earned per roll, not assigned to every color on a
  given day.

## 2026-08-03 — Clarify the daily-color preview

- Replaced the opaque “vivid violet signal” label with a readable color-first
  result and explicit example context.
- Removed ambiguous leaderboard position, clarified the roll score and rarity,
  and changed the discovery link to “Explore public profiles.”
- Made the local example Rare so it does not imply every daily color is Mythic.

## 2026-08-03 — Refine the homepage lower sections

- Turned “How it works” into a three-step horizontal sequence with a calmer,
  continuous stage.
- Made leaderboard rows lighter and more editorial, with a truthful empty
  state and a direct path to explore profiles.
- Kept the real product imagery, lightbox interactions, responsive behavior,
  and existing discovery/claim boundaries intact.

## 2026-08-03 — Improve the homepage first viewport

- Made the public profile easier to see and read in the homepage hero.
- Removed empty recent-roll ticker space and replaced the large empty daily
  result panel with a compact, truthful status.
- Improved mobile presentation by keeping the unavailable-result status below
  the profile instead of covering it.
- Tightened the homepage introduction and changed the primary action to
  “Claim page.”
- Restored the original-resolution profile PNG in the hero so its fine detail
  is not softened by a lossy derivative.
- Added a localhost-only daily-color preview that uses the existing guest roll
  fixture by default, with `?home_preview=empty` available for empty-state
  testing; production remains live-data-only.
- Refined the browser-style hero frame with a higher-contrast address bar,
  removed the redundant inset border and “PUBLIC PROFILE” label, and kept one
  clear outer boundary around the composition. Replaced the placeholder cue
  with a complete Safari-style toolbar: traffic lights, navigation, privacy,
  locked URL, reload, share, new-tab, and tab controls.
- Added a full-height local preview capture so the existing product showcase,
  How it works, leaderboard, and final claim surfaces can be reviewed as one
  homepage composition.

## 2026-08-02 — Align the shop with the approved identity storefront

- Reworked the existing Shop Home hierarchy toward the approved dark boutique
  direction with a compact category row, real catalog counts, an editorial
  Today’s Edit, and a small real recommended selection.
- Reworked Browse’s Name surface into a Font/Material/Motion lab while
  preserving search, sort, filters, contextual preview, Product Detail, and
  temporary try-on behavior.
- Product cards now keep the name and EP price together, use the shared visual
  renderer for previews, and present rarity, collection, ownership, and
  description as compact metadata. Earned products also expose an inline Buy
  button that preserves the existing confirmation and purchase RPC boundary.
- Added isolated/combined contextual preview controls with Replay, Pause, and
  Reset actions while keeping the live account identity in the preview.
- Shop profile previews use the authenticated user’s real handle and display
  name rather than a placeholder identity. No mock products or backend data
  were added.

## 2026-08-02 — Lean alpha cosmetic reset

- Reduced the live cosmetic catalog to the 64 modern Name products and nine
  retained Profile Border designs, plus the existing utility/title entries.
- Removed legacy Name presets, Frames, cosmetic profile backgrounds and
  atmospheres, Orb Shapes, Roll Effects, and Leaderboard Themes from the live
  catalog, equipped loadout, shop, settings, Studio, preview, and CSS paths.
- Added one shared, code-owned Profile Border renderer with finite keys,
  reduced-motion handling, offscreen pausing, and stable card/profile output.
- Preserved wallets, EP, rolls, scores, achievements, profile media, links,
  rivals, leaderboard behavior, consumables, and titles. No refunds or
  replacement grants are created by the reset.
- Remote cleanup remains pending a verified backup and explicit database-owner
  deployment approval.
- The measured build fell from the D2 baseline of 806.28 kB JavaScript and
  431.81 kB CSS to 767.87 kB JavaScript and 388.92 kB CSS. Initial and
  largest-lazy budgets pass; the transitional total caps remain documented
  debt at 767.87/700 kB JavaScript and 388.92/380 kB CSS.

## 2026-08-02 — Phase D2 composable Name catalog activation

- Activated 64 paid Name products through the existing shop and purchase
  authority: 18 Fonts, 22 Materials, and 24 Motions. Plain and Still remain
  free defaults rather than purchasable products.
- Added independent Font, Material, and Motion equipped layers while keeping
  legacy Name presets usable by their existing owners. Applying one modern
  layer preserves the other modern layers; switching between legacy and
  modern Name presentation clears the conflicting side atomically.
- Added Name subtype navigation in Browse, owned subtype filters and legacy
  labels in Collection, combined temporary fitting in Studio, and permanent
  layer selectors in Profile Settings. All previews use the shared Name
  renderer and semantic username path.
- Preserved `purchase_item`, wallet/inventory/entitlement refresh, RLS,
  profile-save boundaries, item keys, prices, legacy CSS, and old ownership.
  The catalog lifecycle prevents new purchases of legacy rows and keeps
  retired rows out of the shop.
- The 64 new rows total 20,480,000 EP. No automatic replacement grants,
  payment changes, font dependencies, or legacy-row deletion were introduced.
  Legacy CSS removal and final parity cleanup remain Phase E.

## 2026-08-01 — Preserve more background image detail

- Increased the stored background-image limit from 1 MB to 4 MB.
- Background uploads now retain up to 3200 px and begin WebP conversion at
  higher quality; avatar processing is unchanged.
- Public identity cards now show all six configured links, including dedicated
  Twitch, Instagram, and TikTok icons.

## 2026-08-01 — Make ambient profile color effects opt-in

- Added an off-by-default profile setting for ambient color effects.
- Disabled profiles show their selected background without the atmosphere
  veil or ambient tint layers; roll and signature colors also no longer recolor
  the play/volume controls or profile navigation cues.
- Card data, links, labels, and badges keep their signature color treatment;
  avatar fallback styling remains neutral.

## 2026-08-01 — Keep roll and signature colors inside profile data surfaces

- Stopped the latest daily roll from recoloring the full profile atmosphere,
  opening surface, or avatar fallback.
- Kept signature color for links, badges, labels, and other card/data accents.
- Preserved user-selected background and atmosphere cosmetics without applying
  the roll or signature color to them.

## 2026-08-01 — Add screenshot-based homepage showcase slots

- Replaced cramped embedded profile previews with an asymmetric screenshot
  collage and screenshot-based below-fold profile showcase.
- Central imagery uses explicit dimensions and eager loading; below-fold
  imagery is lazy-loaded and mobile screenshots stack for readability.
- Removed unavailable homepage metric placeholders and left the live-roll
  ticker unchanged.
- Replaced the temporary capture placeholders with four static public-profile
  screenshots linked to their corresponding profile routes.
- Added a reference-style daily-ritual explanation using a local sample roll;
  it does not call or simulate the authoritative roll transaction.

## 2026-08-01 — Remove invented homepage profile history

- Removed the horizontal recent-colors strip from the featured homepage
  preview because it does not match the live public profile.
- Kept profile history in the live profile’s secondary archive/story surface.

## 2026-08-01 — Cool the interface accent

- Switched shared interface accents from lime to a cool near-white.
- Added cyan interaction cues across navigation, links, focus states, and shop
  highlights.
- Retained lime for daily-roll and reward feedback.

## 2026-08-01 — Tighten the homepage first impression

- Reduced desktop hero height so the claim action and featured profile appear
  together in the first viewport at 1920×1080.
- Preserved the larger mobile headline and stacked mobile reading order.
- Added a 1920×1080 homepage capture for visual review.

## 2026-08-01 — Match homepage previews to live profile controls

- Replaced the invented homepage music card and waveform with the same floating
  play and expandable volume controls used by live profiles.
- Anchored preview controls outside the featured identity card and removed the
  invented today-color/current-rank strip from that card.
- Switched the featured example to existing cool-toned profile cosmetics and
  removed amber from the homepage/demo visual treatment.

## 2026-08-01 — Refine homepage profile aspiration

- Replaced vague homepage copy with a direct explanation of public profiles,
  customization, the daily color roll, and rank-based visibility.
- Upgraded the featured example to show the Mara dog avatar, identity, links,
  music controls, and restrained production cosmetics.
- Replaced the homepage leaderboard-style cards with three distinct profile
  examples: Minimal, Atmospheric, and Expressive.
- Added full in-page example-profile views, a quiet “Explore today’s
  leaderboard” link, and a final claim action without changing public profile
  routes or leaderboard logic.
- Styled homepage audio controls are preview-only; no full Spotify or media
  embeds load on initial page render.

## 2026-08-01 — Rework leaderboard cards around profile identity

- Replaced anonymous score-first cards with profile-forward discovery surfaces.
- Added public display name, bio, accent, and validated avatar data to the
  bounded discovery projection.
- Show the latest color beside the person it belongs to, with streak, rolls,
  score, rarity, share, and profile actions kept in the same card.
- Keep initials as the designed fallback when a profile has no avatar.
- Preserve ranking, filters, pagination, privacy, and server authority.

## 2026-08-01 — Restore the application header treatment

- Returned the header to its transparent, blurred-pill presentation.
- Matched the `chm.lol` wordmark to the header’s Satoshi typography.
- Kept the `.lol` accent lime and preserved navigation prefetch behavior.

## 2026-08-01 — Keep navigation inside the live shell

- Split non-home route components into cached deferred chunks.
- Keep the current page visible while a destination loads, with compact inline
  loading and retry states for direct loads and failures.
- Prefetch common destinations during idle time and when users hover or focus
  primary navigation.
- Preserve existing SPA routes, authentication boundaries, profile URLs, and
  server-authoritative gameplay behavior.

## 2026-08-01 — Add interactive roll and profile discovery to the homepage

- The homepage daily-roll example now opens into a local sample reveal with a
  real rarity, score, and condition presentation.
- Visitors can continue from the completed preview into profile creation;
  authenticated users can open their profile.
- Added a “Today on Chromadie” rail using public discovery entries, direct
  profile navigation, retry handling, and an intentional empty state.
- Preserved server-authoritative roll behavior and public-data boundaries.

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

## 2026-08-01 — Simplify profile settings hierarchy

- Replaced poetic settings copy with concise, instructional text.
- Removed redundant public-profile links from the editor body.
- Reduced the intro footprint and widened the live profile preview.

## 2026-08-01 — Improve settings editor density

- Expanded the profile bio field across the available editor width.
- Added a themed staff audio player with play/pause, seeking, progress, and
  duration controls.
- Tightened spacing between audio details, playback, and upload actions.

## 2026-08-01 — Remove redundant settings chrome

- Removed the duplicate section heading and local top utility bar.
- The left settings rail now provides the sole section context.

## 2026-08-01 — Connect layout controls to the live draft preview

- Removed the abstract layout chip diagram and its separate preview toggle.
- Connected every normalized layout draft edit to the shared profile preview.
- Made style, signature color, links, story visibility, and section order
  visible in the draft preview before publishing.

## 2026-08-01 — Refine the profile roll entry point

- Replaced “Reveal your color” with direct “Roll your color” copy.
- Added a live `Resets in HH:MM:SS` countdown to the ready state.
- Replaced the orb/orbit treatment with a restrained square signal mark and
  quieter profile-aligned button styling.

## 2026-08-01 — Make atmosphere effects full-page overlays

- Added a separate `profile_atmosphere` cosmetic slot for rain, snow,
  fireflies, and scanlines.
- Rendered those effects across the full public profile viewport while keeping
  profile backgrounds scoped to the identity card.
- Migrated existing weather loadouts and kept their item keys and entitlements.

## 2026-08-01 — Replace tiled profile effects with procedural layers

- Replaced repetitive CSS grids and repeated background tiles with a seeded
  canvas renderer for rain, snow, fireflies, and scanlines.
- Reused the same renderer in profile settings, the decoration studio, and shop
  previews so effects stay visually consistent while being extended.
- Preserved curated effect allowlisting and `prefers-reduced-motion` behavior.

## 2026-08-01 — Rebuild the cosmetics shop as a visual atelier

- Replaced the dashboard-like shop presentation with a profile canvas beside
  catalog browsing and a compact featured collection strip.
- Added reusable shop item cards and a selected-item panel with clear free,
  earned, premium, owned, and preview states.
- Added temporary try-on across profile, roll, and leaderboard preview
  contexts without changing equipped account state.
- Kept purchases server-authoritative and purchase-only; owned cosmetics now
  link to profile settings for permanent equip management instead of being
  equipped automatically.
- Removed the redundant detail drawer and kept the existing catalog, wallet,
  entitlement, route, and RPC contracts intact.

## 2026-08-01 — Remove auth flashes during internal navigation

- Kept same-origin application links inside the SPA router so shop, profile,
  settings, discovery, and legal navigation do not reload the document.
- Prevented protected routes from showing the signed-out account lock while
  the existing session is hydrating.
- Let profile settings render from the current account profile immediately
  while deeper configuration data refreshes in place.

## 2026-08-01 — Reconcile additive catalog migrations

- Updated the catalog drift check to include the additive atmosphere catalog
  migration on top of the base live snapshot.
- Parsed all `shop_items` insert blocks in the seed and supported SQL boolean
  values, keeping fresh resets and remote catalog checks aligned.

## 2026-08-01 — Prototype a quieter game-native homepage

- Kept the shared application header unchanged while giving `/` a flat
  warm-black background without the default purple/cyan atmosphere.
- Introduced homepage-scoped geometric and technical typography.
- Replaced the glowing SaaS-style mockup with a restrained specimen that
  reuses the live public-profile identity card and a dedicated daily-roll
  section explaining score, leaderboard position, and profile visibility.
- Removed showcase prism, spectrum, sparkle, orb, nested-glass, and colored
  frame treatments while preserving existing homepage actions and analytics.
- Added a profile color trail and separate warm identity/daily-roll accents to
  give the specimen more character without adding visual noise.
- Added a curated real-cosmetics fixture and local anime-dog avatar so the
  homepage preview demonstrates the same expression systems as live profiles.

## 2026-08-01 — Extend the game-native visual system across the site

- Applied the homepage warm-black canvas, signal-lime accent, Spline Sans
  typography, and IBM Plex Mono metadata treatment to supporting routes.
- Reworked the shared shell, Roll, discovery, leaderboard, studio, profile
  settings, auth, guest, help, legal, banner, error, and footer surfaces.
- Removed the legacy route-wide purple/cyan atmosphere from supporting pages;
  public profile and cosmetic previews retain profile effects.
- Preserved server-authoritative rolls, authentication, catalog and purchase
  behavior, profile rendering, URLs, and accessibility boundaries.
- Updated source-level visual contracts and retained reduced-motion behavior.

## 2026-08-01 — Reconcile compact profile and roll previews

- Added a shared `CompactRollPreview` adapter so homepage, discovery, and shop
  previews use the same orb shapes, rarity treatment, and roll effects as the
  live profile.
- Replaced the homepage and discovery-only color swatches with the shared
  cosmetic-aware renderer.
- Added the configured avatar to the shop leaderboard context while retaining
  a safe initial fallback.

## 2026-08-01 — Refine discovery cards into profile tiles

- Reduced the generic leaderboard-widget treatment on homepage and leaderboard
  cards.
- Kept the profile identity and score primary, with the current color presented
  as one compact secondary signal.
- Removed visible question-mark placeholders for unknown badge ids.

## 2026-08-01 — Add a cohesive homepage cosmetic build

- Added the `Signal Garden` collection for the homepage's Mara profile
  example: background, border, frame, name treatment, roll orb, and roll
  effect.
- Replaced the mixed starfield/rain/chroma treatment with a warm-black,
  lime-and-amber visual system and kept Fireflies as the full-page atmosphere.
- Added the collection to the shop's featured strip through the existing
  catalog and fitting-room flow.
- Added source contracts for catalog parity, CSS class coverage, and preview
  loadout completeness.

## 2026-08-01 — Homepage live-directory rebuild

- Rebuilt only the public homepage around the approved live-directory
  reference while preserving the existing header and public profile routes.
- Added an authoritative recent public-roll ticker, uneven profile collage,
  real public profile hydration, truthful empty states, discovery links, and a
  compact roll-to-discovery explanation.
- Removed homepage use of fictional profile specimens and avoided adding any
  homepage-only appearance, roll, rank, music, or activity data.
- Added local Instrument Sans for the homepage only and deferred audio/Spotify
  media until explicit interaction.

## 2026-08-01 — Apply homepage visual language to supporting routes

- Removed the old equipped effect wrapper from compact reference orb previews.
- Unified non-profile route surfaces around the homepage's warm-black canvas,
  Instrument Sans/IBM Plex Mono typography, lavender-blue accent, quiet borders,
  and off-white controls.
- Left public profile rendering and profile-specific visual systems unchanged.

Signed-out supporting routes now use Explore/Leaderboard navigation instead of
linking to the legacy guest profile onboarding page.

## Homepage directory activity summary — 2026-08-01

- Simplified the public-roll ticker to username, hex, and a color dot, with a
  slower full-width loop.
- Added authoritative daily roll count and next-reset countdown stats beneath
  the username claim.
- Tightened the hero copy and widened the desktop profile-directory split.

## Candidate 5.11 homepage reconciliation — 2026-08-01

- Reworked the public homepage to match the supplied centered-roll reference:
  measured live activity ticker, daily result panel, product explanation,
  Roll/Progress/Visibility tabs, three-row leaderboard, and final claim.
- Connected the visible public activity to existing discovery/profile data and
  reused the real roll-effect renderer; no mock production profiles or new
  gameplay authority were added.
- Preserved the existing sign-in/sign-up modal flow, username validation,
  public profile links, global footer, and mobile/reduced-motion behavior.

## Candidate 5.11 homepage interaction corrections — 2026-08-01

- Corrected the centered shell and hero vertical spacing for the supplied
  1907×942 desktop composition.
- Added enlarged image previews to the profile/roll and How it works sections.
- Made the hero Today panel link scroll to the live leaderboard.
- Matched the home header `.lol` color to the hero lavender-blue.

- Tightened the hero profile specimen with a subtle CSS-only zoom.
- Restored the How it works heading scale, muted its explanatory copy, and
  contained the daily-roll image so the full preview remains visible.
- Switched the desktop hero to the original-resolution PNG source to preserve
  image detail during the tighter crop.
- Halved the desktop Product showcase image height while preserving the key
  profile and daily-result focal areas.
- Zoomed the shortened profile crop to keep the identity card legible and
  restored the Candidate 5.11 leaderboard heading, kicker, and subcopy roles.
- Kept the profile/roll showcase statically visible so interrupted scroll
  reveals cannot hide the section.
- Replaced the homepage’s default circular/orb roll preview with the
  reference’s faceted SVG glyph and float motion. Existing orb-shape classes
  now use the same clean presentation while retaining their catalog keys.

## 2026-08-01 — Cohere supporting pages with the homepage

- Reworked the leaderboard surface from feature cards into a quiet, homepage-
  style public-profile board without changing discovery data or actions.
- Restyled Privacy and Terms as one shared product-document family with the
  homepage font, color, spacing, and border roles.
- Preserved public profile rendering, auth, scoring, RLS/RPC boundaries, and
direct route behavior.

## 2026-08-01 — Refine profile header and homepage daily result

- Made the public profile header transparent and limited it to `chm.lol` plus
  username/sign-out or sign-in controls.
- Vertically centered the homepage Today’s Color content within its hero panel.
- Preserved profile rendering, authentication, and route contracts.

## 2026-08-02 — Reset shop architecture around the live profile

- Rebuilt `/shop` around curated Home, full-catalog Browse, real Collection,
  temporary Studio, and product-detail surfaces.
- Preserved item keys, prices, rarities, server-authoritative `purchase_item`,
  wallet/inventory/entitlement refreshes, and profile customization boundaries.
- Added search, category, collection, rarity, ownership, affordability, and
  sort controls without introducing migrations, seed changes, or new effects.

## 2026-08-02 — Refine shop visual composition

- Aligned the live shop surfaces more closely with the approved reference’s
  stage proportions, category strip, filter rail, collection tabs, Studio
  workspace, product visual height, and detail drawer styling.
- Kept all content account-backed and preserved existing purchase, inventory,
  entitlement, equipped, preview, and profile-settings contracts.

## 2026-08-02 — Add Phase A Name rendering foundation

- Added one shared Canvas 2D Name renderer with compact/profile contexts,
  animated/paused/static/reduced-motion modes, deterministic seeded noise,
  capped device pixel ratio, offscreen pausing, and cleanup-safe clock and
  observer lifecycles.
- Added code-owned renderer presets for all 29 existing `name_effect` keys and
  kept the existing catalog, ownership, entitlement, pricing, purchase, and
  equip contracts unchanged.
- Integrated the renderer only into the internal Profile Settings preview;
  legacy CSS remains available on every other surface until parity is signed
  off.

## 2026-08-02 — Complete Phase B Name renderer integration

- Replaced production and internal Name effect rendering across public
  profiles, profile settings, shop item/product previews, Studio, discovery,
  leaderboard, rivals, homepage directory/leaderboard, and homepage examples
  with the shared semantic `NameEffectCanvas` path.
- Added deliberate full, compact animated, and static-signature context modes,
  real daily-color/history inputs, offscreen pause behavior, and accessible
  semantic text preservation.
- Added an internal-only 29-key legacy parity harness and static architecture
  checks. Legacy CSS remains for comparison/rollback and is no longer applied
  by production Name surfaces.
- Recorded parity as strong, acceptable reinterpretation, or needs refinement
  per legacy key without claiming pixel-perfect equivalence.
- Preserved all item keys, catalog rows, prices, entitlement identity,
  purchase/inventory/equip behavior, RLS, and server authority. No schema,
  catalog, new effect, or replacement-grant work started.

## 2026-08-02 — Complete Phase C shop presentation refinement

- Simplified Shop Home around a compact category bar, real Today’s Edit
  merchandising, the current profile/roll context, one curated row, and
  Browse/Collection text paths.
- Replaced Browse’s permanent filter rail with a compact toolbar and
  contained filter panel, added a sticky contextual preview using the shared
  Studio/Name renderer, and kept the full real catalog/filter contracts.
- Reworked cards around readable name/price/preview/rarity/collection/state
  hierarchy with detail-first purchase decisions.
- Converted Product Detail to a right drawer on desktop and bottom sheet on
  mobile with focus restoration, Escape handling, existing confirmation,
  temporary try-on, related items, and account refresh behavior preserved.
- Refined Collection search/quantities and Studio presentation without
  changing item keys, prices, catalog rows, inventory, entitlements, RLS,
  profile saves, permanent equip, schema, or legacy Name CSS.

## 2026-08-02 — Phase D1: prepare the composable Name catalog

- Extended the Phase A/B shared Name renderer with a safe composable loadout
  resolver and explicit Font, Material, and Motion inputs. Legacy
  `rendererKey` behavior remains compatible and takes the fallback path unless
  a composable layer is explicitly supplied.
- Added all 18 Font definitions, 23 Material definitions including Plain, and
  25 Motion definitions including Still. This is renderer/catalog foundation
  work only; the 64 paid definitions are not live, purchasable, or connected
  to database slots.
- Added reusable Canvas primitives for bounded fills, strokes, masks, seeded
  texture, slices, fragments, character layers, echoes, daily color, and
  recent-color history. Paid Motion output uses the shared animation clock and
  no per-component requestAnimationFrame loop.
- Added an internal-only composable catalog gallery for layer isolation and
  combined-loadout review. No production route or navigation entry was added.
- Preserved all 29 legacy Name keys, item ownership, entitlements, prices,
  inventory, equip behavior, purchase RPCs, RLS, shop behavior, and legacy CSS.
- Kept the existing Instrument Sans Variable, Spline Sans Variable, and IBM
  Plex Mono font packages. Unsupported reference faces use documented local or
  system fallbacks; no remote font or new font asset was added.
- D1 build totals are 794.07 kB JavaScript and 430.09 kB CSS versus Phase C
  765.16/430.09 kB. Initial JavaScript is 440.13 kB, largest lazy JavaScript
  73.13 kB, and font assets total 220.49 kB (215.32 KiB in binary units). The transitional total caps still
  fail honestly; initial/largest-lazy budgets pass.

## 2026-08-03 — Refine the homepage around accumulated identity

- Made the real profile identity more legible inside the existing
  high-resolution browser presentation and carried the validated daily color
  into restrained, contrast-safe homepage accents.
- Rewrote the lower-page narrative around persistent color history, exposed
  all three Roll/Evolve/Explore steps at once, and varied the section rhythm.
- Added distinct today, real-profile fallback, loading, error, and empty
  discovery states without adding demo data or another backend request.
- Updated the final username claim to emphasize a page that changes with the
  player while preserving authentication, routing, scoring, public data, and
  deployment contracts.
## 2026-08-03 — Use the reference Font families in production

- Font products now use their real family names, such as `Cormorant Garamond`,
  `Syne`, `Pirata One`, and `VT323`, instead of invented aliases.
- Bundled and lazy-loaded the reference families so each Font preview has a
  genuinely different face.
- Preserved all technical keys, effect behavior, prices, rarities,
  descriptions, inventory, and equip/purchase contracts.

## 2026-08-03 — Reconcile the live shop catalog

- Applied the pending Name-label migrations so the live shop uses the canonical
  Font family names and the approved Material/Motion vocabulary.
- Restored the nine retained profile-border descriptions with a safe additive
  migration.
- Kept Streak Freeze quantity stacking intact and declared it explicitly in the
  canonical seed/check instead of changing its purchase behavior.
- Bumped the catalog version so existing browser caches pick up the corrected
  labels without requiring users to clear storage manually.

## 2026-08-03 — Keep shop try-on on the profile

- Replaced the oversized product-detail interaction with a persistent
  fitting-room preview. Selecting a piece now applies its effect to the
  profile card in place; the equipped profile remains visible and Clear
  restores it.
- Removed the isolated-item/profile toggle and the social-link grid from the
  bounded preview so the actual identity treatment is the focal point.
- Preserved card purchases, confirmation, inventory refresh, entitlements,
  server-authoritative purchase RPCs, and profile-settings equip behavior.

## 2026-08-03 — Make the selected shop effect visible

- Applied each selected Name catalog item’s renderer value to the persistent
  profile preview, without mutating the equipped loadout.
- Removed the redundant Try it on detail block so the preview is anchored by
  the player’s profile and a small set of playback/reset controls.
