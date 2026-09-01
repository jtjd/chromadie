# Competitor effect research — 2026-09-01

This record documents the source-backed profile-effect audit behind the current
Chromadie expression work. The audit used populated public profiles in a real
browser, then fetched the shipped HTML, CSS, inline profile configuration, and
referenced JavaScript where the browser exposed it. The implementation ports
the observed behavior into Chromadie's finite, code-owned renderers; it does
not copy a competitor bundle, hosted effect library, or embedded cursor bitmap.

## Profiles and states inspected

| Site | Profile | Relevant observed state |
| --- | --- | --- |
| Guns.lol | [1234](https://guns.lol/1234) | Satoshi name, rain background, custom cursor, centered banner card, blur/opacity surface treatment, animated page title. |
| Guns.lol | [drixs](https://guns.lol/drixs) | Velocity name, username typewriter, rain, ghost cursor, video background, avatar, and parallax. |
| Guns.lol | [.jamal.](https://guns.lol/.jamal.) | Kode Mono custom font, pop entry, typewriter text, custom cursor/avatar, and parallax. |
| Guns.lol | [$](https://guns.lol/$) | Chillax font, night background, particles cursor, pop entry, parallax, and typewriter text. |
| Guns.lol | [veso](https://guns.lol/veso) | Apple Garamond custom font, username glow, rain, custom cursor/avatar/background/audio, unfold entry, and portfolio layout. |
| Vaults.lol | [vault](https://vaults.lol/vault) | A live profile route with the shipped profile bundle and CSS inspected for font, typewriter, layout, background, and cursor configuration. |

Haunt was also checked through its current [asset customization
documentation](https://help.haunt.gg/customization/assets), [section-builder
documentation](https://help.haunt.gg/customization/section-builder), and
[changelog](https://help.haunt.gg/overview/changelog). Its public route was
behind a challenge during this audit, so no Haunt implementation is described
as source-inspected here.

## Shipped implementations inspected

The Guns page bundle dispatches these effects to concrete implementations:

- `Fuzzy` waits for `document.fonts.ready`, measures actual glyph bounds into
  an offscreen canvas, and on every animation frame copies one source row to a
  destination row with `floor(0.15 * (random - 0.5) * 30)` horizontal jitter.
- `Shuffle` splits the name into measured glyph wrappers. Each wrapper moves
  right from `-2 * wrapperWidth` to `0` over `350ms` with `power3.out` easing,
  `30ms` stagger, odd/even overlapping tracks, and a `0.7` overlap start for
  the even pass.
- `trailingCursor` creates `15` nodes and advances each following node at
  `0.6` of the remaining distance. Its image path is the profile's validated
  custom cursor.
- `fairyDustCursor` creates particles with a `60–90` frame lifespan, signed
  horizontal velocity, upward velocity in the observed `.7 * random + .9`
  range, and `.02` gravity.
- `3d-parallax` uses a `1000px` perspective, `700ms` transform transition, and
  a ten-degree pointer-driven X/Y envelope.
- The background `rain` path dynamically loads the site's
  [`guns_storm.js`](https://assets.guns.lol/guns_storm.js) implementation with
  the observed snow color, `80` active flakes, twinkle enabled, and automatic
  start. Chromadie keeps its existing bounded atmosphere layer instead of
  loading that third-party script into public profiles.

The cursor dispatch and particle behavior were read from the public
[`cursor-effects.js`](https://assets.guns.lol/cursor-effects.js) asset. The
official [Guns customization guide](https://help.guns.lol/getting-started/customization)
and [cursor/profile-effects guide](https://help.guns.lol/premium-guides/cursor-profile-effects)
were used as feature cross-checks, not as substitutes for the bundle audit.
Vaults' shipped profile bundle was similarly inspected for its `Chillax` font
face and profile effect vocabulary; its public [Supporter feature page](https://vaults.lol/wiki/what-is-supporter)
was used to confirm the supported customization surface.

## Chromadie mapping

- `src/lib/competitor-effects/gunsEffectAlgorithms.js` contains the measured
  Fuzzy and Shuffle math and timing constants.
- `src/lib/name/render/composableMotions.js` uses those helpers for
  `haunt-fuzzy` and `letter-shuffle`, including actual glyph-bound buffers and
  reduced-motion/static fallbacks.
- `src/lib/competitor-effects/gunsCursorAlgorithms.js` contains the trailing
  node and fairy-dust state transitions. `ghost-tail` and `solar-sparks` use
  them through the existing bounded cursor canvas.
- The same bounded canvas now carries six additional source-inspected cursor
  controllers: `bubble-wake`, `character-bloom`, `emoji-bloom`,
  `following-dot`, `text-flag`, and `springy-emoji`. Their lifespans, glyph
  sprites, follower lag, flag gap/wave, and spring constraints are ported from
  the inspected cursor source and kept behind fixed renderer keys.
- `src/lib/competitor-effects/gunsParallax.js` contains the pointer envelope;
  `AvatarEffect.svelte` applies it only to the existing `3d-parallax` effect.
- `Chillax` is registered as a compatibility font for imported/historical
  configurations. It is not a new catalog entitlement or database row in this
  slice, so catalog counts and purchase boundaries remain unchanged.
- The inspected `Kode Mono` face is bundled as a new finite Name Font choice.
  Its product label is the original Chromadie name `Code Current`; the six
  cursor choices are labeled `Bubble Lift`, `Glyph Bloom`, `Joy Burst`,
  `Orbit Dot`, `Signal Ribbon`, and `Elastic Emoji`. Source/vendor names are
  provenance only and are not used as product labels.
- The existing validated custom cursor URL is passed through to the trailing
  renderer. If a browser cannot decode a `.cur`, Chromadie uses a small
  code-owned fallback while retaining the inspected node motion.

All effects remain inside Chromadie's existing visibility, canvas, reduced-
motion, mobile, and safe-configuration boundaries. The live research is
intended to keep the visual behavior concrete and reproducible—not to grant
profile data the ability to execute arbitrary competitor code.
