# Competitor parity M11 — identity, content, providers, and sharing

## Goal

Give a Chromadie profile the practical identity and sharing depth users expect
from guns.lol and haunt.gg while keeping the daily roll, earned history, and
structured renderer as the center of the profile.

## Delivered slice

- Added the additive `ProfileConfigurationV2` envelope. Existing V1 payloads
  remain readable, and the public renderer still consumes the normalized V1
  base projection during rollout.
- Added finite identity presentation controls: location, timezone, join-month
  display, avatar visibility, plain/typewriter description rhythm, and
  reduced-motion-aware entry animation.
- Bounded validated links to six stable-keyed HTTPS entries. All six share one
  finite link rail in every profile layout; there is no overflow continuation.
  Link alignment, monochrome, size, and glow are finite structured controls.
- Added a safe Markdown subset for About content. Markdown is parsed into an
  AST containing only paragraphs, lists, emphasis, strong text, code, and
  HTTPS links. Raw HTML, scripts, and non-HTTPS link targets are discarded.
  Free profiles retain four projects; Chromadie Plus and staff profiles may
  use up to ten.
- Added allowlisted GitHub, Twitch, Last.fm, and Discord provider cards while
  retaining Spotify and YouTube embeds. Free profiles retain two widget slots;
  Chromadie Plus and staff profiles may use four.
- Added a canonical/alias share dialog with copy, downloadable QR, and
  crawler-safe structured metadata controls. Metadata is normalized server-side
  and may select only validated profile media for custom share-preview output;
  historical banner data remains a compatibility fallback only.
- Kept the public acquisition surface within the blocking payload budgets by
  loading the identity card and QR dialog at their explicit interaction/render
  boundaries; the aggregate asset catalog remains advisory.

## Data and compatibility

Migration `20260808220000_profile_configuration_v2.sql` adds nullable V2 draft
and published columns, version checks, safe normalizers, V1 backfill, and
authenticated owner/public RPCs. Browser table writes remain prohibited.
Existing section RPCs remain compatible; V2 identity and presentation writes
use dedicated security-definer RPCs. Disabling the V2 client flag leaves V1
rendering and stored data intact.

## Acceptance and rollback

- V1/V2 normalization, six-link bounds, unsafe Markdown/URL rejection,
  provider allowlists, metadata path validation, and QR/share contracts have
  source and unit coverage.
- Local schema lint and reset pass after applying the migration. Public pages
  keep canonical URLs, OG/Twitter metadata, direct refresh, empty optional
  regions, and no raw HTML execution path.
- The complete repository validation suite and Chromium smoke flow pass; the
  browser harness accepts the authenticated redirect from `/login` to Profile
  Studio and verifies direct refresh, mobile, reduced-motion, and public
  profile rendering.
- Rollback disables the V2 client surface and continues reading the normalized
  V1 columns. The additive columns and RPCs can remain in place for a later
  retry; no profile history, roll, achievement, inventory, or prestige data is
  removed.
