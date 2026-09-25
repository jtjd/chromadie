# Codebase security and reliability audit — 2026-09-24

## Objective

Review actionable client, backend, privacy, and runtime defects, then fix
confirmed issues through the existing interfaces. Preserve authentication,
RLS, authoritative gameplay RPCs, profile history, and deployment behavior.

## Review scope

Three GPT-6 Luna Max reviewers examined backend security, client security, and
runtime reliability. Follow-up review covered authentication messaging,
Profile Studio account transitions, stale and rejected asynchronous actions,
third-party embeds, stored and newly uploaded media, progression analytics,
deployment headers, CI permissions, and dependency advisories.

## Remediations

- Keep same-page fragment links on native hash navigation so Profile Studio's
  unsaved-change controller sees them. Clear account-owned drafts, previews,
  locks, and pending navigation on account changes; pin each asynchronous
  mutation to the access token that started it and discard stale results.
- Recover from rejected profile, achievement, media-library, and auth-session
  reads so loaders release and callers can retry. Keep account-state auth
  responses neutral and remove the profile-insight recency key when consent is
  denied.
- Require an explicit click before loading public Spotify and other third-party
  profile embeds.
- Parse image dimensions from JPEG/WebP frame headers and PNG IHDR before
  browser decode; reject animated PNG and animated static-WebP inputs. Parse
  GIF/WebP frame structures, ANI RIFF chunks, declared cursor dimensions, and
  embedded frame resources, including complete DIB XOR/AND planes and
  checksummed PNG chunks. Reject nested APNG animation and enforce cursor
  frame/step ceilings. Enforce bounded encoded dimensions/frame counts before
  server-side media promotion. For MP4, compare H.264 SPS dimensions with the
  sample entry, check `stts`/`ctts` sample timing and absolute presentation
  timestamps against `mdhd`, and accept only a single validated 1× edit-list
  segment. Unsupported edit rates fail closed. For WebM, inspect every VP8/VP9
  frame dimension rather than trusting track metadata. Keep video limits at
  1280×720 and 30 seconds.
- Add a versioned R2 media-validation gate. Existing R2 references stay hidden
  until an owner-triggered request reads the stored object, checks its size,
  MIME, SHA-256, and current format-specific bounds, then stamps the row with
  the validated policy version. The expression and hosted-media libraries now
  expose recheck and delete controls; rows without a trustworthy saved hash
  direct the owner to re-upload. If a legacy public copy fails but its private
  copy is still valid, the server restores the public copy and purges that URL
  from Cloudflare before marking it verified. Promotion and public reference
  projections require the validated version and a well-formed content hash.
- Bind library deletion and legacy-audio removal feedback to the account that
  started the action. Restrict the named QA inventory grant to profiles that
  are staff when the migration runs.
- Serialize the profile/day profile-insight dimension limit under concurrent
  requests. Add an atomic limit of 500 progression analytics events per
  account/UTC day; a rejected event does not alter shared aggregates. Both
  preserve existing RPC contracts and client-facing access boundaries.
- Apply security headers to Cloudflare Pages Function HTML responses, make CI
  token permissions read-only, ignore local `.env.*` files while keeping the
  example template visible, and resolve the vulnerable `devalue` lockfile
  version.

## Data and compatibility

Three additive migrations were added. `20260924100000_profile_insight_daily_cap_serialization.sql`
serializes the existing 500-dimension profile/day check and reapplies its
existing service-role-only execution grants; it adds no stored user data.
`20260924120000_progression_analytics_account_quota.sql` adds a private
per-account/day counter, an atomic 500-event daily limit, and indexed
90-day cleanup. The counter cascades when its auth user is deleted and is not
directly accessible to client roles. Existing event aggregation, profile
history, roll eligibility, rewards, scoring, RLS, and RPC signatures remain
unchanged. `20260924150000_profile_media_content_validation_version.sql`
adds a default-unverified media-policy marker for R2 rows, leaves legacy
Supabase storage paths inert, requires the marker for R2 publication, and hides
older R2 references until the control plane validates their actual stored
bytes. New uploads are marked only after byte-level server verification. The
public runtime remains R2-only; public V1/V2 profile projections also strip
legacy media paths from fields and audio playlist tracks, while owner
projections retain them for recovery.
## Validation

- `npm run build`, `npm run check`, `npx eslint src/`, and all 885 unit tests
  pass.
- Links, CSP, enforced performance budgets, username policy, balance, local
  catalog, scoring parity, and database security checks pass.
- `npm audit --audit-level=high` reports zero vulnerabilities. Aggregate
  asset-catalog JavaScript/CSS totals exceed advisory targets; all enforced
  route and initial-load budgets pass.
- `npm run db:reset`, warning-level local schema lint, progression behavior,
  database security, and profile-insight integrity checks pass against the
  migrations. npm reports zero known vulnerabilities at the high severity
  threshold.
- Catalog drift validation used local seed data; remote catalog credentials
  were unavailable.
- The optional local release-configuration check failed closed because
  `PREVIEW_PROTECTION` was not explicitly set to `off`. No deployment was
  attempted, and production Pages configuration was unavailable.

## Residual production checks

- Production Supabase rows, R2 buckets, stored media objects, and deployed
  control-plane bindings were not available for inspection. The migration
  hides legacy R2 references until owners recheck them. Rows whose stored hash
  is absent or mismatched require re-upload; production impact and the number
  of affected accounts remain unknown.
- Suppressing a legacy database reference does not remove an object already in
  the public R2 bucket. A previously known media URL can remain directly
  accessible until the owner deletes that asset or the object is otherwise
  removed. Profile Studio now offers deletion for hidden legacy rows; production
  object state and cache contents could not be inspected. Revoking known URLs
  automatically requires an edge media gateway or equivalent Cloudflare
  routing change, which cannot be verified from this repository.
- Production Supabase email-confirmation settings were not available for
  inspection. Client responses are neutral, but provider-level enumeration
  behavior still depends on that deployment configuration.
- Migration `20260919150000_grant_tjz_cosmetic_test_access.sql` resolves the
  mutable username `tjz` when it runs and grants active nonconsumables. The
  intended production identity cannot be verified from repository contents;
  confirm the target account before applying that historical QA migration to
  production.
