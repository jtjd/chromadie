# Profile content draft projection — 2026-09-22

## Objective

Move structured profile-content draft normalization and typed-text preservation
into a directly tested helper while leaving draft state and editor effects in
`ProfileContentEditor.svelte`.

## Audit

`ProfileContentEditor.svelte` currently normalizes the public content
projection, then restores bounded title, description, and URL strings so an
incomplete value is not erased while the owner types. The typing test extracts
those component functions from source and evaluates them in a VM instead of
testing importable production code.

## Plan

1. Add `profile-studio/contentDraft.js` with the existing fallback ordering,
   config/content normalization, and post-normalization typed-text projection.
2. Keep the editor's draft, baseline, empty-project state, status/error, focus,
   and dispatch behavior in the Svelte component.
3. Rewrite the typing test to import the production helper and cover incomplete
   URLs, canonical public normalization, bounded text, and config fallback.
4. Run the mandatory validation suite; no schema changes.

## Compatibility and risk

Preserve the current normalization order: normalize the structured config and
public projection first, then restore the bounded title, description, and URL
at each retained project index. Preserve `value || draftConfig ||
publishedConfig` fallback order and do not weaken public URL validation,
configuration validation, or publish checks. No route, data, RPC, or schema
changes.

## Acceptance

- Production code and direct tests share the same pure draft helper.
- Incomplete HTTPS input remains visible while editing and remains omitted
  from the normalized public projection.
- Editor-owned state updates, error clearing, dirty events, preview events,
  and DOM focus remain in the Svelte component.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `profile-studio/contentDraft.js` with the existing config/content
normalization, fallback order, and bounded typed-text restoration. The editor
uses these functions while retaining its draft/baseline state, empty-project
state, validation and publish behavior, focus, status/errors, and event
dispatch. Replaced the VM test that extracted Svelte source functions with
direct tests of the production helper, including partial URLs, public URL
normalization, field limits, and fallback order. No schema, route, RPC, or
authority changes.

## Validation

The required validation suite passes: build, Svelte check with zero warnings,
ESLint, 719 tests, links, CSP, performance, username-policy, balance, catalog,
scoring parity, and database-security checks. Initial JavaScript is
278.33/300 kB and largest lazy JavaScript is 78.92/100 kB; route budgets pass.
Aggregate catalog totals remain advisory overages (JavaScript 1378.12/800 kB
and CSS 670.52/400 kB). Catalog verification used the local seed because
remote Supabase credentials were unavailable.
