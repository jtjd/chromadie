# Launch readiness tranche — 2026-09-28

## Objective

Run a production launch preflight, fix confirmed release, moderation, billing,
and media-lifecycle gaps through existing interfaces, and publish reviewed
code and additive database changes without weakening authentication, RLS,
payment authority, or historical data.

## Implementation plan

1. Audit current routes, branch protection, release workflow, public media
   lifecycle, Stripe checkout, account deletion, and operations signals.
2. Add the smallest supported internal moderation queue and immutable audit
   history; preserve the service-role and authenticated-RPC boundaries.
3. Add refund-recovery media expiry and guard account deletion against active
   or unconfirmed Stripe sessions.
4. Reduce repeated hero-image transfer without changing rendered pixels.
5. Validate locally, back up the linked database, dry-run and apply additive
   migrations, test the live public journey, and record remaining release gates.

## Changes

- The unindexed `/moderation` route uses a separate service-managed staff
  allowlist and fixed authenticated RPCs. It supports review/dismiss decisions
  and hide/remove for reported guestbook content. Decision snapshots are
  immutable. It does not suspend accounts, freeze profile interactions, or
  take down user-uploaded media.
- A bounded, service-only queue processes Plus-only R2 assets after the
  30-day billing recovery period. It rechecks the entitlement and staff state,
  clears selected Plus-only media, preserves free media and preferences, and
  uses exact-key deletion plus CDN purge with retries.
- Checkout reservation and account deletion share an advisory lock. Account
  deletion expires open unpaid Stripe sessions and preserves paid or
  unconfirmed sessions until webhook confirmation. Unknown provider state
  fails closed.
- Shared desktop/mobile homepage hero PNGs were moved out of the deploy tree
  to `design/homepage-atmosphere/`; exact-pixel WebP versions are served from
  `public/homepage/`. The throttled local pricing run dropped by 348,457 bytes
  (13%) and 1.7 seconds in one run. No performance threshold changed.
- The production release check uses trusted base-branch code for
  `pull_request_target`; required environment access is limited to the actual
  Cloudflare Pages configuration check. Dependabot is grouped weekly and
  `SECURITY.md` documents reporting.

## Data and deployment

The linked database is the `Chromadie` project. Before applying migrations,
schema and data dumps were saved with mode `0600` under the local protected
backup directory, checksummed, and compared against a dry run. Migrations
`20260928140000_minimal_moderation_operations.sql`,
`20260928150000_refunded_plus_media_cleanup.sql`, and
`20260928160000_checkout_account_deletion_guard.sql` were applied and the
remote migration ledger now matches local. They add moderation audit/allowlist
and cleanup-queue state and replace fixed RPC/function bodies; they do not
delete account or media rows at migration time. Rollback should restore the
previous function definitions and remove only unused new objects after a
review of any rows created since deployment.

## Validation

- `npm run build`, `npm run check`, `npx eslint src/`, and all 903 Node tests
  pass.
- `npm run check:links`, `check:csp`, `check:performance`,
  `check:username-policy-drift`, `check:balance-drift`, `check:catalog-drift`,
  `check:scoring-parity`, `check:db-security`, and
  `npm audit --audit-level=high` pass.
- `npm run db:reset`, warning-level local schema lint, and linked warning-level
  schema lint pass. The delete-account Edge Function source passes a TypeScript
  syntax parse.
- Performance limits pass. Advisory aggregate catalogs remain over target at
  about 1,418 kB JavaScript / 800 kB and 650 kB CSS / 400 kB; the largest video
  remains 10,908 kB / 12,288 kB.
- Public routes returned successfully with the 401 maintenance page disabled.
  The signed-out guest roll completed on a fresh browser profile and saved only
  local device state. Public profile rendering had no browser exceptions.
  Signup, reset completion, authenticated profile editing, and a real Stripe
  payment were not submitted against production.

## Remaining release requirements

- Configure `CLOUDFLARE_API_TOKEN` in the GitHub `production` environment with
  Pages Read scope for the intended Cloudflare account. The account ID and
  Pages project name are configured; the release gate currently fails closed
  without this token.
- Provision at least one moderator through the restricted database operator
  channel before relying on the queue. The queue is manually checked and has
  no response-time, appeal, notification, or alert system.
- Add and verify a safe user-media report/takedown path that clears selection,
  deletes the owned R2 object, purges its public cache, and preserves an audit
  record. Keep broader user-uploaded media launch behind that work. Account
  suspension and a global interaction freeze are also unsupported.
- Review production operational logs and add uptime/error/backlog alerts. The
  repository contains no centralized exception collector or scheduled uptime
  check; production provider-side alert configuration was not verifiable here.
