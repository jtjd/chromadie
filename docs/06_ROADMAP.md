# Chromadie 2.0 Roadmap

Each phase must produce a usable vertical slice. Do not attempt all phases in one Codex run.

## Phase 0 — Baseline and Safety

Goal: establish a clean, reproducible baseline before redesign work.

Deliverables:

- Install and run the current application.
- Record validation results.
- Document current routes, stores, RPCs, profile fields, cosmetics, and roll flow.
- Identify current production-critical behavior.
- Add missing tests around the current roll/profile contract.
- Create a working redesign branch.

Exit criteria:

- Baseline checks are documented.
- Existing critical flows are covered well enough to detect regressions.
- No product behavior has changed.

## Phase 1 — Design Foundations

Goal: introduce a coherent system without replacing the live profile.

Deliverables:

- Design tokens.
- Typography and spacing foundations.
- Motion primitives.
- Shared surface, button, media, and module components.
- Responsive profile canvas prototype using fixture data.
- Reduced-motion behavior.

Exit criteria:

- Prototype looks excellent with no paid cosmetics.
- Mobile and desktop compositions are approved.
- No backend migration required.

## Phase 2 — Profile Shell

Goal: make the new profile renderer work with real current account data.

Deliverables:

- `ProfileShell`.
- Identity hero.
- Owner and visitor modes.
- Public profile route integration.
- Existing avatar, bio, rank, badges, and cosmetics adapted into the new shell.
- Legacy profile available behind a temporary fallback during migration.

Exit criteria:

- Current public profiles render through the new shell.
- Share links and direct refresh work.
- No loss of privacy behavior or cosmetic ownership.

## Phase 3 — Integrated Roll Vertical Slice

Goal: make today's roll feel like a living event inside the profile.

Deliverables:

- Roll availability integrated into the profile.
- Existing secure RPC reused.
- New roll presentation.
- Result updates the profile without navigation.
- Clear reward, rarity, condition, collection, and next-action states.
- Guest and authenticated behavior preserved.

Exit criteria:

- No separate roll page is needed for the primary flow.
- Anti-reroll and scoring parity tests pass.
- Animation works under reduced motion and on mobile.

## Phase 4 — Profile Configuration and Links

Goal: let users build a meaningfully personal share page.

Deliverables:

- Versioned profile configuration.
- Signature color.
- Curated layout variants.
- Module visibility and order.
- Social/content links.
- Draft preview and explicit save/publish.
- Attractive free defaults.

Exit criteria:

- Two free users can make visibly different, coherent profiles.
- Invalid configuration cannot break rendering.
- Public visitor performance remains acceptable.

## Phase 5 — Story and Progression

Goal: make profiles accumulate meaningful history.

Deliverables:

- Timeline events.
- Visual roll history.
- Pinned accomplishments.
- Collection showcase.
- Progressive module unlocks.
- Clear distinction between earned prestige and purchased expression.

Exit criteria:

- Old and new accounts both have meaningful states.
- History survives cosmetic changes.
- Profile growth is understandable.

## Phase 6 — Discovery

Goal: turn rankings into profile exploration.

Deliverables:

- Discovery hub.
- Roll leaderboard with strong profile cards.
- Recent exceptional rolls.
- Rising/new/random discovery.
- Filters and pagination.
- Public-profile CTA and sharing.

Exit criteria:

- Every discovery item leads to a compelling public profile.
- Discovery works without exposing private data.
- Ranking queries are indexed and bounded.

## Phase 7 — Social Layer

Goal: create safe reasons to revisit other profiles.

Deliverables:

- Follow/favorite.
- Positive reactions.
- Moderated guestbook.
- Blocking/reporting.
- Notifications only after abuse controls.
- Privacy settings.

Exit criteria:

- RLS and abuse tests pass.
- Owners can control or disable interactions.
- No private messaging.

## Phase 8 — Decoration Studio and Monetization

Goal: transform the shop into profile creation tools.

Deliverables:

- Decoration studio.
- Preview on the actual profile canvas.
- Free and earned baseline catalog.
- Premium expression entitlements.
- Clear labels for earned, free, and premium items.
- No sale of gameplay rank or prestige.

Exit criteria:

- Free users can create excellent profiles.
- Premium materially expands expression.
- Purchases cannot impersonate earned achievements.

## Phase 9 — Launch Polish

Goal: production readiness.

Deliverables:

- Performance budgets.
- Accessibility audit.
- Mobile/browser audit.
- Media safety and loading controls.
- Analytics funnel.
- OG/profile sharing improvements.
- Migration cleanup and legacy route redirects.
- Moderation operations documentation.

Exit criteria:

- All automated checks pass.
- Critical user flows are manually smoke-tested.
- Rollback and data recovery procedures are documented.

## Phase 10 — Vision Reconciliation and Profile Simplification

Goal: make the live profile feel like a composed personal website before it
feels like a game dashboard.

Deliverables:

- Authenticated default home resolves to the owner’s live profile.
- Public profiles use a four-region identity/roll/expression/featured
  composition with real mapped data.
- Story, statistics, social, configuration, owner controls, and compatibility
  surfaces remain available behind deliberate detail surfaces.
- Public-boundary explanation and redundant primary calls to action are
  removed without deleting data or server authority.
- Required desktop/mobile screenshots, profile-first gate, and validation
  report are complete.

Exit criteria:

- The acceptance gates in
  [`milestones/PHASE_10_VISION_RECONCILIATION.md`](milestones/PHASE_10_VISION_RECONCILIATION.md)
  and [`../checklists/PROFILE_FIRST_GATE.md`](../checklists/PROFILE_FIRST_GATE.md)
  are demonstrably met.
- [`docs/12_NEXT_PHASES_ROADMAP.md`](12_NEXT_PHASES_ROADMAP.md) is the active
  boundary for later work.
- Phase 11 is tracked separately in the next-phases roadmap and its report.

## Phase 10.2 — Approved Mockup Visual Convergence (historical)

This completed phase translated the former profile mockup composition into the
existing Svelte renderer while keeping Supabase-backed profile and roll
authority unchanged. The retired mockup source is no longer an active visual
authority; current work follows the versioned references under
`REFERENCE/chm-redesign-2026-08/`.

Deliverables:

- Mockup translation map and approved parity gate.
- Minimal profile-mode header, atmospheric identity surface, canonical roll,
  compact collection, and expression/music boundary.
- Real-data owner/visitor/reduced-motion screenshots and exact viewport
  measurements under `artifacts/phase-10-2/`.
- Phase report with compatibility decisions and the explicit Phase 11
  boundary.

The approved visual contract and evidence are recorded in
[`docs/APPROVED_MOCKUP_TRANSLATION.md`](APPROVED_MOCKUP_TRANSLATION.md),
[`checklists/APPROVED_MOCKUP_PARITY_GATE.md`](../checklists/APPROVED_MOCKUP_PARITY_GATE.md),
and [`docs/PHASE_10_2_REPORT.md`](PHASE_10_2_REPORT.md). No Phase 11 feature
expansion begins at this boundary. Later work is governed by
[`docs/12_NEXT_PHASES_ROADMAP.md`](12_NEXT_PHASES_ROADMAP.md).

## Phase 11 — Continuous Profile Composition and Minimalism

Status: complete on the current branch. The workflow carried the minimalist
direction forward as a composition constraint, not a card-count exercise:

- Identity and the roll become one central visual moment.
- Links, expression, and story continue one authored canvas through typography,
  whitespace, alignment, and atmosphere.
- Repeated module chrome, equal-weight cards, and visible subsystem language
  are removed from the visitor hierarchy.
- Owner, configuration, social, moderation, entitlements, and legacy detail
  surfaces remain reachable without returning them to the public composition.

See [`milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md`](milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md)
and [`docs/12_NEXT_PHASES_ROADMAP.md`](12_NEXT_PHASES_ROADMAP.md) for the
workflow and [`docs/PHASE_11_REPORT.md`](PHASE_11_REPORT.md) for the evidence.
Stop at this milestone; later release reconciliation, browser certification,
and any renderer/code-splitting work require their own authorized boundary.

## Phase 12 — Sitewide Profile Language and Default Entry

Extend the approved profile atmosphere and minimal navigation language to the
supporting Roll, Discover, Studio, help, privacy, guest-lock, and unavailable
surfaces. Keep the profile renderer as the primary composition and make the
default route behavior explicit for signed-out and authenticated first visits.

Deliverables:

- Shared non-profile application header and atmospheric shell.
- Readable, darker supporting surfaces with responsive mobile navigation.
- Authenticated `/` → owner profile, signed-out `/` → guest Roll, and explicit
  `/?view=game` compatibility.
- Focused route/source tests, browser screenshots, and a validation report.

Exit criteria:

- Profile mode remains on `ProfileModeHeader`/`ProfileShell`.
- Existing routes, direct refresh, auth, roll, backend, privacy, social,
  shop, and deployment contracts remain intact.
- Desktop/mobile screenshot review confirms the surrounding site no longer
  returns to the legacy dashboard shell.

See [`milestones/PHASE_12_SITEWIDE_PROFILE_ENTRY.md`](milestones/PHASE_12_SITEWIDE_PROFILE_ENTRY.md)
and [`docs/PHASE_12_REPORT.md`](PHASE_12_REPORT.md). Stop here before any
identity-data, media, social, or feature-expansion milestone.

## Phase 13 — Real Identity Contract and chm.lol Canonicalization

Status: blocked at the database baseline gate. Additive identity fields,
owner editing, root username routing, and canonical-domain work are planned
but have not started because the linked project is missing the branch's
Phase 4–8 migrations and two catalog rows.

The safe reconciliation sequence and resume condition are recorded in
[`docs/PHASE_13_DATABASE_BASELINE.md`](PHASE_13_DATABASE_BASELINE.md). Do not
create the Phase 13 identity migration until that gate is cleared.
