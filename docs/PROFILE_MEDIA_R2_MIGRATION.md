# Profile Media: Supabase Storage → Cloudflare R2

Status: local implementation slice complete; Cloudflare provisioning, active
asset backfill, and production cutover remain operator-gated.

This migration moves profile-media bytes out of Supabase Storage without
changing Supabase's authority over authentication, profile configuration,
ownership, metadata, quotas, selection, RLS, account lifecycle, or optimistic
concurrency.

## Non-negotiable storage policy

CHM uses **R2 Standard only** for profile media.

- No Infrequent Access storage.
- No automatic lifecycle transition to Infrequent Access.
- No Cloudflare Images, Stream, Cache Reserve, or paid media proxy in this
  migration.
- R2 billing alerts are notifications, not hard service shutoffs.
- Application quotas and the 8 GB active/public safety cap are enforced by CHM
  control-plane/database policy, independently of Cloudflare billing alerts.

The operator must verify both R2 buckets have no lifecycle rule that changes
storage class before enabling the production flag.

## Target ownership

Supabase remains the authority for auth, identity, profile configuration,
ownership, metadata, quotas, selection, RLS, account lifecycle, and
concurrency tokens. R2 Standard owns object bytes. `media.chm.lol` is the
public custom domain for the public bucket and is cached by Cloudflare.

Normal public delivery is:

```text
profile renderer → media.chm.lol → Cloudflare Cache → public R2 (miss only)
```

No Worker proxies normal media GETs. Pages/control-plane functions only
authorize uploads, verify objects, promote objects, enforce deletion, and
retry account cleanup.

## Two-bucket lifecycle

New uploads are authorized against an immutable key such as:

```text
profiles/<user-id>/<asset-id>/<sha256>.<extension>
```

The browser uploads directly to the private Standard bucket using a short-lived
presigned PUT URL. The control plane verifies size, MIME, hash metadata, and
the database authorization. Only a verified `ready` asset can be selected.

On first public selection:

```text
private R2 upload
  → copy to the same immutable key in public R2
  → verify public object
  → record that destination key with the publication transition
  → mark ever_public/public-ready in Supabase
  → select asset
  → delete temporary private copy
```

The private/public overlap is temporary. A normally published asset has one
authoritative byte copy in public R2. If private cleanup fails, the metadata
response reports pending cleanup and the object is retried; it is not silently
treated as complete.

The scheduled control-plane cleanup also claims promoted assets whose temporary
private deletion failed, removes that private key, and leaves the public key
unchanged. This keeps the two-bucket overlap temporary without coupling public
profile availability to a transient delete failure.

Once an asset has been public, `ever_public` remains true. Unequip clears only
the profile selection; it does not make the asset private again. Re-equipping
reuses the existing public object. Explicit asset deletion removes the public
and any remaining private object, then finalizes metadata. If either R2 delete
fails, the tombstoned metadata row is retried by the scheduled cleanup path
before finalization. Immutable URLs mean replacement does not need a cache
purge; hard deletion may require a purge or an equivalent privacy-removal
operation.

## Current implementation slice

The additive migrations add provider/status/key/hash fields to
`profile_media_assets`, typed asset-ID compatibility columns to
`profile_configurations`, provider-neutral `media_references` projections,
R2 selection validation, and R2-aware deletion semantics. Legacy `*_path`
fields remain readable and are not a blocker for the storage cutover.

The control-plane endpoints are:

- `POST /api/profile-media/upload-intent`
- `POST /api/profile-media/complete`
- `POST /api/profile-media/promote`
- `POST /api/profile-media/delete`
- `POST /api/profile-media/account-cleanup` (scheduled/service secret)

The feature flag `VITE_CHROMADIE_FLAG_PROFILE_MEDIA_R2` keeps new browser
uploads opt-in while the provider-neutral resolver can already read promoted
R2 assets. For a narrow canary, set
`VITE_PROFILE_MEDIA_R2_CANARY_IDS` to a comma-separated list of explicit Auth
UUIDs; when that list is non-empty, only those UUIDs can receive the R2 path.
This is R2-specific and does not change the general rollout stage or unrelated
feature flags. The existing Studio state contract is unchanged:

```text
scoped editor patch → canonical studioDraft → render snapshot → ProfileShell
```

## Hardening gate before enablement

The direct-upload path uses a server-only SigV4 implementation. Canonical
headers and signed query fields are sorted from the same normalized input, and
server-side R2 requests sign the exact `x-amz-date` and content-hash headers
that they send. Presigned uploads also bind the authorized `Content-Length`.
Deterministic signing vectors are covered in
`test/profile-media-r2-hardening.test.js`; `npm run test:r2:integration` must
also be run against a disposable R2 bucket before a production canary. That
smoke performs presigned PUT, authenticated HEAD/GET, private-to-public copy,
and deletion. It skips cleanly without credentials and is not evidence of
Cloudflare acceptance until it reports a live success.

Completion reads and hashes the actual private R2 bytes and validates the
allowlisted container signature (WebP, ANI, MP4, WebM, or MP3) before the
asset can become ready or selectable. The R2 intent RPC counts physical
private/public bytes, staged uploads, failed cleanup rows, and per-kind
pending/active objects against the application safety limits. Historical
limits remain server-side: three background videos, five audio assets, and
one banner, cursor, or pointer cursor; one-slot replacement excludes only the
asset being replaced.

Explicit public deletion is the only normal media operation that purges the
exact immutable `media.chm.lol` URL. Replacement and unequip do not purge.
R2 deletion and Cloudflare purge are tracked independently on the tombstone,
so a purge failure remains retryable. Expired or failed private uploads are
also claimed by the scheduled cleanup endpoint. Account cleanup jobs use a
15-minute database lease and reclaim both expired and legacy null-lease
processing rows; account deletion remains asynchronous and user-friendly.

The active-media migration distinguishes standalone audio from playlist
tracks. A playlist migration updates only the matching track's `asset_id`,
while the standalone selection updates only `audio_asset_id`; the migration
selection RPC locks the configuration and preserves unrelated fields. The
work list is idempotent and safe to rerun after a partial playlist failure.

The final correctness migration also guards every legacy-path deletion test
with `storage_path IS NOT NULL`, so two NULL paths cannot be mistaken for a
selection. The delete API preserves `configuration_changed`,
`cleared_reference`, `updated_at`, and cleanup state. Promotion clears the
temporary private key after a successful delete or idempotent 404, while
completion and promotion accept already-ready/already-public retries.

Presigned PUTs sign the authorized exact `Content-Length`; the live smoke must
prove that R2 rejects both oversized and undersized bodies before the upload
canary is enabled. A standalone Cloudflare Worker with a 15-minute Cron
Trigger invokes the existing cleanup endpoint over HTTPS using the server-only
cleanup secret. It is control-plane-only and never handles public media GETs.

No production feature flag, active-media backfill, public R2 cutover, or
Supabase Storage deletion is performed by this hardening pass. Those actions
remain blocked until the live R2 smoke, Cloudflare purge test, staged
backfill verification, and browser/network zero-Supabase-Storage audit have
all passed.

### Storage dependency audit

| Current use | Migration disposition |
| --- | --- |
| `ProfileExpressionEditor.svelte` avatar/background/standalone-audio upload and deletion | R2 control plane when the feature flag is enabled; legacy Supabase path retained during rollback window |
| `ProfileRichMediaEditor.svelte` video/banner/cursor/audio upload and selection | R2 control plane when enabled; legacy staged Storage RPC path retained temporarily |
| `profileMedia.js` legacy URL fallback | Keep temporarily for historical Supabase assets; no new public R2 URL uses it |
| `profileRenderModel.js`, ProfileShell, ProfileMusic | Provider-neutral `media_references` first, legacy path fallback second |
| Discovery, homepage, leaderboard, cosmetics, Shop previews | Updated to consume the same `avatarReference`/`media_references` contract |
| `_profilePage.js` metadata/OG resolver | Provider-neutral R2 reference first, legacy Supabase fallback during migration |
| Supabase Storage RPCs, RLS, and cleanup triggers | Keep temporarily for legacy rows and rollback; retire only after the zero-read window |
| `supabaseStorage.js` local compatibility/mock transport | Unrelated transport compatibility; do not remove as part of the profile cutover |

The verified immediate egress cause was public ProfileShell generating a fresh
`Date.now()` value and passing it through `getProfileMediaUrl()` as `?v=...`.
That path is removed. Remaining timestamp values in editor-only preview/cache
code are intentionally scoped to owner previews and do not enter public R2
references. The background/video fix also prevents simultaneous full image and
video environment downloads in normal motion mode; reduced-motion keeps the
static fallback.

## Account deletion

Account deletion does not wait for Cloudflare. Before profile rows cascade,
`delete_account_data` captures the user's R2 private/public keys in
`profile_media_account_cleanup_jobs`. The profile is removed immediately, the
public route disappears, and the Auth user deletion proceeds. A scheduled
control-plane request claims jobs, deletes only the recorded owned keys, and
marks success or schedules exponential retry. A Cloudflare outage therefore
cannot make a user unable to delete their account.

## Immediate egress mitigation

Public ProfileShell media no longer appends a per-render `Date.now()` query
parameter. R2 references resolve to stable immutable URLs. Legacy Supabase
paths remain cache-stable in public rendering; cache-busting is available only
to explicit editor-preview callers during the compatibility window.

When a background video is active and motion is allowed, ProfileShell does not
mount or use the full background image as a video poster. The resolved
background color remains the lightweight loading fallback, and reduced-motion
mode uses the static background path. A future optimized poster can be added
as its own bounded media reference without reusing the original full image.

## Cutover runbook

### Phase A — reduce avoidable Supabase egress

Deploy the stable public URL resolver and background/video loading fix. Measure
Supabase Storage requests and verify public profiles no longer emit changing
`?v=<timestamp>` URLs.

Rollback if media error rates rise or a public profile emits an invalid URL.

### Phase B — provision R2

Create two **Standard** R2 buckets, a private upload bucket and a public
delivery bucket. Attach `media.chm.lol` only to the public bucket. Keep
`r2.dev` disabled in production. Add server-only R2 credentials and a cleanup
secret to Pages/Functions. Configure no IA lifecycle rule.

For browser PUTs, configure CORS only for CHM origins and only for the required
PUT headers (`Content-Type`, `x-amz-meta-sha256`) and methods. The public custom
domain needs no broad browser CORS for ordinary `<img>`, `<video>`, or `<audio>`
delivery; add only the actual cross-origin fetch requirements discovered in
the browser audit.

Rollback by leaving the feature flag disabled; no Supabase data changes are
required in this phase.

### Phase C — direct R2 new uploads

Enable the flag for an internal cohort. Verify auth, kind/extension/MIME,
post-upload object metadata, byte size, SHA-256, entitlement, and the 150 MB
per-user quota before readiness. Register only `ready` assets and reject
failed/incomplete assets from selection.

Rollback by disabling the flag. Existing Supabase uploads remain readable.

### Phase D — migrate active selected assets

Run `scripts/migrate-profile-media-to-r2.mjs` in dry-run mode first, then with
`R2_MIGRATION_APPLY=1`. It is limited to currently selected profile assets and
playlist tracks, copies/validates bytes, promotes to public R2, deletes the
temporary private copy, updates provider metadata, and switches typed
selection references only after public verification. Re-running is safe.

Dormant private library assets are not copied by default. They can be
migrated later on first publication or explicitly handled by an operator.

Rollback during the compatibility period is to keep the old Supabase path and
provider metadata until the R2 copy is verified. A failed migration must not
clear the old selected path.

### Phase E — public R2 resolution

Enable provider-neutral projections and confirm the following surfaces consume
`media_references`: public profile, server metadata/OG, Discovery, homepage
previews, leaderboard rows, Studio previews, cosmetics previews, and music.
The cutover assertion is:

```text
normal public profile visit → zero Supabase Storage media requests
```

Keep a rollback flag/compatibility path until this is true across direct
refresh, mobile, reduced-motion, video, audio, and no-avatar profiles.

### Phase F — disable new Supabase uploads

After internal/cohort and active-asset checks pass, remove normal new-upload
authorization for Supabase Storage while retaining legacy reads and narrowly
scoped deletion compatibility. Do not delete old buckets yet.

### Phase G — retire old bytes and policies

After a full active-selection audit, a sustained zero-read observation window,
and a tested account/asset deletion path, delete migrated Supabase objects in
an operator-controlled batch. Retain the old schema paths/RPCs until no live
client or server route depends on them. Remove Storage public-read/upload/
delete policies and buckets only after a repository-wide search and production
request audit find no remaining profile or unrelated consumer.

## Cloudflare operator configuration

Required server values are documented in `.env.example` and must never use
`VITE_` prefixes:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PRIVATE_BUCKET=chm-profile-media-private
R2_PUBLIC_BUCKET=chm-profile-media-public
MEDIA_PUBLIC_ORIGIN=https://media.chm.lol
R2_ACCOUNT_CLEANUP_SECRET
```

Recommended application alarms are below the free allowance rather than
assuming billing alerts will stop traffic: 8 GB active/public R2 storage cap,
an approximately 800,000 Class A soft warning, and a Class B warning threshold
below the free allowance. Cloudflare billing notifications at $1/$5/$10/$15
are review signals, not service shutoffs.

## Verification and tests

The implementation must keep coverage for stable public URLs, no public
timestamp cache busting, direct-upload authorization failures, post-upload
verification, ready-only selection, active Supabase→R2 migration, failed
migration fallback, video/reduced-motion source selection, explicit deletion,
account cleanup retry, and R2-only public resolution after the final flag.

The final correctness gate also requires real database coverage for deleting an
unused R2 row whose legacy path is NULL, operation-token propagation through
the delete endpoint, idempotent completion/promotion after private cleanup,
and exact signed Content-Length behavior. The cleanup queue is invoked by the
standalone `workers/profile-media-cleanup-scheduler` Cloudflare Worker every
15 minutes; it only triggers the existing control-plane endpoint and never
proxies public media GETs. Install `R2_ACCOUNT_CLEANUP_SECRET` as a Worker
secret and set the HTTPS `CLEANUP_ENDPOINT_URL` variable. The Worker logs a
bounded invocation summary (claimed, orphan, deleted, and retried counts)
without logging the secret.

The direct-upload smoke must be run with disposable R2 credentials before a
canary. It signs the exact expected Content-Length and attempts both an
oversized and undersized PUT. If a real R2 run accepts either mismatch, the
canary is blocked and an upload-only enforcement gate is required; no public
delivery Worker is introduced as a workaround.

External gates remain required before production enablement: R2 bucket/domain
creation, CORS validation, cache rules, secret installation, a dry-run
backfill report, and browser/network confirmation that public profile visits
make zero Supabase Storage media requests.
