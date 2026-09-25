# Profile Social RPC rejection recovery — 2026-09-23

## Objective

Ensure unexpected rejected social RPC promises resolve through the existing
error result shape so action, sorting, reporting, and settings flows can finish
their loading states.

## Audit

`invokeProfileSocialRpc()` returned `client.rpc()` directly. The bundled
PostgREST client normally resolves transport failures as `{ data, error }`, but
an RPC adapter that throws or rejects bypassed the callers' normal result
handling and left busy state set. The shared helper is the narrow boundary used
by these flows.

## Plan

1. Add a regression test for a rejected RPC and a compatibility test for an
already-resolved response.
2. Catch thrown/rejected RPC errors and return `{ data: null, error }`.
3. Preserve the unavailable-service result and existing response passthrough.
4. Run full required validation and update the project records.

## Compatibility and risk

No endpoint, arguments, result interpretation, UI copy, schema, RPC definition,
or authority changes are intended. Rejected promises now follow the existing
resolved-error path. The usual `{ data, error }` responses are returned as-is.

## Acceptance

- A rejected RPC resolves to the existing data/error result shape.
- Resolved RPC responses are returned unchanged.
- Existing caller error feedback and loading cleanup remain intact.
- Full required validation passes; no schema changes are needed.

## Implementation

- `invokeProfileSocialRpc()` now awaits the RPC and converts thrown/rejected
  errors into `{ data: null, error }`.
- Added regression coverage for rejected calls and unchanged resolved responses.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  and `npm test` pass; the suite reports 831 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Route budgets pass: initial JavaScript is 277.57/300 kB, auth route
  JavaScript is 297.71/300 kB, dashboard JavaScript is 541.53/542 kB, and
  largest lazy JavaScript is 78.92/100 kB. Aggregate JS/CSS catalog totals
  remain advisory overages at 1385.96/800 kB and 670.60/400 kB.
- No schema changes were made, so database lint and reset were not applicable.
