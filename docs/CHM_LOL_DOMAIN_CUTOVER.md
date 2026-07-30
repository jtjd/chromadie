# chm.lol Domain Cutover Plan

Date: 2026-07-29

Status: **repository implementation complete; external cutover pending**.

This document separates checked-in behavior from Cloudflare, Supabase, and
email operations. No DNS, Cloudflare custom-domain, Supabase dashboard, or
email-template installation was performed by this repository change.

## Target strategy

- Primary public origin: `https://chm.lol`
- Canonical public profile: `https://chm.lol/<username>`
- Compatibility profile: `/u/<username>` remains readable and redirects to
  the canonical root-username path unless `legacy=1` is explicitly used by
  the owner compatibility flow.
- Legacy origin: `https://chromadie.com` remains an accepted transition origin;
  repository origin helpers canonicalize its public links to `chm.lol`.
- Local development remains `http://localhost:5173` or
  `http://127.0.0.1:5173`.
- A configured preview origin remains distinct from production when supplied
  through the deployment environment.

## Repository checklist

- [x] One shared canonical-origin helper distinguishes production, legacy,
  local, and configured preview origins.
- [x] `index.html`, JSON-LD, canonical metadata, Open Graph URLs, Twitter
  card URLs, static sitemaps, `robots.txt`, and `llms.txt` use `chm.lol`.
- [x] Dynamic profile metadata, profile JSON-LD, profile OG cards, challenge
  metadata, and share helpers use the canonical origin.
- [x] Public profiles use `/<username>`; `/u/<username>` is a compatibility
  route with noindex behavior for `legacy=1`.
- [x] The shared reserved-route definition covers real top-level app routes,
  Pages Functions, static assets, preview endpoints, encoded-path checks, and
  username validation.
- [x] `supabase/config.toml` retains local and legacy auth callbacks while
  adding the canonical callback and reset URLs.
- [x] Authentication URL helpers reject cross-origin `next` values and keep
  local development local.
- [x] Visible links in the checked-in email templates say `chm.lol`; the
  templates still use Supabase's dynamic `{{ .SiteURL }}` values.
- [x] Automated tests cover root routing, `/u` compatibility, reserved and
  encoded paths, canonical metadata, share URLs, old-origin handling, and
  auth callback safety.
- [ ] Update the production Pages `VITE_SITE_URL` to `https://chm.lol` and
  verify the deployed value after the custom domain is attached.

## Cloudflare Pages checklist — external operator action

- [ ] Attach `chm.lol` to the Pages project.
- [ ] Verify DNS records and the managed SSL certificate for `chm.lol`.
- [ ] Attach `www.chm.lol` only if the owner wants a `www` public origin;
  otherwise leave it unattached.
- [ ] Keep `chromadie.com` attached during the transition.
- [ ] Add one host-only legacy forwarding rule from
  `chromadie.com/*` to `https://chm.lol/$1`.
- [ ] Use temporary redirects during staged rollout; change to a permanent
  redirect only after verification. Do not match `chm.lol` in that rule.
- [ ] Purge cached HTML after the canonical host is live.
- [ ] Verify no redirect loop for `/`, `/u/<username>`, `/c/<id>`,
  `/auth/callback`, `/reset-password`, `/privacy`, and `/leaderboard`.
- [ ] Confirm maintenance/preview access behavior before removing the gate.

## Supabase checklist — external operator action

- [ ] Set the Site URL to `https://chm.lol`.
- [ ] Allow exactly these production callback/reset URLs during transition:
  - `https://chm.lol/auth/callback`
  - `https://chm.lol/reset-password`
  - `https://chromadie.com/auth/callback`
  - `https://chromadie.com/reset-password`
- [ ] Retain local-development exceptions only where needed:
  `http://localhost:5173/auth/callback`,
  `http://localhost:5173/reset-password`, and matching `127.0.0.1` URLs if
  local testing uses them.
- [ ] Verify email confirmation, password reset, and OAuth callback flows on
  the canonical host before removing legacy URLs.
- [ ] Do not add wildcard redirect URLs.

## Email checklist — external operator action

- [x] Repository templates have canonical visible `chm.lol` labels.
- [ ] Install the reviewed confirmation, invite, magic-link, recovery,
  email-change, address-changed, password-changed, and reauthentication
  templates in Supabase Auth.
- [ ] Send test confirmation, recovery, and email-change messages.
- [ ] Verify every button uses an allowed canonical callback/reset URL.
- [ ] Confirm support/contact references remain valid mailbox addresses.

The repository does not claim that the templates were installed or that the
mailboxes were changed. Existing support addresses remain
`support@chromadie.com` and `business@chromadie.com` until mailbox ownership
is separately confirmed.

## Post-cutover verification checklist

- [ ] `https://chm.lol/` loads successfully and is canonical to itself.
- [ ] A known public profile at `https://chm.lol/<username>` returns 200,
  includes profile JSON-LD and OG/Twitter URLs, and exposes no private fields.
- [ ] `/u/<username>` redirects safely or renders only the documented legacy
  compatibility view.
- [ ] Old-origin `/` and `/u/<username>` make one safe hop to `chm.lol`.
- [ ] Direct profile refresh, owner profile, visitor profile, settings,
  discovery, social interactions, shop, guest roll, and authenticated roll
  work in browser smoke tests.
- [ ] Login, email confirmation, password reset, and OAuth callback flows
  remain safe and do not create cross-domain cookie or redirect loops.
- [ ] Challenge links, sitemap index/core/profile sitemap, `robots.txt`,
  canonical tags, OG previews, and `llms.txt` all use the intended origin.
- [ ] Mobile browser tests pass at the supported profile and editor sizes.
- [ ] The maintenance gate is removed only after this checklist is complete.

## Redirect policy

The repository uses a temporary `307` for `/u/<username>` during staged
rollout so the compatibility behavior can be reversed without browser
caching. A Cloudflare host-forwarding rule should likewise remain temporary
until the new host and auth flows are verified. Permanent `308` forwarding is
a later, separately reviewed cutover step.
