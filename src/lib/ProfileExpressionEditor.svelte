<script>
  import { onDestroy, onMount, createEventDispatcher } from 'svelte';
  import { supabase } from './supabase.js';
  import { normalizeProfileExpression, parseSpotifyUrl, spotifyUrlFromParts, PROFILE_IMAGE_RULES } from './profileExpression.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { deleteLegacyProfileAudio, deleteProfileMediaAsset, isR2MediaAsset, promoteProfileMediaR2, uploadProfileMediaToR2 } from './profileMediaR2.js';
  import { prepareProfileAudioFile, processProfileImage, validateProfileAudioFile } from './profileMediaProcessing.js';
  import { isProfileFeatureEnabled } from './profileFeatureFlags.js';
  import ProfileMediaIcon from './ProfileMediaIcon.svelte';
  import ProfileRichMediaEditor from './ProfileRichMediaEditor.svelte';
  import Module from './foundation/Module.svelte';
  import Media from './foundation/Media.svelte';
  import ProfileAudioWaveform from './ProfileAudioWaveform.svelte';

  export let profileId = null;
  export let config = {};
  export let fallbackInitial = '✦';
  export let staff = false;
  export let entitlements = [];
  export let compact = false;

  const dispatch = createEventDispatcher();
  let expression = normalizeProfileExpression();
  let syncedKey = '';
  let avatarInput;
  let backgroundInput;
  let audioInput;
  let avatarPreviewSrc = '';
  let backgroundPreviewSrc = '';
  let audioPreviewSrc = '';
  let audioElement;
  let audioPlaying = false;
  let audioCurrentTime = 0;
  let audioDuration = 0;
  let spotifyUrl = '';
  let busy = false;
  let status = '';
  let error = '';
  let avatarAssets = [];
  let backgroundAssets = [];
  let assetsLoading = false;
  let expressionMediaReferences = {};
  let assetLoadRequestId = 0;
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
  $: configuredMediaReferences = config?.draft?.media_references || config?.draft?.base?.media_references || config?.published?.media_references || config?.published?.base?.media_references || {};
  $: avatarSrc = avatarPreviewSrc || getProfileMediaUrl(configuredMediaReferences.avatar || expressionMediaReferences.avatar || expression.avatar_path);
  $: backgroundSrc = backgroundPreviewSrc || getProfileMediaUrl(configuredMediaReferences.background || expressionMediaReferences.background || expression.background_path);
  $: audioSrc = audioPreviewSrc || getProfileMediaUrl(configuredMediaReferences.audio || expressionMediaReferences.audio || expression.audio_path);
  $: hasAvatar = Boolean(expression.avatar_path || expression.avatar_asset_id || configuredMediaReferences.avatar || expressionMediaReferences.avatar);
  $: hasBackground = Boolean(expression.background_path || expression.background_asset_id || configuredMediaReferences.background || expressionMediaReferences.background);
  $: hasAudio = Boolean(expression.audio_path || expression.audio_asset_id || configuredMediaReferences.audio || expressionMediaReferences.audio);
  $: audioProgress = audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0;
  $: richMediaEnabled = isProfileFeatureEnabled('richMedia', { userId: profileId, isStaff: staff });
  $: r2MediaEnabled = isProfileFeatureEnabled('profileMediaR2', { userId: profileId, isStaff: staff });

  function selectedR2AssetId(kind) {
    const assetId = expression[`${kind}_asset_id`];
    const reference = configuredMediaReferences[kind] || expressionMediaReferences[kind];
    return assetId && reference?.storage_provider === 'r2' && reference?.r2_public_key ? assetId : null;
  }

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

  function setPersistedAvatarPreview(source) {
    if (avatarPreviewSrc && avatarPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewSrc);
    avatarPreviewSrc = source;
  }

  function setPersistedBackgroundPreview(source) {
    if (backgroundPreviewSrc && backgroundPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(backgroundPreviewSrc);
    backgroundPreviewSrc = source;
  }

  function setAudioPreview(source) {
    if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
    audioPreviewSrc = source;
  }

  function setFeedback(nextError = '', nextStatus = '') {
    error = nextError;
    status = nextStatus;
  }

  async function loadAssetLibrary() {
    if (!profileId) return;
    const requestId = ++assetLoadRequestId;
    assetsLoading = true;
    const { data, error: assetError } = await supabase
      .from('profile_media_assets')
      .select('id, kind, storage_path, storage_provider, r2_public_key, label, created_at, status, delivery_status, ever_public')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });
    if (requestId !== assetLoadRequestId) return;
    assetsLoading = false;
    if (assetError) {
      setFeedback(assetError.message || 'The media library could not be loaded.');
      return;
    }
    avatarAssets = (data || []).filter(asset => asset.kind === 'avatar' && (!asset.status || asset.status === 'active'));
    backgroundAssets = (data || []).filter(asset => asset.kind === 'background' && (!asset.status || asset.status === 'active'));
  }

  async function selectR2ExpressionAsset(kind, assetId, { clear = false, mediaReference = null } = {}) {
    if (kind === 'audio') {
      const { data, error: audioRpcError } = await supabase.rpc('select_my_profile_audio_asset', {
        p_audio_id: clear ? null : assetId,
        p_clear_audio: clear
      });
      if (audioRpcError || !data?.success) throw new Error(audioRpcError?.message || data?.error || 'The profile audio selection could not be saved.');
      expression = normalizeProfileExpression({ ...expression, ...data });
      expressionMediaReferences = {
        ...expressionMediaReferences,
        ...(data.media_references || {}),
        ...(mediaReference ? { audio: mediaReference } : {})
      };
      syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
      dispatch('expressionchange', { ...expression, media_references: expressionMediaReferences, updatedAt: data.updated_at || null });
      return data;
    }
    const { data, error: rpcError } = await supabase.rpc('select_my_profile_expression_assets', {
      p_avatar_id: kind === 'avatar' ? (clear ? null : assetId) : selectedR2AssetId('avatar'),
      p_background_id: kind === 'background' ? (clear ? null : assetId) : selectedR2AssetId('background'),
      p_clear_avatar: kind === 'avatar' && clear,
      p_clear_background: kind === 'background' && clear
    });
    if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The profile media selection could not be saved.');
    expression = normalizeProfileExpression({ ...expression, ...data });
    expressionMediaReferences = {
      ...expressionMediaReferences,
      ...(data.media_references || {}),
      ...(mediaReference ? { [kind]: mediaReference } : {})
    };
    syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
    dispatch('expressionchange', { ...expression, media_references: expressionMediaReferences, updatedAt: data.updated_at || null });
    return data;
  }

  async function selectAsset(kind, asset) {
    if ((!asset?.id || !isR2MediaAsset(asset) || !asset.r2_public_key) || busy) {
      if (asset?.id && !busy) setFeedback('', 'This saved media is unavailable. Re-upload it to R2 to use it.');
      return;
    }
    busy = true;
    setFeedback('', `Applying ${kind}…`);
    try {
      if (!asset.ever_public) await promoteProfileMediaR2(asset.id);
      await selectR2ExpressionAsset(kind, asset.id);
      setFeedback('', `${kind === 'avatar' ? 'Avatar' : 'Background'} applied to your profile.`);
    } catch (selectionError) {
      setFeedback(selectionError instanceof Error ? selectionError.message : `The ${kind} could not be applied.`);
    } finally {
      busy = false;
    }
  }

  async function deleteAsset(asset) {
    if (!asset?.id || busy) return;
    busy = true;
    setFeedback('', 'Removing media asset…');
    try {
      // All permanent library deletion goes through the server control plane.
      // It owns R2 deletion. Historical storage_path values remain inert and
      // are never sent to a Supabase Storage API.
      const data = await deleteProfileMediaAsset(asset.id);
      if (!data?.success) {
        throw new Error(data?.error || 'The media asset could not be removed.');
      }
      const field = `${asset.kind}_path`;
      if (expression[field] === asset.storage_path || expression[`${asset.kind}_asset_id`] === asset.id) {
        expression = normalizeProfileExpression({ ...expression, [field]: null, [`${asset.kind}_asset_id`]: null });
        syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
        const nextReferences = { ...configuredMediaReferences, ...expressionMediaReferences, [asset.kind]: null };
        expressionMediaReferences = nextReferences;
        dispatch('expressionchange', { ...expression, media_references: nextReferences, updatedAt: data.updated_at || null });
      }
      await loadAssetLibrary();
      setFeedback('', 'Media asset deleted from your library.');
    } catch (deleteError) {
      setFeedback(deleteError instanceof Error ? deleteError.message : 'The media asset could not be removed.');
    } finally {
      busy = false;
    }
  }

  function formatAudioTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  async function toggleAudio() {
    if (!audioElement) return;
    if (audioElement.paused) {
      try {
        await audioElement.play();
      } catch {
        setFeedback('', 'Press play to start the profile audio preview.');
      }
    } else {
      audioElement.pause();
    }
  }

  function updateAudioMetadata(event) {
    audioDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
  }

  function updateAudioTime(event) {
    audioCurrentTime = event.currentTarget.currentTime || 0;
  }

  function seekAudio(event) {
    if (!audioElement || !audioDuration) return;
    audioElement.currentTime = (Number(event.currentTarget.value) / 100) * audioDuration;
    audioCurrentTime = audioElement.currentTime;
  }

  async function saveExpression(nextExpression) {
    const next = normalizeProfileExpression(nextExpression);
    const { data, error: rpcError } = await supabase.rpc('update_my_profile_expression', {
      p_avatar_path: next.avatar_path,
      p_background_path: next.background_path,
      p_spotify_url: spotifyUrlFromParts(next.spotify_type, next.spotify_id) || null
    });
    if (rpcError || !data?.success) {
      throw new Error(rpcError?.message || data?.error || 'The profile cosmetics could not be saved.');
    }

    expression = normalizeProfileExpression({ ...expression, ...data });
    syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
    const nextResult = { ...expression, updatedAt: data.updated_at || null };
    dispatch('expressionchange', nextResult);
    return nextResult;
  }

  async function handleAvatarChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !profileId || busy) return;
    if (!r2MediaEnabled) {
      setFeedback('Profile media uploads are temporarily unavailable.');
      return;
    }

    busy = true;
    setFeedback('', 'Preparing the avatar…');
    let r2AssetId = '';
    let persisted = false;
    try {
      const blob = await processProfileImage(file, 'avatar');
      setPersistedAvatarPreview(URL.createObjectURL(blob));
      const uploaded = await uploadProfileMediaToR2({ kind: 'avatar', blob, extension: 'webp', mimeType: 'image/webp', label: file.name });
      const assetId = uploaded.asset_id || uploaded.asset?.id;
      if (!assetId) throw new Error('The R2 upload did not return a media asset.');
      r2AssetId = assetId;
      const promoted = await promoteProfileMediaR2(assetId);
      await selectR2ExpressionAsset('avatar', assetId, {
        mediaReference: { storage_provider: 'r2', r2_public_key: promoted.r2_public_key }
      });
      persisted = true;
      setPersistedAvatarPreview(getProfileMediaUrl({ r2_public_key: promoted.r2_public_key }));
      await loadAssetLibrary();
      setFeedback('', `Avatar saved to your R2 library and profile (${formatStoredSize(blob.size)} stored).`);
    } catch (uploadError) {
      if (!persisted && r2AssetId) await deleteProfileMediaAsset(r2AssetId).catch(() => {});
      setFeedback(uploadError instanceof Error ? uploadError.message : 'The avatar could not be saved.');
      revokeAvatarPreview();
    } finally {
      busy = false;
    }
  }

  async function removeAvatar() {
    if ((!expression.avatar_path && !expression.avatar_asset_id) || busy) return;
    busy = true;
    setFeedback('', 'Removing the avatar…');
    try {
      const next = selectedR2AssetId('avatar')
        ? (await selectR2ExpressionAsset('avatar', null, { clear: true }), normalizeProfileExpression({ ...expression, avatar_path: null, avatar_asset_id: null }))
        : await saveExpression({ ...expression, avatar_path: null });
      expression = next;
      revokeAvatarPreview();
      setFeedback('', 'Avatar unequipped. Your initials fallback is active; the saved asset remains in your library.');
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
    if (!r2MediaEnabled) {
      setFeedback('Profile media uploads are temporarily unavailable.');
      return;
    }

    busy = true;
    setFeedback('', 'Preparing the background…');
    let r2AssetId = '';
    let persisted = false;
    try {
      const blob = await processProfileImage(file, 'background');
      setPersistedBackgroundPreview(URL.createObjectURL(blob));
      const uploaded = await uploadProfileMediaToR2({ kind: 'background', blob, extension: 'webp', mimeType: 'image/webp', label: file.name });
      const assetId = uploaded.asset_id || uploaded.asset?.id;
      if (!assetId) throw new Error('The R2 upload did not return a media asset.');
      r2AssetId = assetId;
      const promoted = await promoteProfileMediaR2(assetId);
      await selectR2ExpressionAsset('background', assetId, {
        mediaReference: { storage_provider: 'r2', r2_public_key: promoted.r2_public_key }
      });
      persisted = true;
      setPersistedBackgroundPreview(getProfileMediaUrl({ r2_public_key: promoted.r2_public_key }));
      await loadAssetLibrary();
      setFeedback('', `Background saved to your R2 library and public atmosphere (${formatStoredSize(blob.size)} stored).`);
    } catch (uploadError) {
      if (!persisted && r2AssetId) await deleteProfileMediaAsset(r2AssetId).catch(() => {});
      setFeedback(uploadError instanceof Error ? uploadError.message : 'The background could not be saved.');
      revokeBackgroundPreview();
    } finally {
      busy = false;
    }
  }

  async function removeBackground() {
    if ((!expression.background_path && !expression.background_asset_id) || busy) return;
    busy = true;
    setFeedback('', 'Removing the background…');
    try {
      const next = selectedR2AssetId('background')
        ? (await selectR2ExpressionAsset('background', null, { clear: true }), normalizeProfileExpression({ ...expression, background_path: null, background_asset_id: null }))
        : await saveExpression({ ...expression, background_path: null });
      expression = next;
      revokeBackgroundPreview();
      setFeedback('', 'Background unequipped. The generated color atmosphere is active; the saved asset remains in your library.');
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
    if (!r2MediaEnabled) {
      setFeedback('Profile media uploads are temporarily unavailable.');
      return;
    }

    busy = true;
    setFeedback('', 'Checking the audio…');
    let r2AssetId = '';
    let persisted = false;
    try {
      const validationError = validateProfileAudioFile(file);
      if (validationError) throw new Error(validationError);
      const blob = await prepareProfileAudioFile(file);
      setAudioPreview(URL.createObjectURL(blob));
      const uploaded = await uploadProfileMediaToR2({ kind: 'audio', blob, extension: 'mp3', mimeType: 'audio/mpeg', label: file.name });
      const assetId = uploaded.asset_id || uploaded.asset?.id;
      if (!assetId) throw new Error('The R2 audio upload did not return a media asset.');
      r2AssetId = assetId;
      const promoted = await promoteProfileMediaR2(assetId);
      await selectR2ExpressionAsset('audio', assetId);
      expressionMediaReferences = { ...expressionMediaReferences, audio: { r2_public_key: promoted.r2_public_key } };
      persisted = true;
      setAudioPreview(getProfileMediaUrl({ r2_public_key: promoted.r2_public_key }));
      setFeedback('', `Profile audio saved to R2 (${Math.round(blob.size / 1024)} KB).`);
    } catch (audioError) {
      setFeedback(audioError instanceof Error ? audioError.message : 'The audio could not be saved.');
      if (r2AssetId && !persisted) await deleteProfileMediaAsset(r2AssetId).catch(() => {});
      setAudioPreview('');
    } finally {
      busy = false;
    }
  }

  async function removeAudio() {
    if ((!expression.audio_path && !expression.audio_asset_id) || !staff || busy) return;
    if (selectedR2AssetId('audio')) {
      busy = true;
      setFeedback('', 'Removing profile audio…');
      try {
        await selectR2ExpressionAsset('audio', null, { clear: true });
        if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
        audioPreviewSrc = '';
        setFeedback('', 'Profile audio unequipped. The saved asset remains in your library.');
      } catch (audioError) {
        setFeedback(audioError instanceof Error ? audioError.message : 'The audio could not be removed.');
      } finally {
        busy = false;
      }
      return;
    }
    if (!expression.audio_path) return;
    const previousPath = expression.audio_path;
    busy = true;
    setFeedback('', 'Removing profile audio…');
    try {
      const data = await deleteLegacyProfileAudio(previousPath);
      expression = normalizeProfileExpression({ ...expression, audio_path: null });
      syncedKey = `${profileId || ''}:${JSON.stringify(expression)}`;
      setAudioPreview('');
      dispatch('expressionchange', { ...expression, updatedAt: data.updated_at || null });
      setFeedback('', 'Profile audio removed.');
    } catch (audioError) {
      setFeedback(audioError instanceof Error ? audioError.message : 'The audio could not be removed.');
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    void loadAssetLibrary();
  });

  onDestroy(() => {
    revokeAvatarPreview();
    revokeBackgroundPreview();
    if (audioPreviewSrc && audioPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(audioPreviewSrc);
  });
</script>

<Module size="wide" tone="quiet" className="profile-expression-editor" title="Media" description="Upload an avatar or background, or connect Spotify.">
  {#if compact}
    <div id={compact ? 'profile-media-rich' : undefined} class="profile-expression-editor__compact-grid" aria-label="Profile media uploads">
      <article class="profile-expression-editor__compact-card profile-expression-editor__compact-card--avatar">
        <input bind:this={avatarInput} class="profile-expression-editor__compact-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose avatar image" on:change={handleAvatarChange} />
        <button
          class="profile-expression-editor__compact-preview profile-expression-editor__compact-preview--avatar"
          type="button"
          disabled={busy}
          on:click={() => avatarInput?.click()}
          aria-label={hasAvatar ? 'Replace profile avatar' : 'Upload profile avatar'}
        >
          {#if avatarSrc}
            <div class="profile-expression-editor__compact-avatar-frame">
              <Media src={avatarSrc} alt="Profile avatar preview" aspect="square" loading="eager" className="profile-expression-editor__compact-media" fallbackLabel="Avatar unavailable" allowLocalPreview={true} />
            </div>
          {:else}
            <ProfileMediaIcon kind="avatar" />
          {/if}
        </button>
        <div class="profile-expression-editor__compact-copy">
          <strong>Avatar</strong>
          <small>JPEG, PNG, or WebP · processed and stored as WebP</small>
          <div class="profile-expression-editor__compact-actions">
            <button type="button" class="profile-expression-editor__compact-replace" disabled={busy} on:click={() => avatarInput?.click()}>{hasAvatar ? 'Replace' : 'Upload avatar'}</button>
            {#if hasAvatar}<button type="button" class="profile-expression-editor__compact-remove" disabled={busy} on:click={removeAvatar}>Unequip</button>{/if}
          </div>
        </div>
      </article>

      <article class="profile-expression-editor__compact-card profile-expression-editor__compact-card--background">
        <input bind:this={backgroundInput} class="profile-expression-editor__compact-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose background image" on:change={handleBackgroundChange} />
        <button
          class="profile-expression-editor__compact-preview profile-expression-editor__compact-preview--background"
          type="button"
          disabled={busy}
          on:click={() => backgroundInput?.click()}
          aria-label={hasBackground ? 'Replace profile background' : 'Upload profile background'}
        >
          {#if backgroundSrc}
            <Media src={backgroundSrc} alt="Profile background preview" aspect="wide" loading="eager" className="profile-expression-editor__compact-media" fallbackLabel="Background unavailable" allowLocalPreview={true} />
          {:else}
            <ProfileMediaIcon kind="image" />
          {/if}
        </button>
        <div class="profile-expression-editor__compact-copy">
          <strong>Background</strong>
          <small>JPEG, PNG, or WebP · processed and stored as WebP</small>
          <div class="profile-expression-editor__compact-actions">
            <button type="button" class="profile-expression-editor__compact-replace" disabled={busy} on:click={() => backgroundInput?.click()}>{hasBackground ? 'Replace' : 'Upload background'}</button>
            {#if hasBackground}<button type="button" class="profile-expression-editor__compact-remove" disabled={busy} on:click={removeBackground}>Unequip</button>{/if}
          </div>
        </div>
      </article>

      {#if staff}
        <article class="profile-expression-editor__compact-card profile-expression-editor__compact-card--audio">
          <input bind:this={audioInput} class="profile-expression-editor__compact-file" type="file" accept="audio/mpeg,.mp3" aria-label="Choose profile audio" on:change={handleAudioChange} />
          {#if audioSrc}
            {#key audioSrc}
              <div class="profile-expression-editor__compact-audio-player">
                <audio
                  bind:this={audioElement}
                  class="profile-expression-editor__audio-native"
                  src={audioSrc}
                  loop
                  preload="metadata"
                  aria-label="Profile audio preview"
                  on:loadedmetadata={updateAudioMetadata}
                  on:timeupdate={updateAudioTime}
                  on:play={() => audioPlaying = true}
                  on:pause={() => audioPlaying = false}
                ></audio>
                <button type="button" class="profile-expression-editor__compact-audio-play" aria-label={audioPlaying ? 'Pause profile audio' : 'Play profile audio'} aria-pressed={audioPlaying} on:click={toggleAudio}>
                  <span aria-hidden="true">{audioPlaying ? 'Ⅱ' : '▶'}</span>
                </button>
                <div class="profile-expression-editor__compact-audio-track">
                  <div class="profile-expression-editor__compact-audio-meta"><strong>{audioPlaying ? 'Playing' : 'Ready to play'}</strong><time>{formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}</time></div>
                  <ProfileAudioWaveform src={audioSrc} progress={audioProgress} accent="var(--media-card-accent)" />
                  <input class="profile-expression-editor__audio-range" type="range" min="0" max="100" step="0.1" value={audioProgress} style={`--audio-progress:${audioProgress}%`} aria-label="Seek profile audio" on:input={seekAudio} />
                </div>
              </div>
            {/key}
          {:else}
            <button
              class="profile-expression-editor__compact-preview profile-expression-editor__compact-preview--audio"
              type="button"
              disabled={busy}
              on:click={() => audioInput?.click()}
              aria-label="Upload profile audio"
            >
              <ProfileMediaIcon kind="audio" />
            </button>
          {/if}
          <div class="profile-expression-editor__compact-copy">
            <strong>Profile audio</strong>
            <small>MP3 · reusable audio library / playlist support</small>
            <div class="profile-expression-editor__compact-actions">
              <button type="button" class="profile-expression-editor__compact-replace" disabled={busy} on:click={() => audioInput?.click()}>{hasAudio ? 'Replace' : 'Upload audio'}</button>
              {#if hasAudio}<button type="button" class="profile-expression-editor__compact-remove" disabled={busy} on:click={removeAudio}>Unequip</button>{/if}
            </div>
          </div>
        </article>
      {:else if !richMediaEnabled}
        <article class="profile-expression-editor__compact-card profile-expression-editor__compact-card--audio profile-expression-editor__compact-card--locked">
          <div class="profile-expression-editor__compact-preview profile-expression-editor__compact-preview--locked" aria-hidden="true">
            <ProfileMediaIcon kind="audio" />
            <small>Chromadie Plus</small>
          </div>
          <div class="profile-expression-editor__compact-copy">
            <strong>Profile audio</strong>
            <small>MP3 · reusable audio library / playlist support</small>
          </div>
        </article>
      {/if}

      {#if richMediaEnabled}
        <ProfileRichMediaEditor profileId={profileId} {config} {staff} {entitlements} compact={true} compactKinds={staff ? ['cursor'] : ['audio', 'cursor']} on:expressionchange={(event) => dispatch('expressionchange', event.detail)} />
      {:else}
        <article class="profile-expression-editor__compact-card profile-expression-editor__compact-card--cursor profile-expression-editor__compact-card--locked">
          <div class="profile-expression-editor__compact-preview profile-expression-editor__compact-preview--locked" aria-hidden="true">
            <ProfileMediaIcon kind="image" />
            <small>Chromadie Plus</small>
          </div>
          <div class="profile-expression-editor__compact-copy">
            <strong>Custom cursor</strong>
            <small>JPEG, PNG, WebP, or ANI</small>
          </div>
        </article>
      {/if}

      {#if avatarAssets.length > 0 || backgroundAssets.length > 0}
        <section class="profile-expression-editor__compact-library" aria-label="Saved media library">
          <div class="profile-expression-editor__compact-library-heading">
            <strong>Saved media</strong>
            <span>Unequip only removes an asset from the profile. Delete from library is permanent.</span>
          </div>
          <div class="profile-expression-editor__compact-library-list">
            {#each avatarAssets as asset (asset.id)}
              <div class="profile-expression-editor__compact-library-item">
                <Media
                  src={getProfileMediaUrl(asset.storage_provider === 'r2' ? { r2_public_key: asset.r2_public_key } : null)}
                  alt={asset.label || 'Saved avatar'}
                  aspect="square"
                  loading="lazy"
                  className="profile-expression-editor__compact-library-media"
                  fallbackLabel="Avatar unavailable"
                />
                <div class="profile-expression-editor__compact-library-copy">
                  <strong>{asset.label || 'Saved avatar'}</strong>
                  <span>{asset.id === expression.avatar_asset_id ? 'Active avatar' : 'Saved avatar'}</span>
                </div>
                <button type="button" class="profile-expression-editor__compact-library-delete" disabled={busy} on:click={() => deleteAsset(asset)}>Delete from library</button>
              </div>
            {/each}
            {#each backgroundAssets as asset (asset.id)}
              <div class="profile-expression-editor__compact-library-item">
                <Media
                  src={getProfileMediaUrl(asset.storage_provider === 'r2' ? { r2_public_key: asset.r2_public_key } : null)}
                  alt={asset.label || 'Saved background'}
                  aspect="wide"
                  loading="lazy"
                  className="profile-expression-editor__compact-library-media profile-expression-editor__compact-library-media--wide"
                  fallbackLabel="Background unavailable"
                />
                <div class="profile-expression-editor__compact-library-copy">
                  <strong>{asset.label || 'Saved background'}</strong>
                  <span>{asset.id === expression.background_asset_id ? 'Active background' : 'Saved background'}</span>
                </div>
                <button type="button" class="profile-expression-editor__compact-library-delete" disabled={busy} on:click={() => deleteAsset(asset)}>Delete from library</button>
              </div>
            {/each}
          </div>
        </section>
      {/if}

    </div>
  {/if}

  {#if compact}
    <section class="profile-expression-editor__compact-spotify" aria-labelledby="profile-expression-editor__compact-spotify-title">
      <div class="profile-expression-editor__compact-spotify-heading">
        <h3 id="profile-expression-editor__compact-spotify-title">Spotify</h3>
        <p>Track, playlist, or album URLs from open.spotify.com are supported.</p>
      </div>
      <div class="profile-expression-editor__compact-spotify-row">
        <input bind:value={spotifyUrl} type="url" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/..." />
        <button type="button" class="profile-expression-editor__compact-spotify-save" disabled={busy} on:click={saveSpotify}>{expression.spotify_id ? 'Update Spotify' : 'Save Spotify'}</button>
        {#if expression.spotify_id}<button type="button" class="profile-expression-editor__compact-spotify-remove" disabled={busy} on:click={() => { spotifyUrl = ''; void saveSpotify(); }}>Remove</button>{/if}
      </div>
    </section>
  {/if}

  {#if !compact}
  <details class="profile-expression-editor__advanced" open>
  {#if assetsLoading}<p class="profile-expression-editor__asset-loading" role="status">Loading your saved media…</p>{/if}
  <div id="profile-media-avatar" class="profile-expression-editor__media-row" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
    <div class="profile-expression-editor__preview" style="flex:0 0 7rem;width:7rem" aria-label="Avatar preview">
      {#if avatarSrc}
        <Media src={avatarSrc} alt="Avatar preview" aspect="square" loading="eager" className="profile-expression-editor__avatar" fallbackLabel="Avatar unavailable" allowLocalPreview={true} />
      {:else}
        <div class="profile-expression-editor__avatar profile-expression-editor__avatar--fallback" style="display:grid;place-items:center;width:7rem;aspect-ratio:1;border-radius:50%;background:var(--profile-accent);color:var(--color-ink-strong);font-size:2.8rem" aria-label="Initials fallback">{fallbackInitial.slice(0, 1).toUpperCase() || '✦'}</div>
      {/if}
    </div>
    <div class="profile-expression-editor__copy" style="display:grid;gap:.5rem;min-width:12rem;flex:1">
      <strong>{hasAvatar ? 'Avatar is visible' : 'Initials fallback is active'}</strong>
      <p>JPEG, PNG, or WebP · up to {formatInputLimit(avatarRules.maxInputBytes)} input; stored as WebP up to {avatarRules.outputLabel}.</p>
      <div class="profile-expression-editor__actions">
        <input bind:this={avatarInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose avatar image" on:change={handleAvatarChange} />
        <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => avatarInput?.click()}>{hasAvatar ? 'Replace avatar' : 'Upload avatar'}</button>
        {#if hasAvatar}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeAvatar}>Unequip</button>{/if}
      </div>
    </div>
  </div>

  {#if avatarAssets.length > 0}
    <div class="profile-expression-editor__asset-library" aria-label="Saved avatar assets">
      <div class="profile-expression-editor__asset-heading">
        <strong>Saved avatars</strong>
        <span>{avatarAssets.length} in your library</span>
      </div>
      <div class="profile-expression-editor__asset-grid">
        {#each avatarAssets as asset (asset.id)}
          <div class="profile-expression-editor__asset" class:profile-expression-editor__asset--active={asset.storage_path === expression.avatar_path || asset.id === expression.avatar_asset_id}>
            <button type="button" class="profile-expression-editor__asset-select" aria-label={`Use ${asset.label || 'saved avatar'}`} disabled={busy} on:click={() => selectAsset('avatar', asset)}>
              <Media src={getProfileMediaUrl(asset.storage_provider === 'r2' ? { r2_public_key: asset.r2_public_key } : null)} alt={asset.label || 'Saved avatar'} aspect="square" loading="lazy" className="profile-expression-editor__asset-media" fallbackLabel="Avatar unavailable" />
            </button>
            <div class="profile-expression-editor__asset-meta">
              <span>{asset.storage_path === expression.avatar_path || asset.id === expression.avatar_asset_id ? 'Active' : (asset.label || 'Saved avatar')}</span>
              <button type="button" class="profile-expression-editor__asset-remove" disabled={busy} on:click={() => deleteAsset(asset)}>Delete from library</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div id="profile-media-background" class="profile-expression-editor__section" style="display:grid;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-line-subtle)">
    <div>
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
        <strong>{hasBackground ? 'Background is visible' : 'Generated atmosphere is active'}</strong>
        <p>JPEG, PNG, or WebP · up to {formatInputLimit(backgroundRules.maxInputBytes)} input; stored as WebP up to {backgroundRules.outputLabel}.</p>
        <div class="profile-expression-editor__actions">
          <input bind:this={backgroundInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose background image" on:change={handleBackgroundChange} />
          <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => backgroundInput?.click()}>{hasBackground ? 'Replace background' : 'Upload background'}</button>
          {#if hasBackground}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeBackground}>Unequip</button>{/if}
        </div>
      </div>
    </div>
    {#if backgroundAssets.length > 0}
      <div class="profile-expression-editor__asset-library" aria-label="Saved background assets">
        <div class="profile-expression-editor__asset-heading">
          <strong>Saved backgrounds</strong>
          <span>{backgroundAssets.length} in your library</span>
        </div>
        <div class="profile-expression-editor__asset-grid profile-expression-editor__asset-grid--background">
          {#each backgroundAssets as asset (asset.id)}
            <div class="profile-expression-editor__asset" class:profile-expression-editor__asset--active={asset.storage_path === expression.background_path || asset.id === expression.background_asset_id}>
              <button type="button" class="profile-expression-editor__asset-select" aria-label={`Use ${asset.label || 'saved background'}`} disabled={busy} on:click={() => selectAsset('background', asset)}>
                <Media src={getProfileMediaUrl(asset.storage_provider === 'r2' ? { r2_public_key: asset.r2_public_key } : null)} alt={asset.label || 'Saved background'} aspect="wide" loading="lazy" className="profile-expression-editor__asset-media" fallbackLabel="Background unavailable" />
              </button>
              <div class="profile-expression-editor__asset-meta">
                <span>{asset.storage_path === expression.background_path || asset.id === expression.background_asset_id ? 'Active' : (asset.label || 'Saved background')}</span>
                <button type="button" class="profile-expression-editor__asset-remove" disabled={busy} on:click={() => deleteAsset(asset)}>Delete from library</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if staff}
    <div id="profile-media-audio" class="profile-expression-editor__section profile-expression-editor__section--audio">
      <div>
        <p class="profile-expression-editor__eyebrow">Staff audio</p>
        <h3>Profile audio</h3>
        <p class="profile-expression-editor__section-copy">Upload an MP3 up to 5 MB for the public profile. It loops after playback starts and can autoplay when the browser allows it.</p>
      </div>
      <div class="profile-expression-editor__audio-block">
        {#if audioSrc}
          {#key audioSrc}
            <div class="profile-expression-editor__audio-player">
              <audio
                bind:this={audioElement}
                class="profile-expression-editor__audio-native"
                src={audioSrc}
                loop
                preload="metadata"
                aria-label="Profile audio preview"
                on:loadedmetadata={updateAudioMetadata}
                on:timeupdate={updateAudioTime}
                on:play={() => audioPlaying = true}
                on:pause={() => audioPlaying = false}
              ></audio>
              <button type="button" class="profile-expression-editor__audio-play" aria-label={audioPlaying ? 'Pause profile audio' : 'Play profile audio'} aria-pressed={audioPlaying} on:click={toggleAudio}>
                <span aria-hidden="true">{audioPlaying ? 'Ⅱ' : '▶'}</span>
              </button>
              <div class="profile-expression-editor__audio-track">
                <div class="profile-expression-editor__audio-meta"><strong>{audioPlaying ? 'Playing profile audio' : 'Profile audio preview'}</strong><time>{formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}</time></div>
                <input class="profile-expression-editor__audio-range" type="range" min="0" max="100" step="0.1" value={audioProgress} style={`--audio-progress:${audioProgress}%`} aria-label="Seek profile audio" on:input={seekAudio} />
              </div>
            </div>
          {/key}
        {:else}
          <p class="profile-expression-editor__audio-empty">No profile audio configured.</p>
        {/if}
        <p class="profile-expression-editor__audio-limit">MP3 only · up to 5 MB.</p>
        <div class="profile-expression-editor__actions">
          <input bind:this={audioInput} class="profile-expression-editor__file" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)" type="file" accept="audio/mpeg,.mp3" aria-label="Choose profile audio" on:change={handleAudioChange} />
          <button type="button" class="profile-expression-editor__button" style={actionButtonStyle} disabled={busy} on:click={() => audioInput?.click()}>{hasAudio ? 'Replace audio' : 'Upload audio'}</button>
          {#if hasAudio}<button type="button" class="profile-expression-editor__button profile-expression-editor__button--quiet" style={quietButtonStyle} disabled={busy} on:click={removeAudio}>Unequip</button>{/if}
        </div>
      </div>
    </div>
  {/if}

  <div id="profile-media-music" class="profile-expression-editor__section" style="display:grid;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-line-subtle)">
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

  <div id={!compact ? 'profile-media-rich' : undefined}>
    {#if !compact && richMediaEnabled}
      <ProfileRichMediaEditor profileId={profileId} {config} {staff} {entitlements} on:expressionchange={(event) => dispatch('expressionchange', event.detail)} />
    {:else if !compact}
      <div class="profile-expression-editor__rollout-notice" role="status">
        Rich media cosmetics are temporarily paused while this rollout is verified. Your image-based profile remains available.
      </div>
    {/if}
  </div>

  </details>
  {/if}

  {#if error}<p class="profile-expression-editor__message profile-expression-editor__message--error" style="margin:0" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-expression-editor__message" style="margin:0" role="status" aria-live="polite">{status}</p>{/if}
</Module>

<style>
  .profile-expression-editor__compact-grid {
    --media-surface: var(--surface, #161619);
    --media-surface-inset: var(--surface-3, #28282c);
    --media-surface-deep: var(--surface, #161619);
    --media-text-primary: var(--text, #f5f5f6);
    --media-text-secondary: var(--text-muted, #8d8c92);
    --media-text-muted: var(--text-muted, #8d8c92);
    --media-text-faint: var(--text-faint, #59585e);
    --media-line: var(--border, rgba(255, 255, 255, .09));
    --media-line-strong: var(--border, rgba(255, 255, 255, .09));
    --media-focus: var(--studio-accent, var(--white, #ffffff));
    --media-teal: var(--white, #ffffff);
    --media-sky: #d5d6da;
    --media-peach: #bfc0c5;
    --media-green: #92939a;
    --media-red: #ff5578;
    --media-premium: #8f9099;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 10px;
    color: var(--media-text-primary);
    font-family: var(--customize-font-body, var(--font-body-stack, sans-serif));
  }

  :global(.profile-expression-editor) { display: grid; gap: .65rem; }
  .profile-expression-editor__compact-grid :global(.rich-media-editor--compact),
  .profile-expression-editor__compact-grid :global(.rich-media-editor--compact > .foundation-module__body) { display: contents; }
  .profile-expression-editor__compact-grid :global(.rich-media-editor--compact .rich-media-editor__advanced) { grid-column: 1 / -1; order: 5; }

  .profile-expression-editor__compact-card {
    --media-card-accent: var(--media-teal);
    display: grid;
    align-content: start;
    gap: 0;
    min-width: 0;
    grid-template-rows: 115px auto;
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--media-line);
    border-radius: 9px;
    background: var(--media-surface-inset);
  }

  .profile-expression-editor__compact-card--background { order: 1; --media-card-accent: var(--media-sky); }
  .profile-expression-editor__compact-card--avatar { order: 2; --media-card-accent: var(--media-teal); }
  .profile-expression-editor__compact-card--audio { order: 3; --media-card-accent: var(--media-peach); }
  .profile-expression-editor__compact-card--cursor { order: 4; --media-card-accent: var(--media-green); }
  .profile-expression-editor__compact-card--locked { --media-card-accent: var(--media-premium); opacity: 1; }
  .profile-expression-editor__compact-file { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); }
  .profile-expression-editor__compact-preview {
    position: relative;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: .5rem;
    width: 100%;
    height: 115px;
    min-height: 115px;
    aspect-ratio: auto;
    overflow: hidden;
    padding: 0;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    border-radius: 0;
    background: rgba(0, 0, 0, .22);
    color: var(--media-text-secondary);
    font: inherit;
    line-height: 1.2;
    cursor: pointer;
  }

  .profile-expression-editor__compact-preview:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, .08);
    background: rgba(0, 0, 0, .22);
  }

  .profile-expression-editor__compact-preview--locked { align-content: center; gap: .35rem; padding: 0; border-color: rgba(255, 255, 255, .08); background: rgba(0, 0, 0, .22); cursor: default; }
  .profile-expression-editor__compact-preview:disabled { cursor: wait; opacity: .72; }
  .profile-expression-editor__compact-preview:focus-visible { outline: 2px solid var(--media-focus); outline-offset: 2px; }
  :global(.profile-expression-editor__compact-preview .profile-media-icon) { color: var(--media-card-accent); }
  :global(.profile-expression-editor__compact-preview--locked .profile-media-icon) { color: var(--media-premium); }
  .profile-expression-editor__compact-preview--avatar { border-color: var(--media-line); }
  .profile-expression-editor__compact-card--avatar .profile-expression-editor__compact-preview { aspect-ratio: auto; min-height: 115px; }
  .profile-expression-editor__compact-avatar-frame {
    display: block;
    width: 5.5rem;
    height: 5.5rem;
    flex: 0 0 5.5rem;
    overflow: hidden;
    aspect-ratio: 1;
    border: 1px solid var(--media-line-strong);
    border-radius: 50%;
    background: var(--media-surface-deep);
  }
  :global(.profile-expression-editor__compact-avatar-frame .foundation-media) {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    min-width: 0;
    min-height: 0;
    aspect-ratio: 1;
    border: 0 !important;
    border-radius: 50% !important;
    background: transparent;
  }
  :global(.profile-expression-editor__compact-avatar-frame .foundation-media img) {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    display: block;
    border: 0 !important;
    border-radius: 50% !important;
    object-fit: cover;
  }
  :global(.profile-expression-editor__compact-avatar-frame .foundation-media__fallback) {
    min-height: 0;
    border: 0;
    border-radius: 50%;
  }
  :global(.profile-expression-editor__compact-preview .profile-expression-editor__compact-media.foundation-media),
  :global(.profile-expression-editor__compact-preview .profile-expression-editor__compact-media.foundation-media img),
  :global(.profile-expression-editor__compact-preview .foundation-media),
  :global(.profile-expression-editor__compact-preview .foundation-media img) { width: 100%; height: 100%; aspect-ratio: auto; border: 0 !important; border-radius: 0; outline: 0; box-shadow: none; }
  /* The circular avatar frame above owns avatar media geometry. */
  :global(.profile-expression-editor__compact-preview .profile-media-icon) { width: 2.35rem; height: 2.35rem; }
  :global(.profile-expression-editor__compact-media .foundation-media__fallback) { min-height: 0; }
  .profile-expression-editor__compact-copy { display: grid; align-content: start; gap: 4px; min-width: 0; order: 2; padding: 11px; }
  .profile-expression-editor__compact-copy strong { display: block; overflow: visible; color: var(--media-text-primary); font: 600 .73rem/1.2 'Inter', var(--font-body-stack, sans-serif); letter-spacing: 0; white-space: normal; }
  .profile-expression-editor__compact-preview small { overflow: hidden; color: #6d6e76; font: 400 .59rem/1.4 'Inter', var(--font-body-stack, sans-serif); text-overflow: ellipsis; white-space: nowrap; }
  .profile-expression-editor__compact-preview--locked small { color: var(--media-premium); font-weight: 600; }
  .profile-expression-editor__compact-actions { display: flex; flex-wrap: wrap; gap: .4rem; min-width: 0; }
  .profile-expression-editor__compact-replace,
  .profile-expression-editor__compact-remove { min-height: 1.8rem; padding: .28rem .65rem; border: 1px solid var(--media-line-strong); border-radius: .28rem; background: transparent; color: var(--media-text-secondary); font: 600 .75rem/1 var(--customize-font-body, var(--font-body-stack, sans-serif)); cursor: pointer; }
  .profile-expression-editor__compact-replace:hover:not(:disabled),
  .profile-expression-editor__compact-replace:focus-visible { border-color: var(--media-card-accent); background: color-mix(in srgb, var(--media-card-accent) 10%, transparent); color: var(--media-text-primary); }
  .profile-expression-editor__compact-remove { border-color: color-mix(in srgb, var(--media-red) 55%, var(--media-line)); color: color-mix(in srgb, var(--media-red) 84%, var(--media-text-secondary)); }
  .profile-expression-editor__compact-remove:hover:not(:disabled),
  .profile-expression-editor__compact-remove:focus-visible { border-color: var(--media-red); background: color-mix(in srgb, var(--media-red) 10%, transparent); color: var(--media-red); }
  .profile-expression-editor__compact-replace:focus-visible,
  .profile-expression-editor__compact-remove:focus-visible { outline: 2px solid var(--media-focus); outline-offset: 2px; }
  .profile-expression-editor__compact-replace:disabled,
  .profile-expression-editor__compact-remove:disabled { cursor: wait; opacity: .55; }
  .profile-expression-editor__compact-library { grid-column: 1 / -1; display: grid; gap: .55rem; padding: .7rem; border: 1px solid var(--media-line); border-radius: var(--media-radius, .38rem); background: color-mix(in srgb, var(--media-surface-inset) 82%, transparent); }
  .profile-expression-editor__compact-library-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; min-width: 0; color: var(--media-text-primary); }
  .profile-expression-editor__compact-library-heading strong { font-size: .86rem; font-weight: 650; }
  .profile-expression-editor__compact-library-heading span { color: var(--media-text-muted); font-size: .72rem; }
  .profile-expression-editor__compact-library-list { display: grid; gap: .45rem; }
  .profile-expression-editor__compact-library-item { display: grid; grid-template-columns: 3.25rem minmax(0, 1fr) auto; align-items: center; gap: .6rem; min-width: 0; padding: .35rem; border: 1px solid var(--media-line); border-radius: .3rem; background: var(--media-surface-deep); }
  :global(.profile-expression-editor__compact-library-media) { width: 3.25rem; height: 3.25rem; overflow: hidden; border-radius: .24rem; }
  :global(.profile-expression-editor__compact-library-media--wide) { height: 2.2rem; }
  .profile-expression-editor__compact-library-copy { display: grid; gap: .12rem; min-width: 0; }
  .profile-expression-editor__compact-library-copy strong,
  .profile-expression-editor__compact-library-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-expression-editor__compact-library-copy strong { color: var(--media-text-primary); font-size: .78rem; font-weight: 600; }
  .profile-expression-editor__compact-library-copy span { color: var(--media-text-muted); font-size: .7rem; }
  .profile-expression-editor__compact-library-delete { min-height: 1.8rem; padding: .28rem .6rem; border: 1px solid color-mix(in srgb, var(--media-red) 55%, var(--media-line)); border-radius: .28rem; background: transparent; color: color-mix(in srgb, var(--media-red) 84%, var(--media-text-secondary)); font: 600 .72rem/1 var(--customize-font-body, var(--font-body-stack, sans-serif)); cursor: pointer; }
  .profile-expression-editor__compact-library-delete:hover:not(:disabled),
  .profile-expression-editor__compact-library-delete:focus-visible { border-color: var(--media-red); background: color-mix(in srgb, var(--media-red) 10%, transparent); color: var(--media-red); }
  .profile-expression-editor__compact-library-delete:focus-visible { outline: 2px solid var(--media-focus); outline-offset: 2px; }
  .profile-expression-editor__compact-library-delete:disabled { cursor: wait; opacity: .55; }
  .profile-expression-editor__compact-audio-player { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .55rem; width: 100%; min-height: 5.7rem; aspect-ratio: 10 / 3; padding: .6rem .65rem; border: 1px solid var(--media-line); border-radius: .35rem; background: var(--media-surface-inset); }
  .profile-expression-editor__compact-audio-play { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; flex: 0 0 auto; border: 1px solid color-mix(in srgb, var(--media-card-accent) 58%, var(--media-line-strong)); border-radius: 50%; background: color-mix(in srgb, var(--media-card-accent) 13%, transparent); color: var(--media-text-primary); font: 700 .72rem/1 var(--customize-font-body, var(--font-body-stack, sans-serif)); cursor: pointer; }
  .profile-expression-editor__compact-audio-play:hover { border-color: var(--media-card-accent); background: color-mix(in srgb, var(--media-card-accent) 24%, transparent); }
  .profile-expression-editor__compact-audio-play:focus-visible { outline: 2px solid var(--media-focus); outline-offset: 2px; }
  .profile-expression-editor__compact-audio-track { display: grid; min-width: 0; gap: .35rem; }
  .profile-expression-editor__compact-audio-meta { display: flex; align-items: center; justify-content: space-between; gap: .5rem; min-width: 0; }
  .profile-expression-editor__compact-audio-meta strong { overflow: hidden; color: color-mix(in srgb, var(--media-card-accent) 76%, var(--media-text-primary)); font-size: .78rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .profile-expression-editor__compact-audio-meta time { flex: 0 0 auto; color: var(--media-text-muted); font: 600 .72rem/1 var(--customize-font-mono, var(--font-mono-stack, ui-monospace, monospace)); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--media-card-accent) var(--audio-progress), color-mix(in srgb, var(--media-text-muted) 26%, transparent) var(--audio-progress)); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range::-moz-range-track { background: color-mix(in srgb, var(--media-text-muted) 26%, transparent); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range::-moz-range-progress { background: var(--media-card-accent); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range::-webkit-slider-thumb { box-shadow: 0 0 0 .18rem color-mix(in srgb, var(--media-focus) 34%, transparent); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range::-moz-range-thumb { box-shadow: 0 0 0 .18rem color-mix(in srgb, var(--media-focus) 34%, transparent); }
  .profile-expression-editor__compact-audio-player .profile-expression-editor__audio-range:focus-visible { outline-color: var(--media-focus); }

  .profile-expression-editor__advanced { margin-top: .15rem; padding-top: .75rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-expression-editor__rollout-notice { margin: 0; padding: .8rem 1rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.45; }
  .profile-expression-editor__asset-loading { margin: 0 0 0.8rem; color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-expression-editor__asset-library { display: grid; gap: 0.65rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-expression-editor__asset-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-expression-editor__asset-heading span { color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-expression-editor__asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); gap: 0.65rem; max-width: 34rem; }
  .profile-expression-editor__asset-grid--background { grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); max-width: 42rem; }
  .profile-expression-editor__asset { min-width: 0; padding: 0.35rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--surface-inset) 76%, transparent); }
  .profile-expression-editor__asset--active { border-color: var(--color-accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 22%, transparent); }
  .profile-expression-editor__asset-select { display: block; width: 100%; padding: 0; border: 0; border-radius: calc(var(--radius-sm) - 0.15rem); background: transparent; cursor: pointer; }
  .profile-expression-editor__asset-select:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 2px; }
  :global(.profile-expression-editor__asset-media) { width: 100%; overflow: hidden; border-radius: calc(var(--radius-sm) - 0.2rem); }
  .profile-expression-editor__asset-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.45rem; min-width: 0; padding: 0.35rem 0.15rem 0.1rem; color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-expression-editor__asset-meta > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-expression-editor__asset-remove { flex: 0 0 auto; padding: 0; border: 0; background: transparent; color: var(--color-ink-faint); font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 0.15em; }
  .profile-expression-editor__asset-remove:hover:not(:disabled), .profile-expression-editor__asset-remove:focus-visible { color: var(--color-ink-strong); }
  .profile-expression-editor__asset-remove:disabled { cursor: wait; opacity: 0.55; }

  .profile-expression-editor__section--audio {
    display: grid;
    gap: 0.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-line-subtle);
  }

  .profile-expression-editor__audio-block {
    display: grid;
    gap: 0.55rem;
    max-width: 42rem;
  }

  .profile-expression-editor__audio-player {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-inset);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .profile-expression-editor__audio-native {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .profile-expression-editor__audio-play {
    display: grid;
    width: 2.65rem;
    height: 2.65rem;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--color-accent) 58%, transparent);
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-ink-strong);
    font: 700 0.78rem / 1 var(--font-body-stack);
    cursor: pointer;
    transition: background-color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard);
  }

  .profile-expression-editor__audio-play:hover,
  .profile-expression-editor__audio-play:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 32%, transparent);
  }

  .profile-expression-editor__audio-play:hover { transform: translateY(-1px); }
  .profile-expression-editor__audio-play:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }

  .profile-expression-editor__audio-track { display: grid; min-width: 0; gap: 0.5rem; }
  .profile-expression-editor__audio-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-width: 0; }
  .profile-expression-editor__audio-meta strong { overflow: hidden; color: var(--color-ink-strong); font-size: var(--type-small); text-overflow: ellipsis; white-space: nowrap; }
  .profile-expression-editor__audio-meta time { flex: 0 0 auto; color: var(--color-ink-muted); font: 600 var(--type-label) / 1 var(--font-mono-stack); }

  .profile-expression-editor__audio-range {
    width: 100%;
    height: 0.9rem;
    margin: 0;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  .profile-expression-editor__audio-range::-webkit-slider-runnable-track {
    height: 0.22rem;
    border-radius: 999px;
    background: linear-gradient(to right, var(--color-accent-bright) var(--audio-progress), rgba(255, 255, 255, 0.14) var(--audio-progress));
  }

  .profile-expression-editor__audio-range::-moz-range-track {
    height: 0.22rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
  }

  .profile-expression-editor__audio-range::-moz-range-progress { height: 0.22rem; border-radius: 999px; background: var(--color-accent-bright); }
  .profile-expression-editor__audio-range::-webkit-slider-thumb { width: 0.72rem; height: 0.72rem; margin-top: -0.25rem; appearance: none; border: 0; border-radius: 50%; background: var(--color-ink-strong); box-shadow: 0 0 0 0.18rem color-mix(in srgb, var(--color-accent) 34%, transparent); }
  .profile-expression-editor__audio-range::-moz-range-thumb { width: 0.72rem; height: 0.72rem; border: 0; border-radius: 50%; background: var(--color-ink-strong); box-shadow: 0 0 0 0.18rem color-mix(in srgb, var(--color-accent) 34%, transparent); }
  .profile-expression-editor__audio-range:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }

  .profile-expression-editor__audio-empty,
  .profile-expression-editor__audio-limit { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.45; }

  @media (max-width: 52rem) {
    .profile-expression-editor__compact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-expression-editor__compact-library-item { grid-template-columns: 3rem minmax(0, 1fr); }
    .profile-expression-editor__compact-library-delete { grid-column: 2; justify-self: start; }
  }

  @media (max-width: 24rem) {
    .profile-expression-editor__compact-grid { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 34rem) {
    .profile-expression-editor__audio-player { grid-template-columns: auto minmax(0, 1fr); padding: 0.65rem; }
    .profile-expression-editor__audio-meta { align-items: flex-start; flex-direction: column; gap: 0.3rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-expression-editor__audio-play { transition: none; }
    .profile-expression-editor__audio-play:hover { transform: none; }
  }
</style>
