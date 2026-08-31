# Chromadie Name Renderer v5

## Decision

Use one Canvas 2D renderer for every Name surface:

- shop item cards
- product detail
- Studio
- public profile
- leaderboard and rivals at compact sizes

Each renderer receives the same structured inputs:

- text
- font definition
- material definition
- motion definition
- size
- compact/full context
- normalized animation progress
- reduced-motion or paused state

A single global `requestAnimationFrame` clock drives every visible renderer. `IntersectionObserver` prevents off-screen previews from redrawing.

## Rendering order

1. Resolve font and fit text within the available width.
2. Draw the selected material.
3. Apply the selected motion as additional canvas draw operations.
4. Draw accessibility text outside the canvas or expose an appropriate `aria-label`.

Velvet Sweep and Refraction Sweep redraw the real glyphs inside moving clipped bands. Ghost Offset draws chromatic copies behind the base name. Fuzzy Signal redraws bounded horizontal slices with deterministic displacement.

## Why this replaces the previous approach

The earlier prototypes mixed:

- CSS keyframes
- pseudo-elements
- duplicated text nodes
- JavaScript runtimes
- separate card and live-preview behavior

That made effects fragile and allowed the two preview contexts to drift.

The canvas renderer has one implementation for every context. An effect cannot work in the live preview but use different logic in its shop card.

## Lifecycle and performance

- Keep active renderers in a `Set`.
- Destroy and unregister card renderers when the catalog grid changes.
- Keep exactly one renderer per visible card plus one live renderer.
- Clamp device-pixel ratio to a reasonable maximum.
- Pause off-screen renderers.
- Freeze effects at an intentional still frame for reduced motion.
- Use one shared clock rather than one animation loop per card.

## Production file structure

- `NameEffectCanvas.svelte`
- `nameRenderer.js`
- `nameEffectCatalog.js`
- `nameFonts.js`
- `nameMaterials.js`
- `nameMotions.js`

Do not duplicate rendering logic in profile, shop, Studio, leaderboard, or rivals. Each surface should pass context and dimensions to the same component.

## Current prototype validation

The v5 prototype deterministically compares two frames of every motion in both the item card and live preview.

- All 13 motion states pass.
- Ghost Offset changes and remains visible in both contexts.
- Fuzzy Signal changes and remains visible in both contexts.
- Velvet Sweep and Refraction Sweep change visibly in both contexts.
- Repeated tab changes do not leak renderer instances.
- No browser errors or tested responsive overflow.
