# Pre-launch Balance Candidate

This document describes the candidate launch economy. It does not change the live scoring RPC or
remote data by itself.

## Scoring baseline

- Exhaustive RGB colors tested: 16,777,216
- Average roll score: 45,727.95 EP
- Average scoring contributors: 4.378
- Descriptive traits per roll: 5
- Category multipliers: 100%, 35%, 10%
- F1 reward: 75,000 EP

| Rarity | Minimum score | Exact RGB frequency |
| --- | ---: | ---: |
| Trash | 0 | 6.479% |
| Common | 25,000 | 25.574% |
| Uncommon | 35,000 | 40.535% |
| Rare | 50,000 | 22.682% |
| Epic | 85,000 | 4.470% |
| Anomaly | 200,000 | 0.260% |
| Mythic | 1,500,000 | 3 colors |

## Rank pacing

Pacing below excludes achievement rewards and assumes one average roll per day.

| Rank | Lifetime EP | Approximate days |
| --- | ---: | ---: |
| Bronze | 0 | 0 |
| Silver | 500,000 | 11 |
| Gold | 2,500,000 | 55 |
| Platinum | 7,500,000 | 164 |
| Diamond | 15,000,000 | 328 |
| Chroma | 30,000,000 | 656 |

## Shop bands

The canonical catalog retains its relative price order within each rarity. Prices are compressed
into these bands with stepped pricing.

| Rarity | Price band | Approximate days |
| --- | ---: | ---: |
| Uncommon | 15,000–35,000 | 0.3–0.8 |
| Rare | 30,000–100,000 | 0.7–2.2 |
| Epic | 75,000–300,000 | 1.6–6.6 |
| Mythic | 175,000–1,150,000 | 3.8–25.1 |

- Streak Freeze: 50,000 EP
- Three prestige cosmetics: 1,250,000 EP each
- Paid canonical items: 76
- Candidate catalog total: approximately 22.1M EP
- Full collection time before achievement rewards: approximately 484 days (1.3 years)
- Rank and streak milestone frames remain zero-cost unlocks.

The launch reset removes retired catalog keys `frame_spectrum`, `lb_spectrum`, `name_spectrum`,
`reroll_shard`, and `roll_spectrum` after player data is cleared.

## Achievements

The candidate retains 42 focused achievements with 8.82M EP in total one-time rewards. Routine
parity, per-character, divisibility, and obsolete score achievements are retired. New score
milestones align with the launch distribution at 50k, 100k, 200k, and 1.5M.

Achievement rewards add spendable EP but never change the roll's leaderboard score.
