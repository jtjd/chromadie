# ChromaDie 2.0 — Phase 9 Continuation Report

**Milestone:** Launch Polish — Product Events and Operations Boundary  
**Audit / implementation date:** 2026-07-25  
**Branch:** `redesign/profile-first`

## Boundary

This continuation starts from the completed Phase 9 launch-hardening slice:
77 passing native tests and green required validation. It covers only a
consented, provider-neutral product-event contract and moderation/operations
documentation. It does not claim completion of browser/device certification,
deeper code-splitting, media/embeds, OG/share expansion, or legacy-renderer
retirement.

## Baseline status

Before this slice there was no in-app product-event module or sink. Cloudflare
Web Analytics was already present at the shell level and Supabase analytics
was disabled. The social layer already had RLS-protected reports, guestbook
states, blocks, rate limits, and SECURITY DEFINER RPCs, but it had no
moderation dashboard, queue, notification delivery, moderator audit identity,
or appeal workflow.

## Work completed

- Added `src/lib/productAnalytics.js` with explicit consent, event/property
  allow-lists, bounded string normalization, a page-local browser adapter, and
  a memory adapter for tests.
- Added the privacy-page preference in
  `src/lib/AnalyticsPreferences.svelte`. Unknown and denied consent emit no
  events; consent is stored only in browser local storage.
- Wired observations to existing route, profile-load, roll-ready,
  canonical-roll-completion, share-success, try-on, and equip-success
  transitions. No event is required for any product flow.
- Excluded usernames, emails, profile/account ids, scores, colors, draft
  configuration, entitlements, guestbook content, report details, and
  moderation state from the event contract.
- Added `docs/ANALYTICS_CONTRACT.md` and
  `docs/MODERATION_OPERATIONS.md` with retention/deletion prerequisites,
  report triage boundaries, protected-data rules, and current operational
  gaps.

No database migration, event table, provider SDK, network request, moderation
dashboard, notification path, scoring/economy change, RLS change, or
production-data mutation was introduced.

## Failures discovered and resolved

1. The first privacy-policy integration referenced the preference component
   before adding its import; the missing import was corrected before validation.
2. The focused analytics test initially needed an async callback for source
   reads; it was corrected and the five new tests pass.

No runtime or database failure was discovered after correction.

## Coverage added

`test/phase-9-analytics.test.js` protects:

- explicit-consent and invalid-event rejection;
- redaction, control-character stripping, string bounds, and absence of
  private fields;
- denied consent and bounded in-memory adapter behavior;
- the no-network/page-local adapter seam; and
- instrumentation at the existing route/profile/roll/share/shop call sites.

The native suite increased from 77 to **82 passing tests**.

## Risks and migration hazards

- The current adapter is intentionally not a production measurement system;
  adding a sink later requires an assigned owner, retention/deletion rules,
  access controls, provider review, and incident response.
- Cloudflare Web Analytics remains a separate shell-level service. The new
  preference does not claim to disable or govern that existing script.
- Consent is browser-local and not tied to authentication. A future account
  deletion flow must not assume that local consent represents server records.
- Product-event call sites must remain observational. They must never be used
  to decide roll eligibility, scoring, rewards, purchases, equips, profile
  publication, social access, or metadata.
- Social reports are protected records, not a complete operations system. A
  future dashboard needs least-privilege operator auth, moderator identity
  audit, queue semantics, and appeal/privacy review.

## Next Phase 9 boundary recommendation

The next Phase 9 slice should be a real browser/device accessibility and
performance audit, with route refresh, public profile sharing, guest/auth
transitions, reduced motion, keyboard focus, narrow mobile layouts, and cache
behavior covered by evidence. Only after that audit should measured
code-splitting or legacy-renderer retirement be considered. Do not add a
provider sink, payment/webhook issuance, visitor identity analytics, private
messaging, or unrelated cleanup in that slice.

## Acceptance assessment

**GO for this Phase 9 continuation slice.** Consent, redaction, no-network
behavior, event integration, and moderation/operations boundaries are
documented and tested without changing product authority or persistent data.

**NO-GO for declaring the entire Phase 9 roadmap complete.** Browser/device
certification, deeper code-splitting, media/embeds, OG/share expansion, and
legacy-renderer retirement remain open.

## Validation record

The complete post-edit suite passed:

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 258 modules transformed; JS asset 580.61 kB; CSS asset 243.24 kB; existing Vite warning for a chunk over 500 kB |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 82 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:performance` | PASS | `Performance budget passed: JavaScript 567.00 kB/650.00 kB; CSS 237.54 kB/300.00 kB; HTML shell 5.59 kB/12.00 kB` |
| `npm run check:balance-drift` | PASS | `Balance drift check passed: 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | PASS | `Catalog drift check passed locally: snapshot and seed match (82 items).` Remote comparison was not run because Supabase environment variables were absent |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.`; audit transaction rolled back |

No schema change was made, so schema lint/reset were not newly required for
this slice; the Phase 8 local schema lint/reset results remain green.
