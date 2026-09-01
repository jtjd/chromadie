# Chromadie 2.0 Changelog

Document user-visible redesign changes by milestone.

## 2026-09-01 — Align expression effects with every profile layout

- Profile borders now fit the rendered Default, Sleek, Full-bleed, Framed, and
  Portfolio surfaces instead of inheriting a wider layout opening.
- Halo Offset and Wavefront decorative layers track the same surface bounds on
  responsive profiles and Studio previews.
- Kept the effect catalog, profile data authority, scoring, and reduced-motion
  behavior unchanged.

## 2026-09-01 — Add source-backed profile expression layers

- Added Shimmer Track for a moving rounded-profile edge, with a static fallback
  for reduced motion and offscreen states.
- Added Spectrum Flow and Soft Halo for animated and luminous name treatments,
  plus Soft Orbit as a rounded display font choice.
- Added Bounce In and Fold In entry animations to the shared profile card,
  portfolio, and full-bleed layouts.
- Kept product labels original to Chromadie and did not import a user-specific
  remote avatar decoration as a catalog effect.
- Expanded the active catalog to 98 rows without changing gameplay authority,
  scoring, RLS, or historical ownership records.

## 2026-08-31 — Final launch stabilization

- Kept the full daily Roll on `/roll`; profiles now contain only the current
  static result and progression story, avoiding a second embedded game.
- Made the discovery setting also remove profiles from generated sitemaps and
  request `noindex,follow` while keeping direct profile links functional.
- Hardened Plus checkout against duplicate concurrent sessions and stale
  expired checkout state.
- Updated Privacy and Terms to match current hosting, media, analytics, and
  payment behavior.
- Reduced route payload and removed normal-production prototype code without
  changing visuals, scoring, progression, cosmetics, or historical data.

## 2026-08-30 — Reduce Compact to a daily-roll summary

- Compact now shows a small daily-roll widget with the color swatch, color
  identity, HEX, rarity, and earned score.
- Removed the embedded timer, roll action, condition breakdown, share action,
  reward surface, and other game controls from the profile card.
- The full interactive roll remains available on its dedicated/alternate
  profile surface, so the profile summary and the game each keep a clear job.

## 2026-08-30 — Finish the compact profile/link contract

- Redesigned Compact as a balanced profile-and-game surface: identity first,
  a small static Daily Roll summary second, and a six-link rail last.
- Fixed links in the public compact card and the Customize live preview,
  including safe external targets and profile click tracking.
- Enforced six total links across the editor, preview, V1/V2 normalization,
  and stored configuration cleanup. Link overflow no longer creates a second
  continuation surface.

## 2026-08-30 — Align the compact profile roll with the result card

- Rebalanced compact owner and visitor results as one profile-and-game surface:
  the profile owns the card while the roll borrows the dedicated game's square
  color signal, score treatment, and condition evidence.
- Flattened the shared breakdown and reduced reset/share controls to an
  integrated footer so the inline card does not read like a full game card
  nested inside the profile.

## 2026-08-30 — Refine the compact profile roll

- Reworked the compact profile's daily roll into a legible inline game surface
  with a reset timer, focused `Roll today` action, color preview, identity, and
  score.
- Kept the same owner reveal flow, visitor result projection, server authority,
  and reduced-motion behavior as the full roll game.
- Fixed narrow public compact profiles so content can grow without clipping or
  being vertically centered outside the viewport.

## 2026-08-27 — Harden account media cleanup

- Enabled row-level security on the internal account-media cleanup queue while
  keeping cleanup available only through the service control-plane RPCs.

## 2026-08-27 — Clarify score and reset hierarchy

- Stacked the score label above the result total for a clearer metric block.
- Recolored condition point values and live reveal totals with the earned-score
  orange instead of the rolled color.
- Turned the top-roll expiry line into a centered card footer with a divider
  and concise `Resets in` copy.

## 2026-08-27 — Clarify the completed daily roll

- Removed the duplicate overall rarity badge beside the score; rarity now
  stays attached to the color result where it is already identified.
- Moved the guest “Create an account” CTA into the left result context so the
  right-side share and next-roll controls keep their own clear action area.
- Matched the summary score's earned-value styling to the result context while
  keeping the score label concise.
- Increased the saturation of dedicated result and reveal rarity accents for
  better scanability while leaving the canonical score model unchanged.
- Removed the decorative rarity glyph and centered the score and share action
  within the result card.
- Matched the homepage best-roll spotlight to the result styling for color
  metadata, earned score, rarity, condition evidence, and supporting metrics.
- Gave the spotlight a clear “Today’s top roll” title, separated the player
  identity, reused the result score summary, and removed the repeated hex.
- Promoted the winning player's avatar and name into a dedicated “Rolled by”
  block with a clear, live `#N TODAY` achievement badge.
- Added a restrained animated glow behind the spotlight using the winning
  color, with a static reduced-motion fallback.
- Slowed the active reveal, exposed the full returned condition list with a
  contained auto-following viewport, and removed stage labels plus the early
  overall-rarity copy.
- Added a concise `A NEW COLOR, EVERY DAY` eyebrow above the pre-roll value to balance
  the two-column composition without adding explanatory copy.

## 2026-08-27 — Balance the completed daily roll

- Replaced the dense result ledger with a compact score summary showing the
  total and three strongest conditions; the color card retains the overall
  rarity label.
- Moved the complete server-returned breakdown into a contained, scrollable
  detail panel so full condition names remain readable without stretching the
  result card.
- Centered the result context beside the focused card and stacked the layout
  at tablet widths.

## 2026-08-27 — Pace the daily roll reveal

- Stretched the reveal into deliberate color, channel, condition, score, and
  completion beats so the result arrives progressively instead of all at once.
- Kept condition discovery common-first and rarest-last, with skip and reduced
  motion still resolving directly to the server-confirmed result.
- Centered the active left context, changed the unknown color to `#??????`,
  and removed redundant progression and pre-roll copy.

## 2026-08-27 — Recompose the homepage daily-roll invitation

- Set the pre-roll beside a larger “today’s best roll” result-style card so
  the first viewport uses its space like the result screen, with the prompt on
  the left and the best roll on the right; clicking roll replaces that right
  card with the live game, and the layout stacks cleanly on smaller screens.
- Added the winning player's avatar or initials, display name, rank, actual
  color, rarest roll conditions, score, percentile, and reset countdown.
- Kept the pre-roll itself unknown and removed the speculative animated
  spectrum; the only vivid color is the real best roll returned by the public
  board.
- Preserved the server-authoritative roll, guest persistence, and shared `/roll`
  behavior.

## 2026-08-26 — Restore and lock deterministic probability-weighted scoring v6

- Stabilized condition discovery on the dedicated Roll page by reserving the
  reveal regions and scrolling long condition lists inside the roll card. The
  left-side roll summary no longer shifts as conditions appear.
- Replaced the superseded v6 scoring implementation with an exact,
  probability-weighted condition catalog measured across the complete RGB
  color space.
- Locked 237 active conditions and 25 combinations to generated client/server
  evaluators, deterministic rewards, and independent contract tests.
- Removed repetitive single-character `Contains X` score rows while retaining
  meaningful HEX pairs, triplets, sequences, words, and structural patterns.
- Conditions now reveal from common to rare, leaving the strongest discovery
  for the final beat.
- Condition rewards now use the approved 500 through 5,000,000 rarity bands,
  with an open-ended 100,000,000+ Anomaly band; overall roll tiers use the
  approved 2,500 through 100,000,000 score thresholds.
- Preserved historical v3–v5 scores and replay behavior, including a legacy
  path for pre-existing score-version-6 records.

## 2026-08-25 — Make rarity mean probability and add more memorable rolls (superseded)

- New rolls now use a deterministic, server-authoritative v6 score model.
- Condition rarity is based on how often a signal appears in the full RGB
  space, and rarer conditions always use higher reward bands.
- Added 28 culture and pattern conditions, including the Six Seven meme family,
  A24, D23, Final Fantasy VII, A113, 808, 1989, calculator jokes, repeated
  number memes, and HEX-native words such as C0FFEE and DEC0DE.
- Stronger versions of a nested culture phrase pay once, while independent
  color and structure conditions continue to stack.
- Recalibrated roll tiers to approximately 1% Trash, 49% Common, 25% Uncommon,
  15% Rare, 7% Epic, 2% Legendary, and 1% Anomaly, with exceptional exact
  colors still reaching more than 100 million EP.
- Preserved all historical v3–v5 scores and replay behavior.

## 2026-08-25 — Slow the condition reveal

- The roll reveal now uses four focused stages: Color, Conditions, Score, and
  Complete.
- Each scored condition stays visible longer so its icon, rarity, name, and
  points can be read before the next one appears.
- Removed generic scan and non-scoring trait rows, plus the redundant rarity
  ceremony; rarity now appears alongside the confirmed score.
- Skip reveal and reduced-motion behavior remain immediate and server-backed.

## 2026-08-25 — Make condition rarity control condition rewards

- Condition rarity now determines the reward band: rarer conditions always
  award more than common conditions.
- Added bounded strength differences within a rarity and deterministic score
  texture so individual awards are not identical round numbers.
- Preserved exact-color Anomaly jackpots and the existing high score ceiling.
- Recalibrated overall roll tiers after the scoring change while preserving
  historical scores and rankings.

## 2026-08-25 — Give condition awards more texture

- Added icons and visible color-coded rarity labels to every condition in the
  score breakdown and reveal, including the newer math, HEX, saturation, tone,
  and density conditions.
- Ordinary condition awards now receive a small roll-derived score spread, so
  repeated types of results do not always display identical clean numbers.
- Exact colors, recognizable HEX patterns, and meme/culture matches retain
  their authored milestone values.
- Preserved v3/v4 and earlier scores for historical replay while routing new
  scores through the versioned v5 model.

## 2026-08-25 — Make daily rolls more varied with score model v3

- Added a larger set of explainable color, math, HEX-pattern, culture, and
  exact-color conditions so daily results can produce more distinct stories.
- Every condition that triggers now contributes points, and the reveal shows
  the complete contributor list with its authored condition rarity.
- Rebalanced the roll ladder from the full RGB color space: ordinary rolls stay
  readable, exceptional rolls can reach six or seven figures, and the rarest
  exact colors can cross 100 million points.
- Introduced Legendary and Anomaly as separate upper tiers. Legendary is
  orange; Anomaly is magenta and reserved for the top 0.1% of RGB space.
- Kept historical scores and rankings intact while updating legacy v2 rarity
  labels to the new vocabulary.

## 2026-08-25 — Clarify rarity in leaderboard rows

- Kept readable rarity names and applied the shared rarity colors used by the
  roll result surfaces.
- Color-coded every tier consistently: gray Trash, white Common, green
  Uncommon, blue Rare, purple Epic, orange Legendary, and magenta Anomaly.
- Removed the decorative radial overlay from the homepage board so the rows
  sit cleanly over the photographic atmosphere.
- Renamed the board “Today’s top rolls,” removed the redundant scope line, and
  increased the contrast of its reset timer and compact metadata.

## 2026-08-25 — Expand and align the homepage daily leaderboard

- The homepage’s “Today’s top rolls” board now shows up to the top five public
  rolls instead of two.
- Matched its compact rows to the full leaderboard with the same top-rank
  marks, profile identity/avatars, color swatches, rarity labels, and score
  columns.
- Removed the extra grey homepage wrapper card and gave the compact rows a
  translucent homepage surface so the board sits directly on the atmosphere.
- Kept the homepage board connected to the existing public discovery feed;
  signed-in players outside the top five are no longer appended as a sixth row.

## 2026-08-23 — Simplify the guest result prompt

- Replaced the sterile preview-transfer warning with the shorter, friendlier
  prompt “Want to save future rolls? Create an account.”

## 2026-08-23 — Clarify the daily roll reveal

- Replaced the reveal timeline’s atmospheric labels with direct stages for
  color, channels, conditions, rarity, score, and completion.
- Updated rolling headings and status messages to explain what is being
  displayed or confirmed, removing “condition scan,” “finding your color,” and
  similar theatrical copy from both roll surfaces.
- Preserved the existing server-backed result, timing, skip behavior, and
  reduced-motion path.

## 2026-08-23 — Strengthen Progression hierarchy and goal state

- Increased page-mode type scale, weight, and muted-text contrast so the
  daily roll, rank, counters, paths, and unlocks read as primary game content.
- Enlarged the summary and path icons, added a real rank-colored medal badge,
  and added bounded gold, coral, and cyan progress-fill gradients without
  reintroducing a page-wide color wash.
- Replaced the weekly goal's misleading continuous bar with an explicit
  target swatch, hex value, 0 / 1 or 1 / 1 match state, and bonus status.
- Removed the page-mode History and server-verification footer copy so the
  board stays focused; the existing history data and normal Studio surface
  remain intact.
- Consolidated Your Paths into one card containing the three progress bars and
  renamed the visible destination label from Progression to Progress.
- Standardized cosmetic preview samples on `CHM` so long profile names remain
  contained in narrow reward and effect-preview tiles.
- Added reward type labels such as `Font`; Avatar effect and Profile motion
  unlocks now use deliberate category badges instead of misleading static
  effect previews.

## 2026-08-23 — Refine Progression against the supplied reference

- Removed the enclosing page frame and tightened the title/streak header so
  the authenticated board reads like the supplied profile progression surface.
- Restored the compact individual Rank, Ritual, and Discovery cards, the 2×2
  stat grid, the rank corner accent, and the reference-sized weekly/unlock
  cards.
- Kept the vivid semantic SVG accents and canonical catalog-backed reward
  previews while constraining their small thumbnails to the card bounds.

## 2026-08-23 — Progression color and icon pass

- Tuned the progression dashboard to use vivid semantic accents from the
  supplied reference: gold rank, coral Ritual, cyan Discovery, green weekly
  success, and distinct stat accents.
- Replaced generic path/stat/check glyphs with purpose-built inline SVG icons
  while keeping cosmetic thumbnails on the canonical renderer.
- Kept the authenticated board behind a lazy boundary and verified mobile,
  reduced-motion, disclosure, and server-owned roll states in browser smoke.

## 2026-08-23 — Match the supplied Progression reference layout

- Reworked `/progression` to use the supplied dashboard composition with
  rounded sections: daily roll and paths on the left, rank/stats/recent
  unlocks on the right.
- Used only existing server-backed progression data and deliberately omitted
  fictional seasonal copy or sections.

## 2026-08-23 — Remove the Progression accent wash

- Removed the page/rank/weekly accent gradients that created visible clipped
  edges in the board.
- Increased contrast for labels, rules, progress tracks, and values while
  keeping color in bounded state accents.
- Clarified the weekly challenge as “Match this week’s color” with its target
  hex shown inline.

## 2026-08-23 — Reframe Progression as a color-led game surface

- Removed the nested page panel and softened the board into the site canvas.
- Replaced the rank card’s clipped purple linear gradient with a borderless
  current-roll color field that fades across the page.
- Added a high-contrast counter ribbon and distinct Rank, Ritual, and Discovery
  accent colors so progression paths read as game state rather than dashboard
  rows.

## 2026-08-23 — Make Progression reflect the completed daily roll

- Replaced the stale post-roll “Roll today” action with a server-backed
  “Rolled today” status so the Progression rail cannot invite a duplicate roll.
- Filled the left rail with the actual roll identity, rarity, hex, score, and
  named scoring signals, removing the redundant repeated-streak milestone.
- Added a restrained current-roll tint to the rank and weekly anchors and
  flattened page-mode path rows so the right board has a clear hierarchy
  instead of grey cards nested inside one another.

## 2026-08-23 — Integrate earned cosmetics into the Roll result

- Moved the progression unlock presentation out of the Daily Roll card and
  directly beneath the “New cosmetic” reward strip in the left result column.
- Kept the compact strip as the immediate earned-reward signal while the panel
  beneath it owns the preview, acknowledgement, and Studio action.
- Fixed recent-unlock cards on Progression so canonical name previews have a
  readable wide viewport instead of clipping inside narrow three-column cells.
- Reflowed the compact reward details and actions for desktop and mobile, and
  widened the canonical cosmetic viewport so name effects no longer clip.

## 2026-08-22 — Match Raster Signal’s approved text treatment

- Raster Signal now uses the reference’s independently drifting white rows,
  thin dark scan gaps, moving grayscale texture, and sparse signal pixels.
- The reference page’s moving background grain is intentionally not included;
  the cosmetic remains a transparent text-only effect on profiles and cards.
- Compact previews proportionally reduce fixed-pixel distortion and texture so
  usernames remain readable.

## 2026-08-22 — Keep Neon Particle visible in compact previews

- Neon Particle now matches the supplied white-hot reference structure:
  crisp white letters, a restrained cyan/rose bloom, irregular micro-grain,
  and sparse particles emitted from the glyph edges.
- Removed the broad color bands, crowded particle field, and oversized glints
  that obscured compact names.
- The same bounded renderer continues to serve Customize, Studio, public
  profiles, and compact cards without changing the cosmetic key or backend
  contract.

## 2026-08-22 — Clarify the cosmetic color direction

- Defined Premium as clean, intentional execution rather than a muted color
  scheme.
- Kept structural UI restrained while making vivid, expressive color the
  default direction for cosmetics.

## 2026-08-22 — Match the approved cosmetic effect references

- Neon Particle now reads as energized text: masked internal color bands,
  dense particles, edge emission, and crisp glints.
- Raster Signal now constructs the name from displaced horizontal rows with
  scan gaps and sparse signal texture instead of stacked blur copies.
- Plasma Swarm now uses vivid cyan/violet charged clusters, ion clouds, hot
  nodes, and short electrical links instead of recoloring a generic trail with
  profile colors.
- Kept the existing cosmetic IDs and server/data contracts unchanged.

## 2026-08-22 — Separate the Neon Particle and Raster Signal treatments

- Neon Particle now samples its particle core and perimeter emission from the
  actual glyph mask, producing the bright white-hot reference look instead of
  a smooth color fill.
- Raster Signal now uses a dedicated monochrome row compositor with stronger
  signal displacement, transparent scan gaps, deterministic grain, and sparse
  bright pixels.
- The two name motions now have distinct construction, palette, and texture
  behavior while retaining the same catalog IDs and data contracts.

## 2026-08-20 — Call profile visual layers cosmetics

- Updated player-facing labels and reward copy to use “cosmetics” consistently
  across progression, roll unlocks, Customize, Profile Studio, Premium, and
  pricing.
- Preserved existing internal compatibility names and server contracts.

## 2026-08-20 — Match Progression to the current roll

- Progression now uses today's server-authoritative roll color, matching the
  swatch and accent shown on Roll; the saved profile mood color no longer
  masquerades as today's result.
- The desktop title and streak rail is positioned against the top of the tall
  progression board for a more balanced Roll-like composition. Mobile remains
  a single-column stack.
- No gameplay, scoring, reward, inventory, or database behavior changed.

## 2026-08-20 — Align Progression with Daily Roll

- Rebalanced the authenticated page into a Roll-inspired split composition:
  daily identity and action on the left, one focused glass progression board
  on the right.
- Let the current server-owned roll color add personality to the Rank hero,
  streak chip, CTA sheen, and subtle halo while keeping structural states
  grayscale.
- Kept the existing server-authoritative data flow, accordion interactions,
  reward previews, history handoff, mobile behavior, and reduced-motion support.

## 2026-08-20 — Make Progression scan-first

- Simplified the dedicated page to one daily streak strip, one Rank/XP focal
  point, quiet supporting metrics, and a one-line weekly color challenge.
- Removed the stray Rank color dot and kept rolled color as a data swatch only.
- Collapsed Rank, Ritual, and Discovery into instant, one-at-a-time accordions;
  expanded lanes retain their short next-step copy and real cosmetic
  thumbnail previews.
- Kept the neutral vignette, glass edge treatment, CTA sheen, abbreviated
  numbers, keyboard focus, and reduced-motion behavior consistent with the
  existing site design.

## 2026-08-20 — Progression visual polish

- Kept the progression page’s dark site language while adding a subtle grayscale
  vignette, consistent glass-panel surfaces, and tactile neutral CTA sheen.
- Made Rank the focal point with a circular progress ring and large lifetime EP;
  summary stats now sit in a quieter secondary row. Journey lanes use the
  existing die/pip vocabulary for distinct Rank, Ritual, and Discovery glyphs.
- Replaced empty reward placeholders with real canonical cosmetic thumbnails;
  locked rewards stay visible in a dimmed grayscale state, while earned rewards
  render normally. Rolled and weekly colors remain data-only swatches.

## 2026-08-20 — Bound continuous-integration usage

- Kept fast code validation on every change while moving the local database and
  browser suite to pull requests, relevant `main` changes, and manual runs.
- Added cancellation and hard time limits so superseded or stalled jobs cannot
  consume hours of runner time.
- Reduced smoke-test evidence to short-lived failure diagnostics instead of
  retaining browser profiles, caches, and local service state.

## 2026-08-20 — Make progression easier to read

- Added a shared “Today's direction” focus so the next useful roll is obvious
  without removing the Rank/Ritual/Discovery model or changing progression
  authority.
- Simplified the summary cards and goal language, gave each lane one featured
  goal, and moved additional active/future goals behind clear “See more” and
  “See later goals” controls. Discovery remains explicitly independent, while
  Weekly color is presented as a secondary challenge.
- Corrected dedicated-route empty-state messaging so roll history, goals, and
  earned cosmetics are never reported as zero merely because a private
  detail feed is unavailable. Long reward names now wrap on mobile.
- Preserved the existing near-black canvas, quiet rules, typography, buttons,
  server-owned progression data, and reduced-motion behavior.

## 2026-08-20 — Complete the Progression Core System locally

- Retained the research-backed Rank/Ritual/Discovery model: mastery, sustained
  roll practice, and an independent color-discovery story. No XP currency,
  fourth bar, battle pass, or seasonal pressure was added.
- Completed the server-authoritative manifest, roll-transaction grant path,
  idempotent account reconciliation, owner read boundary, live presentation/
  acknowledgement transitions, and bounded public progression proof.
- Made progression rewards genuine zero-cost earned cosmetics using active
  canonical renderers, while preserving the generous free baseline and keeping
  Premium as cosmetics rather than gameplay prestige. Added earned 730- and
  1,095-roll capstones and retired greyscale from the published future journey
  without deleting historical ownership.
- Kept the route narrow and lazy, reused the canonical reward preview on
  demand, shared the unlock queue across both roll surfaces, and handed earned
  cosmetics to Profile Studio. Corrected future-goal and independent
  Discovery visibility.
- Defined progression analytics as consented, authenticated-only daily
  aggregates with explicit lifecycle semantics, no hover proxy or raw
  identifiers, and scheduled rather than hot-path retention cleanup.
- Local acceptance evidence includes 436 Node tests, build/check/full ESLint,
  link/CSP/performance/responsive/profile-certification/audit gates, database
  reset/lint/security/progression/scoring checks, progression and R2-local
  browser smoke, and production browser smoke. The ordered progression
  migration chain is applied remotely through `20260820000000`, and the remote
  76-item catalog matches the seed; application hosting remains a separate
  deployment concern.

## 2026-08-19 — Bring Progression back into the site system

- Reworked /progression to match the existing Leaderboard/supporting-route
  composition with a centered title, restrained copy, standard panels, and
  neutral site controls.
- Removed the custom ambient hero, colored rank treatment, decorative
  arrow/status glyphs, and non-system accent styling.
- Kept weekly and history colors as quiet factual swatches so the player's
  color story remains visible without turning the page into a color-accented
  dashboard.

## 2026-08-19 — Give progression its own destination

- Added a full responsive `/progression` page for rank, EP, streak, weekly
  focus, journey milestones, and recent unlocks.
- Moved progression out of Profile Studio while keeping Studio focused on
  structured profile expression and publishing.
- Added Progression links to authenticated site navigation, the footer, the
  Studio More menu, roll context, and the owner profile; old progression hash
  links now redirect to the dedicated route.
- Added owner-safe loading, signed-out, unavailable, error, and reduced-motion
  states without changing server-authoritative progression behavior.

## 2026-08-19 — Turn progression into an identity journey

- Added two expression lanes to Progression: **Keep the ritual** for roll
  count and streak milestones, and **Find the strange** for rare discoveries.
- Kept the existing five EP rank milestones, active catalog rewards, scoring,
  eligibility, and reward authority unchanged while backfilling earned
  journey rewards safely for existing accounts.
- Added weekly Color of the Week focus using the existing +50,000 EP reward,
  with completion proof in the progression destination and the roll result.
- Added bounded recent-unlock proof to public profiles so a profile can show
  earned identity without exposing a private progression ledger.
- Made guest signup explicit: the local preview is discarded when claiming an
  account, so guest HEX and score are never silently transferred.
- Added consented anonymous daily progression totals with a 90-day retention
  boundary; individual product-event records are not stored.

## 2026-08-19 — Make the daily roll feel like a meaningful daily ritual

- Tuned the rare Supernova condition to award 10,000,013 points, creating a
  genuine 10M+ jackpot ceiling while leaving the ordinary roll floor and
  rarity bands intact.
- Replaced the static roll progress bar with an outcome-aware six-stage reveal:
  spectrum sampling, channel locks, signal discovery, rarity assessment, live
  score counting, and a final result settle.
- Made the event last about 15.6 seconds for an ordinary roll and roughly
  18–23 seconds for stronger outcomes, with each additional beat revealing
  server-confirmed information instead of extending a spinner.
- Added progressive condition rows, rarity-specific language, score-aware
  count-up pacing, `Skip reveal`, and reduced-motion behavior to both the
  dedicated and profile roll surfaces.
- Kept roll generation, score calculation, eligibility, rewards, and rerolls
  on the existing server-authoritative path.

## 2026-08-19 — Keep direct route startup focused

- Resolve the current URL before the first lazy route render, avoiding a
  transient homepage import on direct Pricing, Roll, Leaderboard, and content
  route refreshes.
- Keep the Spline profile face scoped to profile rendering so the site shell
  does not download it on ordinary marketing and game routes.
- Resize the authored homepage avatar fixtures to their actual display scale,
  reducing their combined payload while preserving the reference composition.

## 2026-08-19 — Reduce route startup and shared chrome media cost

- Removed unconditional idle route prefetching while preserving destination
  prefetch on header hover and keyboard focus.
- Removed unused global font imports from the shared shell.
- Replaced the oversized shared AM PNG with a smaller alpha WebP without
  changing the rendered logo treatment.

## 2026-08-19 — Reduce homepage media cost without changing the composition

- Deferred photographic showcase media until the lower section approaches the
  viewport, retaining stable card placeholders while the first viewport loads.
- Re-encoded the referenced showcase backgrounds and avatars as WebP and
  removed the obsolete PNG copies.
- Added browser coverage for the deferred initial state and the bounded media
  activation after scrolling into the showcase.

## 2026-08-19 — Keep header chrome singular during navigation

- Fixed homepage header icons such as Pricing so a lazy route transition does
  not briefly render a second header over the still-mounted homepage.
- Preserved the previous-page loading behavior while ensuring the destination
  settles into exactly one shared site header.

## 2026-08-19 — Keep the live preview label clear

- Moved the desktop live-preview status label below the profile specimen so
  framed avatars cannot cover its text while crossing the card edge.

## 2026-08-19 — Keep Profile Studio chrome readable over light profiles

- Made the editable workspace heading, save state, tabs, and preview device
  controls contrast-aware across light and dark profile atmospheres.
- Layered the live-preview label beneath the profile specimen so the moving
  avatar cannot make the label read like a foreground overlay.

## 2026-08-19 — Anchor the Profile Studio footer

- Fixed the Premium and other short Profile Studio sections so the opaque
  footer sits at the bottom of the desktop viewport instead of floating below
  the dashboard content.
- Kept the workspace responsive and content-driven for longer editors and
  narrow screens.

## 2026-08-19 — Soften the homepage leaderboard into the hero atmosphere

- Changed the daily leaderboard from a solid dark slab to translucent glass
  with backdrop blur, a subtle border, and a restrained shadow/glow.
- Reduced the hero preview to two rows, removed the heavy divider, and added a
  quiet `View full leaderboard` link.
- Added a matching accent halo around the top-ranked avatar and aligned the
  desktop card with the profile identity cluster while preserving normal-flow
  stacking on mobile.

## 2026-08-19 — Center Profile Studio header contents

- Aligned the Customize/Profile Studio header contents with the homepage’s
  centered desktop, tablet, and mobile shell widths.
- Preserved the opaque full-width dashboard surface and existing View profile,
  Publish profile, and More actions.

## 2026-08-19 — Give Profile Studio stable dashboard chrome

- Customize/Profile Studio no longer mounts the photo-overlaid site header or
  footer above editable profile backgrounds.
- The dashboard shell now owns an opaque dark header with the AM mark and an
  opaque dark footer using the same brand asset, so editor navigation and
  support links stay readable regardless of the selected profile background.

## 2026-08-19 — Keep roll result controls contrast-safe

- The shared homepage-style header now keeps `Claim handle` in dark ink on
  its white button instead of allowing the bright navigation treatment to
  override it.
- The dedicated roll result action chooses near-black or white text from the
  rolled color’s relative luminance, so light and white rolls remain readable
  while dark rolls keep the white-first treatment.
- Replaced the diffuse result halo with a tighter saturated color layer and a
  softer secondary layer around the card and swatch, keeping the result color
  vivid without a broad lower-screen glow. The card halo now breathes slowly
  so the result feels alive without moving the content or surface.

## 2026-08-19 — Carry the profile descriptor treatment into homepage copy

- Applied the soft white, medium-weight descriptor treatment used by the
  profile’s `daydreamer · pixel artist · music lover` line to the hero copy,
  daily leaderboard labels and reset timer, section descriptions, loop copy,
  and claim/loading states.
- Kept display headlines, leaderboard identities, controls, and rolled-color
  accents distinct so secondary copy gains consistency without flattening the
  page hierarchy. The homepage eyebrow and display headline are also
  shadow-free, keeping the image and rolled color as the visual emphasis.
- Carousel controls now use the same white-first interaction language as the
  homepage CTA, reversing to a dark translucent surface on hover or focus.
- The daily leaderboard now has a contained dark glass surface with a larger
  display heading, giving the right side of the hero a stronger visual anchor.
- Lightened the homepage claim field into a more translucent glass control so
  it carries less visual mass against the profile scene.
- The authored Meilin hero now uses a near-black “Your profile,” line and a
  clean white “alive.” payoff, while alternate fixtures retain contrast-safe
  headline colors.

## 2026-08-18 — Align normal site pages with the homepage

- Updated normal auth, app, discovery, pricing, guide, legal, gameplay, error,
  loading, and Profile Studio pages to use the homepage’s shared type, shell,
  spacing, surfaces, buttons, background, and visual hierarchy.
- Reused the shared site header and footer across application routes while
  leaving public user profiles and the homepage composition unchanged.
- Removed the obsolete signed-out Profile Studio lock screen. Signed-out users
  no longer see inaccessible Customize actions and are sent through the
  current sign-in flow when they open Profile Studio directly.

## 2026-08-18 — Match Framed identity detail typography

- The Katt Framed example now uses Velocity consistently for the name, bio,
  and `Siberia · Russia` detail line.

## 2026-08-18 — Extend homepage atmosphere across the page

- Snowfall now spans the full homepage instead of stopping at the centered
  hero shell, removing the visible dark rectangle around the scene.
- Carousel and roll color changes continue to update the page-level atmosphere.

## 2026-08-18 — Finish the Framed homepage showcase

- The second hero example is now named `katt` and shows `Siberia · Russia`.
- Its name uses Velocity, its avatar is larger, and its card has no fill so
  the snowy background remains part of the composition.
- Framed links use the larger size and direct white icon glow, with snowfall
  carrying the atmosphere behind the complete example.

## 2026-08-18 — Give the second homepage example its own media

- The second hero now uses the provided `p2avatar.png` from a dedicated
  `p2/` fixture folder.
- Replaced the generic `Arcade` placeholder with `p2` and added a snowy
  mountain background designed for the Framed card.

## 2026-08-18 — Add a Framed 3D homepage example

- The second hero preview now uses the Framed profile composition.
- Its avatar demonstrates the 3D Parallax treatment and its name uses
  Silkscreen.
- The profile card keeps the existing perspective tilt on desktop while
  respecting reduced-motion behavior.

## 2026-08-17 — Fix Framed link glows

- Framed social icons now use the same direct pixel glow as Immersive links.
- Removed the opaque-looking link control treatment that was hiding the glow.

## 2026-08-17 — Strengthen the homepage roll firework

- Made the roll impact easier to see with larger, brighter sparks and wider
  outward travel.
- Added a short center flash and expanding accent ring around the profile.
- Kept the effect bounded and disabled it for reduced-motion users.

## 2026-08-17 — Make the Meilin hero avatar react to the homepage roll

- The Meilin homepage example now uses the animated Liquid Blob avatar
  treatment.
- The blob's color and glow follow the roll accent during the preview and
  settle on the final rolled color.
- The effect remains a homepage presentation detail and does not change saved
  profile cosmetics or gameplay authority.

## 2026-08-17 — Turn the homepage roll into a leaderboard invitation

- The homepage roll can now be used once per profile specimen.
- The resulting score appears in the daily board as an accent-highlighted
  `YOU` row, ranked with the live public rolls.
- The daily board uses darker rounded result sections with larger, bolder
  heading, username, and score typography.
- The button becomes `Claim your place` and leads visitors to the existing
  handle-claim control after the preview result lands.
- The preview remains local; real scores and leaderboard writes stay inside the
  existing server-authoritative gameplay flow.

## 2026-08-17 — Make link styling visible across layouts

- Link size now has twice the visual range.
- Link Glow now produces a clear white halo around labels and social icons.
- Icon layouts glow the actual SVG shapes instead of their empty link circles.
- Compact, Framed, and Immersive profiles now share the same size and glow
  behavior in the public renderer and Studio preview.

## 2026-08-17 — Fix generic profile-link publishing

- Website and Other links now accept valid HTTPS destinations as intended.
- Editing structured share metadata no longer fails because a generic link is
  incorrectly treated as invalid.

## 2026-08-17 — Simplify the Layout customization tab

- Removed Link alignment and Visible sections controls that no longer affected
  the active profile renderers.
- Kept Compact, Immersive, and Framed layout selection as the focused Layout
  customization surface.

## 2026-08-17 — Refresh Avatar Effects with four reference treatments

- Replaced the old Avatar Effect choices with 3D Parallax Tilt, Glitch Slicer,
  Liquid Blob, and Cyber HUD.
- Added image-aware chromatic slices, organic morphing, perspective depth, and
  HUD rings while keeping the portrait readable and responsive.
- Retired the previous active choices without deleting their historical
  catalog rows; profiles using one are safely reset to no avatar effect.

## 2026-08-17 — Add the Framed profile layout

- Added a Framed profile-card option with a rounded-square avatar overlapping
  the top-left edge of the card.
- Left-aligned the display name and bio and placed allowlisted social icons
  underneath, with accessible labels and keyboard focus states.
- Kept the daily roll available through the existing profile continuation
  surface so the reference composition stays focused without changing roll
  authority or eligibility.

## 2026-08-16 — Lighten the leaderboard canvas

- Changed the leaderboard from a pure-black page to a soft neutral light
  surface with dark readable text and subtle framed result rows.
- Preserved the existing podium hierarchy, rank accents, period controls, and
  score details.

## 2026-08-16 — Add a simple leaderboard podium

- Reworked the leaderboard into a featured top-three profile podium.
- Displayed remaining ranked profiles as simple framed rows beneath it.
- Kept the Today and This month controls and the existing score/detail data
  contract while reducing the visual weight of the page.

## 2026-08-16 — Focus the leaderboard on top rolls

- Simplified `/leaderboard` to two periods: Today and This month.
- Replaced the multi-control discovery workspace with a compact ranked score
  surface showing profile identity, score, and short roll details such as color,
  rarity, and date.
- Kept the public discovery RPC, bounded pagination, safe profile navigation,
  and loading/error/empty states while removing filters, rival controls, share
  actions, and owner rank context from the active surface.

## 2026-08-16 — Rebuild the leaderboard as a Profile Studio board

- Replaced the previous discovery-card/grid presentation with an editor-style
  leaderboard surface modeled on Customize’s dark canvas, restrained modules,
  tab rails, controls, and green action accent.
- Profile rows now make rank, identity, signature color, score, public stats,
  and profile actions readable as one bounded unit on desktop and mobile.
- Kept public discovery RPCs, filters, pagination, rival follows, profile
  navigation, sharing, route tabs, and owner rank context unchanged.
- Removed the superseded DiscoveryHub/DiscoveryCard presentation and the
  duplicate site CSS overrides so the retired styling cannot leak back into
  the route.

## 2026-08-16 — Align supporting pages with homepage chrome

- Leaderboard, roll, pricing, legal, and authentication lifecycle pages now
  use the same transparent header geometry and constrained footer layout as the
  homepage.
- The shared header keeps its route-aware navigation and mobile account menu,
  while matching the homepage’s brand, typography, spacing, and Claim handle
  treatment.

## 2026-08-16 — Use Immersive for the first homepage example

- The first homepage hero example now demonstrates the canonical Immersive
  profile composition with a cardless identity, avatar, bio, and icon links.
- Other carousel examples keep the compact presentation so the homepage still
  shows both supported profile structures without creating a second renderer.

## 2026-08-16 — Add optional profile-wide typography

- Profile Effects now lets an owner apply a selected custom Name Font across
  the profile's bio, metadata, links, stats, and other public content.
- The setting is opt-in, unavailable for the Platform default, and remains a
  single profile-wide choice rather than adding a separate font control to
  every section.
- Public V2 profiles now preserve the setting during hydration, and the live
  Studio preview reflects the same profile-wide font scope.

## 2026-08-16 — Refresh Profile Effects fonts

- Profile Effects now offers the Platform default plus Black Ops One,
  Permanent Marker, Satoshi, Fira Code, Poppins, JetBrains Mono, Array,
  Silkscreen, Velocity, and Outfit.
- Retired font choices disappear from the active selector without changing
  the appearance of profiles that already use them.
- The supplied Velocity face is bundled locally so it renders consistently in
  Compact, Immersive, and fitting-room previews.

## 2026-08-16 — Stabilize Customize layout and font previews

- Customize now has one canonical layout model: Compact and Immersive
  (`full-bleed` internally). Existing saved profiles are normalized once, and
  old layout aliases no longer create competing runtime preview states.
- Removed obsolete template, content, and widget editor surfaces from the
  active Customize flow. Links remain fully structured and editable in their
  own supported editor, with old dashboard links redirected safely.
- Pending identity, profile, and cosmetic changes now stay visible while
  moving between Customize tabs.
- Selected Name fonts remain visible as accessible text until the actual
  bundled face is ready, so Compact and Immersive previews no longer need a
  layout switch to display the intended font.
- Changing a font while Immersive is already mounted now loads and redraws the
  selected face in place; the same explicit update path also covers lazy name
  material and motion renderers.

## 2026-08-15 — Integrate Links into Customize

- Added Links between Media and Layout in Customize profile.
- Reused the existing link draft, validation, sharing metadata, and alias
  behavior inside the same reference-style Studio surface as Appearance and
  Media.
- Removed the old standalone Links destination from the More menu while
  keeping historical dashboard hashes routed safely to the new tab.

## 2026-08-15 — Retire the Shop and make Customize the expression catalog

- Removed the standalone Shop presentation and its obsolete browsing,
  fitting-room, and purchase UI. Existing `/shop` links enter Customize rather
  than opening a second cosmetic surface.
- Customize now exposes all active profile expression layers, including
  Compact, Immersive, and Profile Motion, through the existing equip/unequip
  flow. Active expression rows are temporarily free for every account while
  future progression and premium acquisition are redesigned.
- Publishing now preserves the selected Compact or Immersive layout across
  both configuration markers. The no-border state uses a neutral card edge;
  valid Profile Border effects remain visible when selected.

## 2026-08-15 — Add the Immersive profile layout

- Added a sixth free profile layout with a full-viewport photographic
  environment, large centered avatar, identity, bio, metadata, and icon links.
- The same Immersive composition is available in the public profile and live
  Studio preview, while the existing roll, story, media, and social content
  remain available below the opening scene.
- Existing layouts, profile data contracts, cosmetics, draft/publish behavior,
  and media delivery are unchanged.

## 2026-08-15 — Complete homepage navigation

- Replaced the homepage's discovery placeholder with real Leaderboard,
  Customize, and Pricing destinations while keeping the in-page reference
  content and Claim handle action; the in-page How it works and Profiles
  anchors no longer appear in the header.
- Expanded the homepage footer with the product's real navigation, legal,
  support, and business destinations.

## 2026-08-15 — Align legacy headers and pages with Profile Studio

- Replaced the old supporting-route capsule/slash header with a quiet
  reference-aligned application bar and canonical Customize destination.
- Updated legacy supporting surfaces and standalone auth to use the approved
  Clash Display + Inter typography, near-black canvas, restrained glass
  surfaces, thin borders, and green accent without changing route or behavior.

## 2026-08-15 — Align the Profile Studio Media tab with the approved reference

- Media, avatar, audio, and cursor controls now use the reference two-by-two
  card composition with photographic/media preview wells and quiet copy below.
- Spotify, Background options, and Saved media now read as separated full-width
  sections instead of old dashboard cards or a three-column action rail.
- Upload/replace/unequip and library actions remain connected to the existing
  media contracts; this pass changes presentation only.

## 2026-08-14 — Rebuild the Profile Studio preview around the reference card

- The selected profile background now acts as the Studio page environment;
  the live preview is one bounded glass profile card instead of a scrollable
  public-profile layout canvas.
- Homepage and Studio share the same reference card anatomy for avatar,
  identity, links, media, and Today’s color.
- Customize Layout now describes the active reference-card composition rather
  than exposing the superseded five-template presentation picker.
- Existing profile data, media, draft/publish, and public-profile behavior
  remain on their established contracts.

## 2026-08-14 — Replace the Profile Studio presentation with the approved shell

- Profile Studio now opens on the selected profile's photographic environment
  with a focused editor surface and sticky live public-profile preview.
- The obsolete destination-navigation row, nested preview panel chrome, and
  old dashboard card framing are gone; secondary destinations remain available
  through the compact More menu.
- Appearance, Media, and Layout keep their existing editor behavior, draft and
  publish state, media flows, and production rendering contracts.

## 2026-08-14 — Add canonical 3D Tilt profile expression

- Added `3D Tilt` as a free `profile_motion` expression that can be equipped
  through the existing profile cosmetics flow.
- Homepage Meilin and real public profiles now consume the same bounded motion
  renderer. Profile Studio uses the preview container as its input surface.
- The effect adds no glow, glare, avatar treatment, or page-background motion;
  reduced-motion and coarse-pointer users receive the unchanged static profile.

## 2026-08-14 — Clarify profile-media removal semantics

- Profile Studio now labels removing an active avatar, background, or audio as
  `Unequip`, reflecting that the reusable library asset remains available.
- Saved-library actions are labeled `Delete from library`; existing R2 assets
  continue to use the R2 deletion control plane even during a rollout rollback.

## 2026-08-14 — Deploy R2 control-plane compatibility safely

- Deployed the R2 control-plane and modern Supabase-key compatibility code with
  profile-media R2 uploads still disabled for users.
- Kept the rehearsal gate on browser routes while allowing only the authenticated
  cleanup scheduler request to reach its server-only endpoint.

## 2026-08-14 — Isolate the first R2 media canary

- Added an R2-only UUID allowlist so the first production media canary does not
  require changing the general M13 rollout stage.
- Users outside the explicit allowlist continue using the existing media path.

## 2026-08-13 — Add modern Supabase key compatibility

- Browser configuration prefers `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Server/control-plane configuration prefers `SUPABASE_SECRET_KEY`.
- Legacy browser/service-role variable names remain temporary fallbacks while
  production variables are migrated. Modern project keys stay in `apikey`;
  user session JWTs remain the only normal bearer credentials.

## 2026-08-13 — Begin profile-media delivery migration to R2

- Public profile media URLs are now stable instead of receiving a new
  timestamp query parameter on every render.
- New R2 support uses authorized direct browser uploads, verified readiness,
  immutable public keys, and `media.chm.lol` provider-neutral references while
  legacy Supabase media remains compatible during rollout.
- Existing Studio draft/render architecture is unchanged. Active selected
  legacy assets have an idempotent migration path, and account deletion uses
  retryable R2 cleanup rather than waiting on a transient Cloudflare response.
- CHM uses R2 Standard only; no Infrequent Access transition is part of the
  product storage policy.

## 2026-08-13 — Close the Profile Studio session-state side door

- Profile Studio no longer restores unpublished profile drafts from
  per-editor session storage after a refresh.
- Appearance, media, identity, and layout controls continue to read the
  canonical Studio draft, while hidden legacy Content/Widget editors are no
  longer mounted inside Customize.
- Dashboard clean/published state now remains aligned with the refreshed
  canonical preview instead of being changed by stale editor caches.

## 2026-08-12 — Finish Studio layout and continuation cleanup

- Layout alignment changes no longer reset unrelated Link Style settings.
- Cardless Minimal and Portfolio layouts now explain and disable surface-only
  controls while preserving the saved configuration for surfaced layouts.
- Continuation content follows an intentional About/Projects → Links → Media
  order without changing the existing compact visual treatment.

## 2026-08-12 — Isolate Studio background-treatment edits

- Media Background Treatment edits now update only page-background treatment
  state, so stale editor values cannot reset the profile card's color,
  opacity, blur, radius, or text colors.
- Appearance and Media transitions are covered by a production browser smoke
  regression that inspects the rendered profile surface and both editors'
  state.

## 2026-08-12 — Stabilize public profile and Studio render parity

- Public profiles and Studio Live Preview now resolve one complete profile
  snapshot before rendering, keeping layout, appearance, media, cosmetics,
  links, Daily Color, and continuation content aligned through edits and
  publication.
- Studio keeps the current readable physical preview host and explicit desktop
  or mobile context; it no longer mounts a second identity-only approximation
  while preview state is incomplete.
- Media selection and deletion continue to use their existing immediate-save
  flow, with selected-state concurrency tokens synchronized and unused asset
  deletion kept outside the profile configuration timestamp.

## 2026-08-12 — Polish compact profile readability and continuation content

- Owner Daily Color stays within its compact presentation instead of allowing
  the full-size color orb to cover nearby profile content.
- Compact profile identity surfaces have modestly larger avatars, clearer
  essential text, and more visible monochrome social glyphs.
- Below-fold About, Projects, Links, and integrations now align in one quiet,
  centered continuation column; project and custom-link UI no longer uses the
  decorative northeast-arrow character.

## 2026-08-12 — Finish Studio media token and preview correctness

- Immediate Studio media mutations now keep the optimistic Publish timestamp
  synchronized, preventing false same-tab concurrency conflicts.
- Live Preview keeps a fitting opening centered even when continuation content
  makes the full profile scrollable; only oversized openings top-align.
- Continuation cues now say `Links ↓` for actual links and `More ↓` for other
  lower profile content.

## 2026-08-12 — Harden profile publication and continuation links

- Publishing a Studio profile now keeps avatar, background, and expression
  media present immediately, matching the post-refresh configuration.
- Live Preview centers profiles that fit and keeps taller profiles accessible
  from the top with internal scrolling, without scaling the profile down.
- Custom continuation links remain visible in Studio and gain a quiet public
  continuation cue when lower content exists.
- Social services remain eligible for the opening even when custom links are
  ordered before them; page background video no longer creates an empty lower
  profile section.

## 2026-08-12 — Finish focused five-layout cleanup

- Layout edits now return to a clean Studio state when the draft matches the
  published layout and alignment again.
- Minimal no longer receives a second horizontal placement offset, and public
  profiles no longer render an empty lower section when there is no lower
  content.
- Studio desktop preview provides a taller readable environment with scrolling
  guidance while preserving its physical-size, non-scaled profile rendering.
- Custom navigation links remain identifiable below compact openings, while
  recognized services retain compact icon treatment.
- Essential profile metadata is modestly more readable without expanding the
  compact profile footprint.

## 2026-08-12 — Complete final five-layout hardening

- Opening links no longer repeat in the continuation story; the first six are
  reserved for the identity opening and later links continue below.
- Headerless public profiles now use the full first viewport, and compact owner
  roll/music treatments stay within the intentionally small profile footprint.
- Studio desktop preview now uses a readable desktop-like environment without
  transform scaling. Mobile remains an intentional portrait preview, and the
  extra fake device sample is removed.
- Rich-profile regression coverage now exercises a real uploaded background,
  active name effects, cosmetics, social services, custom links, music, and
  roll data through publish and direct refresh for all five layouts.
- Recognized social services remain icon-first; custom navigation destinations
  stay identifiable with labeled treatments. Sleek copy describes optional
  detached modules without promising synthetic presence data.
- Cardless Minimal/Portfolio surfaces now reliably clear the compiled backdrop
  blur, and Studio publication keeps its optimistic-concurrency token inside
  the database transaction.

## 2026-08-12 — Stabilize the five-layout renderer and Studio preview

- Profile Studio now shows a readable physical profile stage instead of a tiny
  scaled desktop page. Desktop and mobile preview controls request their
  intended compositions explicitly, while the background and atmosphere fill
  the surrounding preview environment.
- Public profiles keep full-viewport backgrounds and compact profile surfaces.
  Border effects own the visible perimeter, and Minimal/Portfolio remain
  intentionally cardless rather than gaining an extra wrapper surface.
- Compact, Sleek, Minimal, Modern, and Portfolio retain distinct identity,
  roll, secondary-region, and below-fold behavior. Sleek no longer invents
  presence copy; Modern no longer exposes nonfunctional tabs; Minimal shows
  recognized services as an icon row and custom links as labeled rows.
- Name effects use the layout's effective type size and bounded canvas
  measurement in both public profiles and Studio. Compact roll/music
  presentations remain small enough for the profile footprint.

## 2026-08-11 — Remove the standalone public-profile Share control

- Public profiles no longer render a separate Share profile button over the
  identity surface. Canonical profile URLs and existing discovery/roll share
  behavior remain available.

## 2026-08-11 — Introduce five compact public profile layouts

- Replaced the novelty profile-layout choices with Compact, Sleek, Minimal,
  Modern, and Portfolio. Compact is the default.
- Kept the profile surface intentionally small so the user's background,
  avatar, media, effects, music, links, and daily color remain the visual
  focus. Portfolio adds depth only after an intentional scroll.
- Added lightweight monochrome service icons for supported social links,
  accessible labels/tooltips, and one clear primary username identity.
- Studio layout selection now previews the same structural renderer used by
  the public profile, and existing layout ownership/configuration is migrated
  to the nearest replacement without removing cosmetics or entitlements.

## 2026-08-11 — Harden Profile Studio publishing and mobile editing

- Profile Studio now tracks unsaved work per editor and publishes identity,
  configuration, and publication through one rollback-safe server action.
- The hidden Studio Save bio control is gone; the visible workflow is Preview,
  then Publish profile. Cosmetic equipment is labeled as an immediate update
  so its separate behavior is clear.
- Narrow Appearance can keep the full color picker closed until needed, with
  accessible saturation/brightness controls. Common media, Roll, and Studio
  actions have larger touch hit areas, and inactive desktop Publish is visibly
  disabled.
- Production-preview browser smoke and performance budgets are now CI gates,
  extending validation beyond source-level responsive checks.

## 2026-08-11 — Harden Profile Studio on narrow editors

- Identity edits in Customize now join the Profile Studio draft and publish
  with the profile instead of relying on a hidden standalone Save action.
- Visual Effects cards adapt from a narrow two-column comparison to readable
  phone rows, while Name Effect previews stay separate from native selects.
- Appearance, Cosmetics, and Media respond to their actual editor width, not
  only the full browser width.
- Mobile Studio keeps the current Customize tab, Preview, and Publish actions
  reachable while scrolling, including safe-area spacing for fixed actions.

## 2026-08-11 — Restore responsive CSS in production output

- Production bundles now retain the authored responsive layout rules across
  homepage, authentication, Discovery, Game, Pricing, profiles, and Studio.
- Removed the incompatible extra CSS optimization pass; the build now checks
  compiled CSS for the expected responsive media-query families before it can
  pass CI.
- Added a production-preview responsive smoke path so built output is checked
  separately from the development server.

## 2026-08-11 — Harden responsive and mobile usability behavior

- Today's Color now keeps its roll result readable across tablet and
  intermediate-width layouts instead of compressing the result into a narrow
  column.
- Public profiles now follow normal wheel and trackpad scrolling while
  retaining the explicit More/back controls and gentle section proximity snap.
- Profile Studio's mobile Live preview adapts to short landscape screens and
  respects device safe-area space; important mobile controls use larger touch
  targets.
- Narrow profile identity layouts stack based on their rendered card width,
  keeping long names, bios, and links readable in both public profiles and
  embedded previews.
- Mobile profile headers keep Edit accessible and place account actions in the
  existing menu; editable mobile fields use a readable text size.
- Discovery cards on phones prioritize identity, latest color, score, and the
  profile action while retaining lower-value history on the full profile;
  filters and card actions are easier to tap.
- Share dialogs now trap keyboard focus, restore focus on close, lock the page
  while open, and respect mobile safe areas.

## 2026-08-10 — Correct Profile Studio small-screen composition

- Narrow desktop and browser-zoom layouts now reserve space for Live preview
  instead of letting it cover the Appearance editor.
- Phone and tablet preview uses a bounded bottom drawer, with the navigation
  remaining closed until the Menu control is used.
- Embedded profile cards stack to their actual preview width so names, bios,
  and links remain readable on small screens.

## 2026-08-10 — Fit Profile Studio on smaller screens

- Appearance controls now stack before intermediate tablet widths force hex
  fields, color-picker rails, or surface sliders outside the editor.
- Customize tabs keep a visible Preview action on mobile, and the fixed Live
  preview drawer now stays exactly within the viewport.
- Overview, Links, Premium, and Account destinations retain bounded layouts at
  phone and tablet widths, with the mobile navigation drawer remaining usable.

## 2026-08-10 — Align Profile Studio Media with the reference workspace

- Media now uses a compact three-column top row for Background, Avatar, and
  Profile audio, with Custom cursor and Background options sharing the second
  row.
- Active media cards use bounded circular/preview wells and explicit
  Replace/Remove actions, reducing the large empty card heights while keeping
  existing uploads, removal, waveform playback, and background controls.
- Tablet and mobile layouts preserve the same ownership order without allowing
  the media workspace to overflow its editor column.
- Cursor uploads now refresh the owner asset library before choosing the
  single-slot staging path, clear expired staged rows, and can repair an
  orphaned active cursor without weakening the existing owner and storage
  boundaries.
- Compact avatar previews force the source media to fill their circular frame,
  including when an uploaded image has a non-square source ratio.
- The Custom cursor now uses a compact asset/action row instead of a large
  image well, while Background options keeps its natural control height and
  only its useful labels.

## 2026-08-10 — Stabilize effect previews, media, and mobile Live preview

- Name previews now compose Font, Material, and Motion progressively while
  keeping one consistent control-side type treatment.
- Visual-effect cards use transparent effect stages and the real cursor-trail
  recipe; atmosphere media recovers from visibility changes and bounded stalls
  without taking down the dashboard.
- Background and avatar changes propagate to Live preview immediately. Media
  now includes blur/opacity/overlay treatment, a waveform audio player, a
  circular avatar well, and transactional cursor replacement including `.ani`
  assets.
- The profile preview keeps background paint inside the rounded profile card,
  and mobile preview uses a bounded phone context instead of letting the card
  collapse into a narrow column.
- Motion controls now preview the selected motion recipe instead of its item
  key, and animated Name/cursor/atmosphere previews resume after switching
  away from and back to a Customize tab.

## 2026-08-10 — Stabilize Profile Studio workspace ownership

- Profile Studio now uses a stable dashboard shell with dedicated Customize,
  Links, Premium, and Account destinations and a persistent Live preview.
- Draft edits remain visible while moving between sections and update the
  preview immediately; Reset and Publish retain their existing behavior.
- The dashboard keeps legacy hashes and direct-refresh links working, with
  keyboard-aware tabs, mobile navigation, and reduced-motion support preserved.
- The compact cosmetic fitting room now uses the owning Appearance surface,
  with larger name/effect controls and centered, uncropped name previews.
- Effect previews now share the surrounding Mocha surface instead of showing
  an unrelated black catalog canvas; Pixel Wake uses the production cursor
  renderer in demo mode and name-layer controls keep one consistent type scale.

## 2026-08-10 — Render real effect previews

- Name and visual-effect controls now show their selected production renderer
  rather than a generic placeholder sketch.
- Font and effect selections update the persistent Live preview immediately;
  Apply changes remains the save boundary.
- Profile borders now remain visible while previewing an otherwise-default
  profile.
- Removed the duplicate paid-layout control from visual effects.

## 2026-08-10 — Group and preview profile appearance controls

- Moved Profile surface color beside Profile surface opacity and blur.
- The surface swatch, hex field, and shared color picker continue updating the
  Live preview immediately.
- Font, material, motion, avatar, border, cursor-trail, and atmosphere choices
  continue updating the persistent profile preview while they are tried on.

## 2026-08-10 — Merge Effects into Appearance

- Removed the separate Effects tab from Customize.
- Visual-effect controls now appear directly in Appearance with identity,
  profile colors, and profile surface controls.
- Existing Effects links continue opening the correct controls in Appearance.

## 2026-08-10 — Remove nonfunctional Customize controls

- Removed Customize options that appeared editable but were not saved or
  rendered, including Surface tint, Border color, the Celestial Border surface
  selector, unsupported background fit/position controls, atmosphere strength,
  animation restart, content width, navigation style, and mobile layout. The
  persisted background treatment controls were later restored in Media.
- Matched the Profile colors and Profile surface card backgrounds to Profile
  identity while retaining darker input wells for contrast.
- Removed the “Unsaved identity draft” status message.
- Identity, color, surface, structured layout, and cosmetic previews now update
  the persistent Live preview immediately without losing staged changes from
  another Customize tab.

## 2026-08-10 — Add a focused default profile composition

- Fixed the color picker’s visible saturation/brightness dot and hue handle so
  they move with every selected-color edit.
- New Signal profiles now open with a generated deep-blue nebula/starfield
  background, a centered avatar above the name, readable profile details, and
  links in a bottom row without a redundant handle line.
- Removed the extra default border wrapper so the profile card has one clean
  perimeter like the reference.
- Removed the preview-only shell border and forced height so the live preview
  has one identity-card frame with no empty canvas below it.
- Removed the blue default-page backdrop from the embedded Studio preview;
  the generated starfield now belongs only to the profile card.
- Existing custom backgrounds, atmospheres, layouts, and published profile
  configuration remain unchanged.

## 2026-08-10 — Align Studio controls and activate the profile color picker

- Aligned the Customize profile action bar and four-tab row with the editor
  sections so the workspace shares one desktop gutter and remains responsive
  on mobile.
- Darkened text inputs, selects, and textareas to Catppuccin Crust for the
  recessed contrast shown in the reference while preserving native media and
  toggle controls.
- Made the selected profile-color picker functional: click a role, then use
  the saturation/brightness square, hue rail, palette, native color control,
  or hex field to update that role's draft color before publishing.

## 2026-08-10 — Refine Studio header and cursor uploads

- Increased the Chromadie Plus upsell copy and aligned the sidebar brand with
  the Profile changes bar.
- Added the missing custom-cursor hover outline so its upload target matches
  the other Profile media options.
- Fixed rich cursor URL handling and added bounded `.ani` animated cursor
  uploads for normal and pointer cursor slots, with a safe ANI preview badge.

## 2026-08-10 — Simplify Studio accents and media controls

- Removed the sidebar divider and decorative gradients for a flatter Mocha
  workspace; Studio typography remains Manrope.
- Increased Profile media icon and label sizing for clearer upload targets.
- Added a Remove action for an active custom cursor that clears the profile
  selection while preserving the private asset library.
- Removed the visible Profile colors heading, doubled the Chromadie Plus
  banner height, and removed its trailing arrow.

## 2026-08-10 — Tighten the Mocha dashboard proportions

- Narrowed the Studio rail to the reference 14rem footprint and tuned the
  active/inactive navigation row rhythm without changing destinations.
- Added a wider desktop media gap, bounded media wells, and compact two-rem
  form controls so the editor remains dense at the supplied viewport size.
- Shifted the workspace, panels, and input wells toward the darker Crust
  layers while retaining Catppuccin semantic accents and readable borders.
- Kept the owner card, omitted theme switcher, mobile drawer, preview, and
  draft/publish behavior intact.

## 2026-08-09 — Redesign Profile Studio as a focused Mocha dashboard

- Profile Studio now fills the viewport with a dedicated Catppuccin Mocha
  sidebar and editing canvas, matching the supplied dashboard reference.
- Added grouped line-icon navigation and a bottom owner profile card, moved
  Overview into Customize, and removed the redundant Studio theme switcher.
- Removed the site-wide header from Studio while leaving it intact everywhere
  else, giving the editor more usable space on desktop and mobile.
- Reworked panels, upload wells, inputs, status badges, and actions into a
  stronger Crust/Base/Mantle hierarchy with accessible semantic accents.
- Preserved profile drafts, publishing, preview rendering, account navigation,
  direct-refresh routing, mobile focus handling, and reduced-motion behavior.

## 2026-08-09 — Make Studio sections visually decisive

- Inverted the Studio depth hierarchy after live review: Crust now forms the
  workspace, while large sections use Surface0.
- Moved form fields and media wells onto Base and Mantle, with Surface1 and
  Surface2 borders, so controls sit inside their sections instead of visually
  overpowering them.
- Retained the existing Mocha semantic accents, layout, navigation, preview,
  and save behavior.

## 2026-08-09 — Increase Studio section contrast with Crust

- Changed the Studio workspace to Catppuccin Base and its large section cards
  to Catppuccin Crust (`#11111b`).
- Kept nested controls on Mantle and Surface0 so the darker cards remain easy
  to scan and edit on desktop and mobile.
- Left dashboard structure, navigation, preview, and save behavior unchanged.

## 2026-08-09 — Make profile surface blur visible

- Fixed high surface-blur values so uploaded backgrounds visibly soften inside
  the profile card.
- The card now samples and blurs the actual page background, one page-level
  background media layer, and atmosphere media behind it; page media stays
  sharp outside the card.
- Removed duplicate card-local media rendering so the public profile has one
  source of truth for its background layers.
- Kept the standards-track and WebKit backdrop-filter paths intact through
  production CSS minification so deployed profile cards retain visible blur.
- Kept the existing surface controls, saved configuration, and public profile
  boundaries unchanged.

## 2026-08-09 — Balance General Customization identity controls

- Expanded the compact Bio textarea to align with the full stack of
  Location/Timezone and Description rhythm/Entry animation controls.
- Reduced the vertical gap between the two right-side rows and moved Show join
  month / Show avatar below Bio for a cleaner visual rhythm.
- Preserved the stacked tablet/mobile layout and existing identity save flow.

## 2026-08-09 — Align surface controls with the profile card

- Moved Profile Surface into the Surface section beside Opacity and Blur; the
  Profile colors group now contains six colors.
- Fixed surface blur so it applies only within the profile card and blurs the
  main profile background behind it, leaving the page and daily roll clear.
- Kept the saved appearance schema, draft/publish authority, and responsive
  editor behavior unchanged.

## 2026-08-09 — Make profile customization quick to scan

- Customize now opens as one compact page with a Profile media rail for
  Background, Audio, Profile avatar, and Custom cursor.
- Removed the Customize page header, quick-jump rail, Preview, and View profile
  controls so the media section starts higher in the viewport.
- The media cards are now the upload controls: clicking a card opens the
  existing validated input and the card previews the current upload in place.
  Full libraries and advanced media settings remain available under one
  disclosure, with direct anchors retained for keyboard and deep-link access.
- Grouped the remaining controls into General, Color, and Other customization
  surfaces and added a quiet Chromadie Plus expression prompt.
- The redesign is responsive and keeps profile saves, preview drafts, media
  safety, and public profile behavior unchanged.

## 2026-08-08 — Lift the temporary public-site password gate

- Added the reversible `PREVIEW_PROTECTION=off` Cloudflare Pages switch for
  returning the live site to public access.
- The existing preview password flow remains the default when the switch is
  absent, and Supabase account authentication is unchanged.

## 2026-08-08 — Improve Profile Studio readability

- Enlarged the Studio sidebar and navigation labels and gave the Customize
  editor the full available content width.
- Replaced long intro copy with direct labels for appearance, surface, layout,
  and links controls.
- Made Live preview a compact identity-card panel and removed the daily roll
  and lower profile regions from the editor preview; the public profile is
  unchanged.

## 2026-08-08 — Clarify Profile Studio navigation

- Studio now opens on **Customize**, where identity, appearance, media, About,
  widgets, collection, templates, and layout controls live together.
- **Links** is a separate workspace for public links, aliases, and sharing;
  **Premium** explains Plus capacity and links to pricing. Account tools now
  live under their own clearly labeled section.
- Existing saved `#profile-*` dashboard links continue to open the matching
  aggregate destination, so this redesign does not strand old bookmarks.

## 2026-08-08 — Restore bounded rich-media uploads

- Fixed Plus/staff banner, cursor, pointer-cursor, audio, and background-video
  uploads that were rejected by Storage RLS before they could be finalized.
- The staged upload still checks the owner path, MIME type, entitlement, quota,
  and server-owned finalize step; no profile or gameplay data changes.

## 2026-08-08 — Make Atelier expression easy to find

- Chromadie Plus owners now see an Atelier expression guide in Studio →
  Collection.
- **Prism Atelier Name** is configured under Name → Motion, and **Prism
  Atmosphere** is configured under Atmosphere. Select a layer, preview it,
  and press Apply.
- The Atelier page composition remains under Customize → Templates. An
  uploaded background remains a separate Customize → Media setting.

## 2026-08-08 — Refresh the lifetime pricing surface

- Pricing is now reachable from the shared desktop and mobile header, with a
  clear active state and route prefetching.
- `/pricing` follows the homepage's dark authored canvas, thin rules,
  restrained accent, and story-first composition while keeping the fixed
  $7.99 USD lifetime Chromadie Plus offer easy to understand.
- The complete free profile remains the foundation; Plus adds expression and
  capacity without changing daily rolls, earned progression, or identity.
- The lifetime checkout is prepared for Stripe Managed Payments, with hosted
  SaaS tax classification and Stripe-controlled tax/fraud/dispute handling.

## 2026-08-08 — Certify and stage profile-parity surfaces

- Added three code-owned certification profiles to verify that free, premium
  media, and creator/provider identities still open as Chromadie profiles with
  the daily color ritual at the center.
- M13 surfaces can roll out staff-first, then to internal accounts, a bounded
  cohort, and all users, with independent rollback switches and V1/image
  fallbacks.
- Added an operator dashboard contract for fulfillment, staged-media cleanup,
  provider adapter health, privacy-safe retention, and moderation report volume.

## 2026-08-08 — Add privacy-safe insights and deeper guestbooks

- Profile Studio now offers private 7/30/90-day views, exploration clicks,
  device/country/referrer summaries, comparisons, and a downloadable CSV when
  the owner enables aggregate insights.
- Visitors must opt in before a view is counted. Only bounded daily totals are
  retained, and owners can independently hide the aggregate public view count.
- Guestbooks now support one-level replies, positive likes, newest/oldest/
  popular sorting, up to three owner pins, deletion, and reply reporting.
- Owners receive a private grouped inbox for favorites, reactions, guestbook
  activity, and earned reward events. Private messaging and email notifications
  are not part of this release.

## 2026-08-08 — Expand identity, content, providers, and sharing

- Profile Studio now supports optional location, timezone, join-month display,
  avatar visibility, finite description rhythm, and reduced-motion-aware entry
  animation.
- Owners can publish up to 25 stable-keyed HTTPS links, with the first six in
  the identity opening and the remainder continuing in the profile story.
- About text accepts a small safe Markdown subset, and Chromadie Plus/staff
  profiles can show up to ten projects. GitHub, Twitch, Last.fm, and Discord
  join the existing Spotify/YouTube provider set as safe cards.
- The public share dialog includes canonical/alias paths, copy, downloadable
  QR, and structured social metadata. Existing V1 profiles remain compatible;
  the daily roll and earned progression remain unchanged.

## 2026-08-08 — Add $7.99 lifetime Chromadie Plus checkout

- `/pricing` now compares Chromadie's complete free identity profile with the
  extra expression available through Chromadie Plus.
- Signed-in players can open secure Stripe Checkout for one $7.99 USD lifetime
  purchase and return to an authenticated fulfillment-status screen.
- Existing Atelier owners remain compatible. Refunds or chargebacks remove
  paid presentation access without deleting gameplay progress or profile
  content.

## 2026-08-08 — Add bounded profile aliases

- Profile Studio now lets owners create up to three memorable alternate paths.
- `/a/<alias>` redirects to the canonical public profile URL, so shared links
  keep one identity and one metadata surface.
- Aliases use the existing username safety rules and disappear with the
  profile; custom domains and API access remain future milestones.

## 2026-08-08 — Add structured profile templates and optional Atelier expression

- Profile Studio now offers Signal Garden, Editorial, and Color Archive as
  free starting compositions, with manual edits preserved as custom work.
- Existing `atelier_plus` owners can apply the premium Atelier composition;
  other owners can continue using the complete free templates or explore the
  existing expression path.
- Applying a template changes only public section composition. Links, story,
  appearance, media, widgets, progression, and daily rolls remain unchanged.

## 2026-08-08 — Add private aggregate profile insights

- Profile Studio can show owners daily public-view totals and active days when
  they explicitly enable the feature.
- A view is counted only when the visitor has granted product-event consent;
  only daily aggregates are retained, with no visitor identity or exact visit
  history.
- The existing profile, social, appearance, and gameplay contracts remain
  unchanged.

## 2026-08-08 — Bring positive social into public profiles

- Public profiles now expose bounded favorite, Spark/Glow/Cheer reaction, and
  moderated guestbook interactions with block and report controls.
- Anonymous visitors can read allowed social content and see how to sign in;
  authenticated visitors use the existing rate-limited RPC actions.
- Profile owners can hide aggregate positive-social counts while continuing to
  receive reactions and favorites.

## 2026-08-08 — Add allowlisted provider widgets

- Profile Studio now supports up to two focused provider widgets from Spotify
  and YouTube, with draft, publish, conflict, reset, and live-preview states.
- Public profiles use fixed provider embed URLs and lazy loading; the dashboard
  preview keeps external players deferred until the owner clicks Load player.
- Existing Spotify profile music remains compatible, and YouTube uses the
  privacy-enhanced `youtube-nocookie.com` frame origin.

## 2026-08-08 — Align standalone auth with the homepage and add reusable media

- `/login` and `/signup` now use the shared homepage header, wordmark, canvas,
  typography, stage treatment, mobile containment, and reduced-motion rules.
- Profile Studio Media now supports reusable owner-scoped avatar and background
  assets: upload once, keep the processed WebP in a private library, switch
  the selected expression, or remove an asset safely.
- Existing single-slot avatar/background paths remain compatible, and the daily
  roll presentation is unchanged.

## 2026-08-08 — Resolve account hydration after persisted sessions

- Fixed a browser transport deadlock that could leave returning users on
  “Checking your account…” indefinitely.
- Signed-in account controls, leaderboard rank data, and other authenticated
  account projections now resume after an expired or refreshable session is
  recovered.

## 2026-08-08 — Add standalone sign-in and sign-up pages

- Homepage, header, founder, guest, and username-claim actions now navigate to
  `/login` or `/signup` instead of opening an authentication overlay.
- The pages reuse the existing auth implementation, preserve callback and
  password-recovery behavior, support safe local return destinations, and
  redirect authenticated visitors to their destination or canonical profile.
- Auth route switching, direct refresh, initial focus, announced errors,
  mobile layout, reduced motion, and a real signup flow are covered by the
  browser smoke.

## 2026-08-08 — Allow one- and two-character usernames

- Signup, homepage claims, canonical root profiles, compatibility routes, and
  challenge attribution now support available 1–20 character usernames.
- Existing route, brand, moderation, and ownership protections remain active;
  the newly valid `c`, `og`, and `u` application paths are hard-reserved.
- The linked Supabase migration `20260808120000_short_usernames` is deployed
  and the local/remote migration histories are aligned.

## 2026-08-08 — Complete the Profile Studio release baseline

- Added a repeatable loopback-only Chromium smoke that verifies the inline live
  preview, draft blur feedback, public/profile effect boundaries, mobile menu
  focus, reduced motion, and direct-refresh routing.
- Reduced initial application JavaScript and the complete CSS catalog without
  changing profile configuration, gameplay authority, or published routes.
- Replaced the misleading all-route aggregate blocker with route-first budgets
  for initial, lazy, auth, homepage, public-profile, and dashboard payloads;
  aggregate catalog growth remains visible as an advisory metric.
- Completed Milestone 0. Short username support is the next planned milestone
  and has not started.

## 2026-08-08 — Make blur reliable over authored media

- Surface blur now directly softens uploaded backgrounds and atmosphere plates
  beneath the identity card in the public profile and dashboard live preview,
  without blurring the rest of the page.

## 2026-08-08 — Make atmosphere visible to surface blur

- Atmosphere layers no longer isolate themselves from the identity surface's
  backdrop filter, so the blur control has visible feedback over the effect in
  both the dashboard live preview and public profile.

## 2026-08-08 — Make surface blur sample the profile canvas

- Profile-card border wrappers no longer block the card surface from sampling
  the page backdrop, so the configured blur can visibly soften media and
  atmosphere beneath the translucent surface.

## 2026-08-08 — Match public effects to the full profile canvas

- Atmosphere and cursor effects now fill the public profile page while staying
  card-scoped in the dashboard fitting-room preview.
- Surface opacity uses a direct RGBA paint value and blur remains attached to
  the translucent identity surface.
- The dashboard fitting-room preview follows the same effect boundary.

## 2026-08-08 — Make the profile appearance controls visible

- Uploaded backgrounds now fill the public profile page while remaining
  card-scoped in the dashboard fitting-room preview.
- Surface color, opacity, blur, text color, and highlight color now flow into
  the shared identity-card and fitting-room renderers across card layouts.
- The appearance editor explains that blur is visible through a translucent
  surface when media or a gradient sits behind it.

## 2026-08-08 — Make customization settings reliable

- The Collection fitting room now follows the live draft, including the active
  profile theme, avatar, and background.
- Atmosphere scenes and cursor trails fill the public profile without changing
  the roll UI; dashboard previews keep them card-scoped alongside backgrounds.
- Layout & links exposes secondary section sizes, keeps the daily roll fixed,
  and explains incomplete links before they are saved.

## 2026-08-08 — Scope customization to the profile card

- Profile appearance changes now preview on the identity card without
  recoloring or restyling the daily roll UI.
- The roll continues to use the shared system presentation tokens while card
  customization remains live in Profile Studio.

## 2026-08-07 — Keep the Studio preview live

- Profile Studio now keeps the real profile canvas visible beside the dashboard
  on wide screens, so appearance and layout changes can be reviewed without
  opening or closing a temporary overlay.
- On narrower screens the same preview becomes a dedicated section below the
  editor, preserving the live relationship without obscuring dashboard work.
- The preview continues to show normalized draft values while save, publish,
  equip, roll, reward, and progression actions remain behind their existing
  authority boundaries.

## 2026-08-05 — Compact full-page customization dashboard

- `/profile/settings` now uses the homepage header and a grouped sidebar with
  Overview, Customize, Profile, Progression, and Account destinations.
- Customize controls exact profile colors, surfaces, gradients, and borders in
  dense responsive panels with draft, reset, and publish actions.
- Daily roll colors remain part of the color story and authored effects instead
  of recoloring the complete profile theme.
- Live preview opens the real profile renderer in an accessible desktop drawer
  or mobile fullscreen dialog. Shop remains a direct compatibility route but is
  not part of the dashboard loop.

## 2026-08-05 — Turn Profile Studio into a full-page dashboard

- `/profile/settings` now opens as a dedicated dashboard with its own
  navigation, account controls, live-profile link, responsive mobile drawer,
  and editor/preview workspace.
- Overview and Progression are first-class destinations, while the Shop stays
  available at its direct route without occupying the primary dashboard loop.
- Daily play now unlocks five authored expression effects at EP rank
  thresholds: Type In, Carbon Vein, Glow, Raised Glass, and Scramble.
- Unlocks are granted server-side and idempotently, while the dashboard and
  roll result surface only the authoritative state returned by the server.

## 2026-08-05 — Make Studio the profile dashboard

- Added a Studio Overview that connects live identity, rank, EP progress,
  recent roll history, collection state, and direct editing actions.
- Promoted Studio in authenticated navigation and hid Shop from primary
  navigation and dashboard calls-to-action without deleting `/shop` or its
  existing economy contracts.
- Made Shop catalog loading lazy so account hydration is not blocked by a
  catalog outage; Collection and direct Shop entry still load it when needed.

## 2026-08-05 — Make Studio primary and expose progression clearly

- Reframed the authenticated settings workspace around Studio, Collection,
  and Progression rather than a catch-all account panel.
- Added a progression view for rank, lifetime EP, next-rank progress, daily
  rolls, streaks, achievements, story collection unlock state, and recent
  color history.
- Kept the Shop route and existing purchase/equip authority intact as a
  secondary acquisition surface; no rewards, inventory, or historical catalog
  data were moved into client state.

## 2026-08-05 — Rebase Name Motion on Haunt reference behaviors

- Replaced the weak authored motion set with ten focused behaviors modeled on
  Haunt’s public username vocabulary: Glow, Scramble, Type In, Particles,
  Rainbow, Gradient, Fuzzy, Reveal, Split Reveal, and Flash.
- Kept Type In and Scramble as the strongest existing Chromadie gestures and
  rewrote the other eight as original Canvas 2D implementations with vivid
  color, controlled glow, clipping, particles, and deterministic motion.
- Deprecated the prior eight active motion rows while preserving historical
  item keys through finite renderer aliases.

## 2026-08-05 — Refine Name Motion quality

- Type In now types from the left edge with a cursor that follows the visible
  text instead of the full-name bounds.
- Fuzzy’s signal line is text-masked, removing the compact-card box artifact.
- Glow, Particles, Rainbow, Gradient, Reveal, Split Reveal, and Flash now use
  distinct Canvas gestures: breathing aura, baseline trails, prism slices,
  fluid fill, masked entry edge, chromatic seam, and chromatic exposure.
- Added renderer behavior coverage for cursor anchoring, masked scanlines,
  particle trails, spectrum slices, and flash layering.

## 2026-08-05 — Previous Name Motion pass (superseded)

- Reduced the live Name Motion shop to ten authored effects: Ghost Frequency,
  Scramble, Color Wake, Dustfall, Type In, Filament Trace, Prism Fracture,
  Molten Rise, Voltage Arc, and Archive Bloom.
- Added five new Canvas-rendered gestures with high-contrast spectral,
  electrical, thermal, filament, and color-memory motion; strengthened
  Dustfall with a larger, brighter field of particles.
- Removed deprecated motions from new purchases while preserving historical
  ownership and equipped profiles through legacy rows and renderer aliases.
- Curated the active material shelf to Raised Glass, Carbon Vein, Afterglow,
  Soft Black, Quarry Mark, Cathode Bloom, and Draftline; deprecated material
  rows remain legacy-compatible but are no longer offered.

## 2026-08-05 — Increase catalog contrast

- Changed shop cards and preview stages to black for a cleaner, higher-contrast
  gallery.
- Profile Border thumbnails now show only the border treatment without a
  repeated profile name.

## 2026-08-05 — Replace weak atmosphere treatments

- Replaced Night Pollen with the denser Starlight Tunnel particle field.
- Replaced Paper Shadow with the higher-contrast Chromatic Tangle light-trail
  field. Stable renderer and ownership keys remain compatible with existing
  profiles while the catalog names now describe the actual visuals.

## 2026-08-05 — Reframe the Shop as a fitting room

- Reorganized the Shop into a category rail, compact three-column Catalog
  gallery, and right-side inspector with the live profile, selected-cosmetic
  details, and a clear purchase action.
- Kept product tiles focused on the effect and Preview action while preserving
  the existing fitting-room selection and server-authoritative purchase flow.
- Removed explanatory rail subcopy, replay/pause controls, and the redundant
  layout-status badge. The live profile window now lets atmosphere effects show
  through the transparent identity surface, with a stronger title accent.
- Replaced the cluttered default All catalog with a curated Featured set,
  added color-coded rarity filters to the rail, and standardized the shop
  language around cosmetics. The EP balance returned to a quiet label/value
  treatment. Atmosphere cards now animate on hover/selection and show only the
  media plate; avatar cosmetics use the signed-in user’s avatar, and cursor
  cards show an explicit pointer with its trail. Border previews no longer
  carry specimen copy, and atmosphere media fills the full thumbnail stage.

## 2026-08-04 — Add seven sourced atmosphere plates

- Replaced the removed procedural atmosphere slots with Silk Folds, Glass
  Caustics, Cinder Drift, Night Pollen, Paper Shadow, Smoke Spiral, and Lumen
  Flare, all sourced from Pexels and processed as authored video loops.
- Added WebM/MP4 media, representative posters, screen-blended black backing,
  reduced-motion handling, catalog rows, and the renderer allowlist. The active
  catalog now contains 126 items, including 12 Profile Atmospheres.

## 2026-08-04 — Curate the atmosphere catalog

- Removed seven procedural atmosphere presets that read as generic gradients,
  rings, or thin signal paths.
- Kept Rain Window, Droplets on Glass, Dustlight, Ink Bloom, and Snowfall as
  the authored video-plate set, with poster fallbacks and reduced-motion
  handling.
- Removed retired shop and inventory records and cleared any equipped retired
  atmosphere, leaving 119 active catalog items.

## 2026-08-04 — Add three authored looping atmospheres

- Added Dustlight, Ink Bloom, and Snowfall to the atmosphere catalog.
- Each treatment uses a sourced video plate processed with a crossfaded seam,
  WebM/MP4 fallback, and a reduced-motion poster, so looping stays quiet and
  continuous instead of visibly resetting.

## 2026-08-04 — Loop the Droplets on Glass treatment

- Replaced the static droplet texture with a full-frame Pexels window source,
  a crossfaded loop, and a reduced-motion poster.

## 2026-08-04 — Separate rain and glass droplets

- Rain Window is now a clean rain-only overlay.
- Added Droplets on Glass as a separate anchored pane texture so the two
  weather treatments have distinct visual identities.

## 2026-08-04 — Make Rain Window loop-native

- Swapped the crossfaded rain footage for an explicitly seamless rain loop.
- Layered a quiet still of real windshield droplets over the motion plate so
  the glass texture stays grounded while the moving rain repeats cleanly.

## 2026-08-04 — Upgrade the first avatar effects with authored art

- Prism Orbit now uses an authored refractive-glass plate with sparse orbiting
  fragments; Ember Crown uses an authored metal crown plate with rising
  embers; Ghost Double uses a textured chromatic double-exposure plate plus
  the actual portrait offset.
- The selected Shop preview and full profile animate through one bounded shared
  compositor. Unselected cards and compact profile surfaces stay static so
  repeated surfaces do not create animation loops.

## 2026-08-04 — Expand launch identity expression

- Added 16 Cursor Trails, 18 Avatar Effects, and five paid Profile Layouts to
  the existing shop catalog without adding new categories beyond the launch
  brief.
- Cursor Trails follow pointer movement only on public profiles and bounded
  previews; they pause offscreen, disable on touch/reduced-motion contexts, and
  never intercept input.
- Avatar Effects decorate the portrait locally and keep compact discovery and
  leaderboard surfaces readable with static signatures.
- Added Split Signal, Archive Index, Prism Mosaic, Night Terminal, and Story
  Stack as paid composition overrides while keeping Immersive, Editorial, and
  Focus free fallbacks.
- Updated Shop, Owned, Profile Settings, public profiles, discovery, and
  homepage profile rows to resolve the new structured slots through shared
  renderers. Existing Name, Border, purchase, equip, and profile-save behavior
  remains intact.

## 2026-08-03 — Align supporting-route navigation with the homepage

- Reused the homepage header treatment across the shop, leaderboard, roll,
  settings, help, legal, and other supporting surfaces.
- Renamed the header destination from Studio to Shop.
- Removed the redundant Profile item from the primary desktop and mobile nav.

## 2026-08-03 — Polish the shop live preview

- Matched the shop fitting room to the Profile Settings preview with a Live
  profile / Draft preview header and a cleaner identity card.
- Showed the profile avatar, name, bio, and safe social links in the live
  preview while leaving editable page sections in Profile Settings only.
- Moved EP balance into the sticky preview panel and normalized Filter and
  Profile settings controls to the shop's body type stack.

## 2026-08-03 — Turn the shop into a profile workspace

- Added a Profile Settings-inspired navigation rail for Catalog, Owned,
  categories, and Name layers.
- Made the shop a three-column workspace: navigation, catalog results, and a
  persistent live profile preview.
- Removed duplicate horizontal menus and redundant preview/detail framing so
  selecting a piece immediately keeps the real profile renderer in view.
- Kept catalog filtering, ownership, purchase RPCs, temporary try-on, and
  profile settings behavior unchanged.

## 2026-08-03 — Improve shop scale and readability

- Expanded the desktop shop surface so the catalog uses the available viewport.
- Increased supporting labels, controls, card metadata, and purchase text.
- Simplified Name layers into a compact selector with count badges.
- Made the live profile preview larger and less surrounded by empty stage space.

## 2026-08-03 — Condense the shop catalog

- Removed the redundant catalog intro band and its repeated Today’s color
  panel.
- Put Catalog/Owned navigation and Today’s color beside the account actions
  so the product grid starts sooner.
- Tightened the live profile stage slightly without changing try-on or
  purchase behavior.

## 2026-08-03 — Compact the shop and stabilize try-on previews

- Removed the redundant Names headline and copy from the catalog context.
- Gave EP balance a larger, more prominent header treatment.
- Renamed Collection to Owned so the account surface is immediately clear.
- Made selecting a font, material, motion, or border remount the shared live
  profile renderer so the preview always reflects the current choice.

## 2026-08-03 — Improve catalog density and name-layer discovery

- Show three shop pieces per row on desktop so the catalog is easier to scan.
- Add a clear Name layers menu with Font, Material, and Motion choices,
  explanations, and item counts.
- Preserve the existing profile preview, filtering, purchase, collection, and
  responsive behavior.

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
## 2026-08-04 — Add authored profile atmospheres

- Added the new Atmosphere Shop category with eight roll-aware authored scene
  plates, from Signal Garden and Rain Window to the Mythic Color Memory.
- Atmospheres render behind the identity card on public profiles and in the
  Shop/Profile Settings fitting rooms. Uploaded backgrounds remain a separate
  user-controlled layer.
- Added reduced-motion/static card states, visibility pausing, bounded SVG
  artwork, and a finite server-validated renderer registry.
- Bumped the shop cache/catalog version and synchronized seed, migration, RPC
  allowlists, database security checks, balance drift, and catalog drift.
- Atmospheres are now additive-only so uploaded backgrounds are not darkened;
  the scene plates use layered authored particles, refraction, paper marks,
  moon detail, and signal structure instead of a generic wash.

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

## 2026-08-04 — Audit Shop catalog rendering quality

- Preserved all 18 Font mappings, 22 Material keys, 24 Motion keys, 9 Border
  keys, prices, rarities, collections, descriptions, ownership, inventory,
  and equipped state.
- Improved readability for Carbon Vein, Soft Black, Quarry Mark, and Spillway
  without changing their catalog metadata.
- Kept Typefall visible on dark daily colors and made Chroma, Prism, Crystal,
  Glitch, and Neon border motion stay on the border instead of moving or
  fading profile content.
- Removed six unreferenced pre-workspace Shop components; the current Shop
  workspace and shared renderers remain the only production path.

## 2026-08-04 — Rain Window pilot

- Added a realistic droplet video plate to Rain Window, sourced from a
  commercially usable Pexels clip and transformed into a Chromadie-specific
  highlight loop with a longer tail-to-head crossfade so the reset is not
  visually abrupt.
- Added WebM/MP4 delivery, poster fallback, screen-only blending, and reduced-
  motion/card handling without changing the atmosphere slot or catalog key.

## 2026-08-05 — Section-scoped profile dashboard corrections

- Added canonical dashboard history and responsive Profile-group IA with
  guarded dirty navigation and no duplicate sidebar account controls.
- Scoped Layout & links draft/publish to composition keys only and added stale
  version reload actions; appearance remains independently publishable.
- Fixed `#CDD2FF` appearance defaults, bounded owner-data preview behavior, and
  reused account deletion in the legacy Profile route.

## 2026-08-08 — Add structured profile content regions

- Added About & projects editing to Profile Studio with bounded plain text,
  HTTPS-only project links, owner drafts, publish, conflict reload, and live
  preview.
- Added the corresponding public profile continuation region while keeping
  the daily roll and existing customization boundaries unchanged.
- Added additive Supabase normalization and section RPC support; raw HTML,
  JavaScript, CSS, and arbitrary embeds are not part of the profile contract.

## 2026-08-08 — Add bounded rich profile media

- Added premium/staff background videos, MP3 playlists, banners, and cursor
  assets through a staged, owner-scoped, server-verified media library.
- Added strict per-kind limits, a 150 MB profile quota, cleanup of abandoned
  uploads, validated reusable selection, and refund-safe public projection.
- Added muted video poster fallback, reduced-motion behavior, finite Enter-gated
  audio playback, visible pause/volume/track controls, and media-key handling.
- Preserved the free image/atmosphere/Spotify/YouTube expression path and all
  daily-roll, reward, history, and prestige authority boundaries.

## 2026-08-08 — Make Profile Studio easier to scan and operate

- Added a quick asset row for avatar, background, banner, audio, and cursor
  management, including configured and Plus states.
- Added keyboard-accessible Customize categories so profile settings no longer
  appear as one long page with several competing save bars.
- Made live preview an on-demand responsive inspector and kept the compact
  identity-only preview free of daily-roll dashboard content.
- Grouped appearance controls into denser responsive cards and improved field
  label and control sizing.
- Reused all existing media managers, entitlement checks, owner RPCs, RLS, and
  draft/publish behavior; this release contains no database migration.

## 2026-08-08 — Make Customize direct and continuous

- Replaced the nested category/entry-point presentation with one continuous
  Customize workspace containing media, identity, appearance, content,
  widgets, effects, and layout controls.
- Kept the current avatar/background visible beside their upload actions and
  added current previews plus replace actions for rich video, banner, cursor,
  pointer cursor, and audio assets.
- Flattened repeated module headers and kept section save/publish actions next
  to the controls they affect. Existing upload, RLS, entitlement, and
  section-scoped publishing contracts are unchanged.

## 2026-08-09 — Simplify customization and publish the whole profile

- Reduced the color editor to seven profile colors plus surface opacity and
  blur; removed highlight, border, border-color, and background-gradient
  controls while preserving legacy stored values for compatibility.
- Removed repeated Reset, Save draft, and Publish controls from the embedded
  editors and added one responsive dashboard action bar for Reset and Publish
  profile across Customize and Links.
- Kept the existing V2 owner RPC authority, validation, conflict handling,
  media boundaries, and profile preview behavior intact.

## 2026-08-09 — Apply Catppuccin Mocha to Profile Studio

- Recolored the dashboard surfaces, typography, borders, controls, accents,
  and status states with a dashboard-scoped Catppuccin Mocha palette.
- Kept the existing dashboard layout, navigation, spacing, responsive states,
  and reduced-motion behavior unchanged.

## 2026-08-09 — Add restrained accent contrast to Profile Studio

- Added semantic Mocha accents to existing navigation states, dashboard status,
  and Customize surface borders/backgrounds.
- Kept the change color-only; no dashboard geometry, spacing, or interaction
  structure changed.

## 2026-08-09 — Strengthen Profile Studio surface hierarchy

- Used Catppuccin Surface0 and Surface1 roles to separate the existing large
  editor panels and dashboard action bar.
- Increased only the existing accent tint strength; layout, spacing, and
  interaction structure remain unchanged.

## 2026-08-09 — Simplify Profile Studio surface contrast

- Replaced bright large-panel fills with alternating Crust, Mantle, and Base
  backgrounds.
- Reserved lighter Mocha tones for controls, input fields, borders, and
  semantic accents so the dashboard reads more quietly.

## 2026-08-09 — Unify Profile Studio typography

- Added a local Manrope variable font for Profile Studio UI typography and its
  dashboard header.
- Kept IBM Plex Mono for technical values and left homepage/public-profile font
  contracts unchanged.

## 2026-08-09 — Rebalance Profile Studio darkness and control contrast

- Added a Crust canvas gutter and clearer Base/Mantle depth between the
  existing editor sections.
- Softened input fills and accent borders so the controls do not read as extra
  panels.
## 2026-08-10 — Redesign the Profile Studio workspace

- Added Appearance, Media, Effects, and Layout tabs to Customize.
- Kept a live draft profile preview beside the editor on desktop, with responsive
  preview behavior on smaller screens.
- Refined Mocha-inspired panels and spacing, retained Manrope, removed gradient
  accent treatment, and added a compact dark/light icon switch.
- Kept existing draft publishing, direct routes, media uploads, cursor uploads,
  and `.ani` animated cursor support intact.

## 2026-08-10 — Converge Studio layout with the supplied references

- Moved the aggregate action bar into a shell-wide top row and matched the
  reference editor/preview column geometry.
- Replaced descriptive tab cards with the compact Appearance / Media / Effects /
  Layout underline row used by the reference dashboard.
- Added bordered Live preview framing, Desktop/Mobile controls, and the
  Chromadie Plus callout; expanded Appearance colors with a picker and palette.
- Recomposed media, effects, and layout controls into reference-style cards
  without changing their persistence or authority contracts.

## 2026-08-10 — Final reference polish

- Matched the action-bar Published indicator and disabled-control contrast to
  the supplied dashboard, while preserving the Manrope/Mocha token system.
- Kept Profile audio naming consistent across the compact media rail and made
  ANI MIME detection tolerant of browser-specific cursor file types.
- Recorded the measured dashboard route ceiling for the intentional persistent
  preview and editor composition payload.

## 2026-08-10 — Compact the Effects fitting room

- Constrained each real visual-effect preview to the compact card height used
  by the reference Effects workspace, including avatar, border, cursor, and
  atmosphere renderers.
- Removed the inline “Preview only. Apply the change” status copy while keeping
  Apply changes, accessible errors, toast feedback, and existing equip behavior.

## 2026-08-10 — Repair cosmetic preview propagation

- Forwarded Collection fitting-room events through the Customize shell so
  atmosphere selections update the persistent Live preview immediately.
- Keyed atmosphere media by its validated renderer key so switching scenes
  replaces the video/poster element instead of retaining the prior source.
- Increased and vertically centered the name-effect samples beside each select.

## 2026-08-10 — Match compact name-effect formatting

- Shortened the composable slot labels to Font, Material, and Motion, matching
  the reference fitting-room row while retaining the full heading context.
- Reduced the heading, reset action, labels, and select heights to the compact
  reference rhythm and added slot separators with right-aligned renderer samples.
- Added browser smoke coverage for the three labels and bounded control/row
  heights; no cosmetic persistence or equip authority changed.

## 2026-08-10 — Give Profile Studio a dedicated mobile composition

- Made the authenticated dashboard shell switch explicitly to a phone layout:
  the permanent sidebar becomes an inert drawer, the action bar and tabs use
  full-width mobile rows, and Live preview remains a bounded bottom sheet.
- Replaced the desktop identity placement grid below the mobile breakpoint with
  one normal-flow field per row, preventing metadata and behavior controls from
  overlapping on narrow screens.
- Added authenticated browser geometry coverage and a mobile editor capture at
  414px, while retaining the existing 320px, tablet, narrow-desktop, keyboard,
  reduced-motion, routing, and preview checks.

## 2026-08-11 — Harden Discovery and reusable profile media

- Fixed public Discovery avatar projection and normalization for registered
  UUID-backed avatar assets while preserving legacy avatar paths.
- Made avatar/background removal safe for the reusable media library, verified
  persisted upload URLs before completing Studio saves, and cleaned failed
  uploads and owner-scoped media during account deletion.
- Repaired the Leaderboard route shell's legacy 500px cap and moved layout
  ownership to explicit Discovery grid items plus a leaderboard card variant.
- Kept live Profile Studio preview state mounted for ordinary configuration
  changes and added production-browser Discovery geometry/avatar coverage across
  mobile, tablet, and desktop viewports.

## 2026-08-11 — Preserve expression media through V2 configuration reads

- Merged dedicated avatar/background expression columns into owner and public
  V2 configuration payloads at both the normalized base and compatibility
  envelope levels.
- Added regression coverage so a saved UUID-backed avatar survives Studio
  reload and remains available to the public profile, Homepage, and Leaderboard
  renderers.

## 2026-08-11 — Preserve avatars in dynamic homepage embeds

- Distinguished the static homepage hero artwork from the data-driven Today’s
  Color and leaderboard embeds.
- Added a hydrated-profile fallback for discovery rows whose avatar projection
  is temporarily absent during additive database rollout.
- Made profile hydration backfill missing expression fields from the legacy
  owner/public read when an older V2 RPC is still deployed.
- Added regression coverage for the Studio preview projection and homepage
  discovery-row avatar propagation.

## 2026-08-11 — Make the five profile layouts genuinely distinct

- Replaced width-and-spacing variants of `IdentityCard` with structural layout
  frames for Compact, Sleek, Minimal, Modern, and Portfolio.
- Added layout-specific roll presentation using shared daily-roll logic, plus
  detached Sleek strips, Modern tabs/widget structure, and Portfolio's
  below-fold Today placement.
- Rebuilt Studio preview around a logical profile viewport so page-level
  backgrounds, atmosphere, cursor, and media remain visible around the card.
- Made layout selection draft-only, corrected Story Stack → Portfolio inventory
  migration, applied template module ordering, and unified social-service
  metadata/icons/validation.
- Removed public “No bio added yet.” filler and legacy handle CSS; added
  structural layout assertions and fresh desktop/mobile capture paths to the
  browser smoke script.

## 2026-08-12 — Stabilize the canonical Profile Studio draft

- Profile Studio now resolves one complete draft from field-scoped editor
  patches instead of allowing hidden editors to replace unrelated preview
  state.
- Removed the duplicate `customizepreview` event path and kept restored editor
  caches scoped to their owning fields.
- Applied surface appearance directly to the shared profile surface owner and
  added computed-color/opacity/blur regression coverage.
- Removed timing-dependent opening-overflow alignment state while retaining
  readable physical desktop/mobile preview behavior.
- Accepted structurally valid V2 configuration envelopes even when optional
  expression media is absent.
## 2026-08-13 — Harden staged R2 profile media

- Fixed SigV4 canonical header/date signing and added deterministic and
  optional live R2 control-plane coverage.
- Kept standalone audio and playlist-track migration references separate.
- Added exact-URL Cloudflare purge retries, abandoned-upload cleanup, leased
  account cleanup, server-side container validation, physical quota/count
  limits, and idempotent promotion checks.
- Kept R2 Standard-only policy and all production upload/backfill/cutover
  actions operator-gated.

## 2026-08-13 — Close the final pre-canary R2 correctness gaps

- Fixed NULL legacy-path deletion matching so unused R2 assets cannot clear a
  different typed selection, with launch security coverage for multiple media
  kinds.
- Preserved delete operation metadata and optimistic-concurrency timestamps,
  cleared successful promotion's private key, and made completion/publication
  retries safe after cleanup.
- Signed upload byte length and added an environment-gated oversized/undersized
  R2 smoke; added the standalone 15-minute cleanup scheduler and control-plane
  tests. No production R2 flag, backfill, public cutover, or Supabase Storage
  deletion was performed.

## 2026-08-13 — Clean up retained legacy media after R2 migration

- Added a service-only, exact bucket/path cleanup RPC for migrated assets that
  still retain a legacy Supabase Storage path.
- Extended explicit R2 deletion, deleted-asset retries, and account-deletion
  jobs so legacy Supabase objects are removed idempotently alongside R2
  objects, while NULL paths remain native-R2 safe.
- Added database security regressions for migrated-asset deletion and durable
  account queue capture. No production canary, backfill, or legacy-storage
  retirement was run.

## 2026-08-14 — Global R2 new-upload rollout complete

- Removed all normal Profile Studio profile-media upload fallbacks to
  Supabase Storage; new supported uploads use direct private-R2 upload,
  server verification, promotion, and immutable `media.chm.lol` delivery.
- Added exact-path legacy Supabase Storage API cleanup in the server control
  plane. Tombstones retain provider identifiers until external deletion and
  retries are safe for missing or temporarily unavailable objects.
- Kept legacy provider-neutral reads during reconciliation. Four active legacy
  Supabase assets and three expired staged rows remain in the current inventory;
  active media is not deleted or backfilled without owner confirmation.

## 2026-08-14 — Reconcile remaining legacy profile media

- Cleaned the three expired staged rows through the durable cleanup endpoint;
  no active legacy media was removed and the cleanup queue is empty.
- Reconfirmed four active Supabase-backed assets, seven legacy configuration
  path references, and nine legacy Storage objects (4,570,273 bytes). They
  remain preserved pending owner-level disposition rather than an unsafe bulk
  delete or generalized backfill.
- Removed the unused browser Storage upload method while retaining the narrow
  legacy read/delete compatibility boundary.

## 2026-08-14 — Harden legacy profile-media deletion

- Legacy Supabase Storage cleanup now uses the supported `DELETE` object API
  and treats missing objects as idempotent success.
- Legacy staff audio without an asset-library row now deletes the exact
  physical object server-side before clearing `audio_path`; failed cleanup
  leaves the path available for retry.
- Added focused endpoint, migration, and local Storage lifecycle coverage.

## 2026-08-14 — Replace the homepage presentation (Phase 1)

- Replaced the legacy homepage with the approved reference-first visual shell.
- Added deterministic local fixture profiles rendered through a direct
  `HomepageProfileDemo` for the centered hero and photographic showcase, plus
  live community discovery and the existing claim/auth flows.
- Loaded the approved Clash Display and Inter typography and removed obsolete
  homepage presentation components, assets, scripts, and selectors after audit.
- Profile Studio remains unchanged and is not part of this phase.

## 2026-08-14 — Restore homepage reference fidelity

- Removed the homepage `ProfileShell` adapter and restored the reference-owned
  profile specimen geometry, transparent claim treatment, photographic
  environments, and centered desktop composition.
- Kept fixture carousel changes local and deterministic; production profile
  rendering, live community data, claim/auth behavior, and media contracts were
  not changed.

## 2026-08-14 — Enforce R2-only profile-media egress

- Removed runtime Supabase Storage URL/API, verification, deletion, and
  fallback paths. Historical media references now remain inert metadata and
  resolve to an unavailable state until replaced with an R2 asset.
- Removed timestamped remote media cache busting and kept Profile Studio’s
  persistent preview stable across non-media draft changes.
- Added homepage idle/request-budget coverage, shared media URL stability
  guards, active database Storage-function lockdown, and R2-only account
  cleanup assertions.

## 2026-08-14 — Replace the Profile Studio presentation

- Replaced the obsolete sidebar/dashboard presentation with the approved dark
  Profile Studio shell and compact primary/More navigation.
- Restyled Customize around the reference editor surface while preserving the
  real Appearance, Media, Layout, draft/publish, and sticky live-preview
  contracts.
- Removed obsolete sidebar, mobile drawer, duplicate action, owner-card, and
  preview-promotion presentation code after import/reference verification.
- Updated browser smoke and focused regression coverage for the new shell,
  mobile Preview control, More-menu focus behavior, responsive containment, and
  all existing Studio destinations.

## 2026-08-15 — Rebuild Profile Studio Customize around the reference

- Replaced the old Customize card stack with the approved reference-first dark
  editor surface and bounded live profile card.
- Kept Appearance, Media, Layout, identity, cosmetics, media,
  Compact/Immersive presentation, draft/publish, and environment behavior on
  their existing production
  contracts while removing obsolete duplicate action presentation.
- Reduced initial Customize work to the owner profile/configuration path and
  active tab; deferred broader profile hydration until another dashboard
  section requires it.

## 2026-08-15 — Complete the Profile Studio live preview contract

- Staged Customize changes now reach the bounded preview card for appearance
  colors/surface, identity presentation, link styling, name font/material/
  motion, avatar effects, profile borders, and profile motion.
- Kept background, atmosphere, cursor, and media behavior on the existing
  snapshot/environment contracts and reused the production leaf renderers
  rather than adding preview-only cosmetic implementations.
- Added regression coverage for the complete staged snapshot-to-card prop
  boundary.

## 2026-08-15 — Reset profile presentation to Compact and Immersive

- Public profiles and Profile Studio now share the two active structural
  presentations: the centered Compact reference card and the Immersive
  full-bleed identity scene.
- Existing accounts are normalized through a forward migration; obsolete
  layout catalog and inventory presentation rows are removed after references
  are cleared, while profile data, effects, media, rolls, and publishing
  contracts remain intact.
- Removed the retired layout wrapper and IdentityCard presentation paths and
  kept shared production leaf renderers as the reusable effect boundary.

## 2026-08-15 — Tune Immersive identity spacing

- Matched the Immersive name and bio scale to the approved reference.
- Tightened the horizontal spacing between social icons without changing the
  full-bleed profile composition or link behavior.

## 2026-08-17 — Add the homepage daily highest-roll board

- Replaced the hero’s profile-example context panel with a compact live board
  using today’s public discovery results, real EP scores, avatars, color
  accents, and canonical profile links.
- Moved the homepage roll preview under the hero copy and kept it local so the
  public landing page cannot create unauthenticated server scores.
- Added responsive, reduced-motion, fallback-avatar, and bounded-network
  regression coverage.

## Generated roll horizon atmosphere — 2026-08-18

- Added a generated, local pale atmospheric background for normal application,
  auth, status, leaderboard, legal, pricing, guide, gameplay, and Profile Studio
  shells so supporting routes stay visually connected to the homepage.
- Replaced the shared mint interface accent with homepage lavender while keeping
  roll, reward, success, and profile colors data-driven or semantic.
- Left homepage composition, public user-profile rendering, auth/security logic,
  RPCs, storage behavior, and roll authority unchanged.

## Dedicated Roll destination — 2026-08-18

- Added canonical `/roll` navigation to the homepage, application header, and
  footer.
- Reintroduced the full Roll game as a dedicated atmospheric page with a
  homepage-aligned heading, glass surface, lavender controls, and responsive
  mobile layout.
- Preserved the existing Game component’s authoritative RPC flow, guest-local
  mode, rewards, rerolls, results, share actions, and challenge compatibility.

## Roll ritual presentation — 2026-08-18

- Reworked the actual Roll game UI into a color-first ritual with a spectrum
  instrument before the roll, a focused reveal state, and a hierarchy-led result
  surface.
- Applied rarity-aware accents without changing rarity definitions, scoring,
  roll authority, guest behavior, rewards, rerolls, or profile contracts.
- Kept supporting result details visible in compact responsive modules and
  removed legacy emoji-led primary controls and generic dashboard treatment.

## Roll interaction refinement — 2026-08-18

- Replaced the decorative pre-roll orb with a restrained rolling-color spectrum
  tile and scan marker, removing the dead chamber styles and animations.
- Shortened the entry state for faster comprehension and made the completed
  color preview, share, image, reroll, and guest conversion controls consistent
  with the dedicated page’s visual hierarchy.
- Rebalanced the completed state so the score is visible alongside the color on
  desktop, while mobile retains a clear top-to-bottom reveal and compact score
  breakdown.
- Preserved the existing authoritative roll flow, guest-local persistence,
  rewards, scoring details, and public profile behavior.

## Compact Roll reference card — 2026-08-18

- Rebuilt the dedicated Roll surface around the supplied compact dark-plum
  reference, with a pink route treatment and explicit guest/account state.
- Replaced Drop-style language with Roll language, including `Daily Roll`,
  `RARE ROLL`-style result labels, and `Roll For Today`.
- Added a clean single-surface color tile and restrained pointer parallax on the
  complete game card, while keeping color, rarity, score, rewards, and server
  authority unchanged.
- Removed preview score data from the pre-roll card; score breakdown and total
  are now reserved for completed roll results.
- Rebuilt the completed state around the reference sequence: rolled color,
  authoritative breakdown, claimed CTA, and guest conversion prompt. The
  dedicated route no longer renders the generic rank/countdown/share/image
  action section; those controls remain on the legacy embedded Game surface.
- Removed the extra pre-roll instruction chips, capped dedicated result traits
  to two, shortened the client-only reveal pacing, and moved the next-roll clock
  into the result button.
- Unified the Roll header with the homepage/application navigation, restored
  visible signed-out account access, anchored the desktop card with a daily-color
  context column, and removed the redundant guest-mode badge.
- Made the context column state-aware: completed rolls now show the actual
  identity, rarity, score, and history day; authenticated players also see
  streak and rank/EP progression details, while guest state remains local-only.

## Grayscale site chrome — 2026-08-18

- Replaced the normal site’s purple/mint branded chrome with the requested
  grayscale token set and neutralized auth, loading, error, leaderboard, pricing,
  legal/help, and Profile Studio surfaces.
- Standardized the homepage and application routes on the same shared header,
  including Roll, Leaderboard, Pricing, claim, and account access behavior.
- Made Roll pre-roll chrome neutral and reserved actual roll color takeover for
  verified result surfaces; rarity and status colors remain semantic.

## Homepage roll entry and personal leaderboard row — 2026-08-18

- Changed the homepage’s daily action from a fake preview roll to a direct link
  into the full `/roll` experience.
- Reduced the homepage entry to a single `Roll today` button with no arrow or
  repeated supporting copy.
- Removed the preview-only score, result animation, and `YOU` placeholder state
  from the homepage.
- Authenticated visitors now see their real display name, avatar, score, rank,
  rolled color, and public profile link highlighted on the homepage daily board;
  signed-out visitors continue to see the public board without a personal row.

## Header mark replacement — 2026-08-19

- Replaced the shared header’s circular dot and `chm.lol` wordmark with the
  supplied white hand-drawn mark on a transparent, versioned PNG asset.
- Brightened homepage-style navigation and account labels to white for
  reliable contrast over the photographic hero background.
- Applied the same mark to Profile Studio while leaving public-profile-specific
  header treatment outside this change.

## Progression goal contract — 2026-08-19

- Expanded the authored progression lanes with 14-day and 100-day streak
  goals plus intermediate high-contrast, greyscale, and prime-sum discoveries.
- Made goal progress server-described and authoritative. Real counters show
  their current value; rarity and pattern goals show a clear incomplete state
  until discovered.
- Replaced the empty `0/0` journey presentation with explicit ready, partial,
  empty, and unavailable states, and shortened the visible goal copy.
- Added a compact recent-unlocks section and corrected Studio’s next-expression
  summary so unavailable data is not reported as a completed journey.

## Release audit remediation — 2026-08-19

- Fixed exact-CI lint failures and unified header navigation on canonical paths
  with one browser-history entry per action.
- Changed progression milestone expressions from universally free cosmetics to
  earned rewards, preserving a good free baseline and premium Atelier items.
- Added access-contract checks, compatibility backfill, and Studio locked-state
  handling so progression unlocks have a real acquisition effect.
- Split progression goal-view analytics from unlock presentation, validated
  account mode in the RPC, and removed retention cleanup from event recording.
- Added atmosphere catalog/largest-file performance budgets and constrained
  connection fallbacks that use poster media instead of decorative video.

## Approved cosmetic effects — 2026-08-21

- Added Kinetic Echo, Magnetic Type, Neon Particle, and Raster Signal as
  composable Name motions.
- Added Elastic Frame, Halo Offset, Wavefront, Prism Dust, and Plasma Swarm to
  the current Profile Studio/Profile renderer surfaces.
- Added Butterfly Orbit and Bat Orbit with separate back/front decoration
  canvases around the real user avatar, preserving natural DOM occlusion.
- Wired all eleven effects through the existing catalog, inventory, entitlement,
  equip, preview, publish, and public-profile contracts with an additive
  migration and no Shop route revival.
- Added lifecycle, reduced-motion, mobile, offscreen, cleanup, refresh, and
  public/Studio regression coverage; all 446 automated tests and the approved
  browser smoke pass.

## Elastic Frame mobile bounds — 2026-08-22

- Fixed the Elastic Frame's closed spline so narrow mobile previews no longer
  report horizontal overflow from Bézier control-handle overshoot.
- Preserved the existing pointer-responsive bend and added bounded-path
  regression coverage for neutral and bent states.

## Leaderboard visual hierarchy — 2026-08-23

- Replaced the tiered podium with one continuous ranked list. Top-three rank
  marks and gold/silver/bronze accents remain without changing row geometry.
- Simplified identity copy by hiding redundant handles and removing date noise.
- Enlarged roll-color swatches and paired them with readable rarity/hex labels
  across podium and list entries.
- Added one aligned floating Color, Rarity, and Score header above the list,
  keeping each row's swatch, rarity, and score visible without repeated labels.
- Polished the composition with tighter vertical pacing, softer row geometry,
  clearer type sizing, and responsive spacing adjustments.
- Equalized the three metric columns and gave their values consistent alignment.
- Centered the three metric headings and values so the balanced tracks read
  clearly at a glance.
- Kept the existing public discovery data boundary, navigation behavior, and
  responsive containment unchanged.

## Roll card hierarchy — 2026-08-23

- Made `Daily Roll` a centered, semantic card heading with a small accent rule
  and a dedicated reveal-state column for `IN PROGRESS`.
- Replaced saved-state/admin copy with `One color. Every day.`
- Removed the Roll card's 3D pointer tilt and perspective treatment.

## Roll preroll copy — 2026-08-23

- Replaced the promotional preroll copy with a factual readiness message and
  a concise explanation of the generated color, rarity, and score.
- Removed redundant daily/reveal labels from the unrevealed result panel.
- Rounded the unrevealed color tile corners for consistency with result tiles.

## Homepage daily-roll spotlight — 2026-08-25

- Replaced the hero “Today’s top rolls” panel with a “Today’s best roll” card
  centered on the winning public color, identity, score, rarity, and profile.
- Moved the full five-row top-roll board below the homepage story/showcase
  sections while keeping the live discovery request bounded and shared.
- Added responsive empty/error/loading states, a prominent reset countdown, and
  reduced-motion-safe hover/focus treatment.

## Homepage best-roll polish — 2026-08-25

- Removed repeated color, identity, and rarity metadata from the hero card.
- Simplified the profile action to `Open profile`.
- Softened the card surface so the homepage background remains visually present.

## Homepage best-roll surface alignment — 2026-08-25

- Unified the title, reset timer, color result, attribution, metrics, and
  profile action inside one aligned glass surface.
- Removed the redundant rank label and normalized the card’s internal spacing
  across desktop and mobile layouts.

## Scoring v6, Roll reveal, and homepage hierarchy — 2026-08-26

- Added generated probability-weighted scoring v6 with an authoritative catalog,
  exact probabilities, deterministic rewards, client/SQL parity artifacts, and
  additive database migrations that preserve prior scoring functions.
- Removed trivial single-character `Contains X` conditions while retaining
  meaningful repeated-digit, sequence, semantic, and combination discoveries.
- Revealed conditions from bottom to top, common first and rarest last, without
  moving the Roll page’s left-side information as the breakdown grows.
- Clarified guest account conversion before and after a roll, including the fact
  that guest results do not transfer to a newly created profile.
- Simplified the homepage to a static profile-led hero with one prominent,
  state-aware Roll CTA, quiet claim paths, no arrow carousel, and an editorial
  daily-best-roll spotlight below the hero.

## Homepage development-runtime consistency — 2026-08-26

- Prevented Vite from silently selecting a second local port when the canonical
  development endpoint is occupied.
- Made homepage browser verification use a fresh isolated server by default.
- Added regression checks against partial-HMR compositions containing duplicate
  best-roll cards, carousel arrows, or a claim form inside the hero.
- Separated visual-smoke and normal-development Vite caches so running browser
  verification cannot turn an open local page into a black shell.

## Roll-first playable homepage — 2026-08-26

- Made the real daily color roll the homepage’s first and only primary action.
- Removed the sky background, fictional profile demo, carousel glyphs, final
  claim form, and competing Roll/Claim Handle header actions from the homepage.
- Added state-aware guest signup, authenticated sharing/profile actions, concise
  play and scoring explanations, and a bounded board of real public rolls.
- Made `/` the canonical game entry while retaining `/roll` as a noindex
  compatibility route.
- Shortened and capped result reveals while preserving rarest-last order and
  instant reduced-motion behavior.

## Validation record — 2026-08-27

- Completed build, type, lint, test, link, CSP, responsive, drift, scoring
  parity, database-security, schema-lint, and local-reset validation.
- Confirmed the corrected v6 SQL function coexists with the legacy replay
  function after migration and reset.
- Confirmed the homepage browser smoke across seven desktop, tablet, and phone
  viewports.
- Kept the performance budget failure visible: only the existing
  `publicProfile`, `dashboard`, and `progression` JavaScript route budgets
  remain over their configured limits.

## Chromadie Plus hosted media — 2026-08-29

- Changed Plus to a $7.99 lifetime hosted-media offer: background video,
  animated avatar, custom cursors, profile audio/playlists, a custom share
  preview, and 1 GB of bounded storage.
- Added animated GIF/WebP uploads with static reduced-motion fallbacks and
  processed 1200×630 JPEG social previews.
- Made the existing 25-link, ten-project, and four-widget maxima free.
- Removed banner uploads and active Plus-only Atelier cosmetics while retaining
  legacy data, ownership, rendering, and share-preview fallback compatibility.
- Added checkout readiness gates so the product cannot be sold before the R2
  delivery path is enabled.

## Pricing comparison matrix — 2026-08-30

- Added a responsive Free-versus-Plus feature comparison matrix to the pricing
  page using the current hosted-media offer and free profile allowances.
- Added native expandable feature explanations, accessible status labels, and
  reduced-motion-safe interaction styling.

## Pricing page hierarchy and handle claim — 2026-08-30

- Reorganized pricing into direct Plans, Compare, and Claim sections using the
  same concise product language as the other routes.
- Removed editorial promise copy, decorative numbering, and split heading
  filler; the final section uses the existing `chm.lol/` handle claim form.

## Pricing plan-picker refinement — 2026-08-30

- Reworked the pricing hero and plan cards around a direct “Pick your plan”
  hierarchy, with concise Includes lists and no editorial marketing filler.
- Added a short factual FAQ below the feature comparison for current Plus,
  free-profile, storage, lifetime-access, and gameplay boundaries.
- Kept the comparison matrix, Stripe checkout states, responsive behavior, and
  the final homepage-style `chm.lol/` handle claim unchanged.

## Pricing card polish — 2026-08-30

- Aligned Free and Plus actions in shared card footers and removed the Free
  profile link arrow.
- Replaced the gated disabled purchase CTA with a neutral “Available soon”
  state while preserving the checkout gate and active-entitlement state.
- Clarified hosted-media copy, raised supporting-text legibility, tightened
  section spacing, and removed repeated prices from the comparison header.

## Pricing audit follow-through — 2026-08-30

- Converted the comparison to a semantic responsive table with accessible
  feature rows and explicit Free/Chromadie Plus columns.
- Made purchase terms, shared media storage, Stripe checkout, and refund
  behavior visible in the Plus card; listed every hosted-media benefit
  separately.
- Added FAQ coverage for the shared storage limit and non-transferable access,
  and provided a support link while Plus checkout is unavailable.
## Profile layout parity — 2026-08-30

- Added five distinct structural profile layouts: Default, Modern,
  Simplistic, Sleek, and Portfolio, with shared public and Studio renderer
  paths.
- Added the Sleek layout to the validated catalog/RPC contract and retained
  compatibility with existing layout values.
- Added Portfolio through an additive catalog migration and a long-form public
  hero renderer.
- Kept the daily roll as one concise static profile widget and capped visible
  profile links at six across every layout; the interactive game remains on the
  authenticated roll surface.
- Audited populated competitor profiles directly and checked each Chromadie
  renderer through Studio publication at desktop and mobile widths, including
  safe external link targets and the absence of the interactive game.

## Profile layout audit and daily-roll widget — 2026-08-30

- Added a visible/hidden daily-roll widget control to the Layout editor and
  connected it to both the live Studio preview and published public profiles.
- Preserved hidden roll-widget state across layout changes and through the
  server configuration normalizer.
- Corrected Studio roll fallback behavior, duplicate widget instrumentation,
  and no-avatar layout reflow in Sleek and Portfolio.
- Extended renderer and browser coverage for all five layouts, six links, and
  the optional public roll summary.

## Bee score condition — 2026-08-31

- Replaced the D23 hex-culture condition with the self-explanatory Bee (`BEE`, 🐝).
- Preserved its 1-in-1,025 probability, Epic reward band, and named-condition bonus.
- Added a forward-only generated database evaluator migration; historical roll data is unchanged.

## Source-backed competitor effect fidelity — 2026-09-01

- Audited populated Guns.lol and Vaults.lol profiles in a real browser and
  inspected their shipped effect code instead of inferring the visuals.
- Matched Guns Fuzzy row displacement, measured-glyph Shuffle timing, custom
  cursor trailing/fairy-dust behavior, and ten-degree avatar parallax in the
  existing bounded renderers.
- Added Chillax as a compatibility font for imported profile configurations.
- Preserved safe profile configuration, mobile behavior, visibility throttling,
  reduced-motion support, and unchanged catalog/database boundaries.

## Source-backed expression expansion — 2026-09-01

- Added six selectable cursor effects from source-inspected particle/follower
  behavior: Bubble Lift, Glyph Bloom, Joy Burst, Orbit Dot, Signal Ribbon, and
  Elastic Emoji.
- Added the bundled Kode Mono face as the Code Current Name Font choice.
- Kept the implementation finite, local, reduced-motion-aware, and free; no
  hosted vendor runtime, arbitrary catalog drawing code, or upstream cursor
  bitmap was added.
- Product-facing names are original Chromadie labels. Source/vendor names are
  retained only in the research record for traceability.
