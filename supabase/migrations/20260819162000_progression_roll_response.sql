-- Add a named progression-unlock field to the authoritative roll response.
-- The existing transaction remains the source of truth; this wrapper only
-- exposes the already-written unlock payload under a clearer additive key.
BEGIN;

ALTER FUNCTION public.roll_die_impl(boolean)
  RENAME TO roll_die_impl_progression_base;

CREATE FUNCTION public.roll_die_impl(p_is_reroll boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.roll_die_impl_progression_base(p_is_reroll);

  RETURN v_result || jsonb_build_object(
    'new_progression_unlocks', COALESCE(v_result->'new_milestones', '[]'::jsonb)
  );
END;
$function$;

ALTER FUNCTION public.roll_die_impl(boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM PUBLIC, anon, authenticated, service_role;

DO $verification$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl(boolean)'::regprocedure)
  INTO v_definition;

  IF position('new_progression_unlocks' IN v_definition) = 0
     OR position('roll_die_impl_progression_base' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'The progression roll response wrapper is incomplete';
  END IF;
END;
$verification$;

COMMIT;
