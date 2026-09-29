import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../src/lib/ModerationPage.svelte', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260928140000_minimal_moderation_operations.sql', import.meta.url), 'utf8');

test('moderation UI uses the private RPC boundary and separates pending from resolved reports', () => {
  assert.match(page, /moderation_list_reports/);
  assert.match(page, /moderation_resolve_report/);
  assert.doesNotMatch(page, /supabase\.from\(/);
  assert.doesNotMatch(page, /service_role|serviceRole|SUPABASE_SERVICE/);
  assert.match(page, />Pending</);
  assert.match(page, />Resolved</);
  assert.match(page, /aria-label="Report details"/);
  assert.match(page, /Decision history/);
  assert.match(page, /Open target profile/);
  assert.match(page, /Profile or account restrictions are not supported/);
});

test('moderation RPCs require the explicit moderator allowlist and audit mutations are rejected', () => {
  for (const functionName of ['moderation_list_reports', 'moderation_resolve_report']) {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
    const end = migration.indexOf('$function$;', start);
    const definition = migration.slice(start, end);
    assert.ok(start >= 0, `${functionName} must be defined`);
    assert.match(definition, /SECURITY DEFINER/);
    assert.match(definition, /SET search_path TO 'public', 'pg_catalog'/);
    assert.match(definition, /FROM public\.profile_moderation_staff ms WHERE ms\.user_id = v_user_id/);
  }
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.profile_moderation_audit/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_moderation_audit FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.moderation_list_reports\(boolean, integer\) TO authenticated/);
});
