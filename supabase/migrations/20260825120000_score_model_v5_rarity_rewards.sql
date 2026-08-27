-- Score model v5.
--
-- Condition rarity is authored by the condition catalog and selects the
-- reward band. v3 and v4 remain available for historical replay; new rolls
-- use this version through the audited roll transaction.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_roll_v5(p_r integer, p_g integer, p_b integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base jsonb;
  v_condition jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_sorted_contributors jsonb := '[]'::jsonb;
  v_index bigint := 0;
  v_id text;
  v_category text;
  v_condition_rarity text;
  v_band_base bigint;
  v_min_points bigint;
  v_max_points bigint;
  v_strength numeric;
  v_reward_strength numeric;
  v_base_points bigint;
  v_awarded bigint;
  v_variation_bps bigint;
  v_score bigint := 0;
  v_rarity text;
BEGIN
  v_base := public.calculate_roll_v3(p_r, p_g, p_b);

  FOR v_condition IN
    SELECT value
    FROM jsonb_array_elements(v_base->'conditions') WITH ORDINALITY AS item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    v_id := v_condition->>'id';
    v_category := v_condition->>'category';
    v_condition_rarity := COALESCE(v_condition->>'conditionRarity', 'Common');

    CASE v_condition_rarity
      WHEN 'Anomaly' THEN
        v_band_base := 500000;
        v_min_points := 500000;
        v_max_points := NULL;
      WHEN 'Legendary' THEN
        v_band_base := 150000;
        v_min_points := 100000;
        v_max_points := 499999;
      WHEN 'Epic' THEN
        v_band_base := 40000;
        v_min_points := 25000;
        v_max_points := 99999;
      WHEN 'Rare' THEN
        v_band_base := 12000;
        v_min_points := 7500;
        v_max_points := 24999;
      WHEN 'Uncommon' THEN
        v_band_base := 4000;
        v_min_points := 2500;
        v_max_points := 7499;
      ELSE
        v_condition_rarity := 'Common';
        v_band_base := 1000;
        v_min_points := 0;
        v_max_points := 2499;
    END CASE;

    v_strength := CASE
      WHEN v_id IN ('pure_black', 'pure_white') THEN 200
      WHEN v_id IN ('pure_gold', 'reference_123456', 'reference_abcdef', 'reference_fedcba') THEN 60
      WHEN v_id IN ('streamer_purple', 'audio_stream_green', 'classic_cola_red') THEN 40
      WHEN v_id IN ('pure_red', 'pure_green', 'pure_blue') THEN 36
      WHEN v_id IN ('pure_cyan', 'pure_magenta', 'pure_yellow') THEN 32
      WHEN v_category IN ('rare_event', 'hex_culture', 'structure') THEN 1.5
      WHEN v_category IN ('hex_pattern', 'cascade') THEN 1.25
      ELSE 1
    END;
    v_reward_strength := CASE v_condition_rarity
      WHEN 'Legendary' THEN least(v_strength, 2.8)
      WHEN 'Epic' THEN least(v_strength, 2.2)
      WHEN 'Rare' THEN least(v_strength, 1.8)
      WHEN 'Uncommon' THEN least(v_strength, 1.7)
      WHEN 'Common' THEN least(v_strength, 1.4)
      ELSE v_strength
    END;
    v_base_points := greatest(1, round(v_band_base::numeric * v_reward_strength)::bigint);

    IF v_id IN (
      'sum_42', 'sum_100', 'sum_255', 'sum_666',
      'triple_crown', 'palindrome', 'repeated_pair', 'hex_staircase', 'f1',
      'dead', 'beef', 'cafe', 'face', 'fade', 'feed', 'food', 'leet',
      'james_bond', 'blaze_it', 'babe', 'boob', 'dood', 'nice', 'demon',
      'jackpot', 'not_found', 'server_error', 'perfect_score', 'abcd',
      'pure_black', 'pure_white', 'pure_red', 'pure_green', 'pure_blue',
      'pure_cyan', 'pure_magenta', 'pure_yellow', 'pure_gold',
      'streamer_purple', 'audio_stream_green', 'classic_cola_red',
      'reference_123456', 'reference_abcdef', 'reference_fedcba'
    ) THEN
      v_variation_bps := 0;
    ELSE
      v_variation_bps := mod(
        p_r::bigint * 97
        + p_g::bigint * 193
        + p_b::bigint * 389
        + v_index * 9973,
        2001
      ) - 1000;
    END IF;

    v_awarded := round(
      v_base_points::numeric * (10000 + v_variation_bps)::numeric / 10000
    )::bigint;
    v_awarded := greatest(v_min_points, v_awarded);
    IF v_max_points IS NOT NULL THEN
      v_awarded := least(v_max_points, v_awarded);
    END IF;

    v_score := v_score + v_awarded;
    v_contributors := v_contributors || jsonb_build_array(
      v_condition || jsonb_build_object(
        'conditionRarity', v_condition_rarity,
        'points', v_base_points,
        'basePoints', v_base_points,
        'awardedPoints', v_awarded,
        'rewardStrength', v_reward_strength,
        'multiplier', 1,
        'variationBps', v_variation_bps
      )
    );
    v_index := v_index + 1;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(value ORDER BY (value->>'awardedPoints')::bigint DESC, value->>'id' ASC),
    '[]'::jsonb
  )
  INTO v_sorted_contributors
  FROM jsonb_array_elements(v_contributors) AS contributor(value);

  v_rarity := CASE
    WHEN v_score >= 104204 THEN 'Anomaly'
    WHEN v_score >= 86417 THEN 'Legendary'
    WHEN v_score >= 28177 THEN 'Epic'
    WHEN v_score >= 23589 THEN 'Rare'
    WHEN v_score >= 19701 THEN 'Uncommon'
    WHEN v_score >= 10786 THEN 'Common'
    ELSE 'Trash'
  END;

  RETURN v_base || jsonb_build_object(
    'scoreVersion', 5,
    'score_version', 5,
    'score', v_score,
    'rarity', v_rarity,
    'conditions', (
      SELECT COALESCE(jsonb_agg(
        value
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(v_contributors) WITH ORDINALITY AS condition(value, ordinality)
    ),
    'contributors', v_sorted_contributors
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_roll_v5(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Keep the audited roll transaction and reward path intact. Move only the
-- scoring implementation and stored score version to the new model.
DO $patch_roll_v5$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;

  IF position('public.calculate_roll_v4(' IN v_definition) = 0
     AND position('public.calculate_roll_v3(' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'roll_die_impl_pre_audit no longer exposes a supported scoring call';
  END IF;

  v_definition := replace(v_definition, 'public.calculate_roll_v4(', 'public.calculate_roll_v5(');
  v_definition := replace(v_definition, 'public.calculate_roll_v3(', 'public.calculate_roll_v5(');
  v_definition := replace(v_definition, 'score_version = 4', 'score_version = 5');
  v_definition := replace(v_definition, 'score_version = 3', 'score_version = 5');
  v_definition := replace(
    v_definition,
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 4);',
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 5);'
  );
  v_definition := replace(
    v_definition,
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 3);',
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 5);'
  );
  EXECUTE v_definition;
END;
$patch_roll_v5$;

COMMIT;
