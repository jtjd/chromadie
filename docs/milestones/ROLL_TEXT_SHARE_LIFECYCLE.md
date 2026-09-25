# Roll text-share lifecycle — 2026-09-23

## Objective

Move text-share composition and asynchronous challenge/clipboard effects out
of `Game.svelte` into a directly tested helper while keeping roll presentation
and action wiring in the component.

## Audit

`Game.svelte` currently snapshots the roll request and account IDs, creates an
authenticated challenge through the existing server function, builds the
share text from the displayed confirmed result, tracks the share event, and
copies the text. It checks request/account freshness after challenge creation
and after successful clipboard completion. Existing stale-challenge coverage
executes the Svelte handler source in a VM; there is no direct text-share
contract test.

## Implementation

Added `rollTextShare.js` to build and copy text from a click-time snapshot.
`Game.svelte` still captures the current request/account identity, confirmed
roll values, normalized displayed color, rank/unlock line, sender, and app
origin. It injects the existing challenge creator, clipboard, analytics,
toast, and copied UI effects. The helper checks freshness after challenge
creation and after clipboard success or failure. A copied-feedback generation
guard keeps an earlier two-second timer from clearing a newer share's status.

Direct tests cover guest and authenticated text, server challenge payload and
URL handling, failure fallback and event order, stale challenge/copy results,
clipboard errors, Game's click-time snapshot/wiring, and overlapping copied
feedback timers. The previous VM test for stale challenge completion moved to
direct helper coverage. An independent GPT-6 Luna Max review found no behavior
or authority regression.

## Compatibility and risk

Preserve guest versus authenticated text, server-created challenge links,
canonical app-origin resolution, challenge-failure fallback copy, rank or
unlock line, analytics payload, toast messages, and the two-second copied
feedback window. Stale roll/account work must neither copy a previous result
nor update current copied state. No route, data, RPC, schema, or authority
changes are expected.

## Acceptance

- Text construction and async share effects have direct helper tests; Game's
  adapter captures click-time state and protects newer copied feedback.
- `Game.svelte` remains the Roll UI boundary and only adapts current state and
  effects into the helper.
- Confirmed roll, server challenge, privacy, and route contracts remain intact.
- Full required validation passes with 791 tests; no schema changes. Dashboard
  JavaScript is 540.94/542.00 kB. Blocking route budgets pass; aggregate
  JavaScript and CSS catalog totals remain advisory overages. Catalog drift
  used the valid local seed because remote Supabase credentials were
  unavailable.
