-- Configuration belongs to the authoritative account lifecycle, not a side
-- effect of opening the legacy editor. Preserve all existing authoring data.
BEGIN;

CREATE OR REPLACE FUNCTION public.initialize_profile_configuration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_default jsonb := public.profile_default_configuration(NEW.mood_color);
  v_default_v2 jsonb := public.profile_configuration_v2_from_v1(v_default);
BEGIN
  INSERT INTO public.profile_configurations (
    user_id, draft_config, published_config, draft_config_v2, published_config_v2
  ) VALUES (NEW.id, v_default, v_default, v_default_v2, v_default_v2)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_profile_configuration()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS profile_created_configuration ON public.profiles;
CREATE TRIGGER profile_created_configuration
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.initialize_profile_configuration();

-- Includes accounts that never visited the old editor. Never overwrite drafts,
-- expression columns, publication timestamps, or historical profile data.
INSERT INTO public.profile_configurations (
  user_id, draft_config, published_config, draft_config_v2, published_config_v2
)
SELECT p.id, defaults.config, defaults.config,
  public.profile_configuration_v2_from_v1(defaults.config),
  public.profile_configuration_v2_from_v1(defaults.config)
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT public.profile_default_configuration(p.mood_color) AS config
) defaults
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_configurations c WHERE c.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
