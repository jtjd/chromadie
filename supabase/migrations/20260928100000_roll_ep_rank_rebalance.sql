-- Normalize future roll EP while leaving raw score, historical lifetime EP,
-- purchased inventory, and the unlock ledger intact.
BEGIN;

ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS ep_earned bigint;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS lifetime_ep_awarded bigint;
ALTER TABLE public.scores ADD CONSTRAINT scores_ep_earned_nonnegative
  CHECK (ep_earned IS NULL OR ep_earned >= 0);
ALTER TABLE public.scores ADD CONSTRAINT scores_lifetime_ep_awarded_nonnegative
  CHECK (lifetime_ep_awarded IS NULL OR lifetime_ep_awarded >= 0);

CREATE OR REPLACE FUNCTION public.roll_score_to_ep(p_score bigint)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_score <= 0 THEN 0::bigint
    WHEN p_score <= 80000 THEN p_score
    ELSE 80000 + round(80000 * ln(1 + (p_score - 80000)::numeric / 80000))::bigint
  END;
$function$;
REVOKE ALL ON FUNCTION public.roll_score_to_ep(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roll_score_to_ep(bigint) TO service_role;

-- Preserve the original lifetime_ep ledger exactly. The rank ledger maps each
-- legacy account to the same rank and fraction of progress within that rank.
-- This avoids both rank loss and instant promotions caused by old raw-score
-- outliers. Only the mapped EP is exposed as progression EP going forward.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS progression_ep bigint NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.map_legacy_rank_ep(p_lifetime_ep bigint)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_lifetime_ep <= 0 THEN 0::bigint
    WHEN p_lifetime_ep < 4790000 THEN round(p_lifetime_ep::numeric * 1300000 / 4790000)::bigint
    WHEN p_lifetime_ep < 23950000 THEN 1300000 + round((p_lifetime_ep - 4790000)::numeric * 2900000 / 19160000)::bigint
    WHEN p_lifetime_ep < 71851000 THEN 4200000 + round((p_lifetime_ep - 23950000)::numeric * 7000000 / 47901000)::bigint
    WHEN p_lifetime_ep < 143703000 THEN 11200000 + round((p_lifetime_ep - 71851000)::numeric * 10500000 / 71852000)::bigint
    WHEN p_lifetime_ep < 287405000 THEN 21700000 + round((p_lifetime_ep - 143703000)::numeric * 20500000 / 143702000)::bigint
    ELSE 42200000 + round((p_lifetime_ep - 287405000)::numeric / 10)::bigint
  END;
$function$;
REVOKE ALL ON FUNCTION public.map_legacy_rank_ep(bigint) FROM PUBLIC, anon, authenticated;
UPDATE public.profiles
SET progression_ep = public.map_legacy_rank_ep(lifetime_ep);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_progression_ep_nonnegative CHECK (progression_ep >= 0);

-- A roll already claimed today has a legacy raw-score ledger award, while its
-- rank-facing EP is normalized. Both are stored so a reroll reverses each
-- ledger correctly without rewriting any historical score.
UPDATE public.scores
SET ep_earned = public.roll_score_to_ep(score),
    lifetime_ep_awarded = score
WHERE roll_date = public.game_utc_date() AND ep_earned IS NULL;

-- The shop route is retired. Keep historical purchase rows and implementation
-- for audit/rollback, but close the browser purchase boundary.
REVOKE ALL ON FUNCTION public.purchase_item(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_wallet_balance() FROM PUBLIC, anon, authenticated;

-- Existing freeze inventory remains usable by the roll transaction. The old
-- EP-priced consumable is no longer offered as a catalog acquisition.
UPDATE public.shop_items
SET catalog_status = 'retired'
WHERE item_key = 'streak_freeze';

-- The old score-insert trigger was retired by the authoritative roll path.
-- Fail if a divergent database still attaches it, then remove its raw-score
-- award function so it cannot be reintroduced accidentally.
DO $retire_raw_score_trigger$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgfoid = 'public.update_lifetime_ep()'::regprocedure
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Retired raw-score EP trigger is still attached';
  END IF;
END;
$retire_raw_score_trigger$;
DROP FUNCTION public.update_lifetime_ep();

CREATE OR REPLACE FUNCTION public.roll_die_impl_pre_audit(p_is_reroll boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_r integer;
  v_g integer;
  v_b integer;
  v_hex_upper text;
  v_total_score bigint;
  v_roll_ep bigint;
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
  v_total_count integer;
  v_higher_count integer;
  v_percentile numeric;
  v_last_roll date;
  v_current_streak integer := 1;
  v_new_achievements jsonb := '[]'::jsonb;
  v_achievement_badges jsonb := '[]'::jsonb;
  v_total_rolls bigint;
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
  v_cotw_reward_granted boolean := false;
  v_random_bytes bytea;
BEGIN
  IF NOT p_is_reroll THEN
    SELECT * INTO v_existing_roll
    FROM scores
    WHERE user_id = v_user_id AND roll_date = public.game_utc_date();

    IF FOUND THEN
      SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = public.game_utc_date();
      SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = public.game_utc_date() AND score > v_existing_roll.score;
      v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::double precision / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'ep_earned', COALESCE(v_existing_roll.ep_earned, v_existing_roll.score),
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
    SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
  END IF;

  SELECT best_roll_score INTO v_best_roll_score
  FROM profiles
  WHERE id = v_user_id;

  v_random_bytes := extensions.gen_random_bytes(3);
  v_r := get_byte(v_random_bytes, 0);
  v_g := get_byte(v_random_bytes, 1);
  v_b := get_byte(v_random_bytes, 2);

  v_hex_upper := upper('#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0'));

  v_score_data := public.calculate_roll_v6(v_r, v_g, v_b);
  v_total_score := (v_score_data->>'score')::bigint;
  v_roll_ep := public.roll_score_to_ep(v_total_score);
  v_rarity := v_score_data->>'rarity';
  v_condition_ids := coalesce(v_score_data->'conditionIds', '[]'::jsonb);
  v_contributors := coalesce(v_score_data->'contributors', '[]'::jsonb);
  v_traits := coalesce(v_score_data->'traits', '[]'::jsonb);
  v_identity := coalesce(v_score_data->>'identity', '');

  IF v_user_id IS NOT NULL AND NOT p_is_reroll AND v_total_score > COALESCE(v_best_roll_score, 0) THEN
    v_achievement_ep := v_achievement_ep + 50000;
    v_event_badges := v_event_badges || jsonb_build_array('beat_your_best');
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
    IF v_cotw_str IS NOT NULL THEN
      v_cotw_r := split_part(v_cotw_str, ',', 1)::integer;
      v_cotw_g := split_part(v_cotw_str, ',', 2)::integer;
      v_cotw_b := split_part(v_cotw_str, ',', 3)::integer;
      v_dist := sqrt(power(v_r - v_cotw_r, 2) + power(v_g - v_cotw_g, 2) + power(v_b - v_cotw_b, 2));
      IF v_dist <= 50 THEN
        v_event_badges := v_event_badges || jsonb_build_array('cotw_hit');
        INSERT INTO public.user_daily_reward_claims (user_id, reward_date, reward_id)
        VALUES (v_user_id, public.game_utc_date(), 'cotw_hit')
        ON CONFLICT DO NOTHING;
        v_cotw_reward_granted := FOUND;
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
      'ep_earned', CASE WHEN v_user_id IS NULL THEN 0 ELSE v_roll_ep END,
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
  ELSIF v_last_roll = public.game_utc_date() THEN
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF v_last_roll = public.game_utc_date() - 1 THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_roll = public.game_utc_date() - 2 THEN
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

  IF v_current_streak % 7 = 0 AND NOT p_is_reroll AND v_last_roll IS DISTINCT FROM public.game_utc_date() THEN
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

  SELECT total_rolls + CASE WHEN p_is_reroll THEN 0 ELSE 1 END INTO v_total_rolls
  FROM profiles
  WHERE id = v_user_id;



  SELECT
    COALESCE(sum(a.ep_reward), 0),
    COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon, 'ep_reward', a.ep_reward) ORDER BY a.ep_reward DESC), '[]'::jsonb),
    COALESCE(jsonb_agg('ach_' || a.id ORDER BY a.ep_reward DESC), '[]'::jsonb)
  INTO v_achievement_ep, v_new_achievements, v_achievement_badges
  FROM achievements a
  JOIN (VALUES
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
    ('rarity_anomaly', v_rarity = 'Legendary'),
    ('mythic_roll', v_rarity = 'Anomaly'),
    ('score_50k', v_total_score >= 479000),
    ('score_100k', v_total_score >= 958000),
    ('score_200k', v_total_score >= 1916000),
    ('score_1_5m', v_total_score >= 14370000),
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
    ('classic_cola_red', v_condition_ids ? 'classic_cola_red')
  ) AS t(id, condition_met) ON a.id = t.id AND t.condition_met = true
  LEFT JOIN user_achievements ua ON ua.user_id = v_user_id AND ua.achievement_id = a.id
  WHERE a.season_id IS NULL AND ua.achievement_id IS NULL;

  v_achievement_ep := v_achievement_ep
    + CASE WHEN v_event_badges ? 'beat_your_best' THEN 50000 ELSE 0 END
    + CASE WHEN v_cotw_reward_granted THEN 50000 ELSE 0 END
    + CASE WHEN v_event_badges ? 'streak_bonus_7' THEN 50000 ELSE 0 END;

  INSERT INTO user_achievements (user_id, achievement_id, count)
  SELECT v_user_id, a.id, 1
  FROM achievements a
  JOIN (VALUES
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
    ('rarity_anomaly', v_rarity = 'Legendary'),
    ('mythic_roll', v_rarity = 'Anomaly'),
    ('score_50k', v_total_score >= 479000),
    ('score_100k', v_total_score >= 958000),
    ('score_200k', v_total_score >= 1916000),
    ('score_1_5m', v_total_score >= 14370000),
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
    ('classic_cola_red', v_condition_ids ? 'classic_cola_red')
  ) AS t(id, condition_met) ON a.id = t.id AND t.condition_met = true
  WHERE a.season_id IS NULL
  ON CONFLICT (user_id, achievement_id) DO UPDATE
  SET count = CASE
    WHEN NOT p_is_reroll AND user_achievements.achievement_id IN (
      'rarity_rare', 'rarity_epic', 'rarity_anomaly', 'mythic_roll',
      'score_50k', 'score_100k', 'score_200k', 'score_1_5m',
      'roll_prime', 'high_contrast', 'low_contrast', 'greyscale', 'web_safe',
      'roll_42_sum', 'roll_beef', 'roll_cafe', 'roll_dead', 'roll_face',
      'roll_palindrome', 'repeated_pair', 'saturation_spike', 'triple_crown',
      'pastel_soft', 'neon_bright', 'roll_black', 'roll_white', 'roll_gold',
      'pure_red', 'pure_green', 'pure_blue', 'streamer_purple',
      'audio_stream_green', 'classic_cola_red'
    ) THEN user_achievements.count + 1
    ELSE user_achievements.count
  END;

  v_response_badges := v_condition_ids || v_event_badges || v_achievement_badges;

  IF p_is_reroll THEN
    UPDATE profiles
    SET lifetime_ep = GREATEST(COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.lifetime_ep_awarded, v_existing_roll.score, 0) + v_roll_ep + v_achievement_ep),
        progression_ep = GREATEST(0, COALESCE(progression_ep, 0) - COALESCE(v_existing_roll.ep_earned, public.roll_score_to_ep(v_existing_roll.score), 0) + v_roll_ep + v_achievement_ep)
    WHERE id = v_user_id;

    UPDATE scores
    SET hex_code = v_hex_upper,
        score = v_total_score,
        ep_earned = v_roll_ep,
        lifetime_ep_awarded = v_roll_ep,
        rarity = v_rarity,
        badges = '[]'::jsonb,
        score_version = 6
    WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
  ELSE
    BEGIN
      INSERT INTO scores (user_id, hex_code, score, ep_earned, lifetime_ep_awarded, rarity, roll_date, badges, score_version)
      VALUES (v_user_id, v_hex_upper, v_total_score, v_roll_ep, v_roll_ep, v_rarity, public.game_utc_date(), '[]'::jsonb, 6);
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'ep_earned', COALESCE(v_existing_roll.ep_earned, v_existing_roll.score),
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
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_roll_ep + v_achievement_ep,
        progression_ep = COALESCE(progression_ep, 0) + v_roll_ep + v_achievement_ep
    WHERE id = v_user_id;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
      last_roll_date = public.game_utc_date()
  WHERE id = v_user_id;

  IF v_total_score > COALESCE(v_best_roll_score, 0) THEN
    UPDATE profiles
    SET best_roll_score = v_total_score,
        best_roll_hex = v_hex_upper,
        best_roll_rarity = v_rarity
    WHERE id = v_user_id;
  END IF;

  SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = public.game_utc_date();
  SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = public.game_utc_date() AND score > v_total_score;
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
      'ep_earned', CASE WHEN v_user_id IS NULL THEN 0 ELSE v_roll_ep END,
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
$function$;


-- Keep existing RPC response shapes while sourcing rank-facing EP from the
-- mapped progression ledger. Strict anchors fail if an upstream definition
-- changes before this forward migration runs.
DO $progression_projection_update$
DECLARE
  v_signature text;
  v_definition text;
  v_updated text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.get_my_profile()',
    'public.get_my_progression()',
    'public.get_public_discovery_base(text,text,text,integer,integer)',
    'public.get_public_profile_sitemap_page(text,integer)',
    'public.public_profile_identity_projection(uuid)',
    'public.grant_progression_milestones(uuid)',
    'public.reconcile_progression_account(uuid)',
    'public.roll_die_impl_progression_base(boolean)'
  ] LOOP
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    v_updated := CASE v_signature
      WHEN 'public.get_my_profile()' THEN replace(v_definition, 'p.lifetime_ep', 'p.progression_ep')
      WHEN 'public.get_my_progression()' THEN replace(v_definition, 'SELECT lifetime_ep,', 'SELECT progression_ep,')
      WHEN 'public.get_public_discovery_base(text,text,text,integer,integer)' THEN
        replace(v_definition, 'p.lifetime_ep,', 'p.progression_ep AS lifetime_ep,')
      WHEN 'public.get_public_profile_sitemap_page(text,integer)' THEN
        replace(v_definition, 'p.lifetime_ep > 0', 'p.progression_ep > 0')
      WHEN 'public.public_profile_identity_projection(uuid)' THEN replace(v_definition, 'p.lifetime_ep', 'p.progression_ep')
      WHEN 'public.grant_progression_milestones(uuid)' THEN replace(v_definition, 'SELECT lifetime_ep,', 'SELECT progression_ep,')
      WHEN 'public.reconcile_progression_account(uuid)' THEN replace(v_definition, 'v_profile.lifetime_ep', 'v_profile.progression_ep')
      WHEN 'public.roll_die_impl_progression_base(boolean)' THEN
        replace(v_definition,
          'SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_reward',
          'SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_reward, progression_ep = COALESCE(progression_ep, 0) + v_reward')
    END;
    IF v_updated = v_definition THEN
      RAISE EXCEPTION 'Expected progression projection anchor missing in %', v_signature;
    END IF;
    EXECUTE v_updated;
  END LOOP;
END;
$progression_projection_update$;

-- New thresholds correspond to 14, 45, 120, 250, and 500 typical daily
-- roll equivalents; historical accounts retain their old rank position.
UPDATE public.progression_milestones
SET threshold = CASE id
  WHEN 'rank_silver' THEN 1300000
  WHEN 'rank_gold' THEN 4200000
  WHEN 'rank_platinum' THEN 11200000
  WHEN 'rank_diamond' THEN 21700000
  WHEN 'rank_chroma' THEN 42200000 END,
  progress_target = CASE id
  WHEN 'rank_silver' THEN 1300000
  WHEN 'rank_gold' THEN 4200000
  WHEN 'rank_platinum' THEN 11200000
  WHEN 'rank_diamond' THEN 21700000
  WHEN 'rank_chroma' THEN 42200000 END,
  pace_band = CASE id WHEN 'rank_silver' THEN 'weeks' WHEN 'rank_gold' THEN 'months'
    WHEN 'rank_platinum' THEN 'months' WHEN 'rank_diamond' THEN 'months' ELSE 'years' END
WHERE id IN ('rank_silver','rank_gold','rank_platinum','rank_diamond','rank_chroma');

UPDATE public.achievements
SET description = CASE id
  WHEN 'score_50k' THEN 'Score at least 479,000 points in a single roll.'
  WHEN 'score_100k' THEN 'Score at least 958,000 points in a single roll.'
  WHEN 'score_200k' THEN 'Score at least 1,916,000 points in a single roll.'
  WHEN 'score_1_5m' THEN 'Score at least 14,370,000 points in a single roll.'
END
WHERE id IN ('score_50k','score_100k','score_200k','score_1_5m')
  AND season_id IS NULL;

-- Ritual fills the long gaps between rank chapters with distinct profile
-- expression. Discovery retains its separate rare-condition rewards.
INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT p.id, equipped.item_key, 1
FROM public.profiles p
CROSS JOIN LATERAL jsonb_each_text(COALESCE(p.equipped_cosmetics, '{}'::jsonb)) AS equipped(slot, item_key)
WHERE equipped.item_key IN ('profile_atmosphere_ink_bloom', 'cursor_trail_ember_ash', 'border_gold')
ON CONFLICT (user_id, item_key) DO UPDATE
  SET quantity = GREATEST(public.inventory.quantity, 1);

UPDATE public.shop_items
SET cost = 0, access_tier = 'earned', entitlement_key = NULL
WHERE item_key IN ('profile_atmosphere_ink_bloom', 'cursor_trail_ember_ash', 'border_gold')
  AND catalog_status = 'active';

INSERT INTO public.progression_milestones (
  id, name, description, metric, threshold, reward_item_key,
  track, sort_order, achievement_id, progress_source, progress_target,
  published, expected_rolls, pace_band, presentation_role
) VALUES
  ('journey_roll_180', 'Half a year in color', 'Roll 180 colors and deepen your profile atmosphere.',
   'achievement', 0, 'profile_atmosphere_ink_bloom', 'ritual', 81, NULL,
   'total_rolls', 180, true, NULL, 'months', 'objective'),
  ('journey_roll_300', 'Three hundred colors', 'Roll 300 colors and leave a trail of the journey.',
   'achievement', 0, 'cursor_trail_ember_ash', 'ritual', 82, NULL,
   'total_rolls', 300, true, NULL, 'months', 'objective'),
  ('journey_roll_430', 'Four hundred thirty colors', 'Roll 430 colors and frame the story you have built.',
   'achievement', 0, 'border_gold', 'ritual', 95, NULL,
   'total_rolls', 430, true, NULL, 'years', 'objective')
ON CONFLICT (id) DO NOTHING;

DO $ritual_reward_validation$
BEGIN
  IF (SELECT count(*) FROM public.shop_items
      WHERE item_key IN ('profile_atmosphere_ink_bloom', 'cursor_trail_ember_ash', 'border_gold')
        AND catalog_status = 'active' AND access_tier = 'earned' AND cost = 0
        AND css_type = 'renderer') <> 3 THEN
    RAISE EXCEPTION 'Rebalanced Ritual rewards require three active earned renderers';
  END IF;
END;
$ritual_reward_validation$;

-- Backfill newly eligible accounts without a second live unlock notice.
DO $rank_rebalance_backfill$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN SELECT id FROM public.profiles ORDER BY id LOOP
    PERFORM public.reconcile_progression_account(v_profile.id);
  END LOOP;
END;
$rank_rebalance_backfill$;

CREATE OR REPLACE FUNCTION public.get_my_daily_roll()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
    'hex_code', s.hex_code,
    'score', s.score,
    'ep_earned', COALESCE(s.ep_earned, s.score),
    'rarity', s.rarity,
    'badges', s.condition_ids,
    'condition_ids', s.condition_ids,
    'contributors', s.contributors,
    'traits', s.traits,
    'identity', s.identity,
    'score_version', s.score_version,
    'roll_date', s.roll_date
  ) END
  FROM (SELECT auth.uid() AS user_id) caller
  LEFT JOIN public.scores s
    ON s.user_id = caller.user_id AND s.roll_date = public.game_utc_date();
$function$;

COMMIT;
