# Phase 12 Report — Sitewide Profile Language and Default Entry

Date: 2026-07-26

## Outcome

The approved profile aesthetic now extends to the surrounding application
surfaces through one atmospheric shell and one restrained application header.
The profile renderer and profile-mode header remain unchanged as the primary
composition.

The default entry contract is:

| Entry | Result |
| --- | --- |
| `/` signed out | Guest daily-roll surface (`Game.svelte`) |
| `/` authenticated | Owner live profile (`ProfileShell.svelte`) after session hydration |
| `/?view=game` | Explicit daily-roll surface, including for authenticated users |
| `/u/<username>` | Public profile with `ProfileModeHeader` |
| `/leaderboard` | Shared-shell Discover surface |
| `/shop` | Authenticated Studio surface or existing guest lock |

## Implementation

- Added [`SiteModeHeader.svelte`](../src/lib/SiteModeHeader.svelte), with the
  approved `chm.lol` brand, Profile/Roll/Discover/Studio navigation, sign-in,
  retry, sign-out, and native responsive Menu behavior.
- `App.svelte` now keeps `ProfileModeHeader` for profile mode and uses
  `SiteModeHeader` everywhere else. The existing route handlers remain the
  navigation authority.
- Supporting routes reuse the existing [`ProfileAtmosphere.svelte`](../src/lib/ProfileAtmosphere.svelte)
  with `normalizeHexColor($profile?.mood_color)` and a restrained secondary
  accent.
- Shared layout rules in [`layout.css`](../src/styles/layout.css) apply darker
  surfaces, readable text, quiet borders, and consistent responsive widths to
  Roll, Discover, Studio, help, privacy, guest-lock, and unavailable states.
- The new focused contract is
  [`phase-12-sitewide-profile-entry.test.js`](../test/phase-12-sitewide-profile-entry.test.js).

## Visual evidence

Screenshots were captured with Chromium at browser zoom 100%, CDP page scale
1, and `deviceScaleFactor: 1`.

| Surface | 1440×900 | 1280×720 | 390×844 |
| --- | --- | --- | --- |
| First-visit guest Roll | [desktop](../artifacts/phase-12/site-root/1440x900.png) | [desktop](../artifacts/phase-12/site-root/1280x720.png) | [mobile](../artifacts/phase-12/site-root/390x844.png) |
| Discover | [desktop](../artifacts/phase-12/discovery/1440x900.png) | [desktop](../artifacts/phase-12/discovery/1280x720.png) | [mobile](../artifacts/phase-12/discovery/390x844.png) |
| Signed-out Studio boundary | [desktop](../artifacts/phase-12/studio/1440x900.png) | [desktop](../artifacts/phase-12/studio/1280x720.png) | [mobile](../artifacts/phase-12/studio/390x844.png) |

The visual review confirmed that the guest Roll surface reads as a centered
profile-adjacent daily ritual rather than the former full navigation dashboard;
Discover and the signed-out Studio boundary inherit the same dark atmospheric
canvas. Mobile uses the native Menu disclosure and retains the composition
without horizontal overflow.

Raw capture paths and scroll-height evidence are in
[`artifacts/phase-12/`](../artifacts/phase-12/). The captures show the guest
and signed-out boundaries; authenticated Studio mutation behavior was not
recreated with fixture data because production rendering must use real session
and catalog state.

## Preserved behavior

- Supabase authentication/session hydration and sign-out cleanup.
- Secure roll RPCs, guest local persistence, anti-reroll, scoring, rewards,
  rarity, EP/economy, entitlements, inventory, and history.
- Owner/visitor profile parity, public/private boundaries, `/u/<username>` and
  `legacy=1` routing, challenge links, metadata, direct refresh, social and
  moderation boundaries.
- Existing route focus, skip link, reduced-motion CSS, and brand assets.

## Validation

| Command | Result |
| --- | --- |
| `npm run build` | PASS — Vite 8.1.3; 274 modules; JS 590.01 kB; CSS 279.80 kB; existing >500 kB chunk warning remains |
| `npm run check` | PASS — `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS |
| `npm test` | PASS — 100 passed, 0 failed |
| `npm run check:links` | PASS — Internal link check passed |
| `npm run check:csp` | PASS — 1 inline script block passed |
| `npm run check:performance` | PASS — JS 576.19/650 kB; CSS 273.24/300 kB; HTML 5.59/12 kB |
| `npm run check:balance-drift` | PASS — 66 conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS locally — snapshot and seed match at 82 items; no remote credentials were supplied |
| `npm run check:scoring-parity` | PASS — 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS — local SQL audit assertions passed and rolled back |
| `bash scripts/repo-hygiene-check.sh` | PASS |
| `git diff --check` | PASS |

No schema validation/reset was required because this milestone contains no
database changes.

## Known compromises

- The rest of the site now shares the approved atmosphere and header language,
  but the large Studio catalog and detailed Roll/Discover content remain
  intentionally domain-specific surfaces. They are not being rewritten into
  profile cards in this slice.
- The linked Supabase project remains behind the branch’s Phase 4–8 migration
  and catalog boundary documented by the earlier launch audit. This work did
  not broaden or mask that release blocker.
- Authenticated Studio screenshots require a real authenticated session and
  catalog projection; only the existing signed-out boundary was captured here
  to avoid fabricating production account data.

## Boundary

Phase 12 stops after the shared site shell, default entry behavior, screenshots,
and validation. New identity fields, richer media/expression contracts,
uploads, Spotify, new social systems, notifications, messaging, broad
discovery, monetization, SvelteKit, and unrelated cleanup remain separate
future milestones.
