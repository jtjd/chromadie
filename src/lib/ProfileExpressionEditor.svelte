<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { supabase } from './supabase.js';
  import { buildProfileStoragePath, getProfileStorageRef, normalizeProfileExpression, parseSpotifyUrl, spotifyUrlFromParts, PROFILE_AUDIO_RULES, PROFILE_IMAGE_RULES } from './profileExpression.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { processProfileImage, validateProfileAudioDuration } from './profileMediaProcessing.js';
  import Module from './foundation/Module.svelte';
  import Media from './foundation/Media.svelte';

  export let profileId = null;
  export let config = {};
  export let fallbackInitial = '✦';
  export let staff = false;

  const dispatch = createEventDispatcher();
  let expression = normalizeProfileExpression();
  let syncedKey = '';
  let avatarInput;
  let backgroundInput;
  let audioInput;
  let avatarPreviewSrc = '';
  let backgroundPreviewSrc = '';
  let audioPreviewSrc = '';
  let spotifyUrl = '';
  let busy = false;
  let status = '';
  let error = '';
  let mediaCacheKey = String(Date.now());
  const avatarRules = PROFILE_IMAGE_RULES.avatar;
  const backgroundRules = PROFILE_IMAGE_RULES.background;
  const actionButtonStyle = 'display:inline-flex;align-items:center;justify-content:center;min-height:2.65rem;border:1px solid transparent;border-radius:var(--radius-sm);padding:0 1rem;background:var(--color-ink-strong);color:var(--color-canvas-deep);font:600 var(--type-small)/1 var(--font-body-stack);cursor:pointer';
  const quietButtonStyle = 'display:inline-flex;align-items:center;justify-content:center;min-height:2.65rem;border:1px solid var(--color-line-subtle);border-radius:var(--radius-sm);padding:0 1rem;background:transparent;color:var(--color-ink-muted);font:600 var(--type-small)/1 var(--font-body-stack);cursor:pointer';
  const fieldStyle = 'width:100%;min-height:2.65rem;min-width:0;border:1px solid var(--color-line-subtle);border-radius:var(--radius-sm);padding:0 .75rem;background:var(--surface-inset);color:var(--color-ink-strong);font:500 var(--type-small)/1 var(--font-body-stack)';

  $: incomingExpression = normalizeProfileExpression(
    config?.draft || config?.published || {}
  );
  $: incomingKey = `${profileId || ''}:${JSON.stringify(incomingExpression)}`;
  function syncIncomingExpression(nextExpression, nextKey) {
    if (busy || nextKey === syncedKey) return;
    expression = nextExpression;
    spotifyUrl = spotifyUrlFromParts(nextExpression.spotify_type, nextExpression.spotify_id);
    syncedKey = nextKey;
  }
  $: syncIncomingExpression(incomingExpression, incomingKey);
  $: avatarSrc = avatarPreviewSrc || getProfileMediaUrl(expression.avatar_path, mediaCacheKey);
  $: backgroundSrc = backgroundPreviewSrc || getProfileMediaUrl(expression.background_path, mediaCacheKey);
  $: audioSrc = audioPreviewSrc || getProfileMediaUrl(expression.audio_path, mediaCacheKey);

  function formatInputLimit(bytes) {
    const megabytes = bytes / (1024 * 1024);
    return Number.isInteger(megabytes) ? `${megabytes} MB` : `${Math.round(bytes / 1024)} KB`;
  }

  function formatStoredSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function revokeAvatarPreview() {
    if (avatarPreviewSrc && avatarPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewSrc);
    avatarPreviewSrc = '';
  }

  function revokeBackgroundPreview() {
    if (backgroundPreviewSrc && backgroundPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(backgroundPreviewSrc);
    backgroundPreviewSrc = '';
  }

  function setFeedback(nextError = '', nextStatus = '') {
    error = nextError;
    status = nextStatus;
  }

  async function saveExpression(nextExpression) {
    const next = normalizeProfileExpression(nextExpression);
    const { data, error: rpcError } = await supabase.rpc('update_my_profile_expression', {
      p_avatar_path: next.avatar_path,
      p_background_path: next.background_path,
      p_spotify_url: spotifyUrlFromParts(next.spotify_type, next.spotify_id) || null
    });
    if (rpcError || !data?.success) {
      throw new Error(rpcError?.message || data?.error || 'The profile expression could not be saved.');
    }

    expression = normalizeProfileExpression(data);
    syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
    mediaCacheKey = String(Date.now());
    dispatch('expressionchange', { ...expression });
    return expression;
  }

  async function handleAvatarChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !profileId || busy) return;

    busy = true;
    setFeedback('', 'Preparing the avatar…');
    try {
      const blob = await processProfileImage(file, 'avatar');
      const storedPath = buildProfileStoragePath('avatar', profileId);
      const reference = getProfileStorageRef(storedPath);
      if (!reference) throw new Error('The avatar path could not be prepared.');

      const objectUrl = URL.createObjectURL(blob);
      revokeAvatarPreview();
      avatarPreviewSrc = objectUrl;
      const { error: uploadError } = await supabase.storage
        .from(reference.bucket)
        .upload(reference.objectPath, blob, {
          cacheControl: '3600',
          contentType: 'image/webp',
          upsert: true
        });
      if (uploadError) throw new Error(uploadError.message || 'The avatar could not be uploaded.');

      await saveExpression({ ...expression, avatar_path: storedPath });
      setFeedback('', `Avatar saved to your public profile (${formatStoredSize(blob.size)} stored).`);
    } catch (uploadError) {
      setFeedback(uploadError instanceof Error ? uploadError.message : 'The avatar could not be saved.');
      revokeAvatarPreview();
    } finally {
      busy = false;
    }
  }

  async function removeAvatar() {
    if (!expression.avatar_path || busy) return;
    const previousPath = expression.avatar_path;
    busy = true;
    setFeedback('', 'Removing the avatar…');
    try {
      const next = await saveExpression({ ...expression, avatar_path: null });
      const reference = getProfileStorageRef(previousPath);
      if (reference) {
        const { error: removeError } = await supabase.storage.from(reference.bucket).remove([reference.objectPath]);
        if (removeError) {
          setFeedback('', 'Avatar removed from the profile. The old file can be cleaned up later.');
          return;
        }
      }
      expression = next;
      setFeedback('', 'Avatar removed. Your initials fallback is active.');
    } catch (removeError) {
      setFeedback(removeError instanceof Error ? removeError.message : 'The avatar could not be removed.');
    } finally {
      busy = false;
    }
  }

  async function handleBackgroundChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !profileId || busy) return;

    busy = true;
    setFeedback('', 'Preparing the background…');
    try {
      const blob = await processProfileImage(file, 'background');
      const storedPath = buildProfileStoragePath('background', profileId);
      const reference = getProfileStorageRef(storedPath);
      if (!reference) throw new Error('The background path could not be prepared.');

      const objectUrl = URL.createObjectURL(blob);
      revokeBackgroundPreview();
      backgroundPreviewSrc = objectUrl;
      const { error: uploadError } = await supabase.storage
        .from(reference.bucket)
        .upload(reference.objectPath, blob, {
          cacheControl: '3600',
          contentType: 'image/webp',
          upsert: true
        });
      if (uploadError) throw new Error(uploadError.message || 'The background could not be uploaded.');

      await saveExpression({ ...expression, background_path: storedPath });
      setFeedback('', `Background saved to your public atmosphere (${formatStoredSize(blob.size)} stored).`);
    } catch (uploadError) {
      setFeedback(uploadError instanceof Error ? uploadError.message : 'The background could not be saved.');
      revokeBackgroundPreview();
    } finally {
      busy = false;
    }
  }

  async function removeBackground() {
    if (!expression.background_path || busy) return;
    const previousPath = expression.background_path;
    busy = true;
    setFeedback('', 'Removing the background…');
    try {
      const next = await saveExpression({ ...expression, background_path: null });
      const reference = getProfileStorageRef(previousPath);
      if (reference) {
        const { error: removeError } = await supabase.storage.from(reference.bucket).remove([reference.objectPath]);
        if (removeError) {
          setFeedback('', 'Background removed from the profile. The old file can be cleaned up later.');
          return;
        }
      }
      expression = next;
      setFeedback('', 'Background removed. The generated color atmosphere is active.');
    } catch (removeError) {
      setFeedback(removeError instanceof Error ? removeError.message : 'The background could not be removed.');
    } finally {
      busy = false;
    }
  }

  async function saveSpotify() {
    if (busy) return;
    const parsed = parseSpotifyUrl(spotifyUrl);
    if (spotifyUrl.trim() && !parsed) {
      setFeedback('Use an HTTPS track, playlist, or album URL from open.spotify.com.', '');
      return;
    }

    busy = true;
    setFeedback('', parsed ? 'Saving Spotify…' : 'Removing Spotify…');
    try {
      await saveExpression({
        ...expression,
        spotify_type: parsed?.type || null,
        spotify_id: parsed?.id || null
      });
      spotifyUrl = parsed ? spotifyUrlFromParts(parsed.type, parsed.id) : '';
      setFeedback('', parsed ? 'Spotify is visible on your public profile.' : 'Spotify removed from your profile.');
    } catch (spotifyError) {
      setFeedback(spotifyError instanceof Error ? spotifyError.message : 'Spotify could not be saved.');
    } finally {
      busy = false;
    }
  }

  async function handleAudioChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !profileId || !staff || busy) return;

    busy = true;
    setFeedback('', 'Checking the audio…');
    try {
      const validationError = await validateProfileAudioDuration(file);
      if (validationError) throw new Error(validationError);

      const storedPath = buildProfileStoragePath('audio', profileId);
      const reference = getProfileStorageRef(storedPath);
      if (!reference) throw new Error('The audio path could not be prepared.');

      const objectUrl = URL.createObjectURL(file);
      if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
      audioPreviewSrc = objectUrl;
      const { error: uploadError } = await supabase.storage
        .from(reference.bucket)
        .upload(reference.objectPath, file, {
          cacheControl: '3600',
          contentType: 'audio/mpeg',
          upsert: true
        });
      if (uploadError) throw new Error(uploadError.message || 'The audio could not be uploaded.');

      const { data, error: rpcError } = await supabase.rpc('update_my_profile_audio', { p_audio_path: storedPath });
      if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The audio could not be saved.');
      expression = normalizeProfileExpression({ ...expression, audio_path: data.audio_path });
      syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
      mediaCacheKey = String(Date.now());
      dispatch('expressionchange', { ...expression });
      setFeedback('', `Profile audio saved. It will autoplay when the browser permits (${Math.round(file.size / 1024)} KB).`);
    } catch (audioError) {
      setFeedback(audioError instanceof Error ? audioError.message : 'The audio could not be saved.');
      if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
      audioPreviewSrc = '';
    } finally {
      busy = false;
    }
  }

  async function removeAudio() {
    if (!expression.audio_path || !staff || busy) return;
    const previousPath = expression.audio_path;
    busy = true;
    setFeedback('', 'Removing profile audio…');
    try {
      const { data, error: rpcError } = await supabase.rpc('update_my_profile_audio', { p_audio_path: null });
      if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The audio could not be removed.');
      const reference = getProfileStorageRef(previousPath);
      if (reference) {
        const { error: removeError } = await supabase.storage.from(reference.bucket).remove([reference.objectPath]);
        if (removeError) throw new Error(removeError.message || 'The audio reference was removed, but the file could not be deleted.');
      }
      expression = normalizeProfileExpression({ ...expression, audio_path: null });
      syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
      mediaCacheKey = String(Date.now());
      dispatch('expressionchange', { ...expression });
      setFeedback('', 'Profile audio removed.');
    } catch (audioError) {
      setFeedback(audioError instanceof Error ? audioError.message : 'The audio could not be removed.');
    } finally {
      busy = false;
    }
  }

  onDestroy(() => {
    revokeAvatarPreview();
    revokeBackgroundPreview();
    if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
  });
</script>

<Module size="wide" tone="quiet" className="profile-expression-editor" eyebrow="Profile expression" title="Personal expression" description="Optional avatar, atmosphere, and music settings. Images are cropped or compressed and converted to WebP before upload.">
  <div class="profile-expression-editor__media-row" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
    <div class="profile-expression-editor__preview" style="flex:0 0 7rem;width:7rem" aria-label="Avatar preview">
      {#if avatarSrc}
        <Media src={avatarSrc} alt="Avatar preview" aspect="square" loading="eager" className="profile-expression-editor__avatar" fallbackLabel="Avatar unavailable" allowLocalPreview={true} />
      {:else}
        <div class="profile-expression-editor__avatar profile-expression-editor__avatar--fallback" style="display:grid;place-items:center;width:7rem;aspect-ratio:1;border-radius:50%;background:var(--profile-accent);color:var(--color-ink-strong);font-size:2.8rem" aria-label="Initials fallback">{fallbackInitial.slice(0, 1).toUpperCase() || '✦'}</div>
      {/if}
    </div>
    <div class="profile-expression-editor__copy" style="display:grid;gap:.5rem;min-width:12rem;flex:1">
      <strong>{expression.avatar_path ? 'Avatar is visible' : 'Initials fallback is active'}</strong>
      <p>JPEG, PNG, or WebP · up to {formatInputLimit(avatarRules.maxInputBytes)} input; stored as WebP up to {avatarRules.outputLabel}.</p>
      <div class="profile-expression-editor__actions">
        <input bind:this={avatarInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose avatar image" on:change={handleAvatarChange} />
        <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => avatarInput?.click()}>{expression.avatar_path ? 'Replace avatar' : 'Upload avatar'}</button>
        {#if expression.avatar_path}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeAvatar}>Remove</button>{/if}
      </div>
    </div>
  </div>

  <div class="profile-expression-editor__section" style="display:grid;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-line-subtle)">
    <div>
      <p class="profile-expression-editor__eyebrow">Atmosphere</p>
      <h3>Use a background image</h3>
      <p class="profile-expression-editor__section-copy">A centered, compressed image behind the existing daily-color atmosphere. A dark overlay keeps the identity readable.</p>
    </div>
    <div class="profile-expression-editor__background-row" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <div class="profile-expression-editor__background-preview" style="flex:1 1 16rem;min-width:10rem" aria-label="Background preview">
        {#if backgroundSrc}
          <Media src={backgroundSrc} alt="Background preview" aspect="wide" loading="eager" className="profile-expression-editor__background" fallbackLabel="Background unavailable" allowLocalPreview={true} />
        {:else}
          <div class="profile-expression-editor__background profile-expression-editor__background--fallback">Generated color atmosphere</div>
        {/if}
      </div>
      <div class="profile-expression-editor__copy" style="display:grid;gap:.5rem;min-width:12rem;flex:1">
        <strong>{expression.background_path ? 'Background is visible' : 'Generated atmosphere is active'}</strong>
        <p>JPEG, PNG, or WebP · up to {formatInputLimit(backgroundRules.maxInputBytes)} input; stored as WebP up to {backgroundRules.outputLabel}.</p>
        <div class="profile-expression-editor__actions">
          <input bind:this={backgroundInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose background image" on:change={handleBackgroundChange} />
          <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => backgroundInput?.click()}>{expression.background_path ? 'Replace background' : 'Upload background'}</button>
          {#if expression.background_path}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeBackground}>Remove</button>{/if}
        </div>
      </div>
    </div>
  </div>

  {#if staff}
    <div class="profile-expression-editor__section" style="display:grid;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-line-subtle)">
      <div>
        <p class="profile-expression-editor__eyebrow">Staff alpha</p>
        <h3>Profile audio</h3>
        <p class="profile-expression-editor__section-copy">Upload one short MP3. It loops after playback starts and attempts autoplay on public profiles when the browser allows it.</p>
      </div>
      <div style="display:grid;gap:.75rem;max-width:42rem">
        {#if audioSrc}
          <audio src={audioSrc} controls loop preload="metadata" aria-label="Profile audio preview"></audio>
        {:else}
          <p style="margin:0;color:var(--color-ink-muted)">No profile audio configured.</p>
        {/if}
        <p>MP3 only · up to 1 MB · up to {PROFILE_AUDIO_RULES.maxDurationSeconds} seconds.</p>
        <div class="profile-expression-editor__actions">
          <input bind:this={audioInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="audio/mpeg,.mp3" aria-label="Choose profile audio" on:change={handleAudioChange} />
          <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => audioInput?.click()}>{expression.audio_path ? 'Replace audio' : 'Upload audio'}</button>
          {#if expression.audio_path}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeAudio}>Remove</button>{/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="profile-expression-editor__section" style="display:grid;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-line-subtle)">
    <div>
      <p class="profile-expression-editor__eyebrow">Music</p>
      <h3>Connect a Spotify item</h3>
      <p class="profile-expression-editor__section-copy">Paste a public Spotify track, playlist, or album URL. The public profile uses Spotify’s official lazy-loaded embed.</p>
    </div>
    <label class="profile-expression-editor__spotify-field" style="display:grid;gap:.5rem;max-width:42rem">
      <span>Spotify URL</span>
      <input bind:value={spotifyUrl} style={fieldStyle} type="url" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/track/..." aria-describedby="spotify-help" />
      <small id="spotify-help">Only open.spotify.com HTTPS links are accepted.</small>
    </label>
    <div class="profile-expression-editor__actions">
      <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={saveSpotify}>{expression.spotify_id ? 'Update Spotify' : 'Save Spotify'}</button>
      {#if expression.spotify_id}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={() => { spotifyUrl = ''; void saveSpotify(); }}>Remove</button>{/if}
    </div>
  </div>

  {#if error}<p class="profile-expression-editor__message profile-expression-editor__message--error" style="margin:0" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-expression-editor__message" style="margin:0" role="status" aria-live="polite">{status}</p>{/if}
</Module>
