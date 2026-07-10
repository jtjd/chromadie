-- Expose the progression fields needed for public profile pages.
-- EP spent and other account-private fields remain excluded.

GRANT SELECT (
  id,
  username,
  current_streak,
  longest_streak,
  lifetime_ep,
  equipped_cosmetics,
  equipped_badges,
  mood_color,
  best_roll_score,
  best_roll_hex,
  best_roll_rarity
)
ON TABLE public.profiles
TO anon, authenticated;
