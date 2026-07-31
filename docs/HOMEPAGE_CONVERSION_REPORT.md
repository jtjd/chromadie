# Homepage Conversion Pass

## Scope

The root homepage now leads with the public profile promise: a customizable
`chm.lol/username` page, one daily color roll, leaderboard progression, and
profile discovery. Existing signup handoff, username shape validation, auth,
moderation/reservation behavior, routes, and server-authoritative gameplay were
left unchanged.

The hero uses a fully customized profile preview. The homepage also includes
centralized demo data for Minimal and clean, Dark and atmospheric, and Bright
and expressive profile examples; each links to a full public-profile route.
The daily loop section shows a simplified result and leaderboard preview.

Homepage conversion events use the existing consent-gated product analytics
adapter: `username_claim_started`, `username_claim_completed`,
`example_profile_opened`, and `explore_clicked`. No username or identity data
is included.

## Evidence

Only homepage captures were taken:

- [Desktop homepage](../artifacts/homepage-conversion/homepage-desktop-1440x900.png)
- [Mobile homepage at 390 × 844](../artifacts/homepage-conversion/homepage-mobile-390x844.png)
- [Example profiles](../artifacts/homepage-conversion/example-profiles-1440x900.png)
- [Roll/discovery explanation](../artifacts/homepage-conversion/roll-discovery-1440x900.png)

The mobile capture keeps the claim action first, leaves the profile preview
readable, and uses the existing compact header menu without horizontal
overflow.

## Validation

Passed: `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` (142
tests).

`npm run check:performance` is over the repository’s existing budgets
(JavaScript 646.19 kB / 625 kB; CSS 325.02 kB / 295 kB). No backend or schema
change was made in this homepage-only pass.
