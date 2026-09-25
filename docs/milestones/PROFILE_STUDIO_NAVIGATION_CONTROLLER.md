# Profile Studio navigation controller — 2026-09-23

## Objective

Move Profile Studio browser navigation listeners and dirty-navigation
decisions into a directly tested controller while preserving the existing
section, tab, history, and unsaved-change behavior.

## Audit

`dashboardContract.js` already resolves current and legacy Studio hashes.
`ProfileSettings.svelte` still binds `hashchange`, `popstate`, `beforeunload`,
and `chromadie:navigation-request` in its mount lifecycle and combines those
events with dirty state, location restoration, and prompt requests. These
decisions are embedded in the route adapter and are covered mostly by source
assertions rather than direct event tests.

## Implementation

Added `profileStudioNavigation.js` to own initial hash projection,
hash/popstate decisions, dirty-history restoration, before-unload prevention,
the custom navigation guard, and listener cleanup. It reads live section, tab,
and dirty state through injected getters. `ProfileSettings.svelte` still owns
section effects, lazy loading, drafts, prompt focus and discard behavior, and
the legacy progression redirect.

Direct fake-window tests cover initial and legacy hashes, clean/dirty history,
same-section tab changes while dirty, unknown hashes, both navigation target
forms and pathname fallback, live dirty state, idempotent startup, and cleanup.
An independent GPT-6 Luna Max review found no behavioral regression.

## Compatibility and risk

No route, data, RPC, schema, or configuration contract changes are intended.
Preserve initial and legacy hashes; browser Back/Forward behavior; the current
ability to switch Customize tabs while drafts are dirty; hash restoration
before prompting for dirty cross-section navigation; `beforeunload`; and
`chromadie:navigation-request` target handling. The controller must not own
editor drafts, discard logic, or prompt focus. No schema changes are needed.

## Validation and acceptance

- Browser listener registration, dirty-route decisions, and cleanup are
  directly tested through the controller; component wiring is covered by an
  architecture assertion.
- Existing route/hash compatibility and route guard behavior remain intact.
- No schema, RPC, configuration, or backend authority changes were made.
- Required validation passes with 784 tests. The dashboard route is
  540.94/542.00 kB JavaScript. Blocking route budgets pass; the aggregate
  JavaScript and CSS catalog totals remain advisory overages. Catalog drift
  used the valid local seed because remote Supabase credentials were
  unavailable.
