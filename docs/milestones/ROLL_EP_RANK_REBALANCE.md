# Roll EP and rank rebalance

## Implementation plan

1. Keep v6 raw score authoritative for rarity, conditions, achievements, history, and leaderboards. Add a server-owned roll EP award with a smooth conversion curve.
2. Store the per-roll award for correct reroll reversal. Map existing lifetime EP into a private progression ledger without deleting the original amount or changing historical scores.
3. Retune the five existing ranks using exhaustive v6 score enumeration and fixed-seed journey samples. Keep the published rank grant ledger authoritative.
4. Add a few Ritual cosmetics in the longest midgame gaps, preserve purchased and equipped ownership, and retire the browser EP purchase and wallet paths.
5. Update result and progression copy, fixtures, drift checks, SQL behavior tests, and the required validation suite.

## Conversion and measured distribution

For score `s ≤ 80,000`, roll EP equals score. Above that point:

`EP = 80,000 + round(80,000 × ln(1 + (s − 80,000) / 80,000))`

The curve and its first derivative meet smoothly at 80,000. It is monotone and has no finite cap. The database function grants EP; the JavaScript mirror supports fixture analysis and presentation only.

The exhaustive fixture covers all 16,777,216 RGB colors in v6. Values below are roll EP alone, before achievement and weekly bonuses.

| Measure | Raw score | Roll EP |
| --- | ---: | ---: |
| Median | 47,461 | 47,461 |
| p75 | 75,787 | 75,787 |
| p90 | 145,751 | 127,990 |
| p97 | 653,725 | 248,053 |
| p99 | 839,203 | 268,034 |
| p99.9 | 30,203,245 | 554,694 |
| Maximum | 48,172,821,304 | 1,144,662 |

Fixed-seed samples of 10,000 whole journeys from that exhaustive distribution produce the following rank timing when daily rolls also earn existing best-roll, streak, weekly-focus, and achievement bonuses. Discovery condition achievements are excluded, so actual play can be somewhat faster. Roll-only medians are 20, 62, 164, 318, and 617 days respectively.

| Rank | EP threshold | p10 | Median | p90 |
| --- | ---: | ---: | ---: | ---: |
| Silver | 1,300,000 | 10 | 14 | 16 |
| Gold | 4,200,000 | 36 | 45 | 51 |
| Platinum | 11,200,000 | 104 | 119 | 131 |
| Diamond | 21,700,000 | 232 | 252 | 269 |
| Chroma | 42,200,000 | 476 | 500 | 525 |

## Existing accounts and rerolls

`profiles.lifetime_ep` remains unchanged during migration, including older raw-score awards and purchase accounting. `profiles.progression_ep` is an internal rank ledger. A piecewise map preserves each account's old rank and fraction of progress within that rank, so old score outliers cannot promote a player several ranks on cutover. Existing milestone rows and inventory remain; reconciliation adds only newly eligible historical grants and repairs missing reward inventory.

Today's pre-migration roll stores both its original lifetime award and its normalized progression award. A reroll reverses each independently, then records the new normalized award in both ledgers. No historical score is rewritten. Public and owner rank projections continue using the existing `lifetime_ep` response key, sourced from progression EP, so the product still shows one EP value. The original lifetime ledger remains in the database for audit and legacy purchase compatibility.

The browser can no longer call the purchase or wallet RPCs. The old Streak Freeze catalog offer is retired, while a previously owned freeze remains in inventory and the existing roll transaction can still consume it.

## Reward cadence

| Journey point | Intentional reward sources |
| --- | --- |
| First week | First roll Name font; first Rare discovery avatar effect; seven-day streak Name motion. |
| First month | 10-roll Name material, Silver Name motion, 14-day streak Name motion, Epic discovery Name motion, 30-day streak border. |
| Three to four months | Gold Name material, 50-roll atmosphere, 100-roll layout, Platinum Name motion. |
| Six months | 180-roll atmosphere; Diamond follows near day 250. |
| Twelve months | 300-roll cursor trail and 365-roll atmosphere; 430-roll border follows. |
| Chroma | Chroma Name motion near day 500. |
| Veteran | 730-roll cursor trail and 1,095-roll border; rare Discovery effects remain independent. |

The three added Ritual unlocks shorten the largest deterministic reward gaps to roughly two to three months while leaving Rank centered on Name expression and Discovery centered on rare conditions. Early Discovery rewards are stochastic, so the deterministic Ritual and Rank path supplies the reliable cadence.

## Compatibility risks and checks

- The migration changes the private rank ledger and RPC source, so local reset, schema lint, SQL roll/reroll behavior, owner/public projection, grant, and RLS checks are required.
- The catalog seed must keep newly earned rows at zero cost because the reward immutability trigger rejects a priced seed attempt even on an upsert conflict.
- Local catalog drift is not evidence of remote deployment. Production migration and cutover remain separate operator actions.

## Validation

The local reset and schema lint pass. The SQL security and progression behavior suites cover roll EP, reroll replacement, rank projection, purchase closure, historical grant reconciliation, and purchased inventory preservation. All 896 application tests pass. The score and EP parity check passes across 5,000 deterministic RGB samples. Build, Svelte check, ESLint, links, CSP, enforced performance, username policy, balance, and catalog drift checks pass. The desktop/mobile/reduced-motion progression browser smoke passes on rerun after one preview-load failure; its first-roll screenshot visibly presents Score and EP earned separately.

The linked production database had exactly this migration pending. Protected schema and public-data dumps were taken at `20260928T183616Z` under `/home/alex/.local/share/chromadie-backups/` before `supabase db push --linked`. The remote migration ledger now includes `20260928100000`, and the remote catalog drift check passes with 155 active items. No historical score or ownership data was rewritten.
