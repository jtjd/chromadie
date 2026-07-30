# Phase 11 — Continuous Profile Composition and Minimalism

Status: complete on the current branch; implementation and visual gate are
complete. The remaining release/deployment blockers are outside this scope.

## Product intent

Chromadie should feel like a personal website that happens to have a daily
color ritual. The first impression must be authored, calm, sparse, and
memorable. It must not look like an AI-generated game dashboard.

## Design laws

- The page is one composition, not a grid of equal modules.
- Identity and the roll are one central visual moment.
- Links, color expression, and story continue the composition through
  typography, whitespace, alignment, and atmosphere.
- Cards and borders are reserved for meaningful interaction or owner detail;
  they are not the default treatment for every data group.
- A visitor should not need to understand module names, product subsystems, or
  configuration concepts to appreciate the page.
- The initial viewport should communicate a person and a mood before it
  communicates statistics or game mechanics.

## Workflow

1. Re-audit the Phase 10 screenshots and mark every remaining card, border,
   eyebrow, repeated heading, dashboard label, and equal-weight region.
2. Produce a small visual contract for desktop and mobile before changing
   components. The contract must show one continuous canvas, the central
   identity/roll moment, the quiet link expression, and the below-fold story.
3. Refactor the existing profile presentation behind stable data and authority
   seams. Do not add profile tables, new gameplay logic, new social systems, or
   a second profile renderer.
4. Keep owner editing, configuration, account management, moderation, social
   actions, entitlements, and legacy controls outside the visitor composition.
5. Capture the same stable real-data before/after screenshots at 1440×900,
   1280×720, and 390×844. Review the images as design evidence, not only as
   test artifacts.
6. Run the complete validation suite and stop when the minimalism gate is met.

## Acceptance gate

- The first viewport has one dominant composition rather than a hero plus
  equal-card dashboard.
- The roll is visually integrated with identity and has one clear primary
  action when the visitor is the owner.
- No repeated module chrome is needed to explain the page.
- Links and story are discoverable without competing with identity and roll.
- Desktop and mobile screenshots are visually calm, sparse, and intentional;
  the result remains recognizable without labels such as “featured,” “long
  game,” or “profile connections.”
- Secondary features remain reachable through deliberate detail/owner paths.
- Real mapped data, public privacy, authentication, server-authoritative roll
  behavior, RLS, scoring, rewards, economy, entitlements, history, cosmetics,
  social/moderation boundaries, routes, and deployment behavior remain intact.
- The screenshot review does not require explaining why the page is a set of
  modules. If it does, the gate fails.

## Explicit non-goals

No avatar/media integration, Spotify, new social feature, notification,
messaging, monetization, discovery expansion, unrestricted customization,
schema redesign, SvelteKit migration, or unrelated cleanup.
