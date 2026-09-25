# How to Play guide refresh

## Goal

Bring `/how-to-play` in line with the roll-first homepage and make the daily
result, persistent profile, and public discovery loop easy to understand.

## Plan

1. Replace the old page-first instructions and fictional leaderboard mock with
   a short journey, a static example rendered through the current result
   component, and clear guest/account guidance.
2. Explain score, EP, rarity, daily reset, and existing profile discovery with
   copy that matches the live game.
3. Share the guide description and no-JavaScript fallback across route
   metadata and the Pages Function; add content and fixture regression tests.
4. Verify desktop and mobile layouts, keyboard and reduced-motion behavior,
   then run the required checks.

## Data and compatibility

No routes, roll behavior, profile data, auth, scoring authority, database
schema, or existing profile/discovery surfaces change. The example result is
static presentation data checked against the active scorer in tests; it cannot
request or award a roll.

## Acceptance criteria

- Visitors can roll from `/` or browse profiles from `/leaderboard` without
  signing in.
- The guide explains guest preview limits, the account path, the result
  breakdown, score/EP, rarity, and the UTC reset accurately.
- The example matches the score model and shows the same trait count as a live
  homepage result, with its condition points in the shared breakdown UI.
- Today’s top roll and Leaderboard are identified as existing paths to public
  profiles, while describing the top roll as conditional on a public result.
- The guide explains that a reroll shard replaces the current day's result.
- Desktop and narrow mobile layouts remain readable, keyboard-focusable, and
  free of horizontal overflow.

## Validation

- `npm run build`, `npm run check`, `npx eslint src/`, `npm test` (839 pass),
  and all required link, CSP, performance, drift, scoring-parity, and database
  security checks pass.
- `npm run test:browser:how-to-play` passes on the built route at
  1440/1024/768/390/320px, with keyboard focus, native disclosure, reduced
  motion, and request/console checks.
- Enforced route performance budgets pass. Aggregate asset-catalog JavaScript
  and CSS targets remain advisory overages; catalog validation used the local
  seed because remote credentials were unavailable.
- No schema changes; schema lint and local database reset were not applicable.
