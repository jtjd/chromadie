# App route target extraction — 2026-09-22

## Objective

Separate the app shell's route-state decision tree from browser navigation and
Svelte component lifecycle code. Keep `App.svelte` as the integration point,
and leave URL parsing, canonical path generation, component loading, and route
side effects behind their existing interfaces.

## Plan

1. Audit the current route parser, lazy loader, outlet contract, and target
   selection in `App.svelte`.
2. Extract route target selection into a pure module that receives app state
   and the three static component types it may return.
3. Add table-driven tests for route modes, account states, props, and fallback
   behavior, then run the mandatory validation suite.
4. Record compatibility and validation evidence in the project logs.

## Compatibility and risk

This is a frontend-only refactor. There is no schema or data migration. URL
parsing, canonical URLs, challenge and alias loading, auth state, lazy component
keys, public/private profile boundaries, and route outlet behavior must remain
unchanged. The existing static-component imports stay in `App.svelte` and are
passed into the pure selector, preserving the same bundling boundary.

## Acceptance

- Every prior route target branch returns the same component key, loader key,
  props, and loading label for the same state.
- Static route components remain supplied by the existing app shell imports.
- The selector is independently testable without importing Svelte components.
- Full mandatory checks pass; no backend or deployment behavior changes.

## Implementation and evidence

Completed on 2026-09-22. `App.svelte` now delegates target selection to
`resolveRouteTarget` and retains its browser/history orchestration. Static
components are passed positionally, keeping the public route bundle below its
existing dashboard budget. Existing route source tests now inspect the module
that owns the decision; direct tests cover every selector branch.

Validation passed: build, Svelte check (0 errors/warnings), ESLint, all 638 unit
tests, internal links, CSP, performance, username/balance/catalog drift,
5,000-sample scoring parity, and database security. The dashboard bundle is
541.95 kB against a 542 kB cap. No schema changes were made, so database reset
and schema lint were not applicable. No deployment or remote database changes.
