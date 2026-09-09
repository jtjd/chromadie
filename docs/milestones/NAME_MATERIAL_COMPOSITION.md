# Name materials and composition — 2026-09-08

## Plan

1. Capture the current material/Still/Fuzzy combinations in the shared renderer.
2. Keep Soft Halo's appearance; rebuild the other seven materials as distinct,
   vivid glass, carbon, neon, satin, carved mineral, phosphor and blueprint finishes.
3. Make motion consume the selected material, fixing Fuzzy, Scramble, Magnetic
   Type, Neon Particle, Raster Signal and color-motion overrides. Correct shared
   opacity, isolation, duplicate paint and proportional glyph layout bugs.
4. Verify all active fonts, materials and motions in a browser matrix, including
   compact, long names, font/size/material changes and static/reduced motion.
5. Run the required suite and update decisions, progress and changelog.

## Compatibility and acceptance

No schema migration or catalog/ownership change. Keep all current IDs and
legacy aliases. Soft Halo remains the visual benchmark. Materials must stay
recognizable with motions, and glyph silhouettes must remain legible in the
active font at desktop and compact sizes. Color motions may animate the
palette but must preserve the finish. Offscreen buffers must be bounded,
reused and invalidated on material, color, font readiness, size and text changes.
Reduced motion shows a complete readable material without displacement.
No changes to gameplay, public privacy or account authority.

## Validation

Complete locally: 557 tests, all mandatory commands, and 7,488 browser frame
cases pass. Screenshots and the matrix summary are in
`/tmp/chromadie-name-materials/`. Additional browser checks cover material
edit/restore, long-name resize, pointer displacement and actual mounted
components in mobile reduced-motion mode. No schema migration or deployment.
