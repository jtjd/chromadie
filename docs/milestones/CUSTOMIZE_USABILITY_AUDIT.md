# Customize and More usability audit

Status: complete, 2026-09-10.

## Scope and plan

Audit all five Customize tabs (Appearance, Media, Content, Links, Layout) and
every More destination (Overview, Customize, Premium, Analytics,
Notifications, Privacy & social, Settings), plus header navigation, preview,
publishing, reset, and unsaved-change protection.

1. Correct shared keyboard/mobile navigation and redundant or misleading actions.
2. Check each editor's draft, persistence, validation, loading, failure, and retry flows.
3. Verify destinations and primary interactions in desktop/mobile browsers,
   including keyboard and reduced motion.
4. Run focused behavior tests and checks for changed surfaces; record remaining
   limitations before claiming completion.

No schema migration is currently needed. Preserve existing owner RPCs, RLS,
entitlements, media lifecycle, structured profile configuration, route aliases,
and public rendering. The full repository validation suite remains required
before completion.

## Confirmed fixes

- More navigation skips disabled controls, supports arrow opening, restores
  trigger focus on selection/Escape, and dismisses when focus leaves.
- More includes View profile for phones and scrolls within short viewports.
- Notifications marks the entire inbox through the existing owner-authorized
  null-ID RPC instead of only the most recent 50 entries. Failed requests
  retain unread state and expose an inline retryable error.
- Unread notifications include a textual indicator.
- Analytics preserves unsaved collection preferences during report-window
  changes. Save errors retain the form; partial success updates the confirmed
  preference without replacing a 7/90-day report with the RPC's 30-day report.
  Saving locks competing preference/window controls.
- Daily chart entries expose views and clicks to assistive technology.

## Evidence and remaining work

Eight focused handler behavior tests pass in
`test/profile-studio-menu-accessibility.test.js` and
`test/profile-owner-preference-recovery.test.js`.

Full completion remains unproven. Continue auditing Customize controls,
Privacy & social drafts/navigation, Overview, Premium, account error recovery,
and browser interaction/geometry. Review header publish/status relevance on
independently saved More pages. Do not infer browser accessibility or complete
feature coverage from handler tests.

### Preference navigation and browser follow-up

Privacy and Analytics now report preference dirty state separately from the
profile publish draft. Existing navigation/before-unload warnings cover both;
Publish profile never claims to save these independent preferences. Discard
resets the active preference editor. Privacy save errors stay inline, saving
locks the submitted controls, and redundant no-change saves are disabled.
Independently saved pages no longer display a blanket Published/All changes
saved claim.

Ten audit-specific handler tests pass, plus eight existing Studio hardening
and race tests. Svelte checks and lint for changed components pass.

The browser harness was updated for the existing staged signup flow (no auth
product change). The run passed signup, direct Studio refresh, stale draft
rejection, aliases, and Links preview. It then failed waiting for the published
Sleek profile in the surface-depth scenario. Evidence:
`/tmp/chromadie-profile-studio-smoke-Qc6Q59/evidence.json`.
The failure screenshot shows the profile load-error/retry state and browser
logs include ERR_NETWORK_CHANGED. One mobile screenshot is blank, so its
geometry cannot count as validated. Investigate/retry the affected browser
flow before claiming a complete pass; later More-page/browser checks have not
run yet.

### Content typing and focused browser audit

Project URL/title/description input now remains intact while being typed;
public projection still normalizes it. Content and Links mount lazily on
first visit and remain mounted while switching Customize tabs, so incomplete
widget/link inputs and validation survive. Publishing an invalid mounted draft
selects its owning tab.

The focused browser scope is available with
`PROFILE_STUDIO_SMOKE_SCOPE=customize-audit PROFILE_STUDIO_SMOKE_SKIP_MEDIA=1 node scripts/browser/profile-studio-smoke.mjs`.
It avoids unrelated progression/leaderboard and large media fixture work.
The Links test now waits for its lazy editor before clicking Add link.

The focused run passed all seven More destinations and five Customize tabs at
1440px/390px, Analytics discard navigation, and Escape focus restoration.
Evidence: `/tmp/chromadie-profile-studio-smoke-3m1AJH/evidence.json`.
Content and Privacy phone screenshots were visually reviewed. Privacy controls
were subsequently moved above social summaries and opened by default.
That final ordering change still needs browser revalidation.

Browser testing caught and corrected direct `.catch()` usage on Supabase's
thenable RPC builder. A regression test now uses a builder with no catch method.
Twelve focused audit tests pass. Completion still requires deeper save/reset,
media, content/widget/link persistence, and failure-state browser coverage.

### Cross-tab mutation verification

Browser evidence at `/tmp/chromadie-profile-studio-smoke-ZwlhSk/evidence.json`
passes the complete focused destination loop plus incomplete-project validation
from Layout, retained raw URL input, successful project publishing from Layout,
direct-refresh persistence, and Reset restoring the published project.
Privacy ordering is included in this newer run.

Account deletion now translates a rejected transport into the existing
normalized error result; its confirmation input is locked during the request.
Two focused mocked tests cover transport failure and canonical success.
No real account deletion was performed for this check.

The production build passes. The focused browser script now also covers
widget publication/refresh, Analytics/Privacy saves with refresh, and reduced
motion. That extended run is not yet certified; verify its terminal result
before claiming those additional cases pass.

### Revalidated continuation — 2026-09-09

The prior browser process was absent and its temporary evidence unavailable.
A fresh focused run passes at
`/tmp/chromadie-profile-studio-smoke-dao6DA/evidence.json`: all destinations
and Customize tabs at 1440/390px, cross-tab project validation/publication,
refresh persistence, Reset, widget retention/publication/refresh, Analytics
and Privacy save/refresh, preference discard, and Escape focus restoration.
Mobile Privacy and desktop Content screenshots were visually inspected.
Reduced-motion emulation was confirmed; this does not certify every animation.

Build, Svelte check (zero errors/warnings), source ESLint, links, CSP,
performance, username/balance/catalog drift, 5,000-sample scoring parity,
and local database security checks pass. No schema changed.
The full test run failed three assertions: two obsolete Studio unmounting
assertions were updated for the browser-verified retained Content/Links drafts,
and their six-test files now pass. The remaining failure is
`public profiles leave wheel scrolling to the browser` in
`test/responsive-hardening.test.js:58`: `ProfileShell.svelte:290` registers a
wheel listener, also present in HEAD. It is outside the Studio changes and
has not been altered. Full-suite success is not claimed.

Remaining acceptance work includes media mutation/recovery and browser failure
and retry coverage; this milestone remains in progress.

### Media and failed-request follow-up — 2026-09-09

Media-library requests now recover from thrown transport errors, keep the
previous library on failure, ignore obsolete responses, and expose loading
and Retry in compact Studio as well as the legacy editor. Privacy settings
now catch thrown save requests. Reassigning unchanged canonical Privacy
settings no longer overwrites an unsaved draft during parent updates.

Eleven focused preference/media handler tests pass, including retained media
on failure, successful retry, stale-response protection, and unchanged-parent
Privacy updates. Build, Svelte check, source lint, links, CSP, and performance
checks pass. The full run before the last Privacy guard reported 576/577
passing, with only the previously recorded public wheel-listener assertion
failing.

The browser audit now injects failed Analytics/Privacy saves, notification
loads, and media-library loads with CDP URL blocking, then retries against the
local backend. Runs exposed a disabled Privacy retry after parent updates and
a harness assertion that accepted disabled controls while still saving. Both
were corrected. Subsequent runs have also encountered homepage hydration and
signup timeouts. Extended failure/retry browser coverage is not yet certified;
inspect the latest running handle/result before rerunning. Hosted media
upload/selection/deletion coverage remains outstanding.

The corrected run has now terminated successfully:
`/tmp/chromadie-profile-studio-smoke-umJpAz/evidence.json`.
Analytics and Privacy save failures retain editable preferences and retry to
persisted values after refresh. Notifications and the compact media library
recover through their visible retry controls. All prior destination, project,
widget, and preference checks also pass. The mobile media-library error
screenshot was visually reviewed. Hosted-media mutation coverage and the
public wheel-listener test conflict remain outstanding.

### Completion — 2026-09-10

The public wheel-listener assertion was reconciled with the intended native
scroll behavior, and the complete test suite now passes. The final focused
Chromium run passes all five Customize tabs and seven More destinations at
1440px and 390px, cross-tab project/widget publication and reset, Appearance
and Layout persistence, preference save failures and retries, notification and
media-library recovery, reduced motion, alias resolution, and Links preview.
Evidence: `/tmp/chromadie-profile-studio-smoke-y2zNql/evidence.json`.

The application-level R2 smoke also covers avatar and background upload,
promotion, stable public delivery, saved-media unequip/reapply on desktop and
phone widths, database deletion, R2 object deletion, and safe repeated
deletion. Evidence:
`/tmp/chromadie-profile-media-r2-local-XhKvVy/evidence.json`. Both configured
Cloudflare API tokens return HTTP 401, so this run used the harness's explicit
credential-limited mode: exact CDN cache purge remains recorded as pending
while every application-controlled deletion boundary passes. The strict
default smoke continues to fail until that external test credential is
renewed.

Hosted profile audio was restored at the shell boundary during final review.
It now remains visible in every layout without duplicate players or an empty
audio-only continuation page. No schema or authority boundary changed.
