# Profile Studio, Collection, and Progression

Status: implementation complete; performance release gate remains open — 2026-08-05

## Decision

Chromadie will not choose between a dashboard and a Shop as mutually exclusive
products.

- **Studio** is the primary owner surface for identity, expression, layout,
  links, privacy, and progression.
- **Collection** is the primary ownership surface for equipped and earned
  expression.
- **Progression** is the primary meaning surface for daily rolls, EP, ranks,
  streaks, achievements, and visible history.
- **Shop** remains a compatibility-safe secondary acquisition surface for EP
  purchases and future premium expression. It is not the product's primary
  identity loop.

This keeps the existing server-authoritative economy valuable while preventing
the storefront from becoming the user's mental model of Chromadie.

## Why this direction

A pure Shop-first model makes expression feel like inventory management and
creates pressure to expand catalog breadth. A pure progression-only model
removes a useful, already-secure acquisition path and makes future premium
expression harder to introduce cleanly. The hybrid gives each surface one job:

| Surface | Player question | Authority |
| --- | --- | --- |
| Studio | How do I shape my profile? | validated profile draft/publish and equip RPCs |
| Collection | What do I own and what is equipped? | inventory, entitlements, equipped cosmetics |
| Progression | What did I earn and what comes next? | rolls, EP, rank, achievements, story RPCs |
| Shop | What can I acquire next? | catalog and `purchase_item(text)` |

## Compatibility and migration boundary

This milestone does not add a reward grant, purchase, or progression table.
The first slice projects existing authoritative fields and RPC responses into
the Studio. Existing `/shop`, catalog caching, inventory, entitlements,
`purchase_item`, `equip_item`, `unequip_item`, RLS, and historical inventory
keys remain intact. The public profile route and legacy profile escape hatch
remain unchanged.

Future progression rewards must be additive server-side grants with explicit
idempotency and RLS tests. The client may display eligibility and canonical
results, but may not calculate or grant rewards.

## First-slice acceptance criteria

- Settings presents Collection and Progression as deliberate owner surfaces.
- Progression shows current rank, lifetime EP, next-rank progress, rolls,
  streaks, achievement count, collection unlock state, and recent history.
- Collection continues to preview and equip owned expression through existing
  RPC boundaries.
- Shop continues to load, preview, purchase, and preserve compatibility while
  acting as secondary acquisition.
- Empty history, incomplete achievement data, mobile, keyboard, and reduced
  motion states remain safe and legible.
- Automated tests and the full repository validation suite are run before the
  milestone is closed. The current performance script still reports the
  repository's existing bundle-budget overages, so this slice is not a clean
  release gate yet.

## Next slice, intentionally deferred

Do not add a new progression currency, loot box, battle pass, payment flow,
or reward grant in this milestone. The next slice should prototype a small,
server-authoritative milestone unlock contract only after the Studio surface
has been reviewed with live profiles.
