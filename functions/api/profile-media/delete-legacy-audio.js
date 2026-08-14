import {
  callSupabaseRpc,
  controlPlaneError,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  requireUser
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;

  const body = await parseJsonRequest(request);
  const storagePath = String(body?.storage_path || '').trim();
  const expectedPath = `profile_audio/${auth.user.id}/profile.mp3`;
  if (storagePath !== expectedPath) {
    return jsonResponse({ success: false, error: 'The legacy profile audio path is invalid.' }, 400, request);
  }

  try {
    // This route now reconciles historical metadata only. The old object is
    // never requested through Supabase Storage; users must re-upload media to
    // R2 if they want it back.
    const cleared = await callSupabaseRpc(env, 'clear_my_legacy_profile_audio', {
      p_audio_path: storagePath
    }, { token: auth.token });
    if (!cleared?.success) {
      return jsonResponse({
        success: false,
        error: cleared?.error || 'The legacy profile audio reference could not be cleared.',
        storage_path: storagePath,
        cleanup_pending: true
      }, 422, request);
    }
    return jsonResponse({
      success: true,
      cleared: cleared.cleared === true,
      audio_path: null,
      updated_at: cleared.updated_at || null
    }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
