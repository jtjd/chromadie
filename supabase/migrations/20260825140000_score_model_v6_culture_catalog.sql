-- Score model v6.
--
-- v6 keeps the v3 condition mechanics and v5 reward bands, but makes the
-- condition catalog probability-aware and adds deterministic HEX culture
-- matches. The audited transaction remains the only path that can persist a
-- roll; v3, v4, and v5 stay available for historical replay.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_roll_v6(p_r integer, p_g integer, p_b integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base jsonb;
  v_condition jsonb;
  v_conditions jsonb := '[]'::jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_sorted_contributors jsonb := '[]'::jsonb;
  v_index bigint := 0;
  v_id text;
  v_category text;
  v_condition_rarity text;
  v_hex text;
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
  v_hex := upper(lpad(to_hex(p_r), 2, '0') || lpad(to_hex(p_g), 2, '0') || lpad(to_hex(p_b), 2, '0'));

  -- Reclassify the historical condition IDs from their measured probability
  -- in the full 24-bit RGB space. The score literal is never used to infer a
  -- condition's rarity.
  FOR v_condition IN
    SELECT value
    FROM jsonb_array_elements(v_base->'conditions') WITH ORDINALITY AS item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    v_id := v_condition->>'id';

    -- A larger culture phrase owns its smaller nested phrase. Structural and
    -- color conditions continue to stack normally.
    IF (v_id = 'blaze_it' AND (v_hex LIKE '%42069%' OR v_hex LIKE '%69420%' OR v_hex LIKE '%420420%'))
      OR (v_id = 'nice' AND (v_hex LIKE '%42069%' OR v_hex LIKE '%69420%' OR v_hex LIKE '%696969%'))
      OR (v_id = 'not_found' AND v_hex LIKE '%404404%')
      OR (v_id = 'demon' AND v_hex LIKE '%666666%')
      OR (v_id = 'jackpot' AND v_hex LIKE '%777777%')
      OR (v_id = 'leet' AND v_hex LIKE '%133713%')
      OR (v_id = 'face' AND v_hex LIKE '%DEFACE%')
    THEN
      CONTINUE;
    END IF;

    v_condition_rarity := CASE
      WHEN v_id IN (
        'sum_even', 'sum_odd', 'even_channel_harmony', 'odd_channel_rhythm', 'mixed_channel_rhythm',
        'prime_sum', 'sum_divisible_3', 'sum_divisible_5', 'sum_divisible_7', 'balanced_sum_band',
        'high_contrast', 'gentle_contrast', 'layered_contrast', 'neon', 'complementary_balance',
        'warm_bias', 'cool_bias', 'vivid_contrast', 'channel_span', 'hex_letter_rich', 'hex_digit_rich',
        'hex_digit_prime', 'channel_edge', 'hex_echo', 'channel_parity_lock', 'saturation_spike',
        'vivid_saturation', 'rich_saturation', 'muted_saturation', 'deep_tone', 'balanced_tone',
        'bright_tone', 'red_dominant', 'green_dominant', 'blue_dominant', 'ascending_channels',
        'descending_channels', 'all_channels_even', 'all_channels_odd', 'hex_letter_run', 'hex_digit_run',
        'condition_cascade', 'condition_storm'
      ) THEN 'Common'
      WHEN v_id IN (
        'low_contrast', 'pastel', 'edge_luminance', 'edge_pair', 'extreme_span', 'hex_bookends', 'triple_hex', 'f1', 'soft_saturation',
        'luminous_saturation', 'shadow_saturation', 'shadow_tone', 'luminous_tone', 'balanced_channels',
        'channel_pair', 'condition_constellation', 'nice'
      ) THEN 'Uncommon'
      WHEN v_id IN ('fibonacci_sum', 'sum_255', 'mirror_channels', 'triple_crown', 'tone_edge') THEN 'Rare'
      WHEN v_id IN (
        'sum_100', 'sum_666', 'luminous_core', 'palindrome', 'james_bond', 'blaze_it', 'demon', 'jackpot',
        'not_found', 'server_error', 'perfect_score'
      ) THEN 'Epic'
      WHEN v_id IN (
        'sum_42', 'greyscale', 'web_safe', 'repeated_pair', 'dead', 'beef', 'cafe', 'face', 'fade',
        'feed', 'food', 'leet', 'babe', 'boob', 'dood', 'abcd'
      ) THEN 'Legendary'
      WHEN v_id IN (
        'hex_staircase', 'pure_black', 'pure_white', 'pure_red', 'pure_green', 'pure_blue', 'pure_cyan',
        'pure_magenta', 'pure_yellow', 'pure_gold', 'streamer_purple', 'audio_stream_green',
        'classic_cola_red', 'reference_123456', 'reference_abcdef', 'reference_fedcba'
      ) THEN 'Anomaly'
      WHEN v_id = 'hue_family_neutral' THEN 'Rare'
      WHEN v_id = 'hue_family_emerald' THEN 'Common'
      WHEN v_id LIKE 'hue_family_%' THEN 'Uncommon'
      WHEN v_id = 'temperature_neutral' THEN 'Legendary'
      ELSE 'Common'
    END;

    v_conditions := v_conditions || jsonb_build_array(
      v_condition || jsonb_build_object('conditionRarity', v_condition_rarity)
    );
  END LOOP;

  -- Six Seven is a strongest-match family: 676767 pays once as a full house,
  -- 6767 pays once as an echo, and every other occurrence pays the base 67
  -- condition. The remaining culture catalog entries may stack with it.
  IF v_hex = '676767' THEN
    v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
      'id', 'six_seven_full', 'name', 'Six Seven Full House', 'category', 'hex_culture',
      'points', 1, 'conditionRarity', 'Anomaly'
    ));
  ELSIF v_hex LIKE '%6767%' THEN
    v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
      'id', 'six_seven_echo', 'name', 'Six Seven Echo', 'category', 'hex_culture',
      'points', 1, 'conditionRarity', 'Legendary'
    ));
  ELSIF v_hex LIKE '%67%' THEN
    v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
      'id', 'six_seven', 'name', 'Six Seven', 'category', 'hex_culture',
      'points', 1, 'conditionRarity', 'Uncommon'
    ));
  END IF;

  IF v_hex LIKE '%A24%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'a24', 'name', 'A24', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Epic')); END IF;
  IF v_hex LIKE '%D23%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'd23', 'name', 'D23', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Epic')); END IF;
  IF v_hex LIKE '%FF7%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'ff7', 'name', 'Final Fantasy VII', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Epic')); END IF;
  IF v_hex LIKE '%A113%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'a113', 'name', 'A113', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Legendary')); END IF;
  IF v_hex LIKE '%808%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'eight_oh_eight', 'name', '808', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Epic')); END IF;
  IF v_hex LIKE '%1989%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'era_1989', 'name', '1989 Era', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Legendary')); END IF;
  IF v_hex LIKE '%42069%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'blaze_nice', 'name', 'Blaze Nice', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%69420%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'nice_blaze', 'name', 'Nice Blaze', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%58008%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'calculator_classic', 'name', 'Calculator Classic', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%07734%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'calculator_hello', 'name', 'Calculator Hello', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%80085%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'calculator_boobs', 'name', 'Calculator Boobs', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%420420%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'double_blaze', 'name', 'Double Blaze', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%404404%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'double_not_found', 'name', '404 Echo', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%666666%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'six_sixes', 'name', 'Six Sixes', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%696969%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'nice_stack', 'name', 'Nice Stack', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%777777%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'jackpot_stack', 'name', 'Jackpot Stack', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%133713%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'leet_stack', 'name', 'Leet Stack', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%C0FFEE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'coffee_code', 'name', 'Coffee Code', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%C0D3%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'code_echo', 'name', 'Code Echo', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Legendary')); END IF;
  IF v_hex LIKE '%DEC0DE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'decode', 'name', 'Decode', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%FACADE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'facade', 'name', 'Facade', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%DEFACE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'deface', 'name', 'Deface', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%BADA55%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'badass', 'name', 'Badass', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%F00BA4%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'foobar', 'name', 'Foobar', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Anomaly')); END IF;
  IF v_hex LIKE '%B0BA%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id', 'boba', 'name', 'Boba', 'category', 'hex_culture', 'points', 1, 'conditionRarity', 'Legendary')); END IF;

  FOR v_condition IN
    SELECT value
    FROM jsonb_array_elements(v_conditions) WITH ORDINALITY AS item(value, ordinality)
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
      WHEN v_id = 'six_seven_full' THEN 24
      WHEN v_id IN ('double_blaze', 'double_not_found', 'six_sixes', 'nice_stack', 'jackpot_stack', 'leet_stack', 'coffee_code', 'decode', 'facade', 'deface', 'badass', 'foobar') THEN 12
      WHEN v_id IN ('blaze_nice', 'nice_blaze', 'calculator_classic', 'calculator_hello', 'calculator_boobs') THEN 8
      WHEN v_id IN ('six_seven_echo', 'a113', 'era_1989', 'code_echo', 'boba') THEN 2.8
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
    WHEN v_score >= 79651 THEN 'Anomaly'
    WHEN v_score >= 38478 THEN 'Legendary'
    WHEN v_score >= 28532 THEN 'Epic'
    WHEN v_score >= 23826 THEN 'Rare'
    WHEN v_score >= 19826 THEN 'Uncommon'
    WHEN v_score >= 10813 THEN 'Common'
    ELSE 'Trash'
  END;

  RETURN v_base || jsonb_build_object(
    'scoreVersion', 6,
    'score_version', 6,
    'score', v_score,
    'rarity', v_rarity,
    'conditions', v_contributors,
    'conditionIds', COALESCE((SELECT jsonb_agg(value->>'id') FROM jsonb_array_elements(v_conditions) AS condition(value)), '[]'::jsonb),
    'contributors', v_sorted_contributors
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_roll_v6(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Move only the authoritative scorer and persisted version. The surrounding
-- audited, eligibility, reward, and RLS layers stay unchanged.
DO $patch_roll_v6$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;

  IF position('public.calculate_roll_v5(' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'roll_die_impl_pre_audit no longer exposes the expected v5 scoring call';
  END IF;

  v_definition := replace(v_definition, 'public.calculate_roll_v5(', 'public.calculate_roll_v6(');
  v_definition := replace(v_definition, 'score_version = 5', 'score_version = 6');
  v_definition := replace(
    v_definition,
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 5);',
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 6);'
  );
  EXECUTE v_definition;
END;
$patch_roll_v6$;

-- Keep discovery pacing aligned with the active roll ladder. The stable
-- achievement IDs remain unchanged: rarity_anomaly is the Legendary unlock,
-- while mythic_roll is the Anomaly unlock.
UPDATE public.progression_milestones
SET expected_rolls = 50
WHERE id = 'journey_rarity_anomaly';

UPDATE public.progression_milestones
SET expected_rolls = 100
WHERE id = 'journey_mythic';

UPDATE public.progression_milestones
SET expected_rolls = 14
WHERE id = 'journey_rarity_epic';

COMMIT;
