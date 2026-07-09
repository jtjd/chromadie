-- Align the live achievement row with the badge/function IDs used by the app.

INSERT INTO public.achievements (id, name, description, icon, ep_reward, rarity)
VALUES (
  'streamer_purple',
  'Streamer Purple',
  'Roll the exact Streamer Purple.',
  '🟣',
  2000000,
  'Mythic'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  ep_reward = EXCLUDED.ep_reward,
  rarity = EXCLUDED.rarity;

INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, count)
SELECT user_id, 'streamer_purple', unlocked_at, count
FROM public.user_achievements
WHERE achievement_id = 'roll_purple'
ON CONFLICT (user_id, achievement_id) DO UPDATE
SET
  count = GREATEST(public.user_achievements.count, EXCLUDED.count),
  unlocked_at = LEAST(
    COALESCE(public.user_achievements.unlocked_at, EXCLUDED.unlocked_at),
    COALESCE(EXCLUDED.unlocked_at, public.user_achievements.unlocked_at)
  );

DELETE FROM public.user_achievements
WHERE achievement_id = 'roll_purple';

DELETE FROM public.achievements
WHERE id = 'roll_purple';
