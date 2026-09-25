# Shared dynamic-color text contrast — 2026-09-22

## Objective

Move the identical dynamic-color text-ink calculation from `Game.svelte` and
`ProgressionPage.svelte` into one tested color-contrast helper.

## Audit

Both components normalize a six-digit hex color, convert its sRGB channels to
linear values, compute relative luminance, and choose the same dark or white
text at the `0.179` threshold. The fallback and output hex strings differ only
in letter casing, which CSS treats identically. Roll action labels and
Progression accent text both consume this projection.

## Plan

1. Add direct tests for black, white, colors on either side of the existing
   luminance threshold, and invalid-color fallback.
2. Add `colorContrast.js` and update both components to use the same exported
   helper without changing their CSS values.
3. Update the Roll source contract and cover both component call sites.
4. Run the mandatory validation suite and record the results in the project
   logs.

## Compatibility and risk

No database, route, RPC, or scoring change is expected. Preserve the existing
sRGB conversion, `0.179` threshold, white fallback, and resulting dark/white
ink values. The helper is visual presentation only and does not define profile
color, scoring, or gameplay behavior.

## Acceptance

- Both components import and use one tested contrast helper.
- Threshold and invalid-color outputs match current rendering.
- No visible, route, schema, or gameplay change; full mandatory checks pass.

## Implementation and validation — 2026-09-22

Added `src/lib/colorContrast.js` and routed the Roll action ink and Progression
accent ink through it. The helper retains `normalizeHexColor`'s six-digit hex
validation, white fallback, sRGB linearization, and the `0.179` threshold. It
returns the same CSS colors; their hex letter casing is normalized.

Direct tests cover black, white, both sides of the existing threshold, invalid
input, and both component call sites. Full validation passes (657 tests),
including build, Svelte check, ESLint, links, CSP, performance, username policy,
balance, local catalog, scoring parity, and database security. Homepage and
Progression route budgets pass at 487.87/501 kB and 362.15/400 kB. The catalog
check used the local seed because remote Supabase credentials were unavailable.
No migration or gameplay behavior changed.
