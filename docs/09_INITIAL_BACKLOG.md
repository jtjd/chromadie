# Initial Backlog

> Historical backlog. Integrated profile-roll items are superseded by the
> launch contract in `docs/02_TARGET_EXPERIENCE.md`.

This backlog is ordered. Do not begin later epics before their dependencies.

## Epic A — Baseline

- Map current routes and route ownership.
- Map Supabase RPCs used by the client.
- Map profile, roll, achievement, cosmetic, shop, and leaderboard data.
- Record all validation results.
- Add regression tests for the current owner/public profile distinction.
- Add regression tests for roll readiness and canonical result handling.

## Epic B — Foundations

- Introduce design tokens.
- Add reusable profile surface primitives.
- Add motion utilities and reduced-motion handling.
- Build fixture-backed profile canvas.
- Establish desktop and mobile reference compositions.

## Epic C — Profile Shell

- Extract public profile data adapter.
- Build identity hero.
- Build owner controls boundary.
- Adapt existing cosmetics.
- Add graceful media fallbacks.
- Preserve profile privacy behavior.

## Epic D — Roll

- Extract roll transaction controller from presentation.
- Build integrated roll state machine.
- Connect profile-ready state.
- Animate canonical result.
- Revalidate wallet, score, achievements, and activity.
- Preserve challenge and guest behavior.

## Epic E — Customization

- Define profile configuration schema.
- Add validated signature color.
- Add module visibility/order.
- Add structured links.
- Add preview/save/publish workflow.
- Add default and free theme set.

## Epic F — Story

- Define durable timeline event types.
- Backfill safe historic events where possible.
- Add pinned accomplishments.
- Add collection showcase.
- Add roll-history visualization.
- Add progressive unlock rules.

## Epic G — Discovery and Social

- Redesign leaderboard cards.
- Add discovery hub.
- Add follows/favorites.
- Add reactions.
- Add guestbook with moderation.
- Add block/report/privacy controls.

## Epic H — Commerce

- Convert shop preview to profile canvas preview.
- Categorize items by free, earned, and premium.
- Define premium entitlements.
- Ensure prestige remains earned.
- Add purchase and entitlement regression tests.
