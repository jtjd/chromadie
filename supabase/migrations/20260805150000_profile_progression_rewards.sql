-- Profile progression rewards.
-- Rank progression remains EP-backed and server-authoritative. Rewards reuse
-- active catalog rows; the dashboard only presents the returned state.
BEGIN;

CREATE TABLE IF NOT EXISTS public.progression_milestones (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL CHECK (metric = 'lifetime_ep'),
  threshold bigint NOT NULL CHECK (threshold > 0),
  reward_item_key text NOT NULL REFERENCES public.shop_items(item_key),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_progression_milestones (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id text NOT NULL REFERENCES public.progression_milestones(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, milestone_id)
);

ALTER TABLE public.progression_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression_milestones ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.progression_milestones, public.user_progression_milestones FROM anon, authenticated;
GRANT SELECT ON TABLE public.progression_milestones, public.user_progression_milestones TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view progression manifest." ON public.progression_milestones;
CREATE POLICY "Authenticated can view progression manifest."
  ON public.progression_milestones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view own progression milestones." ON public.user_progression_milestones;
CREATE POLICY "Users can view own progression milestones."
  ON public.user_progression_milestones FOR SELECT TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.progression_milestones (id, name, description, metric, threshold, reward_item_key)
VALUES
  ('rank_silver', 'Silver', 'Reach Silver and add a precise Type In motion to your identity.', 'lifetime_ep', 500000, 'name_motion_typewriter_name'),
  ('rank_gold', 'Gold', 'Reach Gold and reveal the cut facets of Carbon Vein.', 'lifetime_ep', 2500000, 'name_material_carbon_cut'),
  ('rank_platinum', 'Platinum', 'Reach Platinum and bring a concentrated Glow to your name.', 'lifetime_ep', 7500000, 'name_motion_haunt_glow'),
  ('rank_diamond', 'Diamond', 'Reach Diamond and unlock the refracted edge of Raised Glass.', 'lifetime_ep', 15000000, 'name_material_glass_emboss'),
  ('rank_chroma', 'Chroma', 'Reach Chroma and let Scramble rearrange your name before it settles.', 'lifetime_ep', 30000000, 'name_motion_letter_shuffle')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric = EXCLUDED.metric,
  threshold = EXCLUDED.threshold,
  reward_item_key = EXCLUDED.reward_item_key;

-- Existing accounts receive the deterministic rewards they have already
-- earned. Both inserts are replay-safe and preserve existing ownership.
INSERT INTO public.user_progression_milestones (user_id, milestone_id)
SELECT p.id, m.id
FROM public.profiles p
JOIN public.progression_milestones m ON p.lifetime_ep >= m.threshold
ON CONFLICT (user_id, milestone_id) DO NOTHING;

INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT p.id, m.reward_item_key, 1
FROM public.profiles p
JOIN public.progression_milestones m ON p.lifetime_ep >= m.threshold
ON CONFLICT (user_id, item_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_progression_milestones(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lifetime_ep bigint;
  v_milestone record;
  v_inserted_id text;
  v_new jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN v_new;
  END IF;

  SELECT lifetime_ep INTO v_lifetime_ep
  FROM public.profiles
  WHERE id = p_user_id;

  FOR v_milestone IN
    SELECT m.id, m.name, m.description, m.threshold,
      i.item_key, i.name AS reward_name, i.slot
    FROM public.progression_milestones m
    JOIN public.shop_items i ON i.item_key = m.reward_item_key
    WHERE m.metric = 'lifetime_ep'
      AND m.threshold <= COALESCE(v_lifetime_ep, 0)
    ORDER BY m.threshold ASC, m.id ASC
  LOOP
    v_inserted_id := NULL;
    INSERT INTO public.user_progression_milestones (user_id, milestone_id)
    VALUES (p_user_id, v_milestone.id)
    ON CONFLICT (user_id, milestone_id) DO NOTHING
    RETURNING milestone_id INTO v_inserted_id;

    IF v_inserted_id IS NOT NULL THEN
      INSERT INTO public.inventory (user_id, item_key, quantity)
      VALUES (p_user_id, v_milestone.item_key, 1)
      ON CONFLICT (user_id, item_key) DO NOTHING;

      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'id', v_milestone.id,
        'name', v_milestone.name,
        'description', v_milestone.description,
        'threshold', v_milestone.threshold,
        'reward', jsonb_build_object(
          'item_key', v_milestone.item_key,
          'name', v_milestone.reward_name,
          'slot', v_milestone.slot
        )
      ));
    END IF;
  END LOOP;

  RETURN v_new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_progression()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_lifetime_ep bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT lifetime_ep INTO v_lifetime_ep
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_ep', COALESCE(v_lifetime_ep, 0),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'description', m.description,
        'threshold', m.threshold,
        'unlocked_at', u.unlocked_at,
        'unlocked', (u.milestone_id IS NOT NULL),
        'reward', jsonb_build_object(
          'item_key', i.item_key,
          'name', i.name,
          'slot', i.slot
        )
      ) ORDER BY m.threshold ASC, m.id ASC)
      FROM public.progression_milestones m
      JOIN public.shop_items i ON i.item_key = m.reward_item_key
      LEFT JOIN public.user_progression_milestones u
        ON u.user_id = v_user_id AND u.milestone_id = m.id
    ), '[]'::jsonb),
    'recent_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'description', m.description,
        'threshold', m.threshold,
        'unlocked_at', u.unlocked_at,
        'unlocked', true,
        'reward', jsonb_build_object(
          'item_key', i.item_key,
          'name', i.name,
          'slot', i.slot
        )
      ) ORDER BY u.unlocked_at DESC, m.id ASC)
      FROM public.user_progression_milestones u
      JOIN public.progression_milestones m ON m.id = u.milestone_id
      JOIN public.shop_items i ON i.item_key = m.reward_item_key
      WHERE u.user_id = v_user_id
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_progression_milestones(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon, service_role;

-- Rebuild the final audited implementation so the public roll response can
-- carry the same authoritative milestone unlocks as the database writes.
CREATE OR REPLACE FUNCTION public.roll_die_impl(p_is_reroll boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_total_rolls bigint;
  v_score bigint;
  v_hex text;
  v_rarity text;
  v_reward bigint := 0;
  v_new_roll_achievements jsonb := '[]'::jsonb;
  v_new_roll_badges jsonb := '[]'::jsonb;
  v_new_milestones jsonb := '[]'::jsonb;
  v_achievement record;
  v_inserted boolean;
  v_stored record;
BEGIN
  v_result := public.roll_die_impl_pre_audit(p_is_reroll);

  IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  IF v_user_id IS NULL THEN
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  IF COALESCE((v_result->>'already_rolled')::boolean, false) THEN
    SELECT s.hex_code, s.score, s.rarity, s.condition_ids, s.contributors,
      s.traits, s.identity
    INTO v_stored
    FROM public.scores s
    WHERE s.user_id = v_user_id AND s.roll_date = public.game_utc_date();

    IF FOUND THEN
      RETURN (v_result || jsonb_build_object(
        'hex', v_stored.hex_code,
        'score', v_stored.score,
        'rarity', v_stored.rarity,
        'badges', v_stored.condition_ids,
        'contributors', v_stored.contributors,
        'traits', v_stored.traits,
        'identity', v_stored.identity
      )) || jsonb_build_object('new_milestones', '[]'::jsonb);
    END IF;
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  v_score := (v_result->>'score')::bigint;
  v_hex := upper(v_result->>'hex');
  v_rarity := v_result->>'rarity';

  UPDATE public.scores
  SET condition_ids = COALESCE(v_result->'badges', '[]'::jsonb),
      contributors = COALESCE(v_result->'contributors', '[]'::jsonb),
      traits = COALESCE(v_result->'traits', '[]'::jsonb),
      identity = COALESCE(v_result->>'identity', '')
  WHERE user_id = v_user_id AND roll_date = public.game_utc_date();

  IF NOT p_is_reroll THEN
    UPDATE public.profiles
    SET total_rolls = total_rolls + 1
    WHERE id = v_user_id
    RETURNING total_rolls INTO v_total_rolls;
  ELSE
    SELECT total_rolls INTO v_total_rolls
    FROM public.profiles WHERE id = v_user_id;
  END IF;

  FOR v_achievement IN
    SELECT a.id, a.name, a.icon, a.ep_reward
    FROM public.achievements a
    JOIN (VALUES
      ('first_roll'::text, 1::bigint),
      ('roll_10'::text, 10::bigint),
      ('roll_50'::text, 50::bigint),
      ('roll_100'::text, 100::bigint),
      ('roll_365'::text, 365::bigint)
    ) threshold(id, required_rolls) ON threshold.id = a.id
    WHERE v_total_rolls >= threshold.required_rolls
    ORDER BY threshold.required_rolls
  LOOP
    v_inserted := false;
    INSERT INTO public.user_achievements (user_id, achievement_id, count)
    VALUES (v_user_id, v_achievement.id, 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING true INTO v_inserted;

    IF COALESCE(v_inserted, false) THEN
      v_reward := v_reward + v_achievement.ep_reward;
      v_new_roll_achievements := v_new_roll_achievements || jsonb_build_array(
        jsonb_build_object(
          'id', v_achievement.id,
          'name', v_achievement.name,
          'icon', v_achievement.icon,
          'ep_reward', v_achievement.ep_reward
        )
      );
      v_new_roll_badges := v_new_roll_badges || jsonb_build_array('ach_' || v_achievement.id);
    END IF;
  END LOOP;

  IF v_reward > 0 THEN
    UPDATE public.profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_reward
    WHERE id = v_user_id;
    v_result := jsonb_set(
      v_result,
      '{new_achievements}',
      COALESCE(v_result->'new_achievements', '[]'::jsonb) || v_new_roll_achievements
    );
    v_result := jsonb_set(
      v_result,
      '{badges}',
      COALESCE(v_result->'badges', '[]'::jsonb) || v_new_roll_badges
    );
  END IF;

  v_new_milestones := public.grant_progression_milestones(v_user_id);
  v_result := jsonb_set(v_result, '{new_milestones}', v_new_milestones, true);

  INSERT INTO public.user_roll_best_candidates (user_id, roll_date, score, hex_code, rarity)
  VALUES (v_user_id, public.game_utc_date(), v_score, v_hex, v_rarity)
  ON CONFLICT (user_id, roll_date) DO UPDATE
  SET score = EXCLUDED.score,
      hex_code = EXCLUDED.hex_code,
      rarity = EXCLUDED.rarity,
      updated_at = now();

  DELETE FROM public.user_roll_best_candidates c
  WHERE c.user_id = v_user_id
    AND (c.score, c.roll_date) NOT IN (
      SELECT kept.score, kept.roll_date
      FROM public.user_roll_best_candidates kept
      WHERE kept.user_id = v_user_id
      ORDER BY kept.score DESC, kept.roll_date DESC
      LIMIT 10
    );

  SELECT c.score, c.hex_code, c.rarity
  INTO v_stored
  FROM public.user_roll_best_candidates c
  WHERE c.user_id = v_user_id
  ORDER BY c.score DESC, c.roll_date DESC
  LIMIT 1;

  UPDATE public.profiles
  SET best_roll_score = v_stored.score,
      best_roll_hex = v_stored.hex_code,
      best_roll_rarity = v_stored.rarity
  WHERE id = v_user_id;

  RETURN v_result;
END;
$function$;

ALTER FUNCTION public.roll_die_impl(boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.grant_progression_milestones(uuid) FROM PUBLIC, anon, authenticated, service_role;

DO $verification$
DECLARE
  milestone_count bigint;
BEGIN
  SELECT count(*) INTO milestone_count FROM public.progression_milestones;
  IF milestone_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 progression milestones, found %', milestone_count;
  END IF;
END;
$verification$;

COMMIT;
