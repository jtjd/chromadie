# Competitor parity — Milestone 13: certification and rollout

**Status:** implementation complete locally; production rollout remains
operator-controlled
**Date:** 2026-08-08

## Goal

Certify that a complete free profile, a premium media identity, and a creator
provider identity retain Chromadie’s profile-first composition and daily color
ritual while the new parity surfaces can be released in reversible stages.

## Delivered slice

- Added `src/lib/profileFeatureFlags.js`, a build-time audience resolver for
  commerce, rich media, V2 configuration, expanded analytics, and social depth.
  It supports staff, internal allowlist, deterministic cohort, all, and off
  stages plus independent per-surface switches.
- Gated the corresponding client surfaces. Commerce pauses purchase entry
  without changing entitlement authority; rich media pauses to the existing
  image path; V2 falls back to the V1 normalizer; expanded analytics and
  social-depth settings/controls can disappear without removing baseline
  profile interactions.
- Added the three-profile certification fixture at
  `docs/certification/PROFILE_PARITY_CERTIFICATION.json` and the executable
  `npm run check:profile-certification` contract check. It asserts the four
  Chromadie opening regions, free/premium capacities, desktop/mobile evidence,
  slow-network/media/reduced-motion/keyboard coverage, and audio entry behavior.
- Added the service-owned dashboard/alert contract in
  `docs/operations/M13_ROLLOUT_DASHBOARD.md` for Stripe fulfillment, staged
  uploads and quotas, provider failures, analytics retention, and report volume.

## Compatibility and security boundaries

- Feature flags are presentation controls only. Supabase RPC authorization,
  Stripe webhook fulfillment, storage validation, RLS, scoring, rolls,
  rewards, and prestige remain authoritative outside the browser.
- Existing V1 profile configuration is still read when V2 is paused or absent.
  Existing free image expression, Spotify/YouTube support, and earned identity
  history remain available when rich media is paused.
- Rollback is a flag or bundle change. Additive media, analytics, social, and
  billing rows are not deleted as part of a rollback.
- The operations contract is service-role-only and excludes viewer identity,
  storage paths, raw provider payloads, and report identities.

## Rollout order

1. Verify additive migrations and matching Edge Functions in the target
   Supabase project with the authorized release owner.
2. Deploy a Pages bundle with all M13 flags off or at `staff` and run the
   certification contract, desktop/mobile visual matrix, slow-network/media
   failure checks, reduced-motion and keyboard checks, and audio entry smoke.
3. Promote staff → internal premium accounts → limited deterministic cohort →
   all users while recording dashboard snapshots and flag values.
4. If a panel or smoke gate regresses, disable only the affected flag or
   restore the prior bundle; keep the V1 renderer and canonical URLs intact.

## Acceptance evidence

- [x] Three certification profiles pass `npm run check:profile-certification`.
- [x] Desktop and mobile baseline profile screenshots are captured at
      `/tmp/chromadie-m13-public-0g`; the fixture records the full slow-network,
      media-failure, reduced-motion, keyboard-only, and click-unlocked audio
      matrix for the premium/creator certification fixtures.
- [x] `npm run test:browser` passes direct refresh, owner settings, keyboard-
      only navigation, reduced motion, and public profile rendering.
- [x] Full repository validation, local schema lint/reset, and database
      security checks pass before production enablement.
- [ ] Operations owner records panel ownership, alert thresholds, and a
      rollback commit for each rollout stage.
