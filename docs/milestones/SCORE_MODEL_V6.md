# Restore and Lock Deterministic Probability-Weighted Scoring v6

## Summary

Replace the current incorrect v6 implementation rather than patching its thresholds. The pasted v6 specification becomes the binding contract, while a machine-readable spec, generated evaluators, and independent contract tests prevent future drift.

Existing v3–v5 scoring, stored scores, replay behavior, authentication, RLS, RPCs, scoring parity, security checks, deployment behavior, and historical data remain unchanged.

## Implementation Changes

### 1. Establish one authoritative specification

Create:

- `docs/milestones/SCORE_MODEL_V6.md` containing the approved plan verbatim.
- `src/lib/scoringV6Spec.js` containing the machine-readable constants.
- `scripts/generate-scoring-v6.mjs` generating the probability manifest, client evaluator artifacts, and SQL evaluator.

The machine-readable spec will lock these exact values:

| Concept | Values |
|---|---|
| Condition probability tiers | 5%, 1%, 0.1%, 0.01%, 0.001% |
| Condition rewards | 500, 5,000, 50,000, 500,000, 5,000,000, 100,000,000+ |
| Roll thresholds | 2,500, 10,000, 50,000, 500,000, 5,000,000, 100,000,000 |
| Variation | -700 to +700 basis points |
| Active catalog | At least 100 conditions |
| Combination conditions | At least 20 |

Add `npm run check:scoring-spec`, which regenerates all artifacts and fails if committed generated output differs.

### 2. Rebuild the declarative condition catalog

Replace hand-authored rarity and point assignments with a shared declarative catalog.

The catalog will contain at least 100 active conditions across:

- HEX digits, runs, repeated digits, repeated pairs, and triplets.
- Alternation, symmetry, palindromes, ramps, and reversals.
- Prime, square, triangular, Fibonacci, divisibility, and meaningful-sum patterns.
- Channel complements, progressions, permutations, powers of two, and parity.
- Hue, saturation, temperature, extremes, and channel-order conditions.
- Meme and recognizable values including `420`, `666`, `777`, `1337`, existing wordplay, and the Six Seven family.
- At least 20 explicit combination predicates such as meme-plus-symmetry and sequence-plus-channel-order.

Catalog entries may declare display metadata, predicate structure, semantic tags, and optional mutually-exclusive groups. They may not declare rarity, probability, base points, or awarded points.

### 3. Generate exact probabilities and rewards

Enumerate all 16,777,216 RGB colors offline. For every predicate:

1. Count exact matches.
2. Calculate `probability = matchCount / 16,777,216`.
3. Assign rarity exclusively from the probability thresholds.
4. Store the derived count, probability, and rarity in the generated manifest.

For non-Anomaly conditions, calculate the reward by logarithmic interpolation within the condition’s rarity band:

```text
t = log(probabilityUpper / probability)
    / log(probabilityUpper / probabilityLower)

probabilityReward = bandMin + t × (bandMax - bandMin)
```

Apply a global semantic bonus capped at 20%, then apply deterministic variation:

```text
variationBps =
  hash("chromadie:v6:" + red + ":" + green + ":" + blue + ":" + conditionId)
  modulo 1401
  minus 700
```

Clamp ordinary rewards to their assigned rarity band so semantic bonuses and variation cannot cross tiers.

For Anomaly conditions, use:

```text
baseReward = 100,000,000 × (0.00001 / probability)
```

This creates a genuine high-end range while remaining deterministic. The finite RGB universe provides the practical upper bound.

### 4. Implement client/server parity from generated artifacts

Generate the client evaluator and SQL evaluator from the same catalog and reward specification.

The active result will preserve the existing response contract:

- `score`
- `rarity`
- `scoreVersion`
- `conditions`
- `conditionRarity`
- `basePoints`
- `awardedPoints`
- `contributors`

The final roll rarity will be calculated only from the total awarded score:

- `Trash`: `< 2,500`
- `Common`: `≥ 2,500`
- `Uncommon`: `≥ 10,000`
- `Rare`: `≥ 50,000`
- `Epic`: `≥ 500,000`
- `Legendary`: `≥ 5,000,000`
- `Anomaly`: `≥ 100,000,000`

Add an additive migration defining the corrected `calculate_roll_v6`, then patch the audited roll transaction to use it with `score_version = 6`. Keep v3, v4, and v5 functions available.

Before migration, check whether any stored `score_version = 6` rows already exist. If they do, stop and preserve a legacy replay path rather than silently changing their historical interpretation.

### 5. Recalibrate progression and economy

Run the exhaustive v6 simulation and calculate:

- score range, mean, median, and percentiles;
- condition counts and family distribution;
- final roll rarity distribution;
- expected rolls for discovery conditions;
- expected progression pacing.

Scale score-denominated rank and achievement thresholds from the checked-in v5 mean:

```text
v6 threshold =
  roundToNearest1,000(v5 threshold × v6Mean / v5Mean)
```

This preserves expected roll pacing while reflecting the new score scale. Discovery expected-roll metadata will use exact predicate probability, approximately `ceil(1 / probability)`.

Historical scores, achievements, and rankings will not be recomputed.

## Tests and Acceptance

Add independent contract tests that hard-code the approved specification and do not merely import the implementation constants.

Required coverage:

- Exact probability cases for grayscale, palindrome, repeated pairs, sixfold digits, exact colors, and meme values.
- `#111111` triggers the sixfold repeated-digit condition and materially exceeds an ordinary grayscale reward.
- Identical RGB input produces byte-for-byte identical output.
- Every reward remains inside its rarity band, except open-ended Anomaly rewards.
- Rarer probability tiers always use higher reward bands.
- Final roll rarity boundaries behave exactly at `2,500`, `10,000`, `50,000`, `500,000`, `5,000,000`, and `100,000,000`.
- Catalog contains at least 100 active conditions and 20 combinations.
- No catalog entry manually declares rarity or points.
- Client/server parity for all edge cases, combinations, exact colors, and deterministic random samples.
- Exhaustive balance fixture locks score spread, condition distribution, roll distribution, and progression metadata.
- SQL security, function permissions, RLS, and audited transaction behavior remain intact.

Run the complete required validation suite, including build, type checks, lint, tests, balance drift, catalog drift, scoring parity, database security, schema lint, database reset, and performance checks. A failing pre-existing performance check must be reported explicitly rather than treated as success.

## Assumptions

- The pasted “Deterministic Probability-Weighted Scoring v6” plan is the binding product specification.
- Semantic tags use global bonus weights, not per-condition point overrides. Default weights are sequence `+2.5%`, named `+5%`, meme `+7.5%`, combination `+10%`, and exact `+15%`, capped at `+20%`.
- Conditions stack additively except explicitly mutually-exclusive aliases such as progressively stronger Six Seven variants.
- Combination conditions stack with their component conditions.
- Scores continue using PostgreSQL `bigint`; an exhaustive overflow assertion will be added.
- Legacy Mythic records remain compatible but are not used by v6.
