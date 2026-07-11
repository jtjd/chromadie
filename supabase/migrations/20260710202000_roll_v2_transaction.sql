-- Switch the guarded roll transaction to the candidate launch scoring model.
-- Score distribution stays pure v2 scoring; streak, COTW, and achievements are
-- spendable EP events and do not alter leaderboard score or rarity.

DELETE FROM public.achievements
WHERE season_id IS NULL;

INSERT INTO public.achievements (id, name, description, icon, ep_reward, rarity, season_id, season_start, season_end)
VALUES
  ('first_roll', 'First Steps', 'Roll the die for the first time.', '🎲', 5000, 'Common', NULL, NULL, NULL),
  ('roll_10', 'Dedicated', 'Roll the die 10 times.', '🧡', 25000, 'Common', NULL, NULL, NULL),
  ('roll_50', 'Veteran', 'Roll the die 50 times.', '💜', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_100', 'Centurion', 'Roll the die 100 times.', '💯', 250000, 'Epic', NULL, NULL, NULL),
  ('roll_365', 'Annual', 'Roll the die 365 times.', '📅', 1000000, 'Mythic', NULL, NULL, NULL),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak.', '🔥', 50000, 'Common', NULL, NULL, NULL),
  ('streak_14', 'Fortnight', 'Maintain a 14-day streak.', '🔥', 100000, 'Rare', NULL, NULL, NULL),
  ('streak_30', 'Monthly Grinder', 'Maintain a 30-day streak.', '📅', 250000, 'Epic', NULL, NULL, NULL),
  ('streak_100', 'Iron Will', 'Maintain a 100-day streak.', '🔥', 750000, 'Mythic', NULL, NULL, NULL),
  ('rarity_rare', 'Uncommonly Rare', 'Roll a Rare color.', '🔵', 25000, 'Common', NULL, NULL, NULL),
  ('rarity_epic', 'Epic Encounter', 'Roll an Epic color.', '🟣', 100000, 'Rare', NULL, NULL, NULL),
  ('rarity_anomaly', 'Anomaly Detected', 'Roll an Anomaly color.', '🟠', 250000, 'Epic', NULL, NULL, NULL),
  ('mythic_roll', 'Mythic Touch', 'Roll a Mythic color.', '🌟', 500000, 'Mythic', NULL, NULL, NULL),
  ('score_50k', 'High Roller', 'Score at least 50,000 EP in a single roll.', '💰', 25000, 'Common', NULL, NULL, NULL),
  ('score_100k', 'Six Digits', 'Score at least 100,000 EP in a single roll.', '💰', 100000, 'Rare', NULL, NULL, NULL),
  ('score_200k', 'Anomaly Hunter', 'Score at least 200,000 EP in a single roll.', '💰', 250000, 'Epic', NULL, NULL, NULL),
  ('score_1_5m', 'Once in a Spectrum', 'Score at least 1,500,000 EP in a single roll.', '🌈', 500000, 'Mythic', NULL, NULL, NULL),
  ('roll_prime', 'Prime Number', 'Roll a color with a prime R+G+B sum.', '🔢', 25000, 'Common', NULL, NULL, NULL),
  ('high_contrast', 'Polarized Channels', 'Roll a color with an extreme RGB range.', '🌓', 25000, 'Common', NULL, NULL, NULL),
  ('low_contrast', 'Close Harmony', 'Roll a color with very close RGB channels.', '🌫️', 15000, 'Common', NULL, NULL, NULL),
  ('greyscale', 'Perfect Greyscale', 'Roll a pure greyscale color.', '⚫', 50000, 'Rare', NULL, NULL, NULL),
  ('web_safe', 'Web Safe', 'Roll a classic web-safe color.', '🕸️', 50000, 'Rare', NULL, NULL, NULL),
  ('roll_42_sum', 'Meaning of Life', 'Roll a color where R+G+B is exactly 42.', '🧬', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_beef', 'Where is the Beef?', 'Roll a hex containing BEEF.', '🥩', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_cafe', 'Coffee Break', 'Roll a hex containing CAFE.', '☕', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_dead', 'Dead Man Walking', 'Roll a hex containing DEAD.', '💀', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_face', 'Face Value', 'Roll a hex containing FACE.', '😎', 100000, 'Rare', NULL, NULL, NULL),
  ('roll_palindrome', 'Mirror', 'Roll a hex palindrome.', '🪞', 150000, 'Epic', NULL, NULL, NULL),
  ('repeated_pair', 'Repeated Pair', 'Roll a hex that repeats the same byte three times.', '🟰', 125000, 'Epic', NULL, NULL, NULL),
  ('saturation_spike', 'Saturation Spike', 'Roll an extremely saturated color.', '🎨', 50000, 'Rare', NULL, NULL, NULL),
  ('triple_crown', 'Triple Crown', 'Roll one low, one middle, and one maximum channel.', '👑', 150000, 'Epic', NULL, NULL, NULL),
  ('pastel_soft', 'Pastel Bloom', 'Roll a bright, soft pastel color.', '🌸', 50000, 'Rare', NULL, NULL, NULL),
  ('neon_bright', 'Neon Voltage', 'Roll a vivid high-contrast color.', '💡', 50000, 'Rare', NULL, NULL, NULL),
  ('roll_black', 'The Void', 'Roll Pure Black (#000000).', '🌑', 500000, 'Mythic', NULL, NULL, NULL),
  ('roll_white', 'The Light', 'Roll Pure White (#FFFFFF).', '☀️', 500000, 'Mythic', NULL, NULL, NULL),
  ('roll_gold', 'Midas', 'Roll Pure Gold (#FFD700).', '🥇', 500000, 'Mythic', NULL, NULL, NULL),
  ('pure_red', 'Maximum Red', 'Roll Pure Red (#FF0000).', '🟥', 250000, 'Epic', NULL, NULL, NULL),
  ('pure_green', 'Maximum Green', 'Roll Pure Green (#00FF00).', '🟩', 250000, 'Epic', NULL, NULL, NULL),
  ('pure_blue', 'Maximum Blue', 'Roll Pure Blue (#0000FF).', '🟦', 250000, 'Epic', NULL, NULL, NULL),
  ('streamer_purple', 'Streamer Purple', 'Roll Streamer Purple.', '🟣', 350000, 'Mythic', NULL, NULL, NULL),
  ('audio_stream_green', 'Audio Stream Green', 'Roll Audio Stream Green.', '🟢', 350000, 'Mythic', NULL, NULL, NULL),
  ('classic_cola_red', 'Classic Cola Red', 'Roll Classic Cola Red.', '🥤', 350000, 'Mythic', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  ep_reward = EXCLUDED.ep_reward,
  rarity = EXCLUDED.rarity,
  season_id = EXCLUDED.season_id,
  season_start = EXCLUDED.season_start,
  season_end = EXCLUDED.season_end;

CREATE OR REPLACE FUNCTION public.roll_die_impl(p_is_reroll boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_r integer;
  v_g integer;
  v_b integer;
  v_hex_upper text;
  v_hex_no_hash text;
  v_total_score bigint;
  v_rarity text;
  v_score_data jsonb;
  v_condition_ids jsonb := '[]'::jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_traits jsonb := '[]'::jsonb;
  v_identity text := '';
  v_event_badges jsonb := '[]'::jsonb;
  v_response_badges jsonb := '[]'::jsonb;
  v_user_id uuid := auth.uid();
  v_existing_roll record;
  v_sum integer;
  v_range integer;
  v_total_count integer;
  v_higher_count integer;
  v_percentile numeric;
  v_last_roll date;
  v_current_streak integer := 1;
  v_new_achievements jsonb := '[]'::jsonb;
  v_achievement_badges jsonb := '[]'::jsonb;
  v_total_rolls integer;
  v_achievement_ep bigint := 0;
  v_owns_freeze boolean;
  v_shard_count integer;
  v_milestone_granted text := '';
  v_best_roll_score bigint;
  v_cotw_str text;
  v_cotw_r integer;
  v_cotw_g integer;
  v_cotw_b integer;
  v_dist double precision;
  v_force_cotw boolean;
  v_forced_cotw_roll boolean := false;
BEGIN
  IF NOT p_is_reroll THEN
    SELECT * INTO v_existing_roll
    FROM scores
    WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;

    IF FOUND THEN
      SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
      SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_existing_roll.score;
      v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::double precision / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'rarity', v_existing_roll.rarity,
        'badges', v_existing_roll.badges,
        'traits', '[]'::jsonb,
        'contributors', '[]'::jsonb,
        'identity', '',
        'percentile', v_percentile,
        'total_rollers', v_total_count,
        'new_achievements', '[]'::jsonb,
        'milestone_granted', ''
      );
    END IF;
  END IF;

  IF p_is_reroll THEN
    SELECT reroll_shards INTO v_shard_count FROM profiles WHERE id = v_user_id;
    IF v_shard_count IS NULL OR v_shard_count <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No reroll shards available.');
    END IF;

    UPDATE profiles SET reroll_shards = reroll_shards - 1 WHERE id = v_user_id;
    SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
  END IF;

  SELECT best_roll_score, force_cotw_next_roll INTO v_best_roll_score, v_force_cotw
  FROM profiles
  WHERE id = v_user_id;

  IF COALESCE(v_force_cotw, false) THEN
    SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
    IF v_cotw_str IS NOT NULL THEN
      v_r := split_part(v_cotw_str, ',', 1)::integer;
      v_g := split_part(v_cotw_str, ',', 2)::integer;
      v_b := split_part(v_cotw_str, ',', 3)::integer;
      v_forced_cotw_roll := true;
      UPDATE profiles SET force_cotw_next_roll = false WHERE id = v_user_id;
    ELSE
      v_r := floor(random() * 256);
      v_g := floor(random() * 256);
      v_b := floor(random() * 256);
    END IF;
  ELSE
    v_r := floor(random() * 256);
    v_g := floor(random() * 256);
    v_b := floor(random() * 256);
  END IF;

  v_hex_upper := upper('#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0'));
  v_hex_no_hash := substr(v_hex_upper, 2);
  v_sum := v_r + v_g + v_b;
  v_range := greatest(v_r, v_g, v_b) - least(v_r, v_g, v_b);

  v_score_data := public.calculate_roll_v2(v_r, v_g, v_b);
  v_total_score := (v_score_data->>'score')::bigint;
  v_rarity := v_score_data->>'rarity';
  v_condition_ids := coalesce(v_score_data->'conditionIds', '[]'::jsonb);
  v_contributors := coalesce(v_score_data->'contributors', '[]'::jsonb);
  v_traits := coalesce(v_score_data->'traits', '[]'::jsonb);
  v_identity := coalesce(v_score_data->>'identity', '');

  IF v_user_id IS NOT NULL AND v_total_score > COALESCE(v_best_roll_score, 0) THEN
    v_achievement_ep := v_achievement_ep + 50000;
    v_event_badges := v_event_badges || jsonb_build_array('beat_your_best');
  END IF;

  IF v_user_id IS NOT NULL THEN
    IF v_forced_cotw_roll THEN
      v_achievement_ep := v_achievement_ep + 50000;
      v_event_badges := v_event_badges || jsonb_build_array('cotw_hit');
    ELSE
      SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
      IF v_cotw_str IS NOT NULL THEN
        v_cotw_r := split_part(v_cotw_str, ',', 1)::integer;
        v_cotw_g := split_part(v_cotw_str, ',', 2)::integer;
        v_cotw_b := split_part(v_cotw_str, ',', 3)::integer;
        v_dist := sqrt(power(v_r - v_cotw_r, 2) + power(v_g - v_cotw_g, 2) + power(v_b - v_cotw_b, 2));
        IF v_dist <= 50 THEN
          v_achievement_ep := v_achievement_ep + 50000;
          v_event_badges := v_event_badges || jsonb_build_array('cotw_hit');
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_rolled', false,
      'is_anon', true,
      'hex', v_hex_upper,
      'r', v_r,
      'g', v_g,
      'b', v_b,
      'score', v_total_score,
      'rarity', v_rarity,
      'badges', v_condition_ids,
      'traits', v_traits,
      'contributors', v_contributors,
      'identity', v_identity,
      'new_achievements', '[]'::jsonb,
      'milestone_granted', ''
    );
  END IF;

  SELECT last_roll_date, current_streak INTO v_last_roll, v_current_streak
  FROM profiles
  WHERE id = v_user_id;

  IF p_is_reroll THEN
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF v_last_roll = CURRENT_DATE THEN
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF v_last_roll = CURRENT_DATE - 1 THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_roll = CURRENT_DATE - 2 THEN
    SELECT EXISTS(SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1) INTO v_owns_freeze;
    IF v_owns_freeze THEN
      DELETE FROM inventory
      WHERE id IN (SELECT id FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1);
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
      v_current_streak := 1;
    END IF;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak % 7 = 0 AND NOT p_is_reroll AND v_last_roll IS DISTINCT FROM CURRENT_DATE THEN
    v_achievement_ep := v_achievement_ep + 50000;
    v_event_badges := v_event_badges || jsonb_build_array('streak_bonus_7');
    UPDATE profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
    v_event_badges := v_event_badges || jsonb_build_array('reroll_shard_earned');
  END IF;

  IF v_current_streak = 30 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_30_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_30_day');
    v_milestone_granted := 'Monthly Grinder Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_30');
  ELSIF v_current_streak = 100 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_100_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_100_day');
    v_milestone_granted := 'Iron Will Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_100');
  ELSIF v_current_streak = 365 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_365_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_365_day');
    v_milestone_granted := 'Annual Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_365');
  END IF;

  SELECT count(*) + CASE WHEN p_is_reroll THEN 0 ELSE 1 END INTO v_total_rolls
  FROM scores
  WHERE user_id = v_user_id;

  CREATE TEMP TABLE IF NOT EXISTS temp_ach_checks (id text, condition_met boolean) ON COMMIT DROP;
  TRUNCATE temp_ach_checks;
  INSERT INTO temp_ach_checks VALUES
    ('first_roll', true),
    ('roll_10', v_total_rolls >= 10),
    ('roll_50', v_total_rolls >= 50),
    ('roll_100', v_total_rolls >= 100),
    ('roll_365', v_total_rolls >= 365),
    ('streak_7', v_current_streak >= 7),
    ('streak_14', v_current_streak >= 14),
    ('streak_30', v_current_streak >= 30),
    ('streak_100', v_current_streak >= 100),
    ('rarity_rare', v_rarity = 'Rare'),
    ('rarity_epic', v_rarity = 'Epic'),
    ('rarity_anomaly', v_rarity = 'Anomaly'),
    ('mythic_roll', v_rarity = 'Mythic'),
    ('score_50k', v_total_score >= 50000),
    ('score_100k', v_total_score >= 100000),
    ('score_200k', v_total_score >= 200000),
    ('score_1_5m', v_total_score >= 1500000),
    ('roll_prime', v_condition_ids ? 'prime_sum'),
    ('high_contrast', v_condition_ids ? 'high_contrast'),
    ('low_contrast', v_condition_ids ? 'low_contrast'),
    ('greyscale', v_condition_ids ? 'greyscale'),
    ('web_safe', v_condition_ids ? 'web_safe'),
    ('roll_42_sum', v_condition_ids ? 'sum_42'),
    ('roll_beef', v_condition_ids ? 'beef'),
    ('roll_cafe', v_condition_ids ? 'cafe'),
    ('roll_dead', v_condition_ids ? 'dead'),
    ('roll_face', v_condition_ids ? 'face'),
    ('roll_palindrome', v_condition_ids ? 'palindrome'),
    ('repeated_pair', v_condition_ids ? 'repeated_pair'),
    ('saturation_spike', v_condition_ids ? 'saturation_spike'),
    ('triple_crown', v_condition_ids ? 'triple_crown'),
    ('pastel_soft', v_condition_ids ? 'pastel'),
    ('neon_bright', v_condition_ids ? 'neon'),
    ('roll_black', v_condition_ids ? 'pure_black'),
    ('roll_white', v_condition_ids ? 'pure_white'),
    ('roll_gold', v_condition_ids ? 'pure_gold'),
    ('pure_red', v_condition_ids ? 'pure_red'),
    ('pure_green', v_condition_ids ? 'pure_green'),
    ('pure_blue', v_condition_ids ? 'pure_blue'),
    ('streamer_purple', v_condition_ids ? 'streamer_purple'),
    ('audio_stream_green', v_condition_ids ? 'audio_stream_green'),
    ('classic_cola_red', v_condition_ids ? 'classic_cola_red');

  SELECT
    COALESCE(sum(a.ep_reward), 0),
    COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon, 'ep_reward', a.ep_reward) ORDER BY a.ep_reward DESC), '[]'::jsonb),
    COALESCE(jsonb_agg('ach_' || a.id ORDER BY a.ep_reward DESC), '[]'::jsonb)
  INTO v_achievement_ep, v_new_achievements, v_achievement_badges
  FROM achievements a
  JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = true
  LEFT JOIN user_achievements ua ON ua.user_id = v_user_id AND ua.achievement_id = a.id
  WHERE a.season_id IS NULL AND ua.achievement_id IS NULL;

  v_achievement_ep := v_achievement_ep
    + CASE WHEN v_event_badges ? 'beat_your_best' THEN 50000 ELSE 0 END
    + CASE WHEN v_event_badges ? 'cotw_hit' THEN 50000 ELSE 0 END
    + CASE WHEN v_event_badges ? 'streak_bonus_7' THEN 50000 ELSE 0 END;

  INSERT INTO user_achievements (user_id, achievement_id, count)
  SELECT v_user_id, a.id, 1
  FROM achievements a
  JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = true
  WHERE a.season_id IS NULL
  ON CONFLICT (user_id, achievement_id) DO UPDATE
  SET count = user_achievements.count + 1;

  v_response_badges := v_condition_ids || v_event_badges || v_achievement_badges;

  IF p_is_reroll THEN
    UPDATE profiles
    SET lifetime_ep = GREATEST(0, COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep)
    WHERE id = v_user_id;

    UPDATE scores
    SET hex_code = v_hex_upper,
        score = v_total_score,
        rarity = v_rarity,
        badges = '[]'::jsonb,
        score_version = 2
    WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
  ELSE
    BEGIN
      INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges, score_version)
      VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, '[]'::jsonb, 2);
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'rarity', v_existing_roll.rarity,
        'badges', v_existing_roll.badges,
        'traits', '[]'::jsonb,
        'contributors', '[]'::jsonb,
        'identity', '',
        'new_achievements', '[]'::jsonb,
        'milestone_granted', ''
      );
    END;

    UPDATE profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_total_score + v_achievement_ep
    WHERE id = v_user_id;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
      last_roll_date = CURRENT_DATE
  WHERE id = v_user_id;

  IF v_total_score > COALESCE(v_best_roll_score, 0) THEN
    UPDATE profiles
    SET best_roll_score = v_total_score,
        best_roll_hex = v_hex_upper,
        best_roll_rarity = v_rarity
    WHERE id = v_user_id;
  END IF;

  SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
  SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
  v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::double precision / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

  RETURN jsonb_build_object(
    'success', true,
    'already_rolled', false,
    'is_anon', false,
    'hex', v_hex_upper,
    'r', v_r,
    'g', v_g,
    'b', v_b,
    'score', v_total_score,
    'rarity', v_rarity,
    'badges', v_response_badges,
    'traits', v_traits,
    'contributors', v_contributors,
    'identity', v_identity,
    'percentile', v_percentile,
    'total_rollers', v_total_count,
    'new_achievements', v_new_achievements,
    'milestone_granted', v_milestone_granted
  );
END;
$$;

ALTER FUNCTION public.roll_die_impl(boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM PUBLIC, anon, authenticated, service_role;
