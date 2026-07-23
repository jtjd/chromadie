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
