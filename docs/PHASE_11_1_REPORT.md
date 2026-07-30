# Phase 11.1 Report — Approved Mockup Fidelity Correction

Date: 2026-07-26  
Branch: `redesign/profile-first-reconciliation`  
Scope: visual fidelity correction only; no Phase 12 work started

## Outcome

The live Svelte profile now has the visual weight and viewport distribution
required by the approved mockup while continuing to render real mapped
production profile and roll data. The atmosphere fills the viewport, the
identity surface sits in the upper-middle, essential text is readable, the
canonical color visibly shapes the environment, and the optional expression
surface is a separate lower anchor when a real or explicit visual fixture is
available.

The default production profile does not render an unconfigured music bar. It
does not show `Music off`, raw hexadecimal expression copy, or the generic
`A daily color identity.` placeholder. A missing public bio uses a truthful
mapped color-history count or a designed first-chapter state.

## Old visual hierarchy

The measured before state was:

1. Minimal header followed by a compact card cluster.
2. Identity card at x=736, y=117.33, width 448px, with a 58.4px name and
   11.2px handle.
3. Expression bar directly below the card at y=735.36 with a 284.81px bottom
   offset.
4. Atmosphere beginning below the header at y=71.97 and extending beyond the
   visible viewport.
5. Generic absence copy and repeated dashboard-style visual language.

The result met earlier structural bounds but read as a miniature settings card
on an unused application canvas.

## New visual hierarchy

1. Full-viewport restrained dark atmosphere, driven by the canonical daily
   color and signature fallback.
2. Minimal `chm.lol` profile-mode header with only context-appropriate
   Discover, Share, and owner Edit controls.
3. One upper-middle identity surface: avatar/monogram, name, handle, earned
   status, truthful identity line, canonical today/latest color, and one
   compact archive trace.
4. Owner pre-roll/completed-roll behavior remains integrated inside the same
   identity surface.
5. An optional expression surface is independent and close to the lower
   viewport edge; it is omitted when production music/expression data is not
   configured.
6. Statistics, history, achievements, social, moderation, configuration,
   account, entitlements, shop, and compatibility surfaces remain below in
   deliberate detail/owner disclosures.

## Visible features removed or demoted

- Removed the visible unfinished `Music off` state by omitting the optional
  surface when no production music configuration exists.
- Removed raw hex-as-expression presentation from the default composition.
- Replaced `A daily color identity.` with a mapped history-derived line or a
  first-chapter state; no public bio field was invented.
- Kept one `Color archive` treatment with real available samples/counts and no
  large collection grid in the primary visual hierarchy.
- Demoted rank, currency, tier, points, detailed roll statistics, timeline
  entries, achievement grids, collection grids, social controls, owner tools,
  configuration, moderation, entitlements, shop, and account controls to
  existing detail/owner surfaces.
- Kept the lower expression placement available as a development-only visual
  fixture so its approved layout can be reviewed without claiming playback.
- Preserved all underlying data and compatibility paths; no feature or table
  was deleted.

## Exact implementation changes

### Composition and spacing

- `ProfileShell.svelte` now uses a height-aware approved canvas with
  `grid-template-rows: minmax(0, 1fr) auto`; the expression row is independent
  rather than attached to the identity card.
- Short desktop heights compress into a safe flowing layout. Mobile uses an
  intentional vertical composition with 24px side padding, identity first,
  roll immediately after it, and no fixed-height clipping.
- The optional expression row is rendered only when
  `PROFILE_MUSIC_ENABLED` is true or an explicit localhost development fixture
  is requested.

### Scale and atmosphere

- `ProfileAtmosphere.svelte` is fixed to `100vw × 100dvh` and now combines a
  broad central bloom, secondary lower spill, corner illumination, vignette,
  grain, and restrained breathing motion.
- The identity card uses authored glass treatment with stronger contrast and
  lower visual noise.
- The final computed styles are 42px name text, 14px body text, and 12px
  essential handle/metadata text. Decorative eyebrow labels remain below that
  only where nonessential.
- Today’s color uses a larger orb and readable result/next-roll hierarchy.
- The archive uses real available samples, a compact count, and an intentional
  dormant state instead of a generic progress widget.

### Optional expression

- `ProfileMusic.svelte` renders nothing in the default production composition
  while `PROFILE_MUSIC_ENABLED` remains false.
- The explicit local fixture is a no-playback `Color trace / Daily atmosphere`
  lower anchor with a `preview` status. It has no fake track, play control,
  random result, provider claim, or production data.

### Evidence tooling

- `scripts/audit-phase-11-1.mjs` records bounding boxes, computed styles,
  atmosphere bounds, overflow, document height, device scale, browser/page
  scale, and screenshots.
- `scripts/capture-phase-10-2.mjs` now explicitly forces device scale 1 and
  page scale 1 for repeatable Phase 11.1 captures.
- The before audit was written before production component changes and is in
  [`PHASE_11_1_VISUAL_AUDIT.md`](PHASE_11_1_VISUAL_AUDIT.md).

## Visual audit measurements

The required pre-change side-by-side table is preserved in
[`PHASE_11_1_VISUAL_AUDIT.md`](PHASE_11_1_VISUAL_AUDIT.md). Its 1920×1080
measurements were taken with `getBoundingClientRect()` and
`getComputedStyle()`:

| Property | Approved reference | Current-before production | Corrected production / target |
|---|---:|---:|---:|
| Card width | 448px | 448px | 448px / 440–480px |
| Card top position | 252.38px | 117.33px | 281.56px / upper-middle 220–285px |
| Card center position | x=960px | x=960px | x=960px / x=952–968px |
| Music bar width | 672px | 672px | 672px in explicit fixture / 640–704px |
| Music bar bottom offset | 24px | 284.81px | 20px in explicit fixture / 20–40px |
| Primary name size | 30px / 36px | 58.4px / 54.9px | 42px / 41.16px; target 30–42px |
| Body text size | 14px / 22.75px | 13.92px / 21.58px | 14px / 22.4px; target ≥14px |
| Smallest essential text | 11px decorative eyebrow | 11.2px handle | 12px handle / target ≥12px |
| Atmosphere visible bounds | 0,0,1920×1080 | y=71.97; 1920×1171.19 | 0,0,1920×1080 |
| Primary composition bottom | 1056px with expression | 795.19px | 850.36px default; 1060px fixture |

The post-change computed-style source is
[`artifacts/phase-11-1/final-audit/metrics.json`](../artifacts/phase-11-1/final-audit/metrics.json).
All recorded sessions show `devicePixelRatio: 1`,
`visualViewportScale: 1`, `documentZoom: 1`, and `bodyZoom: 1`.

## Exact viewport results

These are CSS-pixel bounds from the repeatable production capture metrics.
`identity`, `roll`, and `featured` are the named primary regions. The default
visitor state intentionally has no expression row because music is not
configured.

| State / viewport | Identity | Roll | Featured | Expression | Primary bottom | Scroll height | Horizontal overflow |
|---|---:|---:|---:|---:|---:|---:|---|
| Visitor 1920×1080 | 282–850 | 623–720 | 758–817 | — | 817 | 1303 | No |
| Visitor 1440×900 | 192–760 | 533–630 | 668–727 | — | 727 | 1123 | No |
| Visitor 1280×720 | 92–596 | 387–484 | 512–571 | — | 571 | 835 | No |
| Visitor 390×844 | 148–682 | 452–560 | 598–657 | — | 657 | 1142 | No |
| Owner 1920×1080 | 241–891 | 583–761 | 798–858 | — | 858 | 1370 | No |
| Owner 1440×900 | 151–801 | 493–671 | 708–768 | — | 768 | 1190 | No |
| Pre-roll 1920×1080 | 288–844 | 630–714 | 752–811 | — | 811 | 1370 | No |
| Expression fixture 1920×1080 | 247–815 | 588–685 | 723–782 | 990–1060 | 1060 | 1303 | No |
| Expression fixture 1440×900 | 157–725 | 498–595 | 633–692 | 810–880 | 880 | 1123 | No |
| Expression fixture 1280×720 | 92–596 | 387–484 | 512–571 | 620–690 | 690 | 929 | No |
| Expression fixture 390×844 | 148–682 | 452–560 | 598–657 | 750–819 | 819 | 1142 | No |
| Reduced motion 1920×1080 | 282–850 | 623–720 | 758–817 | — | 817 | 1303 | No |

At 1440×900 the default primary composition ends at y=727 and the explicit
expression fixture ends at y=880, both without vertical scrolling. At
1280×720 identity, roll, and the archive expression remain visible through
y=571; the explicit lower fixture ends at y=690. At 390×844 identity appears
first, roll follows, and the page has no horizontal overflow; mobile scroll
height is allowed for the full page and detail surfaces.

## Screenshot evidence

The side-by-side comparison is
[`artifacts/phase-11-1/COMPARISON.md`](../artifacts/phase-11-1/COMPARISON.md).
The evidence includes:

- approved reference and current-before production at 1920×1080 and 1440×900;
- corrected real-data visitor, owner completed-roll, owner pre-roll, and
  reduced-motion states at 1920×1080, 1440×900, 1280×720, and 390×844;
- explicit expression fixture at all four viewports;
- missing optional-expression state at 1920×1080 and 1440×900.

Canonical artifact directories:

- [`baseline/`](../artifacts/phase-11-1/baseline/)
- [`corrected-visitor-final/`](../artifacts/phase-11-1/corrected-visitor-final/)
- [`corrected-owner-final/`](../artifacts/phase-11-1/corrected-owner-final/)
- [`corrected-pre-roll-final/`](../artifacts/phase-11-1/corrected-pre-roll-final/)
- [`corrected-expression-fixture-final/`](../artifacts/phase-11-1/corrected-expression-fixture-final/)
- [`corrected-reduced-motion/`](../artifacts/phase-11-1/corrected-reduced-motion/)
- [`missing-optional-expression/`](../artifacts/phase-11-1/missing-optional-expression/)

The screenshots were visually inspected for composition, readable scale,
atmosphere, separate expression anchoring, pre-roll completeness, owner
controls, reduced motion, missing optional content, and mobile overflow. The
engineering visual review found the required gates satisfied. Final owner
approval remains an explicit handoff before Phase 12.

## Behavior explicitly preserved

- Supabase authentication, session ownership, route parsing, direct refresh,
  public/private behavior, old share links, and `legacy=1` compatibility.
- Public profile projection and owner profile RPC separation; no private
  account fields were added to `PUBLIC_PROFILE_SELECT`.
- Secure daily roll RPC authority, eligibility, anti-reroll lock, scoring
  parity, rarity, conditions, rewards, economy, history, cosmetics, and
  canonical result settlement.
- Owner versus visitor roll mounting; visitors remain read-only and the
  explicit fixture cannot settle or reroll a production result.
- Profile configuration draft/publish validation, social projections and
  moderation boundaries, shop ownership, entitlements, and deployment behavior.
- Reduced-motion handling and the existing detail/owner surfaces.

## Compatibility decisions and migration risk

No database migration, schema change, RLS change, RPC change, media change,
music-provider change, route change, or production write was made. Existing
stored configuration and secondary modules remain valid because this is a
rendering projection change. The optional expression bar is hidden behind the
existing `PROFILE_MUSIC_ENABLED` boundary; a future provider can be attached
without changing the current public profile contract.

The only migration risk is visual: profiles with a non-empty published link
configuration, different canonical colors, cosmetics, owner roll state, or
long usernames may produce different card heights and atmosphere hues. The
responsive rules remain bounded and no data is discarded. The local visual
fixture is restricted to development on `127.0.0.1` and is not an account or
production-data fallback.

## Known compromises

- The current public schema still has no public bio or avatar field. The
  profile uses a monogram/logo-mark fallback and a mapped history sentence;
  richer identity content remains a future data-contract decision.
- The current production music flag is disabled. The lower expression anchor
  is evidenced only by an explicit visual fixture; no Spotify or playback
  capability is claimed.
- The Anzul evidence has no published social links, so the default visitor
  screenshot shows the designed absence rather than invented links.
- Collection data remains the existing public story projection (`0/66` in the
  captured account); the compact archive trace is retained without restoring a
  grid.
- This evidence is Chromium-only. The pre-existing linked Supabase
  migration/catalog drift and clean Firefox/device certification remain
  release concerns outside this visual milestone.
- Detail disclosures retain some panel/card treatment because removing those
  would change access and compatibility rather than improve the public first
  impression.

## Exact validation results

| Command | Result | Exact result |
|---|---|---|
| `npm run build` | PASS | Vite 8.1.3; 272 modules transformed; JS 594.36 kB; CSS 273.42 kB; HTML 5.72 kB; existing post-minification >500 kB chunk warning remains |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 97 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:performance` | PASS | JavaScript 580.43 kB/650.00 kB; CSS 267.01 kB/300.00 kB; HTML shell 5.59 kB/12.00 kB |
| `npm run check:balance-drift` | PASS | 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS locally | Snapshot and seed match (82 items); remote comparison was not run because `SUPABASE_URL` and `SUPABASE_ANON_KEY` were not set |
| `npm run check:scoring-parity` | PASS | 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS | Database security and integrity checks passed; audit transaction rolled back |
| `bash scripts/repo-hygiene-check.sh` | PASS | Required phase documents exist and no forbidden tracked paths were found |

No schema-specific `supabase db lint --local` or `npm run db:reset` was
required: Phase 11.1 made no schema change. The known linked-project drift is
not represented as a local validation failure and was not altered.

## Acceptance gate assessment

The screenshot-backed implementation meets the measurable Phase 11.1 visual
contract. The engineering visual review is recorded below; owner/human signoff
is intentionally still open and Phase 12 remains held.

- [x] The profile is no longer miniature at browser zoom 100%.
- [x] The viewport is composed by atmosphere, identity, color, archive, and
  optional lower expression rather than a dashboard grid.
- [x] Identity has clear visual prominence and remains centered.
- [x] The canonical color visibly influences the atmosphere and color surfaces.
- [x] The optional lower expression surface is separate and bottom-anchored.
- [x] Essential body and supporting text meet the readable scale contract.
- [x] Missing profile content is intentional; no `Music off` or fabricated
  social/media/result content appears.
- [x] Pre-roll and completed-roll captures are finished compositions.
- [x] Mobile has no horizontal overflow or fixed-height clipping.
- [x] No game-dashboard framing returned to the default profile.
- [ ] Owner/human screenshot approval has been recorded; this remains the
  required handoff gate before Phase 12.

## Remaining Phase 11 boundary

Phase 11.1 stops here. Phase 12 has not started and must not begin without
explicit approval after owner/human review of
[`artifacts/phase-11-1/COMPARISON.md`](../artifacts/phase-11-1/COMPARISON.md).
Richer identity data, avatar/media infrastructure, Spotify/music integration,
new social features, notifications, private messaging, monetization,
discovery expansion, schema changes, SvelteKit, and unrelated cleanup remain
outside this milestone.

## Recommendation for Phase 12

**REJECT / HOLD Phase 12 at this handoff pending explicit visual approval.**
The implementation and validation evidence are ready, but the next phase must
remain closed until the owner accepts the approved-reference comparison and
the remaining linked-environment release blockers are separately reconciled.
