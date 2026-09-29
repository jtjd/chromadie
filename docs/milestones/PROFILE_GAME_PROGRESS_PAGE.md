# Profile Game Progress Page

**Date:** 2026-09-28
**Status:** Complete

## Goal

Replace the user-authored “More” profile continuation with an optional full-page
game progress view. Keep the existing profile card as page one and let profile
owners enable page two from Customize → Layout.

## Implementation

- Remove the public About/projects/widgets renderers and their Studio editors.
- Remove Spotify and third-party provider players from profile rendering and
  remove their iframe origins from the public Content Security Policy.
- Add a branded progress page with lifetime rolls, current and longest streak,
  rank progress, personal best, and up to six recent colors.
- Add full-page scrolling, wheel stepping, page indicators, a return control,
  keyboard page navigation, responsive layout, and reduced-motion handling.
- Use centered arrow-only page controls with a dual-tone edge and shadow that
  stays visible over owner-selected backgrounds.
- Preserve legacy About, project, provider, and Spotify values in their stored
  configuration so this UI change does not erase existing data.

## Data, privacy, and compatibility

No database migration is required. The existing `modules.explore.visible` bit
stores the opt-in by using `false` for the progress page, with the existing
`storyVisible` field retained as a compatibility mirror. Roll totals, streaks,
rank, and best-roll details come from the public profile projection. Recent
colors use only scores already returned by the profile loader, which applies
the existing activity privacy setting. The owner-only progression RPC and
wallet balances are not used.

## Acceptance

- With the setting off, visitors see only the existing profile card.
- With it on, scrolling or page controls move between the card and the
  full-page progress view for every supported card layout.
- Legacy About/projects/provider values cannot create public continuation
  content or re-open provider frames.
- The social/safety region after the progress page remains reachable.
- Keyboard and reduced-motion paths remain usable on desktop and mobile.

## Validation

All required application checks passed, including build, Svelte check (0 errors
and warnings), ESLint, 909 tests, links, CSP, enforced performance budgets,
username policy, balance, local catalog, scoring parity, and database security.
The focused local Profile Studio browser smoke passed at desktop and phone
widths, including enabled and disabled public profile states and centered,
contrasting arrow navigation. Enforced performance budgets passed; advisory
JavaScript and CSS catalog size targets remain over their thresholds. Remote
catalog comparison was unavailable without remote
Supabase credentials. No database schema changed, so database lint and reset
were not applicable. See `docs/PROGRESS.md` for the full record.
