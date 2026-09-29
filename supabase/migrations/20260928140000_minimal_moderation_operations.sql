-- Minimal internal moderation operations for profile and guestbook reports.
-- Moderator access is an explicit service-managed allowlist; the public
-- is_staff profile marker is intentionally not used for authorization.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_moderation_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid
);

ALTER TABLE public.profile_moderation_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_moderation_staff FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.profile_moderation_staff TO service_role;

ALTER TABLE public.profile_reports
  ADD COLUMN IF NOT EXISTS target_kind text,
  ADD COLUMN IF NOT EXISTS target_content_id uuid,
  ADD COLUMN IF NOT EXISTS target_snapshot text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_username_snapshot text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_author_id uuid,
  ADD COLUMN IF NOT EXISTS target_author_username text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderation_decision text,
  ADD COLUMN IF NOT EXISTS moderation_reason text;

UPDATE public.profile_reports r
SET target_kind = CASE
      WHEN r.reply_key IS NOT NULL THEN 'guestbook_reply'
      WHEN r.entry_key IS NOT NULL THEN 'guestbook_entry'
      ELSE 'profile'
    END,
    target_content_id = COALESCE(r.reply_key, r.entry_key),
    target_snapshot = COALESCE(
      (SELECT reply.body FROM public.profile_guestbook_replies reply WHERE reply.reply_key = r.reply_key),
      (SELECT entry.body FROM public.profile_guestbook_entries entry WHERE entry.entry_key = r.entry_key),
      ''
    ),
    target_username_snapshot = COALESCE(
      (SELECT profile.username FROM public.profiles profile WHERE profile.id = r.target_profile_id),
      ''
    ),
    target_author_id = COALESCE(
      (SELECT reply.author_id FROM public.profile_guestbook_replies reply WHERE reply.reply_key = r.reply_key),
      (SELECT entry.author_id FROM public.profile_guestbook_entries entry WHERE entry.entry_key = r.entry_key),
      r.target_profile_id
    ),
    target_author_username = COALESCE(
      (SELECT author.username
       FROM public.profiles author
       WHERE author.id = COALESCE(
         (SELECT reply.author_id FROM public.profile_guestbook_replies reply WHERE reply.reply_key = r.reply_key),
         (SELECT entry.author_id FROM public.profile_guestbook_entries entry WHERE entry.entry_key = r.entry_key),
         r.target_profile_id
       )),
      ''
    );

UPDATE public.profile_reports
SET target_kind = CASE
      WHEN reply_key IS NOT NULL THEN 'guestbook_reply'
      WHEN entry_key IS NOT NULL THEN 'guestbook_entry'
      ELSE 'profile'
    END,
    target_content_id = COALESCE(reply_key, entry_key),
    target_author_id = target_profile_id,
    target_author_username = COALESCE((SELECT p.username FROM public.profiles p WHERE p.id = profile_reports.target_profile_id), '')
WHERE target_kind IS NULL;

UPDATE public.profile_reports
SET target_author_id = target_profile_id
WHERE target_author_id IS NULL;

ALTER TABLE public.profile_reports
  ALTER COLUMN target_kind SET DEFAULT 'profile',
  ALTER COLUMN target_kind SET NOT NULL,
  ALTER COLUMN target_author_id SET NOT NULL;

ALTER TABLE public.profile_reports
  DROP CONSTRAINT IF EXISTS profile_reports_target_kind_check,
  ADD CONSTRAINT profile_reports_target_kind_check
    CHECK (target_kind IN ('profile', 'guestbook_entry', 'guestbook_reply')),
  DROP CONSTRAINT IF EXISTS profile_reports_moderation_decision_check,
  ADD CONSTRAINT profile_reports_moderation_decision_check
    CHECK (moderation_decision IS NULL OR moderation_decision IN ('reviewed', 'dismissed', 'actioned')),
  DROP CONSTRAINT IF EXISTS profile_reports_moderation_reason_check,
  ADD CONSTRAINT profile_reports_moderation_reason_check
    CHECK (moderation_reason IS NULL OR (char_length(moderation_reason) <= 500 AND moderation_reason !~ '[[:cntrl:]]')),
  DROP CONSTRAINT IF EXISTS profile_reports_target_snapshot_check,
  ADD CONSTRAINT profile_reports_target_snapshot_check
    CHECK (char_length(target_snapshot) <= 240 AND target_snapshot !~ '[[:cntrl:]]'),
  DROP CONSTRAINT IF EXISTS profile_reports_target_author_username_check,
  ADD CONSTRAINT profile_reports_target_author_username_check
    CHECK (char_length(target_author_username) <= 20 AND target_author_username !~ '[[:cntrl:]]');

CREATE OR REPLACE FUNCTION public.capture_profile_report_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_body text;
  v_author_id uuid;
BEGIN
  SELECT p.username
  INTO NEW.target_username_snapshot
  FROM public.profiles p
  WHERE p.id = NEW.target_profile_id;
  NEW.target_username_snapshot := COALESCE(NEW.target_username_snapshot, '');

  IF NEW.reply_key IS NOT NULL THEN
    SELECT r.body, r.author_id INTO v_body, v_author_id
    FROM public.profile_guestbook_replies r
    WHERE r.reply_key = NEW.reply_key AND r.profile_id = NEW.target_profile_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Guestbook reply not found for report target.';
    END IF;
    NEW.target_kind := 'guestbook_reply';
    NEW.target_content_id := NEW.reply_key;
    NEW.target_snapshot := v_body;
  ELSIF NEW.entry_key IS NOT NULL THEN
    SELECT e.body, e.author_id INTO v_body, v_author_id
    FROM public.profile_guestbook_entries e
    WHERE e.entry_key = NEW.entry_key AND e.profile_id = NEW.target_profile_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Guestbook note not found for report target.';
    END IF;
    NEW.target_kind := 'guestbook_entry';
    NEW.target_content_id := NEW.entry_key;
    NEW.target_snapshot := v_body;
  ELSE
    NEW.target_kind := 'profile';
    NEW.target_content_id := NULL;
    NEW.target_snapshot := '';
    v_author_id := NEW.target_profile_id;
  END IF;

  NEW.target_author_id := v_author_id;
  SELECT p.username INTO NEW.target_author_username
  FROM public.profiles p WHERE p.id = v_author_id;
  NEW.target_author_username := COALESCE(NEW.target_author_username, '');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_reports_capture_context ON public.profile_reports;
CREATE TRIGGER profile_reports_capture_context
BEFORE INSERT ON public.profile_reports
FOR EACH ROW EXECUTE FUNCTION public.capture_profile_report_context();

REVOKE ALL ON FUNCTION public.capture_profile_report_context() FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.profile_moderation_audit (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  report_id uuid NOT NULL,
  report_created_at timestamptz NOT NULL,
  moderator_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  target_profile_id uuid NOT NULL,
  target_username text NOT NULL DEFAULT '',
  reported_user_id uuid,
  reported_username text NOT NULL DEFAULT '',
  target_kind text NOT NULL CHECK (target_kind IN ('profile', 'guestbook_entry', 'guestbook_reply')),
  target_content_id uuid,
  target_snapshot text NOT NULL DEFAULT '',
  report_reason text NOT NULL,
  report_details text NOT NULL DEFAULT '',
  decision text NOT NULL CHECK (decision IN ('reviewed', 'dismissed', 'actioned')),
  content_action text NOT NULL CHECK (content_action IN ('none', 'hide', 'remove')),
  decision_reason text NOT NULL CHECK (char_length(decision_reason) BETWEEN 1 AND 500 AND decision_reason !~ '[[:cntrl:]]'),
  prior_status text NOT NULL,
  resulting_status text NOT NULL CHECK (resulting_status IN ('reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_moderation_audit_report_idx
  ON public.profile_moderation_audit (report_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS profile_moderation_audit_created_idx
  ON public.profile_moderation_audit (created_at DESC, id DESC);

ALTER TABLE public.profile_moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_moderation_audit FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.profile_moderation_audit TO service_role;

CREATE OR REPLACE FUNCTION public.reject_profile_moderation_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Moderation audit history is immutable.';
END;
$function$;

DROP TRIGGER IF EXISTS profile_moderation_audit_immutable ON public.profile_moderation_audit;
CREATE TRIGGER profile_moderation_audit_immutable
BEFORE UPDATE OR DELETE ON public.profile_moderation_audit
FOR EACH ROW EXECUTE FUNCTION public.reject_profile_moderation_audit_mutation();

REVOKE ALL ON FUNCTION public.reject_profile_moderation_audit_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.moderation_list_reports(
  p_resolved boolean DEFAULT false,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profile_moderation_staff ms WHERE ms.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderator access required.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'resolved', COALESCE(p_resolved, false),
    'reports', COALESCE((
      SELECT jsonb_agg(q.item ORDER BY q.sort_created_at, q.report_id)
      FROM (
        SELECT
          r.id AS report_id,
          CASE WHEN COALESCE(p_resolved, false) THEN r.resolved_at ELSE r.created_at END AS sort_created_at,
          jsonb_build_object(
            'id', r.id,
            'reporterId', r.reporter_id,
            'reporterUsername', COALESCE(reporter.username, ''),
            'targetProfileId', r.target_profile_id,
            'targetProfileUsername', COALESCE(target.username, r.target_username_snapshot, ''),
            'reportedUserId', COALESCE(entry.author_id, reply.author_id, r.target_author_id, r.target_profile_id),
            'reportedUsername', COALESCE(content_author.username, r.target_author_username, target.username, r.target_username_snapshot, ''),
            'targetKind', r.target_kind,
            'targetContentId', r.target_content_id,
            'targetSnapshot', r.target_snapshot,
            'targetContentStatus', COALESCE(entry.status, reply.status),
            'reason', r.reason,
            'details', r.details,
            'status', r.status,
            'createdAt', r.created_at,
            'resolvedAt', r.resolved_at,
            'moderatedBy', r.moderated_by,
            'moderationDecision', r.moderation_decision,
            'moderationReason', r.moderation_reason,
            'auditHistory', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'moderatorId', audit.moderator_id,
                'moderatorUsername', COALESCE(moderator.username, ''),
                'decision', audit.decision,
                'contentAction', audit.content_action,
                'reason', audit.decision_reason,
                'resultingStatus', audit.resulting_status,
                'createdAt', audit.created_at
              ) ORDER BY audit.created_at, audit.id)
              FROM public.profile_moderation_audit audit
              LEFT JOIN public.profiles moderator ON moderator.id = audit.moderator_id
              WHERE audit.report_id = r.id
            ), '[]'::jsonb)
          ) AS item
        FROM public.profile_reports r
        LEFT JOIN public.profiles reporter ON reporter.id = r.reporter_id
        LEFT JOIN public.profiles target ON target.id = r.target_profile_id
        LEFT JOIN public.profile_guestbook_entries entry ON entry.entry_key = r.entry_key
        LEFT JOIN public.profile_guestbook_replies reply ON reply.reply_key = r.reply_key
        LEFT JOIN public.profiles content_author ON content_author.id = COALESCE(entry.author_id, reply.author_id)
        WHERE (COALESCE(p_resolved, false) AND r.status IN ('reviewed', 'dismissed', 'actioned'))
           OR (NOT COALESCE(p_resolved, false) AND r.status = 'open')
        ORDER BY CASE WHEN COALESCE(p_resolved, false) THEN r.resolved_at ELSE r.created_at END,
                 r.id
        LIMIT v_limit
      ) q
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.moderation_resolve_report(
  p_report_id uuid,
  p_decision text,
  p_reason text,
  p_content_action text DEFAULT 'none'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_report public.profile_reports%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_content_action text := COALESCE(p_content_action, 'none');
  v_reported_user_id uuid;
  v_reported_username text;
  v_audit_id uuid;
  v_updated integer;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profile_moderation_staff ms WHERE ms.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderator access required.';
  END IF;

  IF p_report_id IS NULL
     OR p_decision IS NULL
     OR p_decision NOT IN ('reviewed', 'dismissed', 'actioned')
     OR p_content_action IS NULL
     OR v_content_action NOT IN ('none', 'hide', 'remove')
     OR char_length(v_reason) NOT BETWEEN 1 AND 500
     OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid decision, content action, and reason are required.';
  END IF;

  IF p_decision = 'actioned' AND v_content_action = 'none' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A content action is required for an actioned report.';
  END IF;
  IF p_decision <> 'actioned' AND v_content_action <> 'none' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Content actions must use the actioned decision.';
  END IF;

  SELECT r.* INTO v_report
  FROM public.profile_reports r
  WHERE r.id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Report not found.';
  END IF;
  IF v_report.status <> 'open' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Report has already been resolved.';
  END IF;
  IF v_report.target_kind = 'profile' AND v_content_action <> 'none' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile or account restrictions are not available in this workflow.';
  END IF;

  v_reported_user_id := COALESCE(v_report.target_author_id, v_report.target_profile_id);
  SELECT p.username INTO v_reported_username
  FROM public.profiles p WHERE p.id = v_reported_user_id;
  v_reported_username := COALESCE(v_reported_username, v_report.target_author_username, v_report.target_username_snapshot, '');

  IF v_report.target_kind = 'guestbook_entry' AND v_content_action <> 'none' THEN
    UPDATE public.profile_guestbook_entries e
    SET status = CASE WHEN v_content_action = 'hide' THEN 'hidden' ELSE 'removed' END,
        updated_at = now()
    WHERE e.entry_key = v_report.target_content_id
      AND e.profile_id = v_report.target_profile_id
    RETURNING e.author_id INTO v_reported_user_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Reported guestbook note is no longer available.';
    END IF;
  ELSIF v_report.target_kind = 'guestbook_reply' AND v_content_action <> 'none' THEN
    UPDATE public.profile_guestbook_replies r
    SET status = CASE WHEN v_content_action = 'hide' THEN 'hidden' ELSE 'removed' END,
        updated_at = now()
    WHERE r.reply_key = v_report.target_content_id
      AND r.profile_id = v_report.target_profile_id
    RETURNING r.author_id INTO v_reported_user_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Reported guestbook reply is no longer available.';
    END IF;
  END IF;

  SELECT p.username INTO v_reported_username
  FROM public.profiles p WHERE p.id = v_reported_user_id;
  v_reported_username := COALESCE(v_reported_username, v_report.target_author_username, v_report.target_username_snapshot, '');

  UPDATE public.profile_reports r
  SET status = p_decision,
      resolved_at = now(),
      moderated_by = v_user_id,
      moderation_decision = p_decision,
      moderation_reason = v_reason
  WHERE r.id = v_report.id;

  INSERT INTO public.profile_moderation_audit (
    report_id, report_created_at, moderator_id, reporter_id, target_profile_id,
    target_username, reported_user_id, reported_username, target_kind,
    target_content_id, target_snapshot, report_reason, report_details,
    decision, content_action, decision_reason, prior_status, resulting_status
  ) VALUES (
    v_report.id, v_report.created_at, v_user_id, v_report.reporter_id, v_report.target_profile_id,
    v_report.target_username_snapshot, v_reported_user_id, v_reported_username,
    v_report.target_kind, v_report.target_content_id, v_report.target_snapshot,
    v_report.reason, v_report.details, p_decision, v_content_action, v_reason,
    v_report.status, p_decision
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'reportId', v_report.id,
    'status', p_decision,
    'auditId', v_audit_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.moderation_list_reports(boolean, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.moderation_resolve_report(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.moderation_list_reports(boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderation_resolve_report(uuid, text, text, text) TO authenticated;

COMMIT;
