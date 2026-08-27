-- Score model v4.
--
-- v3 remains available for historical replay. v4 preserves the same
-- condition catalog and adds a small deterministic spread to ordinary
-- condition awards. Exact colors, recognizable patterns, and culture/meme
-- matches keep their authored point values.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_roll_v4(p_r integer, p_g integer, p_b integer)
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
    v_base_points := (v_condition->>'points')::bigint;

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

    v_awarded := greatest(
      1,
      round(v_base_points::numeric * (10000 + v_variation_bps)::numeric / 10000)::bigint
    );
    v_score := v_score + v_awarded;
    v_contributors := v_contributors || jsonb_build_array(
      v_condition || jsonb_build_object(
        'basePoints', v_base_points,
        'awardedPoints', v_awarded,
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
    WHEN v_score >= 315419 THEN 'Anomaly'
    WHEN v_score >= 213155 THEN 'Legendary'
    WHEN v_score >= 73744 THEN 'Epic'
    WHEN v_score >= 47916 THEN 'Rare'
    WHEN v_score >= 35871 THEN 'Uncommon'
    WHEN v_score >= 11013 THEN 'Common'
    ELSE 'Trash'
  END;

  RETURN v_base || jsonb_build_object(
    'scoreVersion', 4,
    'score_version', 4,
    'score', v_score,
    'rarity', v_rarity,
    'contributors', v_sorted_contributors
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_roll_v4(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Keep the audited roll transaction and reward path intact. Only its scoring
-- implementation and stored score version move forward from v3 to v4.
DO $patch_roll_v4$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;

  IF position('public.calculate_roll_v3(' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'roll_die_impl_pre_audit no longer exposes the expected v3 scoring call';
  END IF;

  v_definition := replace(v_definition, 'public.calculate_roll_v3(', 'public.calculate_roll_v4(');
  v_definition := replace(v_definition, 'score_version = 3', 'score_version = 4');
  v_definition := replace(
    v_definition,
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 3);',
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 4);'
  );
  EXECUTE v_definition;
END;
$patch_roll_v4$;

COMMIT;
