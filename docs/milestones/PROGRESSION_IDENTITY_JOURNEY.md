# Progression Identity Journey

Status: implementation and local validation complete; release gate remains —
2026-08-19

## Decision

Chromadie’s progression is an evergreen identity journey with two authored
directions:

- **Keep the ritual**: first roll, roll-count, and streak milestones that
  reward showing up.
- **Find the strange**: rarity, Mythic, and palindrome milestones that reward
  discovering unusual colors.

The existing five lifetime-EP rank milestones remain unchanged. The journey
reuses existing achievement rows, existing active catalog items, the existing
Color of the Week +50,000 EP reward, and the existing inventory/equip
contracts. It does not add a currency, season reset, battle pass, loot box, or
purchase flow.

## Authority and compatibility

- `progression_milestones` is extended additively with a track, order, and
  achievement trigger. Existing rank rows and rewards are preserved.
- Existing accounts are backfilled from authoritative lifetime EP and
  achievement rows. Inserts are idempotent and never increase an existing
  inventory quantity.
- `grant_progression_milestones` remains a SECURITY DEFINER operation inside
  the authoritative roll transaction. The client can render returned unlocks
  but cannot grant them.
- The roll response keeps `new_milestones` and adds
  `new_progression_unlocks` as a compatibility-safe alias.
- Public profiles receive only current-rank/progression proof: selected safe
  expressions and at most two recent earned unlocks. The private milestone
  ledger, EP balance, and complete owner journey remain owner-only.
- Guest rolls remain device-local previews. Signup clears the preview before
  auth begins; guest HEX and score are never transferred into an account.

## Measurement boundary

Progression events are consent-gated. Legacy events remain page-local. The
journey events increment only anonymous, dimension-bounded daily totals in
`progression_analytics_daily`, with service-only storage and 90-day cleanup.
No raw event rows, account ids, scores, HEX values, or exact timestamps are
stored. Measurement failures never block rolls, auth, sharing, or profile
rendering. Rollout uses the existing `off` / `staff` / `internal` / `cohort` /
`all` flag stages, with the server grant path independent of presentation.

## Acceptance criteria

- Studio shows rank, EP, rolls, streak, weekly focus, two journey lanes, next
  expressions, recent unlocks, and a server-authority note.
- The dedicated roll and profile roll surfaces show a new expression and/or
  completed weekly focus immediately after the server-confirmed result.
- Public profile story exposes bounded recent unlock proof without private
  ledger data.
- Existing rank rewards, scoring, roll eligibility, rerolls, achievements,
  inventory, RLS, and share URLs remain compatible.
- Empty, guest, loading, error, mobile, keyboard, and reduced-motion paths
  remain safe.
- Migration, application, analytics-contract, and full validation tests pass.
  The performance checker reports only the existing advisory all-assets
  JavaScript/CSS catalog overage; route budgets pass.
- The local browser smoke reaches the Profile Studio and mobile checks but
  stops at the existing R2 upload-persistence step when local R2 control-plane
  configuration is unavailable; no progression assertion fails before that
  environment gate.
