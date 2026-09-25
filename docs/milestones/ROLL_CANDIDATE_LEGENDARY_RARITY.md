# Roll Candidate Legendary Rarity — 2026-09-23

## Objective

Allow the best-roll candidate table to persist every rarity the authoritative
v6 scorer can return, including `Legendary`.

## Audit

The current v6 SQL scorer emits `Legendary` for valid rolls, but the
`user_roll_best_candidates_rarity_check` constraint omitted that value. The
database security suite reproduced the failure with a deterministic candidate
row before the schema change.

## Plan

1. Add a deterministic database-security regression for a `Legendary` candidate.
2. Add an additive migration that widens the existing rarity constraint.
3. Reset and lint the local database, then run the full required validation.

## Compatibility and risk

This accepts an existing canonical rarity from server-owned scoring. It does
not change scoring, roll eligibility, rewards, RPC behavior, RLS, or stored
historical rows. The new check is a superset of the prior constraint.

## Acceptance

- The SQL security fixture can persist a `Legendary` candidate.
- The migration applies cleanly and passes schema lint.
- All required application and database validation passes.

## Implementation and validation

Added `Legendary` to the candidate rarity check and added a database-security
assertion for that value. The assertion failed against the previous schema and
passes after the migration. `supabase db lint --local --level warning
--fail-on warning`, `npm run db:reset`, and `npm run check:db-security` pass.
The full application validation also passes with 834 unit tests.
