-- Pre-launch audit remediation.
--
-- This migration is deliberately forward-only: it repairs privilege checks,
-- makes deletion retry-safe, binds challenge links to authoritative rolls,
-- preserves lifetime progression independently of the 30-day score window,
-- stores authoritative roll presentation data, and exposes only bounded score
-- projections to browser roles.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.game_utc_date()
RETURNS date
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path TO 'pg_catalog'
AS $function$
  SELECT (statement_timestamp() AT TIME ZONE 'UTC')::date;
$function$;

REVOKE ALL ON FUNCTION public.game_utc_date() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.game_utc_date() TO anon, authenticated, service_role;

-- Durable account progression must not depend on retained score history.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_rolls bigint NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_total_rolls_nonnegative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_total_rolls_nonnegative CHECK (total_rolls >= 0);

UPDATE public.profiles p
SET total_rolls = GREATEST(
  COALESCE(p.total_rolls, 0),
  COALESCE((SELECT count(*) FROM public.scores s WHERE s.user_id = p.id), 0)
);

GRANT SELECT (total_rolls) ON TABLE public.profiles TO anon, authenticated;

-- Calculate HSL from integer channels instead of dividing each channel to a
-- fixed-scale numeric first. PostgreSQL's intermediate scale previously turned
-- exact boundaries such as 70% saturation into 69.999999999999999999, while
-- JavaScript correctly classified the same rational value as 70.
DO $audit_hsl$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.calculate_roll_v2_legacy(integer,integer,integer)'::regprocedure)
  INTO v_definition;
  v_definition := replace(v_definition, 'v_rn numeric := p_r / 255.0;', 'v_rn numeric := p_r::numeric;');
  v_definition := replace(v_definition, 'v_gn numeric := p_g / 255.0;', 'v_gn numeric := p_g::numeric;');
  v_definition := replace(v_definition, 'v_bn numeric := p_b / 255.0;', 'v_bn numeric := p_b::numeric;');
  v_definition := replace(
    v_definition,
    'v_lightness := ((v_maxn + v_minn) / 2) * 100;',
    'v_lightness := ((v_maxn + v_minn) / 510) * 100;'
  );
  v_definition := replace(
    v_definition,
    'v_saturation := (v_delta / (1 - abs(2 * ((v_maxn + v_minn) / 2) - 1))) * 100;',
    'v_saturation := CASE WHEN v_maxn + v_minn <= 255 THEN (v_delta * 100) / NULLIF(v_maxn + v_minn, 0) ELSE (v_delta * 100) / NULLIF(510 - v_maxn - v_minn, 0) END;'
  );
  EXECUTE v_definition;

  SELECT pg_get_functiondef('public.calculate_roll_v2(integer,integer,integer)'::regprocedure)
  INTO v_definition;
  v_definition := replace(v_definition, 'v_r numeric := p_r / 255.0;', 'v_r numeric := p_r::numeric;');
  v_definition := replace(v_definition, 'v_g numeric := p_g / 255.0;', 'v_g numeric := p_g::numeric;');
  v_definition := replace(v_definition, 'v_b numeric := p_b / 255.0;', 'v_b numeric := p_b::numeric;');
  v_definition := replace(
    v_definition,
    'v_lightness := ((v_max_n + v_min_n) / 2) * 100;',
    'v_lightness := ((v_max_n + v_min_n) / 510) * 100;'
  );
  v_definition := replace(
    v_definition,
    'v_saturation := (v_delta / (1 - abs(2 * ((v_max_n + v_min_n) / 2) - 1))) * 100;',
    'v_saturation := CASE WHEN v_max_n + v_min_n <= 255 THEN (v_delta * 100) / NULLIF(v_max_n + v_min_n, 0) ELSE (v_delta * 100) / NULLIF(510 - v_max_n - v_min_n, 0) END;'
  );
  EXECUTE v_definition;
END;
$audit_hsl$;

ALTER FUNCTION public.calculate_roll_v2_legacy(integer, integer, integer) STABLE;
ALTER FUNCTION public.calculate_roll_v2(integer, integer, integer) STABLE;

-- Store the server's presentation result with each score. Restored rolls,
-- public profiles, and leaderboards must never re-score authoritative data in
-- JavaScript and accidentally show different conditions or rarity details.
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS condition_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contributors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS traits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS identity text NOT NULL DEFAULT '';

WITH scored AS (
  SELECT
    s.id,
    public.calculate_roll_v2(
      get_byte(decode(substr(s.hex_code, 2), 'hex'), 0),
      get_byte(decode(substr(s.hex_code, 2), 'hex'), 1),
      get_byte(decode(substr(s.hex_code, 2), 'hex'), 2)
    ) AS result
  FROM public.scores s
  WHERE s.hex_code ~ '^#[0-9A-F]{6}$'
)
UPDATE public.scores s
SET condition_ids = COALESCE(scored.result->'conditionIds', '[]'::jsonb),
    contributors = COALESCE(scored.result->'contributors', '[]'::jsonb),
    traits = COALESCE(scored.result->'traits', '[]'::jsonb),
    identity = COALESCE(scored.result->>'identity', '')
FROM scored
WHERE scored.id = s.id;

-- Keep a bounded, durable set of each player's best valid daily rolls. A
-- reroll replaces the candidate for that date; deleting 30-day history does
-- not delete the all-time record. Ten candidates are enough to recover from
-- repeated same-day replacements without storing full lifetime history.
CREATE TABLE IF NOT EXISTS public.user_roll_best_candidates (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_date date NOT NULL,
  score bigint NOT NULL CHECK (score >= 0),
  hex_code text NOT NULL CHECK (hex_code ~ '^#[0-9A-F]{6}$'),
  rarity text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, roll_date)
);

ALTER TABLE public.user_roll_best_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_roll_best_candidates FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_roll_best_candidates TO service_role;

CREATE TABLE IF NOT EXISTS public.user_daily_reward_claims (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_date date NOT NULL,
  reward_id text NOT NULL CHECK (reward_id ~ '^[a-z0-9_]{1,80}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_date, reward_id)
);

ALTER TABLE public.user_daily_reward_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_daily_reward_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_daily_reward_claims TO service_role;

INSERT INTO public.user_roll_best_candidates (user_id, roll_date, score, hex_code, rarity)
SELECT user_id, roll_date, score, hex_code, rarity
FROM public.scores
ON CONFLICT (user_id, roll_date) DO UPDATE
SET score = EXCLUDED.score,
    hex_code = EXCLUDED.hex_code,
    rarity = EXCLUDED.rarity,
    updated_at = now();

WITH ranked AS (
  SELECT user_id, roll_date,
    row_number() OVER (PARTITION BY user_id ORDER BY score DESC, roll_date DESC) AS position
  FROM public.user_roll_best_candidates
)
DELETE FROM public.user_roll_best_candidates c
USING ranked r
WHERE c.user_id = r.user_id
  AND c.roll_date = r.roll_date
  AND r.position > 10;

WITH best AS (
  SELECT DISTINCT ON (c.user_id)
    c.user_id, c.score, c.hex_code, c.rarity
  FROM public.user_roll_best_candidates c
  ORDER BY c.user_id, c.score DESC, c.roll_date DESC
)
UPDATE public.profiles p
SET best_roll_score = best.score,
    best_roll_hex = best.hex_code,
    best_roll_rarity = best.rarity
FROM best
WHERE best.user_id = p.id;

UPDATE public.profiles p
SET best_roll_score = NULL,
    best_roll_hex = NULL,
    best_roll_rarity = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roll_best_candidates c WHERE c.user_id = p.id
);

-- Preserve the proven transaction implementation while adding durable state
-- and authoritative presentation in one outer transaction. The public
-- roll_die() wrapper already serializes calls and locks the profile row.
ALTER FUNCTION public.roll_die_impl(boolean) RENAME TO roll_die_impl_pre_audit;

-- Replace PostgreSQL's session PRNG in the proven transaction body with three
-- bytes from pgcrypto. The transformation is intentionally narrow so the
-- gameplay/economy transaction remains otherwise byte-for-byte equivalent.
DO $audit_random$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;
  v_definition := replace(
    v_definition,
    'v_forced_cotw_roll boolean := false;',
    E'v_forced_cotw_roll boolean := false;\n  v_random_bytes bytea;'
  );
  v_definition := replace(
    v_definition,
    E'v_r := floor(random() * 256);\n      v_g := floor(random() * 256);\n      v_b := floor(random() * 256);',
    E'v_random_bytes := extensions.gen_random_bytes(3);\n      v_r := get_byte(v_random_bytes, 0);\n      v_g := get_byte(v_random_bytes, 1);\n      v_b := get_byte(v_random_bytes, 2);'
  );
  v_definition := replace(
    v_definition,
    E'v_r := floor(random() * 256);\n    v_g := floor(random() * 256);\n    v_b := floor(random() * 256);',
    E'v_random_bytes := extensions.gen_random_bytes(3);\n    v_r := get_byte(v_random_bytes, 0);\n    v_g := get_byte(v_random_bytes, 1);\n    v_b := get_byte(v_random_bytes, 2);'
  );
  EXECUTE v_definition;
END;
$audit_random$;

-- Remove temporary-table DDL from the hot roll path and evaluate achievement
-- predicates as an inline VALUES relation. The same rewrite also switches the
-- legacy transaction's milestone calculation to the durable profile counter.
DO $audit_achievements$
DECLARE
  v_definition text;
  v_start integer;
  v_finish integer;
  v_end_marker text := E'    (''classic_cola_red'', v_condition_ids ? ''classic_cola_red'');';
  v_checks text := E'(VALUES\n'
    || E'    (''first_roll'', true),\n'
    || E'    (''roll_10'', v_total_rolls >= 10),\n'
    || E'    (''roll_50'', v_total_rolls >= 50),\n'
    || E'    (''roll_100'', v_total_rolls >= 100),\n'
    || E'    (''roll_365'', v_total_rolls >= 365),\n'
    || E'    (''streak_7'', v_current_streak >= 7),\n'
    || E'    (''streak_14'', v_current_streak >= 14),\n'
    || E'    (''streak_30'', v_current_streak >= 30),\n'
    || E'    (''streak_100'', v_current_streak >= 100),\n'
    || E'    (''rarity_rare'', v_rarity = ''Rare''),\n'
    || E'    (''rarity_epic'', v_rarity = ''Epic''),\n'
    || E'    (''rarity_anomaly'', v_rarity = ''Anomaly''),\n'
    || E'    (''mythic_roll'', v_rarity = ''Mythic''),\n'
    || E'    (''score_50k'', v_total_score >= 50000),\n'
    || E'    (''score_100k'', v_total_score >= 100000),\n'
    || E'    (''score_200k'', v_total_score >= 200000),\n'
    || E'    (''score_1_5m'', v_total_score >= 1500000),\n'
    || E'    (''roll_prime'', v_condition_ids ? ''prime_sum''),\n'
    || E'    (''high_contrast'', v_condition_ids ? ''high_contrast''),\n'
    || E'    (''low_contrast'', v_condition_ids ? ''low_contrast''),\n'
    || E'    (''greyscale'', v_condition_ids ? ''greyscale''),\n'
    || E'    (''web_safe'', v_condition_ids ? ''web_safe''),\n'
    || E'    (''roll_42_sum'', v_condition_ids ? ''sum_42''),\n'
    || E'    (''roll_beef'', v_condition_ids ? ''beef''),\n'
    || E'    (''roll_cafe'', v_condition_ids ? ''cafe''),\n'
    || E'    (''roll_dead'', v_condition_ids ? ''dead''),\n'
    || E'    (''roll_face'', v_condition_ids ? ''face''),\n'
    || E'    (''roll_palindrome'', v_condition_ids ? ''palindrome''),\n'
    || E'    (''repeated_pair'', v_condition_ids ? ''repeated_pair''),\n'
    || E'    (''saturation_spike'', v_condition_ids ? ''saturation_spike''),\n'
    || E'    (''triple_crown'', v_condition_ids ? ''triple_crown''),\n'
    || E'    (''pastel_soft'', v_condition_ids ? ''pastel''),\n'
    || E'    (''neon_bright'', v_condition_ids ? ''neon''),\n'
    || E'    (''roll_black'', v_condition_ids ? ''pure_black''),\n'
    || E'    (''roll_white'', v_condition_ids ? ''pure_white''),\n'
    || E'    (''roll_gold'', v_condition_ids ? ''pure_gold''),\n'
    || E'    (''pure_red'', v_condition_ids ? ''pure_red''),\n'
    || E'    (''pure_green'', v_condition_ids ? ''pure_green''),\n'
    || E'    (''pure_blue'', v_condition_ids ? ''pure_blue''),\n'
    || E'    (''streamer_purple'', v_condition_ids ? ''streamer_purple''),\n'
    || E'    (''audio_stream_green'', v_condition_ids ? ''audio_stream_green''),\n'
    || E'    (''classic_cola_red'', v_condition_ids ? ''classic_cola_red'')\n'
    || E'  ) AS t(id, condition_met)';
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;

  v_definition := replace(v_definition, 'v_total_rolls integer;', 'v_total_rolls bigint;');
  v_definition := replace(v_definition, 'CURRENT_DATE', 'public.game_utc_date()');
  v_definition := replace(v_definition, E'  v_hex_no_hash text;\n', '');
  v_definition := replace(v_definition, E'  v_sum integer;\n', '');
  v_definition := replace(v_definition, E'  v_range integer;\n', '');
  v_definition := replace(v_definition, E'  v_hex_no_hash := substr(v_hex_upper, 2);\n', '');
  v_definition := replace(v_definition, E'  v_sum := v_r + v_g + v_b;\n', '');
  v_definition := replace(v_definition, E'  v_range := greatest(v_r, v_g, v_b) - least(v_r, v_g, v_b);\n', '');
  v_definition := replace(
    v_definition,
    E'  SELECT count(*) + CASE WHEN p_is_reroll THEN 0 ELSE 1 END INTO v_total_rolls\n  FROM scores\n  WHERE user_id = v_user_id;',
    E'  SELECT total_rolls + CASE WHEN p_is_reroll THEN 0 ELSE 1 END INTO v_total_rolls\n  FROM profiles\n  WHERE id = v_user_id;'
  );

  v_start := strpos(v_definition, '  CREATE TEMP TABLE IF NOT EXISTS temp_ach_checks');
  v_finish := strpos(v_definition, v_end_marker);
  IF v_start = 0 OR v_finish = 0 OR v_finish < v_start THEN
    RAISE EXCEPTION 'Could not locate legacy achievement temp-table block';
  END IF;
  v_definition := substr(v_definition, 1, v_start - 1)
    || substr(v_definition, v_finish + length(v_end_marker));
  v_definition := replace(v_definition, 'temp_ach_checks t', v_checks);
  EXECUTE v_definition;
END;
$audit_achievements$;

-- Remove the legacy operator-only forced Color-of-the-Week branch. Test/admin
-- flags must never be able to manufacture a competitive roll, even when set
-- directly by a privileged operator.
DO $audit_forced_roll$
DECLARE
  v_definition text;
  v_start integer;
  v_finish integer;
  v_normal_cotw text := E'  IF v_user_id IS NOT NULL THEN\n'
    || E'    SELECT value INTO v_cotw_str FROM meta WHERE key = ''cotw_target'';\n'
    || E'    IF v_cotw_str IS NOT NULL THEN\n'
    || E'      v_cotw_r := split_part(v_cotw_str, '','', 1)::integer;\n'
    || E'      v_cotw_g := split_part(v_cotw_str, '','', 2)::integer;\n'
    || E'      v_cotw_b := split_part(v_cotw_str, '','', 3)::integer;\n'
    || E'      v_dist := sqrt(power(v_r - v_cotw_r, 2) + power(v_g - v_cotw_g, 2) + power(v_b - v_cotw_b, 2));\n'
    || E'      IF v_dist <= 50 THEN\n'
    || E'        v_event_badges := v_event_badges || jsonb_build_array(''cotw_hit'');\n'
    || E'        INSERT INTO public.user_daily_reward_claims (user_id, reward_date, reward_id)\n'
    || E'        VALUES (v_user_id, public.game_utc_date(), ''cotw_hit'')\n'
    || E'        ON CONFLICT DO NOTHING;\n'
    || E'        v_cotw_reward_granted := FOUND;\n'
    || E'      END IF;\n'
    || E'    END IF;\n'
    || E'  END IF;\n\n';
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;
  v_definition := replace(v_definition, E'  v_force_cotw boolean;\n', '');
  v_definition := replace(v_definition, E'  v_forced_cotw_roll boolean := false;\n', '');
  v_definition := replace(
    v_definition,
    E'  v_dist double precision;\n',
    E'  v_dist double precision;\n  v_cotw_reward_granted boolean := false;\n'
  );
  v_definition := replace(
    v_definition,
    E'  SELECT best_roll_score, force_cotw_next_roll INTO v_best_roll_score, v_force_cotw\n  FROM profiles\n  WHERE id = v_user_id;\n\n',
    E'  SELECT best_roll_score INTO v_best_roll_score\n  FROM profiles\n  WHERE id = v_user_id;\n\n'
  );

  v_start := strpos(v_definition, '  IF COALESCE(v_force_cotw, false) THEN');
  v_finish := strpos(v_definition, '  v_hex_upper :=');
  IF v_start = 0 OR v_finish = 0 OR v_finish < v_start THEN
    RAISE EXCEPTION 'Could not locate forced roll generation block';
  END IF;
  v_definition := substr(v_definition, 1, v_start - 1)
    || E'  v_random_bytes := extensions.gen_random_bytes(3);\n'
    || E'  v_r := get_byte(v_random_bytes, 0);\n'
    || E'  v_g := get_byte(v_random_bytes, 1);\n'
    || E'  v_b := get_byte(v_random_bytes, 2);\n\n'
    || substr(v_definition, v_finish);

  v_start := strpos(v_definition, E'  IF v_user_id IS NOT NULL THEN\n    IF v_forced_cotw_roll THEN');
  v_finish := strpos(v_definition, E'  IF v_user_id IS NULL THEN\n');
  IF v_start = 0 OR v_finish = 0 OR v_finish < v_start THEN
    RAISE EXCEPTION 'Could not locate forced Color-of-the-Week reward block';
  END IF;
  v_definition := substr(v_definition, 1, v_start - 1)
    || v_normal_cotw
    || substr(v_definition, v_finish);

  IF position('IF v_user_id IS NOT NULL AND v_total_score > COALESCE(v_best_roll_score, 0) THEN' IN v_definition) = 0
     OR position('CASE WHEN v_event_badges ? ''cotw_hit'' THEN 50000 ELSE 0 END' IN v_definition) = 0
     OR position('GREATEST(0, COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep)' IN v_definition) = 0
     OR position('SET count = user_achievements.count + 1;' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate reward/economy hardening expressions';
  END IF;
  v_definition := replace(
    v_definition,
    'IF v_user_id IS NOT NULL AND v_total_score > COALESCE(v_best_roll_score, 0) THEN',
    'IF v_user_id IS NOT NULL AND NOT p_is_reroll AND v_total_score > COALESCE(v_best_roll_score, 0) THEN'
  );
  v_definition := replace(
    v_definition,
    'CASE WHEN v_event_badges ? ''cotw_hit'' THEN 50000 ELSE 0 END',
    'CASE WHEN v_cotw_reward_granted THEN 50000 ELSE 0 END'
  );
  v_definition := replace(
    v_definition,
    'GREATEST(0, COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep)',
    'GREATEST(COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep)'
  );
  v_definition := replace(
    v_definition,
    'SET count = user_achievements.count + 1;',
    E'SET count = CASE\n'
      || E'    WHEN NOT p_is_reroll AND user_achievements.achievement_id IN (\n'
      || E'      ''rarity_rare'', ''rarity_epic'', ''rarity_anomaly'', ''mythic_roll'',\n'
      || E'      ''score_50k'', ''score_100k'', ''score_200k'', ''score_1_5m'',\n'
      || E'      ''roll_prime'', ''high_contrast'', ''low_contrast'', ''greyscale'', ''web_safe'',\n'
      || E'      ''roll_42_sum'', ''roll_beef'', ''roll_cafe'', ''roll_dead'', ''roll_face'',\n'
      || E'      ''roll_palindrome'', ''repeated_pair'', ''saturation_spike'', ''triple_crown'',\n'
      || E'      ''pastel_soft'', ''neon_bright'', ''roll_black'', ''roll_white'', ''roll_gold'',\n'
      || E'      ''pure_red'', ''pure_green'', ''pure_blue'', ''streamer_purple'',\n'
      || E'      ''audio_stream_green'', ''classic_cola_red''\n'
      || E'    ) THEN user_achievements.count + 1\n'
      || E'    ELSE user_achievements.count\n'
      || E'  END;'
  );
  EXECUTE v_definition;
END;
$audit_forced_roll$;

DO $audit_utc_functions$
DECLARE
  v_signature text;
  v_definition text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.cleanup_old_scores()',
    'public.get_my_percentile()',
    'public.get_score_percentile(bigint)',
    'public.purchase_item_impl(text)',
    'public.roll_die(boolean)'
  ]
  LOOP
    SELECT pg_get_functiondef(v_signature::regprocedure) INTO v_definition;
    IF position('CURRENT_DATE' IN v_definition) > 0 THEN
      EXECUTE replace(v_definition, 'CURRENT_DATE', 'public.game_utc_date()');
    END IF;
  END LOOP;
END;
$audit_utc_functions$;

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
  v_achievement record;
  v_inserted boolean;
  v_stored record;
BEGIN
  v_result := public.roll_die_impl_pre_audit(p_is_reroll);

  IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- The legacy function intentionally returns lean data for a restored daily
  -- roll. Merge the stored server presentation back into that response.
  IF COALESCE((v_result->>'already_rolled')::boolean, false) THEN
    SELECT s.hex_code, s.score, s.rarity, s.condition_ids, s.contributors,
      s.traits, s.identity
    INTO v_stored
    FROM public.scores s
    WHERE s.user_id = v_user_id AND s.roll_date = public.game_utc_date();

    IF FOUND THEN
      RETURN v_result || jsonb_build_object(
        'hex', v_stored.hex_code,
        'score', v_stored.score,
        'rarity', v_stored.rarity,
        'badges', v_stored.condition_ids,
        'contributors', v_stored.contributors,
        'traits', v_stored.traits,
        'identity', v_stored.identity
      );
    END IF;
    RETURN v_result;
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

  -- The older implementation still handles every non-lifetime achievement.
  -- Insert only missing durable roll milestones and award their EP exactly once.
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
REVOKE ALL ON FUNCTION public.roll_die_impl_pre_audit(boolean) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_bump_shop_version();
DROP FUNCTION IF EXISTS public.admin_randomize_cotw();
DROP FUNCTION IF EXISTS public.admin_trigger_cotw_test();
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS is_admin,
  DROP COLUMN IF EXISTS force_cotw_next_roll;

-- Enforce the economy and presentation invariants at the database boundary.
-- Browser ACLs are not the only protection against negative or malformed data.
UPDATE public.profiles
SET current_streak = GREATEST(COALESCE(current_streak, 0), 0),
    longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0), 0),
    lifetime_ep = GREATEST(COALESCE(lifetime_ep, 0), COALESCE(ep_spent, 0), 0),
    ep_spent = GREATEST(COALESCE(ep_spent, 0), 0),
    reroll_shards = GREATEST(COALESCE(reroll_shards, 0), 0),
    staff_test_ep = GREATEST(COALESCE(staff_test_ep, 0), COALESCE(staff_test_ep_spent, 0), 0),
    staff_test_ep_spent = GREATEST(COALESCE(staff_test_ep_spent, 0), 0),
    equipped_cosmetics = CASE WHEN jsonb_typeof(equipped_cosmetics) = 'object' THEN equipped_cosmetics ELSE '{}'::jsonb END,
    equipped_badges = CASE WHEN jsonb_typeof(equipped_badges) = 'array' THEN equipped_badges ELSE '[]'::jsonb END,
    mood_color = CASE WHEN mood_color ~* '^#[0-9A-F]{6}$' THEN upper(mood_color) ELSE NULL END;

UPDATE public.profiles
SET best_roll_score = NULL, best_roll_hex = NULL, best_roll_rarity = NULL
WHERE (best_roll_score IS NULL) <> (best_roll_hex IS NULL)
   OR (best_roll_score IS NULL) <> (best_roll_rarity IS NULL)
   OR best_roll_score < 0
   OR best_roll_hex !~ '^#[0-9A-F]{6}$'
   OR best_roll_rarity NOT IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic');

ALTER TABLE public.profiles
  ALTER COLUMN current_streak SET NOT NULL,
  ALTER COLUMN longest_streak SET NOT NULL,
  ALTER COLUMN lifetime_ep SET NOT NULL,
  ALTER COLUMN reroll_shards SET NOT NULL,
  ALTER COLUMN equipped_cosmetics SET NOT NULL,
  ALTER COLUMN equipped_badges SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_economy_nonnegative;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_economy_nonnegative CHECK (
  current_streak >= 0 AND longest_streak >= current_streak
  AND lifetime_ep >= ep_spent AND ep_spent >= 0
  AND reroll_shards BETWEEN 0 AND 1000000
  AND staff_test_ep >= staff_test_ep_spent AND staff_test_ep_spent >= 0
);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_public_color_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_public_color_check
  CHECK (mood_color IS NULL OR mood_color ~ '^#[0-9A-F]{6}$');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_best_roll_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_best_roll_check CHECK (
  (best_roll_score IS NULL AND best_roll_hex IS NULL AND best_roll_rarity IS NULL)
  OR (
    best_roll_score >= 0
    AND best_roll_hex ~ '^#[0-9A-F]{6}$'
    AND best_roll_rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic')
  )
);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cosmetic_json_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cosmetic_json_check CHECK (
  jsonb_typeof(equipped_cosmetics) = 'object'
  AND jsonb_typeof(equipped_badges) = 'array'
  AND jsonb_array_length(equipped_badges) <= 16
);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_authoritative_value_check;
ALTER TABLE public.scores ADD CONSTRAINT scores_authoritative_value_check CHECK (
  score >= 0
  AND hex_code ~ '^#[0-9A-F]{6}$'
  AND rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic')
  AND score_version > 0
  AND jsonb_typeof(condition_ids) = 'array' AND jsonb_array_length(condition_ids) <= 80
  AND jsonb_typeof(contributors) = 'array' AND jsonb_array_length(contributors) <= 64
  AND jsonb_typeof(traits) = 'array' AND jsonb_array_length(traits) <= 12
  AND length(identity) <= 120
);

UPDATE public.inventory SET quantity = 1 WHERE quantity < 1;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_quantity_positive;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_quantity_positive CHECK (quantity BETWEEN 1 AND 1000);
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_item_key_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_item_key_fkey
  FOREIGN KEY (item_key) REFERENCES public.shop_items(item_key) ON DELETE RESTRICT;

UPDATE public.user_achievements SET count = GREATEST(COALESCE(count, 1), 1);
UPDATE public.user_achievements
SET count = 1
WHERE achievement_id IN (
  'first_roll', 'roll_10', 'roll_50', 'roll_100', 'roll_365',
  'streak_7', 'streak_14', 'streak_30', 'streak_100'
);
ALTER TABLE public.user_achievements ALTER COLUMN count SET NOT NULL;
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_count_positive;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_count_positive CHECK (count > 0);

ALTER TABLE public.user_follows DROP CONSTRAINT IF EXISTS user_follows_no_self;
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_no_self CHECK (follower_id <> followee_id);

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'frame', 'lb_theme', 'name_effect', 'orb_shape', 'profile_bg', 'profile_border', 'roll_effect', 'title')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
);

ALTER TABLE public.user_roll_best_candidates DROP CONSTRAINT IF EXISTS user_roll_best_candidates_rarity_check;
ALTER TABLE public.user_roll_best_candidates ADD CONSTRAINT user_roll_best_candidates_rarity_check
  CHECK (rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'));

CREATE OR REPLACE FUNCTION public.cleanup_old_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.scores
  WHERE roll_date < public.game_utc_date() - 30;
  DELETE FROM public.user_daily_reward_claims
  WHERE reward_date < public.game_utc_date() - 31;
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_scores() TO service_role;

-- Admin/staff mutations are service operations. ACLs, rather than caller-owned
-- profile data, are the security boundary.
CREATE OR REPLACE FUNCTION public.grant_staff_test_ep(p_user_id uuid, p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_new_balance bigint;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be between 1 and 1,000,000,000,000.');
  END IF;

  UPDATE public.profiles
  SET staff_test_ep = COALESCE(staff_test_ep, 0) + p_amount
  WHERE id = p_user_id AND is_staff = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found.');
  END IF;

  SELECT COALESCE(staff_test_ep, 0) - COALESCE(staff_test_ep_spent, 0)
  INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'test_wallet_balance', v_new_balance);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_staff_status(p_user_id uuid, p_is_staff boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;
  UPDATE public.profiles
  SET is_staff = COALESCE(p_is_staff, false)
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'is_staff', COALESCE(p_is_staff, false));
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_staff_test_ep(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_staff_test_ep(uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_status(uuid, boolean) TO service_role;

-- Account cleanup is idempotent. A missing profile means cleanup may have
-- completed in an earlier attempt; remaining rows are still removed and the
-- caller may proceed to delete the Auth user.
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_deleted integer := 0;
  v_scores_deleted integer := 0;
  v_inventory_deleted integer := 0;
  v_following_deleted integer := 0;
  v_followers_deleted integer := 0;
  v_achievements_deleted integer := 0;
  v_challenges_deleted integer := 0;
  v_profile_existed boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user id');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), 9341);
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id)
  INTO v_profile_existed;

  IF v_profile_existed THEN
    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  END IF;

  DELETE FROM public.challenges WHERE sender_user_id = p_user_id;
  GET DIAGNOSTICS v_challenges_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE follower_id = p_user_id;
  GET DIAGNOSTICS v_following_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE followee_id = p_user_id;
  GET DIAGNOSTICS v_followers_deleted = ROW_COUNT;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_achievements_deleted = ROW_COUNT;
  DELETE FROM public.inventory WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_inventory_deleted = ROW_COUNT;
  DELETE FROM public.scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_scores_deleted = ROW_COUNT;
  DELETE FROM public.profiles WHERE id = p_user_id;
  GET DIAGNOSTICS v_profile_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'profile_deleted', v_profile_deleted > 0,
    'scores_deleted', v_scores_deleted,
    'inventory_deleted', v_inventory_deleted,
    'following_deleted', v_following_deleted,
    'followers_deleted', v_followers_deleted,
    'achievements_deleted', v_achievements_deleted,
    'challenges_deleted', v_challenges_deleted,
    'missing_profile', NOT v_profile_existed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

-- Challenge data is selected from today's authoritative score. The client
-- values are retained in the signature only for rolling Edge Function deploys.
CREATE OR REPLACE FUNCTION public.create_challenge(
  p_sender_user_id uuid,
  p_target_score bigint,
  p_target_hex text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_username text;
  v_authoritative_score bigint;
  v_authoritative_hex text;
  v_challenge public.challenges;
  v_recent_count integer;
BEGIN
  IF p_sender_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid challenge data');
  END IF;

  -- Use the same per-user lock as roll/reroll so a challenge cannot capture a
  -- score while that score is being replaced.
  PERFORM pg_advisory_xact_lock(hashtext(p_sender_user_id::text), 9341);

  SELECT p.username, s.score, s.hex_code
  INTO v_sender_username, v_authoritative_score, v_authoritative_hex
  FROM public.profiles p
  JOIN public.scores s ON s.user_id = p.id AND s.roll_date = public.game_utc_date()
  WHERE p.id = p_sender_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No authoritative daily roll is available.');
  END IF;

  IF p_target_score IS DISTINCT FROM v_authoritative_score
     OR upper(p_target_hex) IS DISTINCT FROM v_authoritative_hex THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge data does not match the authoritative daily roll.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE sender_user_id = p_sender_user_id
    AND target_score = v_authoritative_score
    AND target_hex = v_authoritative_hex
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT count(*) INTO v_recent_count
    FROM public.challenges
    WHERE sender_user_id = p_sender_user_id
      AND created_at >= now() - interval '1 hour';

    IF v_recent_count >= 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Challenge creation limit reached. Try again later.');
    END IF;

    INSERT INTO public.challenges (sender_user_id, sender_username, target_score, target_hex)
    VALUES (p_sender_user_id, v_sender_username, v_authoritative_score, v_authoritative_hex)
    RETURNING * INTO v_challenge;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'challenge', jsonb_build_object(
      'id', v_challenge.id,
      'sender_username', v_challenge.sender_username,
      'target_score', v_challenge.target_score,
      'target_hex', v_challenge.target_hex,
      'created_at', v_challenge.created_at,
      'expires_at', v_challenge.expires_at
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_challenge(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_challenge(uuid, bigint, text) TO service_role;

-- Safe, bounded score projections. Browser roles no longer read the base score
-- table, while owner restoration and public profiles retain their intended UI.
CREATE OR REPLACE FUNCTION public.get_my_daily_roll()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
    'hex_code', s.hex_code,
    'score', s.score,
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

CREATE OR REPLACE FUNCTION public.get_public_profile_scores(p_user_id uuid)
RETURNS TABLE (
  hex_code text,
  score bigint,
  rarity text,
  roll_date date,
  badges jsonb,
  condition_ids jsonb,
  contributors jsonb,
  traits jsonb,
  identity text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.hex_code, s.score, s.rarity, s.roll_date, s.condition_ids,
    s.condition_ids, s.contributors, s.traits, s.identity
  FROM public.scores s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.user_id = p_user_id
    AND s.roll_date >= public.game_utc_date() - 30
  ORDER BY s.roll_date DESC
  LIMIT 31;
$function$;

REVOKE ALL ON FUNCTION public.get_my_daily_roll() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_daily_roll() TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_scores(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_scores(uuid) TO anon, authenticated;

-- Rebuild safe leaderboard projections with one intentional tie model. RANK()
-- gives equal scores the same rank and leaves the next competition rank gap.
--
-- SECURITY NOTE: These are intentional owner-privilege projection views.
-- Browser roles have SELECT on these views but no direct SELECT on scores or
-- user_roll_best_candidates. Keep the SELECT lists limited to approved public
-- leaderboard/presentation fields. See supabase/SECURITY.md. The Supabase
-- Advisor warning is expected until this projection boundary is redesigned.
DROP VIEW IF EXISTS public.leaderboard_view;
DROP VIEW IF EXISTS public.weekly_best_leaderboard_view;
DROP VIEW IF EXISTS public.monthly_best_leaderboard_view;
DROP VIEW IF EXISTS public.all_time_leaderboard_view;

CREATE VIEW public.leaderboard_view
WITH (security_barrier = true) AS
SELECT s.user_id, s.hex_code, s.score, s.rarity, s.roll_date, s.condition_ids,
  s.contributors, s.traits, s.identity, p.username, p.current_streak,
  p.equipped_cosmetics, p.equipped_badges, p.is_staff,
  rank() OVER (PARTITION BY s.roll_date ORDER BY s.score DESC) AS rank
FROM public.scores s
JOIN public.profiles p ON p.id = s.user_id;

CREATE VIEW public.weekly_best_leaderboard_view
WITH (security_barrier = true) AS
WITH candidates AS (
  SELECT s.*,
    row_number() OVER (PARTITION BY s.user_id ORDER BY s.score DESC, s.roll_date DESC, s.created_at DESC) AS pick
  FROM public.scores s
  WHERE s.roll_date >= date_trunc('week', public.game_utc_date()::timestamp)::date
), best AS (
  SELECT * FROM candidates WHERE pick = 1
)
SELECT best.user_id, best.hex_code, best.score, best.rarity, best.roll_date,
  best.condition_ids, best.contributors, best.traits, best.identity,
  p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges,
  p.is_staff, rank() OVER (ORDER BY best.score DESC) AS rank
FROM best JOIN public.profiles p ON p.id = best.user_id;

CREATE VIEW public.monthly_best_leaderboard_view
WITH (security_barrier = true) AS
WITH candidates AS (
  SELECT s.*,
    row_number() OVER (PARTITION BY s.user_id ORDER BY s.score DESC, s.roll_date DESC, s.created_at DESC) AS pick
  FROM public.scores s
  WHERE s.roll_date >= date_trunc('month', public.game_utc_date()::timestamp)::date
), best AS (
  SELECT * FROM candidates WHERE pick = 1
)
SELECT best.user_id, best.hex_code, best.score, best.rarity, best.roll_date,
  best.condition_ids, best.contributors, best.traits, best.identity,
  p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges,
  p.is_staff, rank() OVER (ORDER BY best.score DESC) AS rank
FROM best JOIN public.profiles p ON p.id = best.user_id;

CREATE VIEW public.all_time_leaderboard_view
WITH (security_barrier = true) AS
SELECT p.id AS user_id, p.best_roll_hex AS hex_code, p.best_roll_score AS score,
  p.best_roll_rarity AS rarity, candidate.roll_date, score.condition_ids,
  score.contributors, score.traits, score.identity, p.username,
  p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.is_staff,
  rank() OVER (ORDER BY p.best_roll_score DESC) AS rank
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT c.roll_date
  FROM public.user_roll_best_candidates c
  WHERE c.user_id = p.id
  ORDER BY c.score DESC, c.roll_date DESC
  LIMIT 1
) candidate ON true
LEFT JOIN public.scores score
  ON score.user_id = p.id AND score.roll_date = candidate.roll_date
WHERE p.best_roll_score IS NOT NULL;

ALTER VIEW public.leaderboard_view OWNER TO postgres;
ALTER VIEW public.weekly_best_leaderboard_view OWNER TO postgres;
ALTER VIEW public.monthly_best_leaderboard_view OWNER TO postgres;
ALTER VIEW public.all_time_leaderboard_view OWNER TO postgres;
GRANT SELECT ON public.leaderboard_view, public.weekly_best_leaderboard_view,
  public.monthly_best_leaderboard_view, public.all_time_leaderboard_view
TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_rivals_scores()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(json_build_object(
    'user_id', ranked.user_id,
    'hex_code', ranked.hex_code,
    'score', ranked.score,
    'rarity', ranked.rarity,
    'username', ranked.username,
    'current_streak', ranked.current_streak,
    'equipped_cosmetics', ranked.equipped_cosmetics,
    'equipped_badges', ranked.equipped_badges,
    'is_staff', ranked.is_staff,
    'rank', ranked.rank,
    'condition_ids', ranked.condition_ids,
    'contributors', ranked.contributors,
    'traits', ranked.traits,
    'identity', ranked.identity
  ) ORDER BY ranked.rank, ranked.username), '[]'::json)
  FROM public.leaderboard_view ranked
  WHERE ranked.roll_date = public.game_utc_date()
    AND ranked.user_id IN (
      SELECT followee_id FROM public.user_follows WHERE follower_id = auth.uid()
    );
$function$;

REVOKE ALL ON FUNCTION public.get_rivals_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rivals_scores() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_username text;
  v_candidate text;
  v_profile json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
      'equipped_cosmetics', p.equipped_cosmetics,
      'reroll_shards', p.reroll_shards,
      'equipped_badges', p.equipped_badges,
      'mood_color', p.mood_color,
      'best_roll_score', p.best_roll_score,
      'best_roll_hex', p.best_roll_hex,
      'best_roll_rarity', p.best_roll_rarity
    )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  -- A confirmed Auth user can outlive its profile after an interrupted
  -- administrative operation. Serialize recovery with rolls/deletion and
  -- recreate only for an Auth row that still exists.
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9341);
  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
      'equipped_cosmetics', p.equipped_cosmetics,
      'reroll_shards', p.reroll_shards,
      'equipped_badges', p.equipped_badges,
      'mood_color', p.mood_color,
      'best_roll_score', p.best_roll_score,
      'best_roll_hex', p.best_roll_hex,
      'best_roll_rarity', p.best_roll_rarity
    )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;
  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  SELECT nullif(trim(u.raw_user_meta_data->>'username'), '')
  INTO v_requested_username
  FROM auth.users u
  WHERE u.id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;

  v_candidate := CASE
    WHEN v_requested_username ~ '^[A-Za-z0-9_]{3,20}$'
      AND lower(v_requested_username) NOT IN ('guest', 'anon', 'anonymous')
      AND public.is_username_allowed(v_requested_username)
    THEN v_requested_username
    ELSE 'player_' || substr(replace(v_user_id::text, '-', ''), 1, 13)
  END;

  INSERT INTO public.profiles (id, username)
  VALUES (v_user_id, v_candidate)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    FOR v_attempt IN 1..5 LOOP
      v_candidate := 'p_' || encode(extensions.gen_random_bytes(9), 'hex');
      INSERT INTO public.profiles (id, username)
      VALUES (v_user_id, v_candidate)
      ON CONFLICT DO NOTHING;
      EXIT WHEN FOUND;
    END LOOP;
  END IF;

  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
      'equipped_cosmetics', p.equipped_cosmetics,
      'reroll_shards', p.reroll_shards,
      'equipped_badges', p.equipped_badges,
      'mood_color', p.mood_color,
      'best_roll_score', p.best_roll_score,
      'best_roll_hex', p.best_roll_hex,
      'best_roll_rarity', p.best_roll_rarity
    )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  RETURN COALESCE(v_profile, json_build_object('success', false, 'error', 'Profile recovery failed'));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Remove broad base-history access and unnecessary trigger-function execute.
REVOKE SELECT ON TABLE public.scores FROM anon, authenticated;
REVOKE SELECT ON TABLE public.inventory, public.user_achievements, public.user_follows FROM anon;
REVOKE ALL ON TABLE public.active_seasonal_achievements FROM anon, authenticated;
GRANT SELECT ON TABLE public.active_seasonal_achievements TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read scores" ON public.scores;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own inventory." ON public.inventory;
DROP POLICY IF EXISTS "shop_items are publicly readable" ON public.shop_items;
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;
CREATE POLICY "Users can view own follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid() = follower_id);
REVOKE ALL ON FUNCTION public.enforce_username_moderation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_username_for_moderation(text) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.update_streak() SET search_path = public;

CREATE INDEX IF NOT EXISTS scores_roll_date_score_user_idx
  ON public.scores (roll_date, score DESC, user_id);
CREATE INDEX IF NOT EXISTS user_follows_followee_idx
  ON public.user_follows (followee_id);
CREATE INDEX IF NOT EXISTS challenges_sender_created_idx
  ON public.challenges (sender_user_id, created_at DESC);
DROP INDEX IF EXISTS public.idx_scores_roll_date_score;
DROP INDEX IF EXISTS public.challenges_sender_user_id_idx;

COMMIT;
