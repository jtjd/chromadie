# Profile Dashboard and Progression Rewards

## Status

Implemented as the next incremental slice after the Profile Studio redesign.

## Outcome

`/profile/settings` is now a full-page owner dashboard using the shared
homepage header, a compact grouped sidebar, concise settings panels, and an
on-demand real-renderer preview drawer. The Shop is hidden from the primary
dashboard loop while its direct compatibility route remains intact. Existing
profile, public profile, authentication, and direct-refresh routes remain
intact.

The additive appearance v1 contract stores exact theme colors, surface opacity
and blur, optional gradients, and base borders. Appearance is independent from
daily roll colors and authored effect palettes. Owner-only section RPCs save and
publish appearance or composition patches with timestamp conflict protection;
existing whole-configuration RPCs remain compatible.

Progression now has a server-published expression track. Lifetime EP unlocks
five active catalog cosmetics:

| Rank | EP | Reward |
| --- | ---: | --- |
| Silver | 500,000 | Type In |
| Gold | 2,500,000 | Carbon Vein |
| Platinum | 7,500,000 | Glow |
| Diamond | 15,000,000 | Raised Glass |
| Chroma | 30,000,000 | Scramble |

The migration backfills milestones already earned by existing profiles,
inserts rewards into the existing inventory table, and makes future grants
idempotent inside the authoritative roll transaction. The client renders the
returned progression state and new unlock notices but cannot grant EP,
milestones, or inventory.

## Compatibility and safety

- The existing `roll_die_impl(boolean)` response remains compatible; it gains
  an additive `new_milestones` array.
- Existing achievements, milestone notices, scores, best-roll candidates,
  rerolls, RLS, and purchase/equip RPCs remain unchanged.
- Public profiles receive no private progression ledger. The owner-only RPC
  returns the current owner’s progression and safe reward metadata.
- The direct `/shop` route remains available even though Shop is hidden from
  the dashboard’s primary loop.
- The dashboard supports mobile navigation, keyboard focus management, and
  `prefers-reduced-motion`.

## Acceptance checks

- Full-page `/profile/settings` shell with responsive sidebar/drawer.
- Overview and Progression surfaces show authoritative EP/rank state.
- Each milestone has one stable catalog reward and one inventory grant.
- Replaying a roll or migration cannot duplicate ledger rows or inventory.
- Existing public and purchase flows keep their current authority boundaries.
- Required build, check, lint, test, link, CSP, catalog, balance, scoring, and
  database-security checks are run before release; any baseline failure is
  reported without being hidden.
