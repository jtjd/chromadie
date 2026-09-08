import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { reportSupabaseSqlResult, runSupabaseSql, runSupabaseSqlFile } from './run-supabase-sql-test.mjs';

process.exitCode = reportSupabaseSqlResult(runSupabaseSqlFile(
  fileURLToPath(new URL('../supabase/tests/profile_initialization_behavior.sql', import.meta.url))
));

if (!process.exitCode) {
  // Run the actual migration twice within a rolled-back fixture transaction.
  const migration = readFileSync(new URL('../supabase/migrations/20260907120000_profile_configuration_initialization.sql', import.meta.url), 'utf8')
    .replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
  process.exitCode = reportSupabaseSqlResult(runSupabaseSql(`
\\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('22000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
  'studio-preserved@example.test', '{"username":"studio_preserved"}', now(), now());
UPDATE public.profile_configurations
SET draft_config = jsonb_set(draft_config, '{signatureColor}', '"#123456"'),
    published_at = '2026-09-01T00:00:00Z'
WHERE user_id = '22000000-0000-4000-8000-000000000003';
ALTER TABLE public.profiles DISABLE TRIGGER profile_created_configuration;
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('22000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
  'studio-existing@example.test', '{"username":"studio_existing"}', now(), now());
ALTER TABLE public.profiles ENABLE TRIGGER profile_created_configuration;
CREATE TEMP TABLE configurations_before AS SELECT * FROM public.profile_configurations;
${migration}
${migration}
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_configurations
    WHERE user_id = '22000000-0000-4000-8000-000000000002' AND draft_config_v2 IS NOT NULL)
  THEN RAISE EXCEPTION 'Existing account was not backfilled'; END IF;
  IF EXISTS (SELECT * FROM configurations_before EXCEPT SELECT * FROM public.profile_configurations)
  THEN RAISE EXCEPTION 'Migration modified existing configuration'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (public.save_profile_configuration_v2(public.get_my_profile_configuration_v2()->'draft')->>'success')::boolean IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Backfilled configuration is not writable'; END IF;
END $$;
ROLLBACK;
`));
}
