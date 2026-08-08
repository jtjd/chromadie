# ChromaDie Social Moderation and Operations Boundary

**Status:** Phase 9 operations documentation slice, 2026-07-25  
**Scope:** Current social protections and the missing operational surfaces.

## What exists today

The Phase 7 social layer provides protected storage and server-enforced
boundaries for:

- `profile_social_settings`: owner controls for interactions, guestbook,
  activity visibility, and discovery inclusion;
- `profile_favorites` and `profile_reactions`: non-competitive signals;
- `profile_guestbook_entries`: bounded plain-text notes with `visible`,
  `hidden`, and `removed` states;
- `profile_blocks`: reciprocal interaction suppression;
- `profile_reports`: profile/guestbook reports with `open`, `reviewed`,
  `dismissed`, and `actioned` states;
- `profile_social_rate_limits`: per-account action windows; and
- the existing `user_follows` rivals graph, which uses the same block and
  interaction boundary for new follows.

All new social tables have RLS enabled, no `anon` or `authenticated` table
grants, and service-role operational access. Browser callers use fixed
`SECURITY DEFINER` RPCs with `search_path = 'public'`. Public social reads
return bounded counts, viewer-safe state, and at most 20 visible guestbook
entries; reporter ids, report details, moderation status, account ids, and
email addresses stay out of public JSON.

## Server protections

- Guestbook bodies are 1–240 plain-text characters, reject control characters
  and URLs, and are limited to 5 writes per 10 minutes per account.
- Reports accept only `spam`, `harassment`, `hate`, `sexual`,
  `impersonation`, or `other`; details are plain text and capped at 500
  characters. Reports are deduplicated by reporter/target/entry/reason and
  limited to 5 per day per account.
- Favorites, reactions, settings, and block changes use bounded per-account
  windows in the database. The rivals graph retains its five-rival cap.
- Blocks suppress the reciprocal social projection and remove reciprocal
  follows, favorites, and reactions. Existing guestbook rows remain protected
  for moderation and are hidden across the blocked relationship.
- Owner settings can disable new interactions, guestbook notes, public recent
  activity, discovery inclusion, or aggregate positive-social counts.
  Disabling discovery does not invalidate a direct public profile URL, and
  hiding aggregate counts does not disable reactions or favorites.
- Profile deletion cascades account-owned social rows. Report rows therefore
  do not outlive the reported profile or reporter through this schema.

The authoritative implementation is
`supabase/migrations/20260725130000_social_layer.sql`; the browser must not
reimplement these checks.

## Current triage runbook

There is no moderation dashboard, notification queue, appeal workflow, or
automated moderator alert in the current product. Until an approved
operations tool exists, the following is the safe boundary for authorized
operators:

1. Review an `open` report through approved service-role tooling only. Never
   grant the service role to a browser, support form, or analytics adapter.
2. Confirm the target profile and, when present, the guestbook entry through
   the protected tables. Treat report details as sensitive moderation data.
3. For an urgent guestbook safety issue, change the entry to `hidden` as a
   reversible containment action. Use `removed` only for a final content
   decision. A global profile report can be recorded without exposing its
   details publicly.
4. Resolve the report as `reviewed`, `dismissed`, or `actioned`, and set
   `resolved_at` when the operational tooling supports the update. Record the
   operator, rationale, and evidence in the approved restricted audit system;
   the current table does not contain a moderator identity field.
5. If a profile needs immediate self-service containment, direct the owner to
   disable interactions or the guestbook. There is currently no global
   moderation freeze switch.
6. If the issue is account compromise, privacy exposure, or an RLS/RPC
   failure, pause the affected surface operationally, preserve the report
   evidence, and escalate to the database/security owner before changing
   schema or grants.

These steps describe an operational boundary, not a claim that the product
already has the tooling to execute every step. Direct production SQL should
be limited to the approved service-role process, reviewed, auditable, and
reversible where possible.

## QA and release checks

Before shipping social or moderation changes, run the full repository suite,
including:

```bash
npm run check:db-security
supabase db lint --local --level warning --fail-on warning
npm run db:reset
```

Also inspect the migration and RPC grants for fixed search paths, table RLS,
browser-role revokes, bounded inputs, deletion cascades, and public projection
fields. Add authenticated-owner, authenticated-other, anonymous, blocked,
private-setting, rate-limit, and deletion tests for every new social action.

The current database security script exercises the existing social boundary;
it is not a substitute for reviewing report triage or production access logs.

## Known operational gaps and migration hazards

- No moderation UI or queue exists; adding one needs a service-role boundary,
  moderator authentication, audit logging, and least-privilege queries.
- No notification or appeal system exists. Do not add email, push, or in-app
  alerts by coupling them to public profile reads or product analytics.
- Reports have statuses and timestamps but no moderator identity, decision
  reason, or immutable audit history in the current schema. Adding those is a
  separate additive migration and privacy review.
- Block cleanup intentionally retains guestbook rows for protected review.
  Changing that retention choice affects evidence preservation, deletion, and
  public projection behavior.
- Per-account rate limits mitigate burst abuse but do not detect coordinated
  abuse, evade compromised accounts, or replace human review.
- Product-event measurement excludes moderation fields entirely. A future
  analytics sink must not become a report queue, moderation log, or source of
  private profile data.
