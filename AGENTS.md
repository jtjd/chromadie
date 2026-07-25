# AGENTS.md — Chromadie 2.0 Codex Operating Rules

This file is the authoritative instruction set for Codex. Read it before planning or changing code.

## Product North Star

Chromadie is a social identity game where a player's profile evolves through daily color rolls.

> The profile is the game. The game is the profile.

Every feature must do at least one of the following:

1. Make the profile more beautiful.
2. Make the profile more personal.
3. Tell more of the player's story.
4. Make other profiles worth exploring.
5. Strengthen long-term attachment to the player's identity.

Features that satisfy none of these goals should be removed, absorbed into another feature, or rejected.

## Required Reading Order

Before beginning a new milestone, read:

1. `AGENTS.md`
2. `docs/00_PRODUCT_VISION.md`
3. `docs/01_CURRENT_STATE_AND_CONSTRAINTS.md`
4. `docs/02_TARGET_EXPERIENCE.md`
5. `docs/03_ARCHITECTURE.md`
6. `docs/04_DESIGN_SYSTEM.md`
7. `docs/05_DATA_AND_BACKEND.md`
8. `docs/06_ROADMAP.md`
9. `docs/10_STACK_RECOMMENDATION.md`
9. The active milestone file in `docs/milestones/`, when present

## Non-Negotiable Engineering Rules

- Do not rewrite the application from scratch.
- Preserve working authentication, server-authoritative rolls, RLS, RPCs, scoring parity, security checks, deployment behavior, and historical data.
- Migrate incrementally behind stable interfaces.
- Never move scoring, roll eligibility, rewards, purchases, or prestige grants into client-authoritative code.
- Never weaken RLS or expose private account data to make a feature easier.
- Do not introduce unrestricted HTML, JavaScript, or user CSS.
- Treat profile customization as structured, validated configuration.
- Make mobile a first-class target.
- Respect `prefers-reduced-motion`.
- Build beautiful defaults before premium customization.
- Gameplay earns prestige; premium buys expression.
- Never make free profiles intentionally ugly, empty, or socially inferior.
- Keep public profile rendering performant and safe because profile links are the product's acquisition surface.

## Work Method

For every milestone:

1. Audit the relevant current implementation.
2. Write a short implementation plan.
3. Identify data migrations and compatibility risks.
4. Add or update tests before declaring completion.
5. Implement the smallest coherent vertical slice.
6. Run the complete validation suite.
7. Update `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/CHANGELOG_2_0.md`.
8. Stop after the milestone acceptance criteria are met. Do not wander into later phases.

## Mandatory Validation

Run all applicable checks before finishing:

```bash
npm run build
npm run check
npx eslint src/
npm test
npm run check:links
npm run check:csp
npm run check:balance-drift
npm run check:catalog-drift
npm run check:scoring-parity
npm run check:db-security
```

For schema changes, also run:

```bash
supabase db lint --local --level warning --fail-on warning
npm run db:reset
```

Do not claim success if a required command fails. Report the failure and its cause.

## Change Discipline

- Prefer new small components and domain modules over enlarging `App.svelte`, `Profile.svelte`, `Game.svelte`, or `Shop.svelte`.
- Do not duplicate scoring, cosmetic, badge, or rarity definitions.
- Do not delete old routes until replacement flows work and redirects are planned.
- Preserve share URLs, public profile URLs, metadata, sitemap behavior, and direct-refresh routing.
- Every database migration must be additive or safely reversible during the migration period.
- Avoid speculative abstractions. Build interfaces needed by the current milestone.
- No unrelated cleanup during milestone work.

## Definition of Done

A feature is done only when:

- It visibly supports the product north star.
- It works on desktop and mobile.
- Keyboard and reduced-motion behavior are considered.
- Empty, loading, error, guest, private, blocked, and deleted-user states are handled.
- Security boundaries are preserved.
- Tests and documentation are updated.
- The full required validation suite passes.
