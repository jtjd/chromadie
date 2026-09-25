# Auth Turnstile lifecycle — 2026-09-22

## Objective

Move Cloudflare Turnstile polling and widget operations out of `Auth.svelte`
into a small directly tested lifecycle module, leaving account and form state
in the component.

## Audit

`Auth.svelte` currently owns signup/login/recovery, username availability,
provider redirects, and the Turnstile API lifecycle. The lifecycle polls for the
global API up to 50 times at 200 ms intervals, renders only when the current
form step has a widget container, tracks token/expiry/error callbacks, resets
and removes the widget, retries it, and removes it on component teardown.
Submission separately requires a configured site key and token outside local
development. Localhost development bypasses the widget and token as it does
today.

## Plan

1. Add `auth/turnstileLifecycle.js` with injected browser references and timer
   functions for API polling, widget render/reset/remove, token callbacks,
   retry, and cleanup.
2. Adapt `Auth.svelte` to use the controller while retaining its local-dev
   decision, account submission guards, form transitions, and error display.
3. Add direct lifecycle tests and update auth source contracts to verify the
   controller is wired into the form and CAPTCHA remains required for remote
   password auth.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No schema, route, auth-provider, username-policy, or visual changes are
intended. Preserve the existing script source, 50-attempt polling window,
200 ms cadence, container selector, callback semantics, retry reload fallback,
and cleanup. Signup, login, and password recovery must continue sending the
Turnstile token to Supabase and must stop before submission when a remote token
is missing. OAuth keeps its current redirect contract. No data migration is
needed.

## Acceptance

- `Auth.svelte` delegates all Turnstile API and timer lifecycle operations to
  the tested module.
- Tests cover API discovery and timeout, one-time rendering, token/expiry/error
  callbacks, reset/remove/retry, and teardown.
- Existing auth and local-development contracts remain covered; all mandatory
  checks pass. No schema changes.

## Implementation

- Added `auth/turnstileLifecycle.js` with injected window/document/timer
  dependencies for API polling, rendering, token callbacks, reset, removal,
  retry, and teardown.
- Adapted `Auth.svelte` to delegate widget operations while retaining its
  local-development bypass, auth validation, token gate, and Supabase calls.
- Added direct lifecycle tests for API discovery, delayed form containers,
  token expiry/errors, reset/remove/retry, timeout, and teardown. Updated auth
  source contracts to follow the extracted lifecycle.

## Validation

- Build, Svelte check, full-source ESLint, 700 tests, links, CSP, performance,
  username policy, balance, catalog, scoring parity, and database security
  checks pass.
- Auth route JavaScript is 299.87/300 kB; all enforced route budgets pass.
  Aggregate JavaScript (1377.25/800 kB) and CSS (670.46/400 kB) catalog checks
  remain advisory. Catalog drift validated the local seed because remote
  Supabase credentials were unavailable.
- No schema changes.
