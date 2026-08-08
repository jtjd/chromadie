# Next Phases Roadmap

This roadmap follows the profile-first direction in
[`11_PRODUCT_DIRECTION_ADDENDUM.md`](11_PRODUCT_DIRECTION_ADDENDUM.md).
Phase 10, Phase 11, Phase 11.1, and the authorized Phase 12 sitewide-shell
boundary are complete on the current branch. Later identity-data and feature
work remains separately scoped.

## Phase 10 — Vision Reconciliation and Profile Simplification

Status: complete on the current branch, subject to the report and profile-
first gate.

- Make the authenticated default home the owner’s live profile.
- Project real public/owner data into a four-region primary composition.
- Collapse story, statistics, social, configuration, and owner compatibility
  surfaces without deleting their data or server authority.
- Preserve public routes, old share links, `legacy=1`, and the existing
  structured configuration contract.

See [`PHASE_10_REPORT.md`](PHASE_10_REPORT.md).

## Phase 11 — Continuous Profile Composition and Minimalism

Status: complete on the current branch. This was a visual correction, not
another dashboard reduction pass. The profile now reads as one authored
personal page: identity and roll form the central moment, links and story
appear as quiet continuation, and secondary systems recede into deliberate
detail views.

The next implementation must reject:

- a hero followed by a row of equal cards;
- repeated eyebrow/title/description module chrome;
- “featured” cards that expose data without adding personality;
- visible owner, moderation, configuration, shop, or developer language;
- adding another module to solve a composition problem.

The implemented evidence is in [`PHASE_11_REPORT.md`](PHASE_11_REPORT.md). The
workflow and acceptance gate are in
[`milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md`](milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md).
It respected the existing data/authority boundaries. The linked Supabase
migration/catalog drift documented in the Phase 9 browser audit remains a
release blocker and was not changed by this presentation milestone.

## Phase 11.1 — Approved Mockup Fidelity Correction

Status: complete on the current branch; the approved profile composition was
carried forward into Phase 12.

This visual-only correction reconciles the live profile with the approved
mockup’s viewport impact without adding backend features. It restores readable
type scale, moves the identity into the upper-middle composition, anchors the
optional expression surface independently near the lower viewport edge,
strengthens the canonical-color atmosphere, and treats missing optional data
as designed absence. It preserves the secure roll path, profile data
projection, route compatibility, and all secondary detail surfaces.

Evidence and exact validation are in
[`PHASE_11_1_REPORT.md`](PHASE_11_1_REPORT.md) and
[`../artifacts/phase-11-1/COMPARISON.md`](../artifacts/phase-11-1/COMPARISON.md).
Phase 12 follows this profile-first direction without changing the approved
profile composition. Its implementation boundary is recorded below.

## Phase 12 — Sitewide Profile Language and Default Entry

Status: complete on the current branch; visual evidence is under
[`../artifacts/phase-12/`](../artifacts/phase-12/) and the exact report is
[`PHASE_12_REPORT.md`](PHASE_12_REPORT.md).

The supporting application surfaces now share the approved atmospheric canvas,
quiet surface treatment, and a minimal `chm.lol` application header. The
Phase 12 originally made signed-out `/` open guest Roll and authenticated `/`
resolve to the owner profile. The later landing-page refinement supersedes that
entry contract: `/` now remains a minimal public homepage for every session,
the signed-in homepage CTA opens the owner profile, and `/?view=game` remains
the direct Roll compatibility route.

No profile fields, media, music provider, social feature, notification,
messaging, discovery expansion, monetization, schema, auth/RLS, roll,
scoring, or deployment behavior changed. The next authorized milestone must
start with a new audit and may not assume identity-data contracts exist.

## Phase 13 — Real Identity Contract and chm.lol Canonicalization

Status: **repository implementation complete; external cutover remains gated**.

Phase 13A reconciled the linked production baseline, and Phase 13 added the
nullable server-authoritative identity contract, owner editor, bounded public
projection, canonical root username routing, `/u/<username>` compatibility,
and chm.lol repository metadata. The approved Phase 10–12 composition remains
fixed. Cloudflare attachment, Supabase dashboard settings, email templates,
and final browser smoke checks are operator gates documented separately.

## Phase 13.1 — Username Safety, Performance, and Public Cutover Certification

Status: **local implementation complete; production reservation and public
launch are NO-GO**.

Phase 13.1 adds exact authoritative username reservations, preserves the
approved grandfathered `Admin` staff profile, enables moderation-table RLS,
adds policy drift detection, and restores strict CSS/JavaScript/HTML budget
headroom. The reservation migration is intentionally not recorded remotely;
the Pages password/maintenance gate remains active. See
[`PHASE_13_1_PLAN.md`](PHASE_13_1_PLAN.md),
[`USERNAME_RESERVATION_POLICY.md`](USERNAME_RESERVATION_POLICY.md),
[`PHASE_13_1_CUTOVER_CHECKLIST.md`](PHASE_13_1_CUTOVER_CHECKLIST.md), and
[`PHASE_13_1_REPORT.md`](PHASE_13_1_REPORT.md).

## Phase 14 — Avatars, Backgrounds, and Spotify

Status: **expression and storage-size migrations applied; public gate active**.

Phase 14 adds only optional avatar, background, and Spotify expression through
the existing Supabase stack. Uploads are processed into owner-scoped WebP
objects, Spotify values are bounded provider identifiers, and all management
controls remain in profile settings. The approved centered identity card and
full-viewport atmosphere are unchanged. See [`PHASE_14_REPORT.md`](PHASE_14_REPORT.md).

## Dashboard Parity Program

Status: Milestones 0, 1A, 1B, 2, and 3 are complete locally. Later milestones
remain planned and must begin one at a time.

1. Completed: close the release baseline and replace the aggregate JavaScript
   release blocker with a route-first performance policy in
   [`milestones/DASHBOARD_PARITY_M0_BASELINE.md`](milestones/DASHBOARD_PARITY_M0_BASELINE.md).
2. Completed and deployed: broaden the authoritative username contract to allow
   available one- and two-character names without weakening exact route
   reservations, case-insensitive uniqueness, or moderation. See
   [`milestones/DASHBOARD_PARITY_M1A_SHORT_USERNAMES.md`](milestones/DASHBOARD_PARITY_M1A_SHORT_USERNAMES.md).
3. Completed: replace the homepage authentication overlay with standalone
   `/login` and `/signup` pages while preserving the existing auth
   implementation, callback, recovery, and safe-return contracts. See
   [`milestones/DASHBOARD_PARITY_M1_AUTH_ROUTES.md`](milestones/DASHBOARD_PARITY_M1_AUTH_ROUTES.md).
4. Completed: the customization-control contract audit. Public page effects
   remain page-wide, preview effects remain contained, card appearance never
   recolors the roll UI, and every control has a tested preview and public
   renderer consumer. See the customization audit and compositor follow-ups in
   [`PROGRESS.md`](PROGRESS.md).
5. Completed locally: reusable owner-scoped avatar/background media assets with
   validated WebP objects, private library RLS, staged registration, and
   selection/deletion in Profile Studio. See
   [`milestones/DASHBOARD_PARITY_M2_MEDIA_LIBRARY.md`](milestones/DASHBOARD_PARITY_M2_MEDIA_LIBRARY.md).
6. Completed locally: structured About/Projects content with bounded plain text,
   HTTPS links, owner drafts, publishing, conflict handling, and live preview.
   See [`milestones/DASHBOARD_PARITY_M3_CONTENT_REGIONS.md`](milestones/DASHBOARD_PARITY_M3_CONTENT_REGIONS.md).
7. Completed and deployed: allowlisted provider widgets with bounded Spotify
   and YouTube providers, owner drafts, lazy preview/public players, and CSP
   enforcement. See
   [`milestones/DASHBOARD_PARITY_M4_PROVIDER_WIDGETS.md`](milestones/DASHBOARD_PARITY_M4_PROVIDER_WIDGETS.md).
8. Next: positive moderated social features, privacy-conscious analytics,
   templates/premium expression, and finally aliases/domains/API access as
   separately authorized milestones.

## Deferred themes

Richer expression data, broader discovery, operational
moderation tooling, analytics ownership and retention, payment/webhook
entitlement issuance, private messaging, notifications, comparisons, and any
SvelteKit migration remain separate proposals. Each requires its own scope,
security review, migration plan, and acceptance gate.
