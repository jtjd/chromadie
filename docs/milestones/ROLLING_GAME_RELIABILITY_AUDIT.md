# Rolling game reliability audit — 2026-09-10

Objective: audit and repair bugs, oversights, and performance issues in the rolling game.

## Scope

Audit both homepage and dedicated roll entry points, guest persistence, authenticated
hydration, duplicate submissions, rerolls, UTC date boundaries, account switches,
route teardown, failures, reveal/skip/reduced motion, sharing and keyboard interaction,
and rendering/network cost. Preserve server scoring, eligibility, shard consumption,
wallet rewards, and history. No schema migration or RPC signature changes.

## Repairs

- Compare the hydrated UTC date instead of testing expiry against a newly computed
  tomorrow. Daily state now reloads after midnight, including background-tab resume,
  after an in-flight roll has settled.
- Reject overlapping ordinary roll requests as well as rerolls.
- Save confirmed guest results before the interruptible reveal and retain the request
  date through presentation. Optional percentile failures no longer delete valid
  guest results.
- Invalidate initial hydration on teardown and reject stale account results before
  hydration or reveal completions update presentation.
- Release loading after thrown initial reads and report returned daily-read errors.
- Retain the confirmed result on failed rerolls. Settle post-roll account refreshes
  independently so a rejected read does not strand controls after a successful roll.
  Returned wallet/inventory errors propagate without overwriting known account data.
- Restore earned-shard reroll and image export controls on modern roll surfaces;
  those actions had been confined to the legacy-only result block. The dedicated
  route also exposes its existing text-share action.
- Scope reroll locks to accounts and retain an ownership token and the original
  storage key for cleanup. Older completions cannot clear replacement locks or a
  different account's lock. Expiry now updates the visible button state.
- Avoid stale challenge-share and image-dialog updates after navigation/account
  changes. Clipboard failures give visible feedback; account changes close stale
  share previews.
- Reduced motion finalizes directly, skips per-condition DOM/scroll work, and
  suppresses jackpot flash/shake. Stale reduced-motion score callbacks cannot write.
- Skip the unused direct Color-of-the-Week request on modern roll surfaces.
- Keep dark roll names and unlock labels readable by lightening only text accents;
  the canonical roll swatch retains the actual color. Roll errors use role=alert.

## Verification map

| Area | Evidence |
| --- | --- |
| Duplicate submission, UTC rollover, hydration failure, guest reveal interruption, reroll rollback, stale share, optional percentile failures | `test/roll-lifecycle-audit.test.js` exercises production handlers and the submission guard |
| Returned wallet/inventory errors preserve account data | `test/roll-account-refresh.test.js` |
| RPC response failures, lock expiry and ownership/account isolation | `test/phase-3-profile-roll.test.js` |
| Reduced motion, cancellation and stale count-up | `test/roll-reveal-controller.test.js` and existing reveal timeline tests |
| Browser interaction and failures | `scripts/browser/roll-reliability-smoke.mjs`: one RPC for double click, navigation during guest reveal, failed reroll/retry, failed post-roll refresh, normal/reduced/skip reveals, old-account response rejection, image dialog/Escape, initial-read error, desktop/phone overflow and dark-heading contrast |
| Existing account/route experience | `npm run test:browser:homepage-account`: delayed profile hydration, same-account token renewal, logout, account switching, guest restoration, board failures/retry, responsive geometry |
| Server authority | Reviewed canonical `roll_die` wrapper: per-user advisory/row locks, profile existence and daily-roll prerequisite for rerolls; implementation retains secure random color, scoring and reward transactions |
| Server behavior/security | `check:db-security` executes `supabase/tests/launch_security.sql`, including guest rolls, first/restored daily rolls, unchanged roll count on restoration, reroll best-score repair and nonnegative wallet balance |
| Scoring | `check:scoring-parity`: 5,000 deterministic RGB samples; existing balance and generated-spec tests |
| Performance | Production budget gate; modern entry avoids one unused meta read; browser `Performance.getMetrics` recorded across normal reveal; reduced-motion direct completion removes reveal DOM/scroll beats |

Browser scenarios inject bounded RPC responses for reproducible failures and races;
server behavior is validated separately against local PostgreSQL. No production
account is rolled for testing. Evidence is written to
`/tmp/chromadie-roll-reliability/results.json` and desktop/phone screenshots.
The homepage account suite writes `artifacts/homepage-account-refinement/`.

## Final validation

Complete: build, Svelte diagnostics (zero errors/warnings), ESLint, all 605 tests,
links, CSP, production performance budgets, username-policy/balance/catalog drift,
5,000-sample scoring parity, and database security checks pass. Both the rolling
browser audit and the existing homepage account browser suite pass. Final desktop
and phone screenshots were inspected; dark heading contrast passes 4.5:1 in the
browser test and the restored actions remain within the viewport.

The sampled normal reveal took 7093 ms, including the authored waits;
Chromium reported 0.200 s task time and 0.037 s layout time
for the measurement window. These are local observations, not production latency
claims. Existing aggregate asset-catalog advisories remain non-blocking; all enforced
route/asset budgets pass. No database migration is needed. Port 5173 remains empty.

The audit scope above is complete; no identified repair or verification remains open.
