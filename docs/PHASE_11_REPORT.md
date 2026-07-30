# Phase 11 Report — Continuous Profile Composition and Minimalism

Date: 2026-07-26  
Branch: `redesign/profile-first-reconciliation`  
Scope: Phase 11 only

## Outcome

Phase 11 completes the visual correction that Phase 10 identified. The public
profile no longer presents a hero followed by equal-weight cards. Identity and
the latest/next color now share one atmospheric opening canvas. Links, signature
expression, and one story trace continue below through typography, alignment,
whitespace, and color rather than separate dashboard containers.

The implementation reuses the Phase 10 data projection and existing renderer.
It adds no profile tables, routes, gameplay logic, social systems, media
integration, or authority changes.

## Old visual hierarchy

The Phase 10 baseline still had a large identity hero followed by three
visually similar primary modules: latest color, signature color, and a
featured-accomplishment card. Each module repeated an eyebrow/title pattern,
contained its own panel treatment, and made the profile read as a small game
dashboard even after the number of regions had been reduced.

## New visual hierarchy

1. One opening canvas combines identity, atmosphere, signature color, and the
   latest public color or the owner’s integrated daily roll.
2. A quiet supporting continuation presents selected links or signature
   expression beside one accomplishment, collection, or story trace.
3. History, statistics, social controls, editing, configuration, account
   management, entitlements, and compatibility controls remain below in
   deliberate disclosure surfaces.

The default public composition still has exactly four named regions in the
data contract—identity, roll/latest result, expression, and featured story—
but those regions no longer render as four competing cards.

## Visible features removed or demoted

- Removed the visible hero/card separation from the default profile canvas.
- Removed repeated primary module headers and descriptions from expression and
  story surfaces.
- Removed visible “Featured accomplishment,” “The long game,” and “Connect
  with this profile” dashboard language.
- Replaced bordered link rows with quiet inline link expression.
- Replaced the signature-color card with a small color note in the supporting
  continuation.
- Kept one accomplishment/story trace visible, but removed its card framing
  and generic “featured” treatment.
- Kept the public latest result in the same opening canvas as identity.
- Kept owner roll readiness, result details, reroll behavior, rewards, and
  server-reported conditions behind the integrated owner roll surface.
- Kept stats, rank progress, history, collection, achievements, social,
  editing, configuration, account, shop, and `legacy=1` compatibility paths
  reachable below the primary composition.
- Reduced owner roll copy from server/mechanics explanation to a concise daily
  ritual while retaining the secure RPC and canonical response path.

## Visual contract and screenshot evidence

The pre-implementation contract is recorded in
[`PHASE_11_VISUAL_CONTRACT.md`](PHASE_11_VISUAL_CONTRACT.md).

The Phase 10 after captures are the before baseline:

- [Before — 1440×900](../artifacts/phase-10/after/1440x900.png)
- [Before — 1280×720](../artifacts/phase-10/after/1280x720.png)
- [Before — 390×844](../artifacts/phase-10/after/390x844.png)

The repeatable Phase 11 captures use the real public `/u/Anzul` account data:

```bash
PROFILE_SCREENSHOT_URL=http://127.0.0.1:5174/u/Anzul \
PROFILE_SCREENSHOT_OUTPUT=artifacts/phase-11/after \
node scripts/capture-profile-screenshots.mjs
```

After:

- [After — 1440×900](../artifacts/phase-11/after/1440x900.png)
- [After — 1280×720](../artifacts/phase-11/after/1280x720.png)
- [After — 390×844](../artifacts/phase-11/after/390x844.png)
- [After metrics](../artifacts/phase-11/after/metrics.json)

Exact browser measurements:

| Viewport | Region bounds | Result |
| --- | --- | --- |
| 1440×900 | identity y=161–489; roll y=234–416; expression/featured y=561–658 | Primary composition ends at y=658; all primary content fits without vertical scrolling. Document scroll height is 916 because the site footer/detail disclosures remain in the page. |
| 1280×720 | identity y=161–470; roll y=226–405; expression/featured y=534–631 | Identity, latest color, and supporting expression end at y=631 and remain visible within the viewport. Document scroll height is 889. |
| 390×844 | identity y=146–524; roll y=301–499; expression y=548–613; featured y=645–775 | Mobile begins with identity, places the color immediately after it, has no horizontal overflow, and keeps the primary composition within the viewport. Document scroll height is 1087. |

The screenshots were reviewed as visual evidence. They show one continuous
opening band and a quiet supporting continuation rather than an explained set
of modules.

## Compatibility and migration decisions

- `ProfileShell.svelte` remains the single renderer for owner, visitor, guest,
  and preview contexts. No second profile renderer was introduced.
- The existing `profileComposition.js` projection and validated v1
  configuration remain the data seam. Stored module order, visibility, links,
  and layout variants were not rewritten.
- `ProfileRoll.svelte` receives an `integrated` presentation prop only. Its
  existing `get_my_daily_roll`, `roll_die`, reroll lock, canonical response,
  result refresh, reward, rarity, and reduced-motion behavior remain intact.
- Public visitors still receive only the existing public latest-result
  projection and never mount owner roll controls.
- Authentication, RLS, RPCs, scoring parity, rewards, rarity, economy, shop
  ownership, entitlements, history, cosmetics, social data, moderation
  boundaries, public/private behavior, routes, direct refresh, old share links,
  deployment behavior, and `legacy=1` remain unchanged.
- No database migration or production write was required.

## Validation results

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | Vite 8.1.3; 263 modules transformed; JS asset 592.08 kB; CSS asset 256.52 kB; HTML 5.72 kB; existing >500 kB chunk warning remains visible |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No errors |
| `npm test` | PASS | 91 passed, 0 failed |
| `npm run check:links` | PASS | Internal link check passed |
| `npm run check:csp` | PASS | CSP check passed for 1 inline script block(s) in `dist/index.html` |
| `npm run check:performance` | PASS | JavaScript 578.21 kB/650.00 kB; CSS 250.51 kB/300.00 kB; HTML shell 5.59 kB/12.00 kB |
| `npm run check:balance-drift` | PASS | Existing score, rarity, achievement, and seed drift checks pass |
| `npm run check:catalog-drift` | PASS locally / linked blocker remains | Local snapshot and seed match for 82 items; linked credentials were not loaded by the required local command, and the known linked project still lacks `bg_prism_atmosphere` and `name_prism_atelier` |
| `npm run check:scoring-parity` | PASS | 5,000 deterministic RGB samples pass |
| `npm run check:db-security` | PASS | Database security and integrity checks pass; audit transaction rolls back |
| `bash scripts/repo-hygiene-check.sh` | PASS | Required phase documents exist and no forbidden tracked paths are present |

No schema-specific lint/reset was required because Phase 11 added no schema
change. The linked Supabase migration/catalog drift and incomplete Firefox/device
certification remain the pre-existing Phase 9 release blockers; no remote write
or client fallback was introduced.

## Known compromises

- The before/after captures use a real public visitor profile. An authenticated
  owner screenshot was not created because the workflow does not mutate a test
  account; owner integrated-roll behavior remains covered by source and roll
  contract tests.
- The public capture still shows the existing linked-environment social warning
  because the remote social RPC boundary is behind the local branch. This is a
  deployment-state warning, not a new presentation module.
- The page document can extend below the viewport for footer and deliberate
  disclosures; the acceptance measurement is the primary composition bounds.
- The existing large Vite chunk warning remains. Code-splitting was not coupled
  to this visual milestone.
- Secondary detail surfaces retain some card treatment because they are
  intentional owner/detail disclosures, not part of the visitor opening
  composition.

## Remaining boundary

Phase 11 stops here. The next workflow must be separately authorized and may
address release migration/catalog reconciliation, a clean Firefox/device pass,
measured renderer/code-splitting work, or deliberate detail-view refinement.
It must not add media/avatars, Spotify, social features, notifications,
messaging, monetization, broad discovery, unrestricted customization, schema
redesign, SvelteKit, or unrelated cleanup under this milestone.
