# Name Effect Catalog Curation

Date: 2026-08-05

## Scope

Rebase the player-facing Name Motion catalog around ten recognizable Haunt
reference behaviors while retaining the existing finite font/material/motion
renderer boundary, the approved material shelf, and historical profile
compatibility. The visual implementations remain original Chromadie Canvas
code; no competitor code or assets are copied.

## Active motion set

- Glow (`haunt-glow`)
- Scramble (`letter-shuffle`)
- Type In (`typewriter-name`)
- Particles (`haunt-particles`)
- Rainbow (`haunt-rainbow`)
- Gradient (`haunt-gradient`)
- Fuzzy (`haunt-fuzzy`)
- Reveal (`haunt-reveal`)
- Split Reveal (`haunt-split`)
- Flash (`haunt-flash`)

The reference vocabulary is grounded in Haunt’s public profile payload and
changelog, which expose username glow, typewriter, particle, rainbow,
gradient, and fuzzy effects plus reveal/split/flash profile-entry behaviors:
https://help.haunt.gg/api/lookup/user and
https://help.haunt.gg/overview/changelog.

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
