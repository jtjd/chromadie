-- Richer launch scoring pass. Keep the existing server scorer as a legacy
-- primitive, then layer the new condition families and cascade rewards on top
-- so this migration stays auditable and the client/server models remain close.

ALTER FUNCTION public.calculate_roll_v2(integer, integer, integer)
  RENAME TO calculate_roll_v2_legacy;

CREATE OR REPLACE FUNCTION public.calculate_roll_v2(p_r integer, p_g integer, p_b integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_base jsonb;
  v_conditions jsonb;
  v_new_conditions jsonb := '[]'::jsonb;
  v_contributors jsonb;
  v_condition jsonb;
  v_category text;
  v_index integer;
  v_multiplier numeric;
  v_awarded integer;
  v_score bigint;
  v_sum integer := p_r + p_g + p_b;
  v_max integer := greatest(p_r, p_g, p_b);
  v_min integer := least(p_r, p_g, p_b);
  v_range integer := v_max - v_min;
  v_hex text := upper(lpad(to_hex(p_r), 2, '0') || lpad(to_hex(p_g), 2, '0') || lpad(to_hex(p_b), 2, '0'));
  v_r numeric := p_r / 255.0;
  v_g numeric := p_g / 255.0;
  v_b numeric := p_b / 255.0;
  v_max_n numeric;
  v_min_n numeric;
  v_delta numeric;
  v_lightness numeric;
  v_saturation numeric;
  v_family text;
  v_temperature text;
  v_even_channels integer;
  v_scored_condition_count integer;
  v_rarity text;
BEGIN
  v_base := public.calculate_roll_v2_legacy(p_r, p_g, p_b);
  v_conditions := coalesce(v_base->'conditions', '[]'::jsonb);
  v_contributors := coalesce(v_base->'contributors', '[]'::jsonb);
  v_score := coalesce((v_base->>'score')::bigint, 0) - 10000;

  v_max_n := greatest(v_r, v_g, v_b);
  v_min_n := least(v_r, v_g, v_b);
  v_delta := v_max_n - v_min_n;
  v_lightness := ((v_max_n + v_min_n) / 2) * 100;
  IF v_delta <> 0 THEN
    IF v_max_n = v_r THEN v_saturation := (v_delta / (1 - abs(2 * ((v_max_n + v_min_n) / 2) - 1))) * 100;
    ELSIF v_max_n = v_g THEN v_saturation := (v_delta / (1 - abs(2 * ((v_max_n + v_min_n) / 2) - 1))) * 100;
    ELSE v_saturation := (v_delta / (1 - abs(2 * ((v_max_n + v_min_n) / 2) - 1))) * 100;
    END IF;
  ELSE
    v_saturation := 0;
  END IF;

  SELECT replace(value->>'id', 'hue_', '')
  INTO v_family
  FROM jsonb_array_elements(coalesce(v_base->'traits', '[]'::jsonb))
  WHERE value->>'group' = 'hue'
  LIMIT 1;
  SELECT replace(value->>'id', 'temperature_', '')
  INTO v_temperature
  FROM jsonb_array_elements(coalesce(v_base->'traits', '[]'::jsonb))
  WHERE value->>'group' = 'temperature'
  LIMIT 1;

  v_even_channels := (CASE WHEN p_r % 2 = 0 THEN 1 ELSE 0 END)
    + (CASE WHEN p_g % 2 = 0 THEN 1 ELSE 0 END)
    + (CASE WHEN p_b % 2 = 0 THEN 1 ELSE 0 END);

  v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object(
    'id', CASE WHEN v_sum % 2 = 0 THEN 'sum_even' ELSE 'sum_odd' END,
    'name', CASE WHEN v_sum % 2 = 0 THEN 'Even Pulse' ELSE 'Odd Pulse' END,
    'category', 'number_pattern', 'points', CASE WHEN v_sum % 2 = 0 THEN 401 ELSE 403 END));
  v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object(
    'id', 'hue_family_' || coalesce(v_family, 'neutral'),
    'name', initcap(coalesce(v_family, 'Neutral')) || ' Hue',
    'category', 'color_identity', 'points', 199));
  v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object(
    'id', 'temperature_' || coalesce(v_temperature, 'neutral'),
    'name', initcap(coalesce(v_temperature, 'neutral')) || ' Temperature',
    'category', 'color_identity', 'points', 197));
  v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object(
    'id', CASE WHEN v_even_channels = 3 THEN 'even_channel_harmony' WHEN v_even_channels = 0 THEN 'odd_channel_rhythm' ELSE 'mixed_channel_rhythm' END,
    'name', CASE WHEN v_even_channels = 3 THEN 'Even Channel Harmony' WHEN v_even_channels = 0 THEN 'Odd Channel Rhythm' ELSE 'Mixed Channel Rhythm' END,
    'category', 'channel_identity', 'points', 101));

  IF v_sum BETWEEN 300 AND 465 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','balanced_sum_band','name','Balanced Sum','category','sum_shape','points',0));
  END IF;
  IF v_saturation >= 70 AND v_range >= 120 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','vivid_contrast','name','Vivid Contrast','category','color_signature','points',10013));
  END IF;
  IF v_lightness < 20 OR v_lightness >= 80 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','edge_luminance','name','Edge Luminance','category','color_signature','points',7011));
  END IF;
  IF v_range >= 170 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','channel_span','name','Wide Channel Span','category','color_signature','points',8008));
  END IF;
  IF length(v_hex) - length(replace(translate(v_hex, 'ABCDEF', 'AAAAAA'), 'A', '')) >= 3 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','hex_letter_rich','name','Letter-Rich Hex','category','hex_signature','points',2203));
  END IF;
  IF v_min <= 8 OR v_max >= 247 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','channel_edge','name','Edge Channel','category','edge_behavior','points',3503));
  END IF;
  IF v_range >= 230 THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','extreme_span','name','Extreme Span','category','edge_behavior','points',9009));
  END IF;
  IF p_r = p_b THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','mirror_channels','name','Mirror Channels','category','symmetry','points',9009));
  END IF;
  IF v_hex ~ '(.)\1' THEN
    v_new_conditions := v_new_conditions || jsonb_build_array(jsonb_build_object('id','hex_echo','name','Hex Echo','category','hex_signature','points',7007));
  END IF;

  FOR v_condition IN SELECT value FROM jsonb_array_elements(v_new_conditions) LOOP
    v_conditions := v_conditions || jsonb_build_array(v_condition);
  END LOOP;

  FOREACH v_category IN ARRAY ARRAY['number_pattern','color_identity','channel_identity','sum_shape','color_signature','hex_signature','edge_behavior','symmetry'] LOOP
    v_index := 0;
    FOR v_condition IN
      SELECT value FROM jsonb_array_elements(v_new_conditions)
      WHERE value->>'category' = v_category
      ORDER BY (value->>'points')::integer DESC
    LOOP
      v_index := v_index + 1;
      IF v_index > 3 THEN EXIT; END IF;
      v_multiplier := CASE v_index WHEN 1 THEN 1 WHEN 2 THEN 0.35 ELSE 0.1 END;
      v_awarded := round((v_condition->>'points')::numeric * v_multiplier);
      v_score := v_score + v_awarded;
      v_contributors := v_contributors || jsonb_build_array(v_condition || jsonb_build_object('awardedPoints', v_awarded, 'multiplier', v_multiplier));
    END LOOP;
  END LOOP;

  -- The client adds cascade bonuses before pure-color special events. Remove
  -- those legacy special-event entries so threshold checks stay in parity.
  v_scored_condition_count := jsonb_array_length(v_conditions) - (
    SELECT count(*)::integer
    FROM jsonb_array_elements(v_conditions)
    WHERE value->>'category' = 'special_event'
  );
  IF v_scored_condition_count >= 13 THEN
    v_condition := jsonb_build_object('id','condition_cascade','name','Condition Cascade','category','cascade','points',20021,'fullValue',true,'awardedPoints',20021,'multiplier',1);
    v_conditions := v_conditions || jsonb_build_array(v_condition - 'awardedPoints' - 'multiplier');
    v_contributors := v_contributors || jsonb_build_array(v_condition);
    v_score := v_score + 20021;
  END IF;
  IF v_scored_condition_count >= 15 THEN
    v_condition := jsonb_build_object('id','condition_storm','name','Condition Storm','category','cascade','points',210069,'fullValue',true,'awardedPoints',210069,'multiplier',1);
    v_conditions := v_conditions || jsonb_build_array(v_condition - 'awardedPoints' - 'multiplier');
    v_contributors := v_contributors || jsonb_build_array(v_condition);
    v_score := v_score + 210069;
  END IF;
  IF v_scored_condition_count >= 17 THEN
    v_condition := jsonb_build_object('id','condition_supernova','name','Condition Supernova','category','cascade','points',600013,'fullValue',true,'awardedPoints',600013,'multiplier',1);
    v_conditions := v_conditions || jsonb_build_array(v_condition - 'awardedPoints' - 'multiplier');
    v_contributors := v_contributors || jsonb_build_array(v_condition);
    v_score := v_score + 600013;
  END IF;

  SELECT coalesce(jsonb_agg(value ORDER BY (value->>'awardedPoints')::integer DESC), '[]'::jsonb)
  INTO v_contributors FROM jsonb_array_elements(v_contributors);
  v_rarity := CASE WHEN v_score >= 1000000 THEN 'Mythic' WHEN v_score >= 500000 THEN 'Anomaly' WHEN v_score >= 85000 THEN 'Epic' WHEN v_score >= 49500 THEN 'Rare' WHEN v_score >= 34500 THEN 'Uncommon' WHEN v_score >= 25000 THEN 'Common' ELSE 'Trash' END;
  RETURN jsonb_build_object(
    'score', v_score, 'rarity', v_rarity, 'conditions', v_conditions,
    'conditionIds', coalesce((SELECT jsonb_agg(value->>'id') FROM jsonb_array_elements(v_conditions)), '[]'::jsonb),
    'contributors', v_contributors, 'traits', v_base->'traits', 'identity', v_base->>'identity'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_roll_v2(integer, integer, integer) FROM PUBLIC, anon, authenticated;
