# Phase 13 Plan — Real Identity Contract and chm.lol Canonicalization

Date: 2026-07-29  
Status: **REPOSITORY IMPLEMENTATION COMPLETE — external cutover pending**

## Objective

Add truthful, user-controlled display names and short bios to the approved
Phase 10–12 profile composition, then make `https://chm.lol` the canonical
public domain while preserving `/u/<username>` and the existing
`chromadie.com` compatibility paths.

The approved centered identity composition, full-viewport atmosphere, minimal
profile header, integrated daily-color treatment, compact collection, and
owner/visitor parity are fixed inputs to this plan. This phase is not a visual
redesign.

## Current gate decision

Phase 13A reconciled the linked Supabase project in the reviewed migration
order. The five Phase 4–8 migrations are now recorded remotely, the catalog
contains 82 items, the story backfill is present, and the expected RPC/RLS/
grant checks pass. The additive identity migration was then applied as the
next timestamped migration with no backfill, so existing identity data remains
unchanged.

Identity implementation and repository canonicalization are complete in the
repository.
External Cloudflare custom-domain forwarding, Supabase dashboard settings, and
email-template installation remain separately documented operator actions and
are not claimed as complete.

The reconciliation evidence is in
[`PHASE_13_DATABASE_BASELINE.md`](PHASE_13_DATABASE_BASELINE.md) and
[`PHASE_13A_RECONCILIATION_REPORT.md`](PHASE_13A_RECONCILIATION_REPORT.md).
The external domain checklist is in
[`CHM_LOL_DOMAIN_CUTOVER.md`](CHM_LOL_DOMAIN_CUTOVER.md).

## Audited production seams

| Concern | Current state | Planned Phase 13 change after reconciliation |
|---|---|---|
| Public identity | `IdentityCard` receives `displayName={username}` and a truthful roll-history fallback in `ProfileShell`; no public display-name/bio fields are loaded | Add bounded published `display_name` and `bio` projection; retain username/history fallbacks |
| Owner editing | `ProfileEditor` edits only version-1 configuration, signature color, module visibility/order, and HTTPS links | Extend the existing owner editor with identity fields, counters, local errors, and save protection |
| Server authority | Existing profile RPCs are fixed-search-path and owner/public projections are explicitly enumerated | Add `update_my_profile_identity(text,text)` and a bounded public identity projection with explicit grants |
| Public routing | `/u/<username>` is the canonical client/Pages Function route; reserved names are not centralized | Add one reserved-route definition and root `/<username>` parsing/metadata while retaining `/u/<username>` compatibility |
| Canonical origin | Runtime/static defaults and metadata still use `chromadie.com`, with `VITE_SITE_URL` override support | Change repository defaults only after external cutover readiness and verify old-host redirects |
| Auth links | `getAppOrigin()` and Supabase config support `chromadie.com` and local URLs | Add `chm.lol` callback/reset URLs while retaining old callback compatibility during transition |

## Planned implementation sequence after the gate clears

1. ~~Reconcile and verify the pending Phase 4–8 migrations/catalog in the
   authorized release window.~~ Complete in Phase 13A.
2. ~~Add one additive identity migration after the verified latest remote
   migration. It will add nullable `display_name` and `bio` columns, exact
   constraints, a fixed-search-path owner update RPC, a bounded public
   projection, explicit grants, RLS verification, and rollback notes. Existing
   rows remain `NULL` for both new fields.~~ Applied as `20260725150000_profile_identity.sql`.
3. ~~Add pure client/server contract tests before wiring the editor.~~ Complete:
   validation trims and normalizes empty values to `NULL`, rejects controls,
   enforces 40-character display names and 160-character bios, and renders
   escaped plain text only.
4. ~~Extend the mapped profile model and identity card.~~ Complete through the
   bounded public identity RPC and the existing composition.
5. ~~Extend the owner settings surface with identity fields.~~ Complete at
   `/profile/settings`; no public form or new visual region was added.
6. ~~Introduce shared reserved-route, metadata, sitemap, robots, share, and
   auth-origin contracts.~~ Complete in the repository; external host and
   dashboard actions remain in `CHM_LOL_DOMAIN_CUTOVER.md`.
7. ~~Capture screenshots and run the full validation/reset/lint gate.~~ Complete.
   The CSS performance budget remains a documented 5.34 kB overage to resolve
   before the maintenance gate is removed.

## Tests and evidence planned

- Identity normalization, limits, control characters, empty values, plain
  text, owner-only update, cross-user rejection, and private-field exclusion.
- Owner/visitor profile projection parity and missing-field fallbacks.
- Reserved route parsing, root username profiles, `/u/<username>`
  compatibility, direct refresh, metadata, old-domain redirect safety, auth
  callback/reset URL safety, and no redirect loops.
- Screenshots at 1440×900 and 390×844 for owner, visitor, username-only,
  long-name, maximum-bio, empty-bio, and owner-editor states.

## Stop boundary

Do not begin avatar, media, music, social expansion, messaging, notification,
customization, monetization, or SvelteKit work. Stop after the Phase 13
acceptance gate is verified.
