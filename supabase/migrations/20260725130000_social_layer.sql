-- Phase 7: safe profile-to-profile social interactions.
--
-- These tables are deliberately hidden behind SECURITY DEFINER RPCs. The
-- browser receives only a bounded public social projection; it never receives
-- moderation state, reporter details, or account identifiers from these
-- tables.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_social_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interactions_enabled boolean NOT NULL DEFAULT true,
  guestbook_enabled boolean NOT NULL DEFAULT true,
  activity_visible boolean NOT NULL DEFAULT true,
  discoverable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_favorites (
  favoriter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (favoriter_id, profile_id),
  CONSTRAINT profile_favorites_no_self CHECK (favoriter_id <> profile_id)
);

CREATE TABLE IF NOT EXISTS public.profile_reactions (
  reactor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reactor_id, profile_id, reaction_type),
  CONSTRAINT profile_reactions_no_self CHECK (reactor_id <> profile_id),
  CONSTRAINT profile_reactions_type_check CHECK (reaction_type IN ('spark', 'glow', 'cheer'))
);

CREATE TABLE IF NOT EXISTS public.profile_guestbook_entries (
  entry_key uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_guestbook_no_self CHECK (author_id <> profile_id),
  CONSTRAINT profile_guestbook_status_check CHECK (status IN ('visible', 'hidden', 'removed')),
  CONSTRAINT profile_guestbook_body_check CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 240
    AND body !~ '[[:cntrl:]]'
    AND body !~* '(https?://|www[.]|[[:alnum:]_-]+[.][[:alpha:]]{2,})'
  )
);

CREATE TABLE IF NOT EXISTS public.profile_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT profile_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.profile_reports (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_key uuid REFERENCES public.profile_guestbook_entries(entry_key) ON DELETE SET NULL,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT profile_reports_reason_check CHECK (reason IN ('spam', 'harassment', 'hate', 'sexual', 'impersonation', 'other')),
  CONSTRAINT profile_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  CONSTRAINT profile_reports_details_check CHECK (char_length(details) <= 500 AND details !~ '[[:cntrl:]]')
);

CREATE TABLE IF NOT EXISTS public.profile_social_rate_limits (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  action_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action_key),
  CONSTRAINT profile_social_rate_action_check CHECK (action_key IN ('favorite', 'reaction', 'guestbook', 'report', 'block', 'settings', 'follow')),
  CONSTRAINT profile_social_rate_count_check CHECK (action_count BETWEEN 0 AND 1000)
);

CREATE INDEX IF NOT EXISTS profile_favorites_profile_idx
  ON public.profile_favorites (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_reactions_profile_idx
  ON public.profile_reactions (profile_id, reaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_guestbook_profile_idx
  ON public.profile_guestbook_entries (profile_id, status, created_at DESC, entry_key DESC);

CREATE INDEX IF NOT EXISTS profile_guestbook_author_idx
  ON public.profile_guestbook_entries (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_blocks_blocked_idx
  ON public.profile_blocks (blocked_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_reports_status_idx
  ON public.profile_reports (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_profile_unique
  ON public.profile_reports (reporter_id, target_profile_id, reason)
  WHERE entry_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_entry_unique
  ON public.profile_reports (reporter_id, target_profile_id, entry_key, reason)
  WHERE entry_key IS NOT NULL;

ALTER TABLE public.profile_social_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_social_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profile_social_settings,
  public.profile_favorites,
  public.profile_reactions,
  public.profile_guestbook_entries,
  public.profile_blocks,
  public.profile_reports,
  public.profile_social_rate_limits
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.profile_social_settings,
  public.profile_favorites,
  public.profile_reactions,
  public.profile_guestbook_entries,
  public.profile_blocks,
  public.profile_reports,
  public.profile_social_rate_limits
TO service_role;

CREATE OR REPLACE FUNCTION public.is_profile_blocked(p_left_id uuid, p_right_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_blocks b
    WHERE (b.blocker_id = p_left_id AND b.blocked_id = p_right_id)
       OR (b.blocker_id = p_right_id AND b.blocked_id = p_left_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.consume_profile_social_rate_limit(
  p_user_id uuid,
  p_action_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_started timestamptz;
  v_count integer;
BEGIN
  IF p_user_id IS NULL
     OR p_action_key NOT IN ('favorite', 'reaction', 'guestbook', 'report', 'block', 'settings', 'follow')
     OR p_limit < 1
     OR p_limit > 1000
     OR p_window_seconds < 1
     OR p_window_seconds > 86400 THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || ':' || p_action_key),
    9350
  );

  SELECT window_started_at, action_count
  INTO v_started, v_count
  FROM public.profile_social_rate_limits
  WHERE user_id = p_user_id
    AND action_key = p_action_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profile_social_rate_limits (
      user_id, action_key, window_started_at, action_count
    ) VALUES (p_user_id, p_action_key, v_now, 1);
    RETURN true;
  END IF;

  IF v_now >= v_started + make_interval(secs => p_window_seconds) THEN
    UPDATE public.profile_social_rate_limits
    SET window_started_at = v_now,
        action_count = 1
    WHERE user_id = p_user_id
      AND action_key = p_action_key;
    RETURN true;
  END IF;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.profile_social_rate_limits
  SET action_count = action_count + 1
  WHERE user_id = p_user_id
    AND action_key = p_action_key;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile_social_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.profile_social_settings;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'settings', jsonb_build_object(
      'interactionsEnabled', COALESCE(v_settings.interactions_enabled, true),
      'guestbookEnabled', COALESCE(v_settings.guestbook_enabled, true),
      'activityVisible', COALESCE(v_settings.activity_visible, true),
      'discoverable', COALESCE(v_settings.discoverable, true)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_profile_social_settings(
  p_interactions_enabled boolean DEFAULT true,
  p_guestbook_enabled boolean DEFAULT true,
  p_activity_visible boolean DEFAULT true,
  p_discoverable boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'settings', 20, 3600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settings updates are temporarily limited.');
  END IF;

  INSERT INTO public.profile_social_settings (
    user_id, interactions_enabled, guestbook_enabled, activity_visible, discoverable, updated_at
  ) VALUES (
    v_user_id,
    COALESCE(p_interactions_enabled, true),
    COALESCE(p_guestbook_enabled, true),
    COALESCE(p_activity_visible, true),
    COALESCE(p_discoverable, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET interactions_enabled = EXCLUDED.interactions_enabled,
      guestbook_enabled = EXCLUDED.guestbook_enabled,
      activity_visible = EXCLUDED.activity_visible,
      discoverable = EXCLUDED.discoverable,
      updated_at = now();

  RETURN public.get_my_profile_social_settings();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_social(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_settings public.profile_social_settings;
  v_blocked boolean := false;
  v_guestbook jsonb;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = p_user_id;

  IF v_viewer_id IS NOT NULL AND v_viewer_id <> p_user_id THEN
    v_blocked := public.is_profile_blocked(v_viewer_id, p_user_id);
  END IF;

  IF v_blocked THEN
    RETURN jsonb_build_object(
      'success', true,
      'blocked', true,
      'interactionsEnabled', false,
      'guestbookEnabled', false,
      'activityVisible', false,
      'favoriteCount', 0,
      'reactionCounts', jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0),
      'viewerFavorited', false,
      'viewerReactions', '[]'::jsonb,
      'guestbook', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'entryKey', e.entry_key,
        'author', author.username,
        'body', e.body,
        'createdAt', e.created_at,
        'canDelete', v_viewer_id IS NOT NULL
          AND (e.author_id = v_viewer_id OR p_user_id = v_viewer_id)
      )
      ORDER BY e.created_at DESC, e.entry_key DESC
    ),
    '[]'::jsonb
  )
  INTO v_guestbook
  FROM (
    SELECT e.*
    FROM public.profile_guestbook_entries e
    WHERE e.profile_id = p_user_id
      AND e.status = 'visible'
      AND NOT public.is_profile_blocked(e.author_id, p_user_id)
    ORDER BY e.created_at DESC, e.entry_key DESC
    LIMIT 20
  ) e
  JOIN public.profiles author ON author.id = e.author_id;

  RETURN jsonb_build_object(
    'success', true,
    'blocked', false,
    'interactionsEnabled', COALESCE(v_settings.interactions_enabled, true),
    'guestbookEnabled', COALESCE(v_settings.guestbook_enabled, true),
    'activityVisible', COALESCE(v_settings.activity_visible, true),
    'favoriteCount', (
      SELECT count(*)
      FROM public.profile_favorites f
      WHERE f.profile_id = p_user_id
    ),
    'reactionCounts', jsonb_build_object(
      'spark', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'spark'),
      'glow', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'glow'),
      'cheer', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'cheer')
    ),
    'viewerFavorited', v_viewer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profile_favorites f
      WHERE f.favoriter_id = v_viewer_id AND f.profile_id = p_user_id
    ),
    'viewerReactions', COALESCE((
      SELECT jsonb_agg(r.reaction_type ORDER BY r.reaction_type)
      FROM public.profile_reactions r
      WHERE r.reactor_id = v_viewer_id AND r.profile_id = p_user_id
    ), '[]'::jsonb),
    'guestbook', v_guestbook
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_favorite(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing boolean;
  v_enabled boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot favorite yourself');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;

  SELECT COALESCE(s.interactions_enabled, true)
  INTO v_enabled
  FROM public.profiles p
  LEFT JOIN public.profile_social_settings s ON s.user_id = p.id
  WHERE p.id = p_profile_id;
  SELECT EXISTS (
    SELECT 1 FROM public.profile_favorites f
    WHERE f.favoriter_id = v_user_id AND f.profile_id = p_profile_id
  ) INTO v_existing;

  IF NOT v_existing AND NOT v_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'follow', 30, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Favorite changes are temporarily limited.');
  END IF;

  IF v_existing THEN
    DELETE FROM public.profile_favorites
    WHERE favoriter_id = v_user_id AND profile_id = p_profile_id;
    RETURN jsonb_build_object('success', true, 'action', 'unfavorited');
  END IF;

  INSERT INTO public.profile_favorites (favoriter_id, profile_id)
  VALUES (v_user_id, p_profile_id);
  RETURN jsonb_build_object('success', true, 'action', 'favorited');
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_reaction(
  p_profile_id uuid,
  p_reaction_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot react to yourself');
  END IF;
  IF p_reaction_type NOT IN ('spark', 'glow', 'cheer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown reaction');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.interactions_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = p_profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'reaction', 60, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reaction changes are temporarily limited.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_reactions r
    WHERE r.reactor_id = v_user_id
      AND r.profile_id = p_profile_id
      AND r.reaction_type = p_reaction_type
  ) INTO v_existing;

  IF v_existing THEN
    DELETE FROM public.profile_reactions
    WHERE reactor_id = v_user_id
      AND profile_id = p_profile_id
      AND reaction_type = p_reaction_type;
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'reaction', p_reaction_type);
  END IF;

  INSERT INTO public.profile_reactions (reactor_id, profile_id, reaction_type)
  VALUES (v_user_id, p_profile_id, p_reaction_type);
  RETURN jsonb_build_object('success', true, 'action', 'added', 'reaction', p_reaction_type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_profile_guestbook_entry(
  p_profile_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_entry_key uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot leave a note on your own profile.');
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 240
     OR v_body ~ '[[:cntrl:]]'
     OR v_body ~* '(https?://|www[.]|[[:alnum:]_-]+[.][[:alpha:]]{2,})' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notes must be 1–240 characters, plain text, and contain no links.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;
  IF NOT COALESCE((
    SELECT s.guestbook_enabled AND s.interactions_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = p_profile_id
  ), true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is not accepting guestbook notes.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'guestbook', 5, 600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook notes are temporarily limited.');
  END IF;

  INSERT INTO public.profile_guestbook_entries (author_id, profile_id, body)
  VALUES (v_user_id, p_profile_id, v_body)
  RETURNING entry_key, created_at INTO v_entry_key, v_created_at;

  RETURN jsonb_build_object(
    'success', true,
    'entry', jsonb_build_object(
      'entryKey', v_entry_key,
      'author', (SELECT username FROM public.profiles WHERE id = v_user_id),
      'body', v_body,
      'createdAt', v_created_at,
      'canDelete', true
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_profile_guestbook_entry(p_entry_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM public.profile_guestbook_entries e
  WHERE e.entry_key = p_entry_key
    AND (e.author_id = v_user_id OR e.profile_id = v_user_id);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', v_deleted > 0,
    'deleted', v_deleted > 0,
    'error', CASE WHEN v_deleted = 0 THEN 'Note not found or not owned.' ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_profile_block(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot block yourself');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'block', 20, 86400) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Block changes are temporarily limited.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_blocks b
    WHERE b.blocker_id = v_user_id AND b.blocked_id = p_profile_id
  ) INTO v_existing;

  IF v_existing THEN
    DELETE FROM public.profile_blocks
    WHERE blocker_id = v_user_id AND blocked_id = p_profile_id;
    RETURN jsonb_build_object('success', true, 'action', 'unblocked');
  END IF;

  INSERT INTO public.profile_blocks (blocker_id, blocked_id)
  VALUES (v_user_id, p_profile_id);

  DELETE FROM public.user_follows
  WHERE (follower_id = v_user_id AND followee_id = p_profile_id)
     OR (follower_id = p_profile_id AND followee_id = v_user_id);
  DELETE FROM public.profile_favorites
  WHERE (favoriter_id = v_user_id AND profile_id = p_profile_id)
     OR (favoriter_id = p_profile_id AND profile_id = v_user_id);
  DELETE FROM public.profile_reactions
  WHERE (reactor_id = v_user_id AND profile_id = p_profile_id)
     OR (reactor_id = p_profile_id AND profile_id = v_user_id);

  RETURN jsonb_build_object('success', true, 'action', 'blocked');
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_profile_social_content(
  p_target_profile_id uuid,
  p_entry_key uuid DEFAULT NULL,
  p_reason text DEFAULT 'other',
  p_details text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := lower(trim(coalesce(p_reason, '')));
  v_details text := btrim(coalesce(p_details, ''));
  v_existing boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_target_profile_id IS NULL OR p_target_profile_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report target');
  END IF;
  IF v_reason NOT IN ('spam', 'harassment', 'hate', 'sexual', 'impersonation', 'other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report reason');
  END IF;
  IF char_length(v_details) > 500 OR v_details ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report details are limited to 500 plain-text characters.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF p_entry_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profile_guestbook_entries e
    WHERE e.entry_key = p_entry_key AND e.profile_id = p_target_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guestbook note not found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_reports r
    WHERE r.reporter_id = v_user_id
      AND r.target_profile_id = p_target_profile_id
      AND r.entry_key IS NOT DISTINCT FROM p_entry_key
      AND r.reason = v_reason
  ) INTO v_existing;
  IF v_existing THEN
    RETURN jsonb_build_object('success', true, 'action', 'already_reported');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'report', 5, 86400) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reports are temporarily limited.');
  END IF;

  INSERT INTO public.profile_reports (
    reporter_id, target_profile_id, entry_key, reason, details
  ) VALUES (
    v_user_id, p_target_profile_id, p_entry_key, v_reason, v_details
  );

  RETURN jsonb_build_object('success', true, 'action', 'reported');
END;
$function$;

-- Preserve the existing rivals contract while applying the Phase 7 block and
-- interaction boundary to new follows. Removing a rival remains possible even
-- after its profile disables new interaction requests.
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_following boolean;
  v_follow_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_target_id IS NULL OR v_user_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;
  IF public.is_profile_blocked(v_user_id, p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'This profile is unavailable for interaction.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9342);

  SELECT EXISTS(
    SELECT 1
    FROM public.user_follows
    WHERE follower_id = v_user_id
      AND followee_id = p_target_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.user_follows
    WHERE follower_id = v_user_id
      AND followee_id = p_target_id;
    RETURN json_build_object('success', true, 'action', 'unfollowed');
  END IF;

  IF NOT COALESCE((
    SELECT s.interactions_enabled
    FROM public.profile_social_settings s
    WHERE s.user_id = p_target_id
  ), true) THEN
    RETURN json_build_object('success', false, 'error', 'This profile has disabled social interactions.');
  END IF;
  IF NOT public.consume_profile_social_rate_limit(v_user_id, 'favorite', 30, 600) THEN
    RETURN json_build_object('success', false, 'error', 'Rival changes are temporarily limited.');
  END IF;

  SELECT count(*) INTO v_follow_count
  FROM public.user_follows
  WHERE follower_id = v_user_id;

  IF v_follow_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum of 5 rivals reached.');
  END IF;

  INSERT INTO public.user_follows (follower_id, followee_id)
  VALUES (v_user_id, p_target_id);

  RETURN json_build_object('success', true, 'action', 'followed');
END;
$function$;

-- Enforce activity privacy at the existing public score/story boundaries.
DO $migration$
DECLARE
  v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.get_public_profile_scores(uuid)'::regprocedure);
  IF position('AND s.roll_date >= public.game_utc_date() - 30' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate public profile score visibility boundary';
  END IF;
  v_definition := replace(
    v_definition,
    'AND s.roll_date >= public.game_utc_date() - 30',
    'AND s.roll_date >= public.game_utc_date() - 30' || E'\n    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))'
  );
  EXECUTE v_definition;

  v_definition := pg_get_functiondef('public.get_public_profile_story(uuid)'::regprocedure);
  IF position('WHERE e.user_id = p_user_id' IN v_definition) = 0
     OR position('WHERE s.user_id = p_user_id' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate public profile story activity boundaries';
  END IF;
  v_definition := replace(
    v_definition,
    'WHERE e.user_id = p_user_id',
    'WHERE e.user_id = p_user_id' || E'\n    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))'
  );
  v_definition := replace(
    v_definition,
    'WHERE s.user_id = p_user_id',
    'WHERE s.user_id = p_user_id' || E'\n    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))'
  );
  EXECUTE v_definition;

  v_definition := pg_get_functiondef('public.get_public_discovery(text, text, text, integer, integer)'::regprocedure);
  IF position('WHERE s.surface = v_surface' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not locate public discovery visibility boundary';
  END IF;
  v_definition := replace(
    v_definition,
    'WHERE s.surface = v_surface',
    'WHERE s.surface = v_surface' || E'\n      AND COALESCE((SELECT s2.discoverable FROM public.profile_social_settings s2 WHERE s2.user_id = s.user_id), true)'
  );
  EXECUTE v_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.is_profile_blocked(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_profile_social_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_profile_social_settings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_my_profile_social_settings(boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_social(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_favorite(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_reaction(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_profile_guestbook_entry(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_profile_guestbook_entry(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_profile_block(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.report_profile_social_content(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_profile_social(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_social_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_social_settings(boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_guestbook_entry(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_guestbook_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_profile_block(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_profile_social_content(uuid, uuid, text, text) TO authenticated;

COMMIT;
