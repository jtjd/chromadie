# Dashboard Parity Milestone 0 — Baseline and Project Control

Status: complete — 2026-08-08

## 2026-08-08 implementation checkpoint

- Linked and local migration history are reconciled through
  `20260805150000`; remaining launch gates are external rather than schema
  drift.
- `npm run test:browser` now exercises a real local Chromium session across
  signup, direct refresh, inline preview, draft blur, card/roll scoping,
  mobile focus, reduced motion, and a canonical public profile.
- Initial JavaScript fell from 464.29 kB to 251.26 kB, the largest lazy chunk is
  44.27 kB, initial CSS fell from 87.84 kB to 61.89 kB, and the largest lazy
  stylesheet is 43.53 kB. The manifest-backed critical-route budgets pass for
  auth, homepage, public profile, and dashboard entry surfaces.
- The full generated asset catalog is retained as an advisory trend at 770.01
  kB JavaScript and 375.73 kB CSS. It is not a release blocker because it adds
  mutually exclusive lazy routes that no user downloads in one route load.
- The complete required suite passes with 205 tests and the eight-step local
  Chromium smoke. External Cloudflare, Supabase Auth, email, and cutover checks
  remain tracked separately and do not keep this repository milestone open.

## Goal

Establish a reproducible, release-safe baseline before expanding the Profile
Studio. This milestone changes no profile schema, gameplay authority, public
configuration contract, or production data.

## Implementation slice

1. Reconcile local and linked migration history and record remaining external
   Cloudflare, domain, email, and browser gates separately from database truth.
2. Replace source-only browser assertions with an executable local Chromium
   smoke covering the public profile and authenticated Profile Studio at
   desktop, mobile, keyboard, and reduced-motion boundaries.
3. Replace the legacy aggregate release blocker with manifest-backed initial,
   lazy-asset, HTML, and critical-route budgets. Retain aggregate JavaScript and
   CSS as advisory catalog-growth indicators without changing product behavior.
4. Lock a competitor capability matrix that adapts useful expression features
   to Chromadie's profile-first product and rejects unsafe or off-strategy
   behavior.

## Capability disposition

| Capability | Decision | Chromadie boundary |
| --- | --- | --- |
| Reliable inline preview, private drafts, cross-tab editing | Adopt | One shared renderer; preview never publishes or mutates gameplay |
| Standalone sign-in and sign-up pages | Adopt next | First-class `/login` and `/signup` routes replace the homepage overlay while preserving safe return paths, confirmation, and password recovery |
| One- and two-character usernames | Adopt next | Broaden the shared client/database policy while retaining case-insensitive uniqueness, exact route reservations, moderation, and canonical profile routing |
| Appearance controls, curated layouts, borders, effects | Adopt | Structured configuration; page/card/roll scopes stay explicit |
| Reusable image, background, cursor, audio, and video assets | Adapt | Owner-scoped library, server validation, quotas, and staged publishing |
| About, projects, skills, galleries, custom cards | Adapt | At most four primary public regions; no unrestricted markup |
| Discord, GitHub, YouTube, Spotify, Twitch widgets | Adapt | Allowlisted server adapters with lazy, failure-isolated rendering |
| Positive comments, replies, pins, owner moderation | Adapt | RLS, blocking, reporting, rate limits, and auditability first |
| Aggregate views, clicks, referrers, devices, sharing tools | Adapt | Consent, retention, deletion, and no visitor identity |
| Structured public/private/unlisted templates | Adopt later | Applying a template cannot copy assets or grant entitlements |
| One-time Premium expression pass | Adopt later | Expression and capacity only; gameplay earns prestige |
| Aliases, custom domains, scoped API keys | Adapt later | Every address resolves to the account's one canonical profile |
| Multiple profiles per account | Reject | One account owns exactly one profile |
| Raw HTML, JavaScript, CSS, or arbitrary embeds | Reject | Only versioned, validated configuration and provider adapters |
| Dislikes, private messaging, paid rank, autoplay audio | Reject | Positive low-risk sociality; gameplay authority and user agency remain intact |

## Compatibility risks

- Production minification changes must preserve CSP hashes, route chunks,
  source-independent runtime behavior, and direct-refresh handling.
- Browser smoke data must remain local-only and may not create or mutate linked
  production accounts.
- Historical reports remain historical evidence; corrections must clearly
  identify current truth instead of rewriting past observations.
- Existing untracked workspace artifacts and the current homepage candidate
  branch belong to the user and must remain untouched.

## Acceptance criteria

- Local and linked migrations match, or every difference has an explicit owner
  and stop condition.
- A repeatable browser command exercises public profile and Profile Studio
  behavior rather than checking source strings only.
- Browser evidence covers desktop, narrow mobile, keyboard focus, reduced
  motion, direct refresh, and the page/card/roll customization boundary.
- `npm run check:performance` passes the active route-first budgets.
- The complete validation suite in `AGENTS.md` passes.
- `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/CHANGELOG_2_0.md` record the
  completed baseline and the next milestone remains unstarted.
