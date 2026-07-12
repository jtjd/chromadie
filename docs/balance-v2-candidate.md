# Launch Balance v2

This document describes the active launch economy. The server-authoritative implementation is the
final `calculate_roll_v2` function, and `src/lib/scoringCandidate.js` is its parity-tested local
model. Historical “candidate” names remain in a few modules to avoid a risky pre-launch rename.

## Scoring baseline

- Exhaustive RGB colors tested: 16,777,216
- Current seeded average roll score: approximately 54,182 EP
- Average scoring contributors: approximately 10.67
- Descriptive traits per roll: 5
- Category multipliers: 100%, 35%, 10%
- Common rolls now surface 8–12 conditions; dense 15+ condition stacks receive cascade bonuses.
- F1 reward: 75,001 EP

The thematic-score pass replaces round condition awards with nearby memorable values. The
calibrated boundaries below are locked by tests and the SQL/JavaScript parity check.

| Rarity | Minimum score | Seeded frequency |
| --- | ---: | ---: |
| Trash | 0 | ~25.0% |
| Common | 25,000 | ~14.8% |
| Uncommon | 34,500 | ~29.2% |
| Rare | 49,500 | ~17.1% |
| Epic | 85,000 | ~13.7% |
| Anomaly | 500,000 | 0.087% |
| Mythic | 1,000,000 | 0.068% |

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
- Catalog total: approximately 22.1M EP
- Full collection time before achievement rewards: approximately 484 days (1.3 years)
- Rank and streak milestone frames remain zero-cost unlocks.

The launch reset removes retired catalog keys `frame_spectrum`, `lb_spectrum`, `name_spectrum`,
`reroll_shard`, and `roll_spectrum` after player data is cleared.

## Achievements

The active model retains 42 focused achievements with 8.82M EP in total one-time rewards. Routine
parity, per-character, divisibility, and obsolete score achievements are retired. New score
milestones align with the launch distribution at 50k, 100k, 200k, and 1.5M.

Achievement rewards add spendable EP but never change the roll's leaderboard score.
