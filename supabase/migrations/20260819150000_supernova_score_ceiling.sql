-- The supernova condition is intentionally rare. Give it a memorable jackpot
-- value without changing roll generation, eligibility, or reward authority.
-- ACTIVE_SCORE_OVERRIDE condition_supernova=10000013

DO $$
DECLARE
  v_definition text;
  v_expected_points text := '10000013';
BEGIN
  SELECT pg_get_functiondef('public.calculate_roll_v2(integer,integer,integer)'::regprocedure)
  INTO v_definition;

  IF position('condition_supernova' IN v_definition) = 0
     OR position('v_score := v_score + 600013;' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'calculate_roll_v2 no longer matches the expected supernova score contract';
  END IF;

  v_definition := regexp_replace(
    v_definition,
    '(''id''[[:space:]]*,[[:space:]]*''condition_supernova''[^[:cntrl:]]*''points''[[:space:]]*,[[:space:]]*)[0-9]+',
    E'\\1' || v_expected_points,
    'g'
  );
  v_definition := replace(v_definition, '''awardedPoints'',600013', '''awardedPoints'',10000013');
  v_definition := replace(v_definition, 'v_score := v_score + 600013;', 'v_score := v_score + 10000013;');

  IF position('''points'',10000013' IN v_definition) = 0
     OR position('''awardedPoints'',10000013' IN v_definition) = 0
     OR position('v_score := v_score + 10000013;' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'supernova score override did not apply to calculate_roll_v2';
  END IF;

  EXECUTE v_definition;
END;
$$;
