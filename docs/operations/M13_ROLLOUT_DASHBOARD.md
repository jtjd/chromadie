# M13 rollout and operations dashboard contract

**Status:** certification-ready, service-owned read-only contract
**Owner:** release/operations owner (assign before enabling a production cohort)
**Scope:** commerce, rich media, V2 configuration, expanded insights, and
social depth

This document defines the panels and alerts required before the matching
client surfaces are enabled. It is a dashboard contract, not a browser route:
all database queries run with a service role or an approved read-only
operations connection. User IDs, storage paths, event IDs, viewer identity,
IP addresses, raw user agents, and complete referrer URLs must not appear in
the dashboard or its exports.

## Panels

### Stripe fulfillment

Use `billing_webhook_events` for durable, idempotent event outcomes and the
Edge Function log stream for HTTP/signature failures (a rejected request must
not create a row).

```sql
select date_trunc('hour', processed_at) as hour,
       outcome,
       count(*) as events
from public.billing_webhook_events
where processed_at >= now() - interval '24 hours'
group by 1, 2
order by 1 desc, 2;
```

Alert on any signature/HTTP failure, a pending event older than 10 minutes, or
a sustained increase in `ignored` outcomes. Duplicate event IDs are expected
to be harmless and should be visible as a replay counter in the function
logs. Only the verified webhook processor may grant or revoke Plus.

### Staged-upload cleanup and storage quota

Rich media rows are private and bounded. Track overdue staged rows and the
aggregate profile quota without displaying account identifiers.

```sql
select count(*) filter (where status = 'staged') as staged_rows,
       count(*) filter (where status = 'staged' and cleanup_at < now()) as overdue_rows,
       count(*) filter (where status = 'abandoned') as abandoned_rows,
       coalesce(sum(byte_size) filter (where status in ('staged', 'active')), 0) as total_bytes
from public.profile_media_assets;

select count(*) as profiles,
       max(bytes) as max_profile_bytes,
       percentile_cont(0.95) within group (order by bytes) as p95_profile_bytes
from (
  select user_id, coalesce(sum(byte_size), 0) as bytes
  from public.profile_media_assets
  where status in ('staged', 'active')
  group by user_id
) quota;
```

Alert when overdue staged rows remain after a cleanup run, when any profile
approaches 150 MB, or when the cleanup function fails. Deleting an active
asset must clear its selected configuration reference before removing the
object; a dashboard alert must never trigger a destructive manual delete.

### Provider-adapter failures

Provider cards are allowlisted and lazy-loaded. Emit a bounded structured
metric from the provider adapter/Edge request log with the event name
`profile_provider_error` and only `provider`, `type`, `status_class`, and a
coarse `failure_kind` (`timeout`, `network`, `blocked`, `invalid_payload`). Do
not send profile IDs, viewer IDs, URLs, query strings, or response bodies.

Display a 24-hour count and error rate per provider, and alert on a provider
whose error rate exceeds 5% for 15 minutes. A provider outage isolates that
card and never blocks the rest of the profile or changes configuration data.

### Analytics retention

The service-owned `profile_insight_daily` table is the dimensional source;
`profile_view_daily` remains for compatibility during the V1/V2 transition.

```sql
select max(insight_date) as newest_insight_date,
       min(insight_date) as oldest_insight_date,
       count(*) filter (where insight_date < current_date - 90) as overdue_rows
from public.profile_insight_daily;

select max(view_date) as newest_legacy_view_date,
       count(*) filter (where view_date < current_date - 90) as overdue_legacy_rows
from public.profile_view_daily;
```

Pair the result with the scheduled cleanup function log and alert when either
table has rows older than 90 days or a cleanup run is missing. This panel is
aggregate-only; analytics never feed discovery, ranks, rewards, badges, or
social counts.

### Social report volume

Moderation receives reports through the bounded RPC. Show volume and status,
not reporter identity or report details, to the operations dashboard.

```sql
select date_trunc('day', created_at)::date as day,
       status,
       reason,
       count(*) as reports
from public.profile_reports
where created_at >= now() - interval '30 days'
group by 1, 2, 3
order by 1 desc, 2, 3;
```

Alert on a sudden 3x day-over-day increase or an unreviewed queue older than
24 hours. Moderation staff alone can read report details; this dashboard
should expose only the bounded counts needed for capacity planning.

## Rollout stages and rollback

Deploy additive migrations and the matching Edge Functions before enabling the
browser bundle. Configure one stage at a time:

```text
VITE_CHROMADIE_ROLLOUT_STAGE=staff
VITE_CHROMADIE_ROLLOUT_STAGE=internal
VITE_CHROMADIE_INTERNAL_IDS=user-id-a,user-id-b
VITE_CHROMADIE_ROLLOUT_STAGE=cohort
VITE_CHROMADIE_COHORT_PERCENT=10
VITE_CHROMADIE_ROLLOUT_STAGE=all
```

The sequence is staff, internal premium accounts, a limited cohort, then all
users. Each `VITE_CHROMADIE_FLAG_*` can be set to `false` independently. To
rollback, disable the affected flag or restore the prior Pages bundle. The
additive rows and media remain recoverable, V1 configuration remains readable,
and no browser path can grant an entitlement or bypass an RPC boundary.

Record the release commit, flag values, migration/function versions, panel
snapshot, and smoke evidence for every stage transition.
