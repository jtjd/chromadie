BEGIN;

ALTER TABLE public.user_roll_best_candidates
  DROP CONSTRAINT IF EXISTS user_roll_best_candidates_rarity_check;

ALTER TABLE public.user_roll_best_candidates
  ADD CONSTRAINT user_roll_best_candidates_rarity_check
  CHECK (rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly', 'Mythic'));

COMMIT;
