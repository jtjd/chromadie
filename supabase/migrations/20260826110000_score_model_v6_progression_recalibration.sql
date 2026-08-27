-- Recalibrate score-denominated progression after the measured v6 score
-- change. Existing milestone rows and inventory are intentionally preserved;
-- this changes only the threshold used for future eligibility checks.
BEGIN;

UPDATE public.progression_milestones
SET threshold = CASE id
    WHEN 'rank_silver' THEN 4790000
    WHEN 'rank_gold' THEN 23950000
    WHEN 'rank_platinum' THEN 71851000
    WHEN 'rank_diamond' THEN 143703000
    WHEN 'rank_chroma' THEN 287405000
    ELSE threshold
  END,
  progress_target = CASE id
    WHEN 'rank_silver' THEN 4790000
    WHEN 'rank_gold' THEN 23950000
    WHEN 'rank_platinum' THEN 71851000
    WHEN 'rank_diamond' THEN 143703000
    WHEN 'rank_chroma' THEN 287405000
    ELSE progress_target
  END
WHERE id IN ('rank_silver', 'rank_gold', 'rank_platinum', 'rank_diamond', 'rank_chroma');

UPDATE public.achievements
SET description = CASE id
  WHEN 'score_50k' THEN 'Score at least 479,000 EP in a single roll.'
  WHEN 'score_100k' THEN 'Score at least 958,000 EP in a single roll.'
  WHEN 'score_200k' THEN 'Score at least 1,916,000 EP in a single roll.'
  WHEN 'score_1_5m' THEN 'Score at least 14,370,000 EP in a single roll.'
  ELSE description
END
WHERE id IN ('score_50k', 'score_100k', 'score_200k', 'score_1_5m')
  AND season_id IS NULL;

UPDATE public.progression_milestones
SET sort_order = CASE id
      WHEN 'journey_rarity_rare' THEN 10
      WHEN 'journey_roll_prime' THEN 20
      WHEN 'journey_high_contrast' THEN 30
      WHEN 'journey_rarity_epic' THEN 40
      WHEN 'journey_rarity_anomaly' THEN 50
      WHEN 'journey_palindrome' THEN 60
      WHEN 'journey_mythic' THEN 70
      ELSE sort_order
    END,
    expected_rolls = CASE id
      WHEN 'journey_rarity_rare' THEN 3
      WHEN 'journey_roll_prime' THEN 7
      WHEN 'journey_high_contrast' THEN 10
      WHEN 'journey_rarity_epic' THEN 26
      WHEN 'journey_rarity_anomaly' THEN 927
      WHEN 'journey_palindrome' THEN 4096
      WHEN 'journey_mythic' THEN 33894
      WHEN 'journey_greyscale' THEN 65536
      ELSE expected_rolls
    END
WHERE id IN (
  'journey_rarity_rare', 'journey_roll_prime', 'journey_high_contrast',
  'journey_rarity_epic', 'journey_rarity_anomaly', 'journey_palindrome',
  'journey_mythic', 'journey_greyscale'
);

COMMIT;
