# Phase 13.1 Cutover Checklist

Status: **CERTIFICATION INCOMPLETE — keep the temporary Pages gate active**

This checklist separates repository work from external operator work. A
checked-in change does not prove that Cloudflare, Supabase Auth, DNS, SSL, or
email configuration changed.

## Repository

- [x] Shared route-reserved and protected-username contracts exist.
- [x] Exact normalized reservation policy is checked in and SQL-seeded.
- [x] Database trigger, availability RPC, auth bootstrap, and reclaim paths are
  server-authoritative.
- [x] Existing `Admin` collision is documented and approved for grandfathering.
- [x] `username_blocklist` RLS is enabled without browser policies.
- [x] Username-policy drift check is registered as a validation command.
- [x] Canonical origin, profile metadata, share helpers, sitemap, robots,
  server-rendered profile pages, and auth URL helpers remain covered by the
  Phase 13 repository contract.
- [ ] Current performance budgets pass: initial JavaScript <=450 kB, largest
  lazy JavaScript <=100 kB, total JavaScript <=700 kB, initial CSS <=200 kB,
  largest lazy CSS <=75 kB, total CSS <=380 kB, and HTML <=12 kB.
- [ ] Fresh full-browser screenshot evidence for every Phase 13.1 state has
  been captured and human-reviewed in this checkout.

## Cloudflare Pages — external operator actions

- [x] Temporary password/maintenance gate remains active for staged review.
- [x] Public probes observed the gate on `chm.lol` and noindex behavior.
- [x] Legacy `chromadie.com` probes observed the configured temporary redirect.
- [ ] Verify `chm.lol` is attached to the intended Pages project.
- [ ] Verify apex DNS and managed SSL.
- [ ] Decide whether `www.chm.lol` should be attached; do not attach it by
  accident.
- [ ] Verify the current production deployment includes the reviewed bundle.
- [ ] Verify host-only legacy forwarding, temporary status, query preservation,
  and no redirect loops.
- [ ] Purge cached HTML only when the deployment owner decides it is required.
- [ ] Remove the password gate only after all post-cutover checks pass.

## Supabase

- [x] Phase 13 identity migration is part of the aligned production baseline.
- [x] The additive Phase 13.1 reservation migration is present in the linked
  migration history.
- [x] All 171 reservation rows, including the `Admin` grandfather row, were
  verified read-only on 2026-08-08.
- [x] Reservation-table and blocklist RLS, browser grants, helper grants,
  trigger policy, and direct-write rejection remotely.
- [ ] Confirm Site URL is `https://chm.lol`.
- [ ] Confirm only required canonical, legacy-transition, preview, and local
  auth callback/reset URLs are allowed.
- [ ] Test confirmation, password reset, and any existing OAuth callback on
  the canonical host.

## Email

- [x] Checked-in visible template labels use the canonical origin.
- [ ] Install/review confirmation, recovery, invite, magic-link,
  email-change, address-changed, password-changed, and reauthentication
  templates in Supabase Auth.
- [ ] Send real confirmation and reset messages and verify the received links.
- [ ] Confirm support/contact references and mailbox ownership separately.
- [ ] Redact email addresses and tokens from stored evidence.

## Post-cutover verification

- [ ] `https://chm.lol/` returns the intended public status after the gate is
  deliberately removed and does not carry accidental `noindex`.
- [ ] Known public profile, direct refresh, `/u/<username>` compatibility,
  unknown user, blocked/private/deleted state, and reserved routes behave as
  documented.
- [ ] Owner/visitor identity parity, settings save, signup, login,
  confirmation, password reset, guest roll, authenticated roll, shop,
  discovery, social, and rapid-refresh protections pass.
- [ ] Canonical tag, OG URL, JSON-LD, sitemap, robots, share URL, and legacy
  redirect are verified on the deployed host.
- [ ] Desktop Chromium, desktop Firefox, mobile Firefox, and mobile Chromium
  smoke tests pass without horizontal overflow.
- [ ] No mixed-domain cookies, callback loops, or redirect loops remain.
- [ ] Release owner records rollback contact and the exact deployment commit.

## Gate removal rule

Do not remove the Pages password/maintenance gate based on repository status
alone. The gate stays until the external Cloudflare, Supabase, email, browser,
and remote reservation checks above are green. Until then the public-launch
recommendation is **NO-GO**.
