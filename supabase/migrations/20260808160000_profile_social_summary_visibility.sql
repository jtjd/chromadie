-- Let profile owners hide aggregate positive-social counts without disabling
-- moderated interactions. The public projection remains bounded and keeps
-- guestbook visibility/block/report behavior unchanged.

BEGIN;

ALTER TABLE public.profile_social_settings
  ADD COLUMN IF NOT EXISTS social_summary_visible boolean NOT NULL DEFAULT true;

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
      'discoverable', COALESCE(v_settings.discoverable, true),
      'socialSummaryVisible', COALESCE(v_settings.social_summary_visible, true)
    )
  );
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
  v_summary_visible boolean;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = p_user_id;

  v_summary_visible := COALESCE(v_settings.social_summary_visible, true);

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
      'socialSummaryVisible', false,
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
    'socialSummaryVisible', v_summary_visible,
    'favoriteCount', CASE WHEN v_summary_visible THEN (
      SELECT count(*)
      FROM public.profile_favorites f
      WHERE f.profile_id = p_user_id
    ) ELSE 0 END,
    'reactionCounts', CASE WHEN v_summary_visible THEN jsonb_build_object(
      'spark', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'spark'),
      'glow', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'glow'),
      'cheer', (SELECT count(*) FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'cheer')
    ) ELSE jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0) END,
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

-- Keep the existing settings RPC contract intact while allowing the dashboard
-- to save the new field in the same owner-authorized transaction.
CREATE OR REPLACE FUNCTION public.update_my_profile_social_settings(
  p_interactions_enabled boolean,
  p_guestbook_enabled boolean,
  p_activity_visible boolean,
  p_discoverable boolean,
  p_social_summary_visible boolean
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
    user_id, interactions_enabled, guestbook_enabled, activity_visible,
    discoverable, social_summary_visible, updated_at
  ) VALUES (
    v_user_id,
    COALESCE(p_interactions_enabled, true),
    COALESCE(p_guestbook_enabled, true),
    COALESCE(p_activity_visible, true),
    COALESCE(p_discoverable, true),
    COALESCE(p_social_summary_visible, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET interactions_enabled = EXCLUDED.interactions_enabled,
      guestbook_enabled = EXCLUDED.guestbook_enabled,
      activity_visible = EXCLUDED.activity_visible,
      discoverable = EXCLUDED.discoverable,
      social_summary_visible = EXCLUDED.social_summary_visible,
      updated_at = now();

  RETURN public.get_my_profile_social_settings();
END;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_social_settings(boolean, boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_social_settings(boolean, boolean, boolean, boolean, boolean) TO authenticated;

COMMIT;
