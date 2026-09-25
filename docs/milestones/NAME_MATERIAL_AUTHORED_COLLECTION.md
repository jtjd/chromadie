# Authored name material collection

## September 24 design restart

The first eighteen replacements were rejected in visual review. Their technical
checks did not establish acceptable design quality. All eighteen renderers are
being replaced by the primary agent, without Luna design delegation. Soft Halo
and Cathode Bloom remain the two preserved finishes.

The revised direction is bright, legible, simple, and pretty: restrained bloom,
delicate sparkle, softly moving color, and clean highlights. Avoid brown or muted
faces, busy surface patterns, mirror bands, scanning lines, and ornamental noise.
Distinctness must come from the rendered structure and animation, not names or
palette changes alone. Compare all eighteen together at profile and compact sizes.

Research: [Discord Display Name Styles](https://support.discord.com/hc/en-us/articles/33833879643927-Discord-Display-Name-Styles-FAQ)
documents Neon, Gummy, Prism, and gradients as real profile treatments, alongside
light/dark previews and accessibility controls. It supports relevance, not a
claim about sales or popularity rankings. [Roman Motsak's LUMINA](https://www.behance.net/gallery/239099941/LUMINA-Holographic-3D-Mesh-Typeface)
demonstrates saturated chromatic light and controlled highlights; its mirrored
metal treatment is deliberately excluded after the user's direction correction.

The completed `luminousMaterials.js` replaces all eighteen drafts. The primary
agent reviewed the final collection and phase strips at profile and compact sizes.
See `docs/NAME_MATERIAL_DESIGN_REVIEW.md` for design distinctions and research.

## Scope and plan

Keep Soft Halo and Cathode Bloom's approved appearance. Rebuild the other six
materials and add twelve distinct finishes, for twenty effects plus Plain.
Materials should read as surfaces with deliberately composed depth, texture,
reflection, and color. Each new/rebuilt finish has its own continuous animation;
this must work with Still and independently of selected motion timing.

1. Audit renderer, surface caching, catalog authority, and real browser output.
2. Build distinct optical and textured finishes with a bounded material phase.
3. Integrate cached isolated surfaces and the existing shared animation clock.
4. Add the twelve catalog rows through an additive allowlist migration; keep
   existing ownership, access, and prices. New rows follow the free expansion
   policy used by the motion collection.
5. Review all finishes at profile/compact sizes, across fonts and motions,
   dark/light backgrounds, reduced motion, and cycle boundaries.
6. Run required validation and document the evidence.

## Acceptance

- Twenty non-Plain materials are selectable through the authoritative catalog.
- Soft Halo and Cathode Bloom retain their approved still rendering.
- Eighteen rebuilt/new finishes have distinct surface structure and animation.
- Text remains readable; animation never changes glyph geometry or layout.
- Still motion permits material animation; reduced motion freezes a designed
  material frame. Motion and material cycles remain independent.
- Masks cannot recolor motion decorations; caches are bounded and fresh after
  material, text, font, color, size, or animation-frame changes.
- No new timers, private data, arbitrary shaders/CSS, or client entitlement logic.
- Catalog, seed, SQL allowlist, UI projections, tests, and metadata agree.
- Desktop/mobile visual review and all required checks pass, including local
  database reset and schema lint for the catalog constraint migration.


## Completion evidence — 2026-09-24

- 20 effects plus Plain; 18 animated replacements; both approved materials retain
  their original rendering branches.
- All mandatory commands passed: `npm run build`, `npm run check`,
  `npx eslint src/`, `npm test` (846), `npm run check:links`, `npm run check:csp`,
  `npm run check:performance`, `npm run check:username-policy-drift`,
  `npm run check:balance-drift`, `npm run check:catalog-drift`,
  `npm run check:scoring-parity`, `npm run check:db-security`, `npm run db:reset`,
  and `supabase db lint --local --level warning --fail-on warning`.
- Existing hard performance budgets pass without increasing limits. Existing
  advisory aggregate JS/CSS catalog targets remain exceeded.
- 54,432 browser frames cover 18 font registrations (including default), 21
  materials, 36 motions, and edit/resize/pointer/reduced-motion transitions.
- 12,068 collection-motion frames pass with zero measured name-coverage loss.
- 1,700 material frames pass, including mounted Still animation, deterministic
  replay, reduced motion, short/long/accented names, and near-wrap continuity.
- Final artifacts: `docs/evidence/name-materials-2026-09-24.png` and `.json`.
  Full phase strips: `/tmp/chromadie-luminous-delivery/`; full matrix:
  `/tmp/chromadie-luminous-matrix-verified/`; collection motions:
  `/tmp/chromadie-luminous-motion-stable/`.
- No remote database migration or deployment was performed.
