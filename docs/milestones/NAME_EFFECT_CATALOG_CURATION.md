# Name Effect Catalog Curation

Date: 2026-08-05

## Scope

Curate the player-facing Name Motion catalog around ten high-quality authored
gestures while retaining the existing finite font/material/motion renderer
boundary, curate the approved material shelf, and retain historical profile
compatibility.

## Active motion set

- Ghost Frequency (`fuzzy-signal`)
- Scramble (`letter-shuffle`)
- Color Wake (`chromatic-ripple`)
- Dustfall (`particle-drift`)
- Type In (`typewriter-name`)
- Filament Trace (`filament-trace`)
- Prism Fracture (`prism-fracture`)
- Molten Rise (`molten-rise`)
- Voltage Arc (`voltage-arc`)
- Archive Bloom (`archive-bloom`)

## Acceptance criteria

- The active seed and remote migration expose exactly ten paid Name Motion rows.
- The active seed exposes exactly seven paid Name Material rows: Raised Glass,
  Carbon Vein, Afterglow, Soft Black, Quarry Mark, Cathode Bloom, and
  Draftline.
- Each motion resolves through the shared Canvas renderer and shared animation
  clock, with no CSS/SVG or user-supplied executable treatment.
- Deprecated motion item keys become legacy-only and remain renderable through
  finite aliases for historical equipped profiles.
- Deprecated material item keys become legacy-only and remain renderable through
  finite aliases for historical equipped profiles.
- Shop/home previews use active motion keys, and reduced-motion/static behavior
  remains covered by the existing renderer lifecycle.
- Required build, check, lint, test, link, CSP, performance, policy, balance,
  catalog, scoring, and database-security checks pass before release.
