# Profile layout parity — 2026-09-09

## Plan

1. Audit shared public, Studio and homepage layout rendering.
2. Correct Sleek identity/link alignment and reserve space for its daily color.
3. Standardize large initial avatars and remove homepage-only layout overrides.
4. Verify rendered desktop/mobile geometry, optional content and animated names.
5. Run required validation and record results.

## Compatibility

Presentation-only changes; no schema migration or saved layout ID changes.
Existing media, privacy, roll authority and profile routes remain intact.
Use the supplied Sleek screenshot for the overlapping avatar and identity
placement. Sleek centers its name on the overlapping avatar while its bio and
links share the username's left edge; location metadata sits in the upper-right.
Modern centers its identity copy vertically beside the avatar.

## Validation

All 60 layout/viewport/content cases pass; desktop/mobile screenshots reviewed.
The browser script also checks all three homepage scenes at each viewport.
All required commands pass, including 557 unit tests, Svelte with zero warnings,
scoring parity and DB security. Existing aggregate asset catalog advisories are
unchanged. No schema migration or deployment.

## Studio preview follow-up

The Studio specimen now occupies the center of the desktop preview viewport.
The redundant live-preview label, divider and device buttons were removed, and
the unused Studio device state was removed from the component wiring. Actual
profile rendering remains responsive at narrow widths.

The follow-up alignment pass centers Sleek's name on the avatar, shares the
bio and link left edge with the username, moves location metadata to the
upper-right, and tightens card spacing. Modern's complete identity copy is
vertically centered beside its avatar. The focused browser smoke passes all 60
layout/viewport/content cases after these changes.

## Modern reference follow-up

Modern now follows the supplied [guns.lol/ssagee](https://guns.lol/ssagee)
geometry: a wide card, 120px avatar, 14px avatar-to-copy gap, tight identity
stack, and a lower-left icon rail. Chromadie's daily color stays in a separate
centered row. The layout editor thumbnail uses the same horizontal identity
composition.

## Portfolio pages and audio follow-up

Portfolio now follows the multi-page profile behavior at [guns.lol/tom](https://guns.lol/tom):
the hero, visible About, Media, and Story regions occupy their own full
viewport sections, use scroll-snap, and expose fixed pagination dots. The page
list is derived from the same render-model visibility flags as the sections,
so empty pages cannot be selected. Public and preview rendering share this
composition.

Profile audio now uses one responsive control surface in floating and inline
placements. It includes progress and trim-aware seeking, track transport,
shuffle, mute, volume, and timing, with no emoji-only controls. The existing
structured media and autoplay-entry boundaries remain unchanged.

Focused unit tests, Svelte check, ESLint, diff checks, and the Portfolio page
browser smoke pass. The full suite was intentionally deferred while this
iteration remains in progress.
