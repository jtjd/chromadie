# ChromaDie Social Moderation and Operations Boundary

**Status:** Minimal moderator workflow, 2026-09-28
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

## Current triage workflow

The internal `/moderation` route provides pending and resolved queues. The
route is marked `noindex,nofollow`; it has no public navigation entry. The
browser calls only the fixed `moderation_list_reports` and
`moderation_resolve_report` RPCs. Both functions verify the caller against
`profile_moderation_staff` on every request. A public `profiles.is_staff`
marker, username, or client-provided role is not moderator authorization.

Grant or revoke access through the restricted database operator channel only.
The table has no browser-role grants; service-role access is limited to
provisioning and inspection. Example provisioning SQL:

```sql
INSERT INTO public.profile_moderation_staff (user_id, granted_by)
VALUES ('<moderator-auth-user-uuid>', '<granting-operator-uuid>');

DELETE FROM public.profile_moderation_staff
WHERE user_id = '<moderator-auth-user-uuid>';
```

The pending queue shows the reporter, target profile, report reason/details,
and a snapshot of the reported profile/guestbook context. Decisions require a
short reason. Moderators can review, dismiss, hide, or remove a reported
guestbook note or reply. Hide is reversible; remove changes the content state
to `removed` and preserves the row for protected review. Profile-only reports
can be reviewed or dismissed. The UI and RPC reject profile/account actions:
there is no safely supported account suspension, profile restriction, or
global interaction-freeze control today.

Every decision inserts a private audit row containing moderator id, report
and target snapshots, decision, content action, reason, prior status, and
timestamp. The audit table has no browser access; UPDATE and DELETE are
rejected by a database trigger. Audit rows have no cascading profile/report
foreign keys, so deleting an account or report later does not erase recorded
decisions. Existing report rows still follow their established cascade when
the reporter or target profile is deleted; an unresolved report can therefore
disappear before a decision is recorded. Operators should prioritize urgent
reports before processing such deletions when feasible.

The queue is bounded to the latest/oldest 100 rows per tab and has no alert,
appeal, SLA, or notification workflow. Operators must check it manually.
For account compromise, privacy exposure, or an RLS/RPC failure, escalate to
the database/security owner before changing schema or grants. Never grant a
service-role secret to the browser, support form, or analytics adapter.

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

- No automated notification, appeal, or response-time tracking exists. The
  internal queue requires manual review.
- No notification or appeal system exists. Do not add email, push, or in-app
  alerts by coupling them to public profile reads or product analytics.
- Open reports still cascade when a reporter or target profile is deleted.
  Completed decision history is retained independently in the immutable audit
  table. Changing report retention requires a separate privacy review.
- Block cleanup intentionally retains guestbook rows for protected review.
  Changing that retention choice affects evidence preservation, deletion, and
  public projection behavior.
- Moderator allowlist provisioning is an external database-operator task; the
  application does not expose a moderator-management screen. No emergency
  global interaction switch exists.
- Per-account rate limits mitigate burst abuse but do not detect coordinated
  abuse, evade compromised accounts, or replace human review.
- Product-event measurement excludes moderation fields entirely. A future
  analytics sink must not become a report queue, moderation log, or source of
  private profile data.
