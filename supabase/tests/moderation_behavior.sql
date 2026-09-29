\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.moderation_assert(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'MODERATION ASSERTION FAILED: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
VALUES
  ('22000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'moderator@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"modtesta"}', now(), now(), false),
  ('22000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'nonmoderator@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"notmoderator"}', now(), now(), false),
  ('22000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'reported-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"reported_owner"}', now(), now(), false),
  ('22000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'reported-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"reported_author"}', now(), now(), false),
  ('22000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'reporter@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"reporter"}', now(), now(), false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name, created_at, current_streak, longest_streak, lifetime_ep, total_rolls, equipped_cosmetics)
VALUES
  ('22000000-0000-4000-8000-000000000001', 'modtesta', 'Moderator', now(), 0, 0, 0, 0, '{}'),
  ('22000000-0000-4000-8000-000000000002', 'notmoderator', 'Not Moderator', now(), 0, 0, 0, 0, '{}'),
  ('22000000-0000-4000-8000-000000000003', 'reported_owner', 'Reported Owner', now(), 0, 0, 0, 0, '{}'),
  ('22000000-0000-4000-8000-000000000004', 'reported_author', 'Reported Author', now(), 0, 0, 0, 0, '{}'),
  ('22000000-0000-4000-8000-000000000005', 'reporter', 'Reporter', now(), 0, 0, 0, 0, '{}')
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;

INSERT INTO public.profile_moderation_staff (user_id, granted_by)
VALUES ('22000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002');

INSERT INTO public.profile_guestbook_entries (entry_key, author_id, profile_id, body)
VALUES
  ('22000000-0000-4000-8000-000000000010', '22000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000003', 'A reported note with useful context.'),
  ('22000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000003', 'A second reported note for removal.');

INSERT INTO public.profile_reports (id, reporter_id, target_profile_id, entry_key, reason, details)
VALUES (
  '22000000-0000-4000-8000-000000000020',
  '22000000-0000-4000-8000-000000000005',
  '22000000-0000-4000-8000-000000000003',
  '22000000-0000-4000-8000-000000000010',
  'harassment',
  'Private report details for authorized review.'
);

INSERT INTO public.profile_reports (id, reporter_id, target_profile_id, reason, details)
VALUES (
  '22000000-0000-4000-8000-000000000021',
  '22000000-0000-4000-8000-000000000005',
  '22000000-0000-4000-8000-000000000003',
  'impersonation',
  'A profile-level report with no supported account action.'
);

INSERT INTO public.profile_reports (id, reporter_id, target_profile_id, entry_key, reason, details)
VALUES (
  '22000000-0000-4000-8000-000000000022',
  '22000000-0000-4000-8000-000000000005',
  '22000000-0000-4000-8000-000000000003',
  '22000000-0000-4000-8000-000000000011',
  'hate',
  'Second report used to verify removal.'
);

SELECT pg_temp.moderation_assert(
  NOT has_table_privilege('anon', 'public.profile_moderation_staff', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_moderation_staff', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.profile_moderation_audit', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_moderation_audit', 'SELECT')
    AND has_function_privilege('authenticated', 'public.moderation_list_reports(boolean,integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.moderation_resolve_report(uuid,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.moderation_list_reports(boolean,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.moderation_resolve_report(uuid,text,text,text)', 'EXECUTE'),
  'moderation data must stay behind authenticated moderator RPCs'
);

SELECT pg_temp.moderation_assert(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_moderation_staff'::regclass)
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_moderation_audit'::regclass),
  'moderator and audit tables must keep RLS enabled'
);

SELECT set_config('request.jwt.claims', '{"sub":"22000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.moderation_list_reports(false, 100);
    RAISE EXCEPTION 'MODERATION ASSERTION FAILED: non-moderator read the report queue';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"22000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$
DECLARE
  v_queue jsonb;
  v_result jsonb;
  v_report jsonb;
  v_audit_id uuid;
  v_failed boolean := false;
BEGIN
  v_queue := public.moderation_list_reports(false, 100);
  PERFORM pg_temp.moderation_assert(jsonb_array_length(v_queue->'reports') = 3, 'moderator must see pending reports');
  v_report := (
    SELECT report
    FROM jsonb_array_elements(v_queue->'reports') AS report
    WHERE report->>'id' = '22000000-0000-4000-8000-000000000020'
  );
  PERFORM pg_temp.moderation_assert(
    v_report->>'targetKind' = 'guestbook_entry'
      AND v_report->>'targetSnapshot' = 'A reported note with useful context.'
      AND v_report->>'reportedUsername' = 'reported_author'
      AND v_report->>'reportedUserId' = '22000000-0000-4000-8000-000000000004'
      AND v_report->>'details' = 'Private report details for authorized review.',
    'moderation queue must include the target context and reporter details'
  );

  v_result := public.moderation_resolve_report(
    '22000000-0000-4000-8000-000000000020', 'actioned', 'Removed from public view after review.', 'hide'
  );
  PERFORM pg_temp.moderation_assert(v_result->>'success' = 'true' AND v_result->>'status' = 'actioned', 'hide decision must resolve the report');
  PERFORM pg_temp.moderation_assert(
    (SELECT status = 'hidden' FROM public.profile_guestbook_entries WHERE entry_key = '22000000-0000-4000-8000-000000000010'),
    'moderation hide action must change only the reported content visibility'
  );
  SELECT id INTO v_audit_id FROM public.profile_moderation_audit WHERE report_id = '22000000-0000-4000-8000-000000000020';
  PERFORM pg_temp.moderation_assert(
    EXISTS (
      SELECT 1 FROM public.profile_moderation_audit
      WHERE id = v_audit_id
        AND moderator_id = '22000000-0000-4000-8000-000000000001'
        AND decision = 'actioned'
        AND content_action = 'hide'
        AND decision_reason = 'Removed from public view after review.'
        AND target_snapshot = 'A reported note with useful context.'
    ),
    'immutable audit history must identify the actor, action, reason, and target snapshot'
  );

  BEGIN
    UPDATE public.profile_moderation_audit SET decision_reason = 'tampered' WHERE id = v_audit_id;
  EXCEPTION WHEN SQLSTATE '55000' THEN
    v_failed := true;
  END;
  PERFORM pg_temp.moderation_assert(v_failed, 'audit history must reject mutation');

  PERFORM public.moderation_resolve_report(
    '22000000-0000-4000-8000-000000000022', 'actioned', 'Removed after review.', 'remove'
  );
  PERFORM pg_temp.moderation_assert(
    (SELECT status = 'removed' FROM public.profile_guestbook_entries WHERE entry_key = '22000000-0000-4000-8000-000000000011')
      AND EXISTS (
        SELECT 1 FROM public.profile_moderation_audit
        WHERE report_id = '22000000-0000-4000-8000-000000000022' AND content_action = 'remove'
      ),
    'moderation remove action must preserve the content row and record the removal'
  );

  v_queue := public.moderation_list_reports(true, 100);
  PERFORM pg_temp.moderation_assert(
    jsonb_array_length(v_queue->'reports') = 2
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_queue->'reports') AS item
        WHERE item->>'id' = '22000000-0000-4000-8000-000000000020'
          AND item->>'status' = 'actioned'
          AND jsonb_array_length(item->'auditHistory') = 1
      ),
    'resolved queue must distinguish resolved rows and include the audit history'
  );

  BEGIN
    PERFORM public.moderation_resolve_report(
      '22000000-0000-4000-8000-000000000021', 'actioned', 'No account action supported.', 'remove'
    );
    RAISE EXCEPTION 'MODERATION ASSERTION FAILED: profile report accepted unsupported account action';
  EXCEPTION WHEN invalid_parameter_value THEN
    NULL;
  END;

  PERFORM pg_temp.moderation_assert(
    position('Private report details for authorized review.' IN public.get_public_profile_social('22000000-0000-4000-8000-000000000003')::text) = 0
      AND position('Removed from public view after review.' IN public.get_public_profile_social('22000000-0000-4000-8000-000000000003')::text) = 0,
    'public profile social projection must not expose report details or moderator decisions'
  );
END;
$$;

ROLLBACK;

\echo 'Moderation database behavior checks passed.'
