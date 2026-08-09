<script>
  import { createEventDispatcher } from 'svelte';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import ProfileMediaIcon from './ProfileMediaIcon.svelte';
  import { supabase } from './supabase.js';
  import Module from './foundation/Module.svelte';
  import {
    PROFILE_RICH_MEDIA_KINDS,
    buildRichMediaStoragePath,
    extensionForRichMedia,
    formatRichMediaBytes,
    getRichMediaStorageRef,
    normalizeRichMediaConfig,
    validateRichMediaFile
  } from './profileRichMedia.js';
  import { prepareProfileAudioFile, processProfileRichImage } from './profileMediaProcessing.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let profileId = null;
  export let config = {};
  export let staff = false;
  export let entitlements = [];
  export let compact = false;
  export let compactKinds = ['audio', 'cursor'];

  const dispatch = createEventDispatcher();
  const actionButtonStyle = 'display:inline-flex;align-items:center;justify-content:center;min-height:2.45rem;border:1px solid transparent;border-radius:var(--radius-sm);padding:0 .8rem;background:var(--color-ink-strong);color:var(--color-canvas-deep);font:600 var(--type-small)/1 var(--font-body-stack);cursor:pointer';
  const quietButtonStyle = 'display:inline-flex;align-items:center;justify-content:center;min-height:2.45rem;border:1px solid var(--color-line-subtle);border-radius:var(--radius-sm);padding:0 .8rem;background:transparent;color:var(--color-ink-muted);font:600 var(--type-small)/1 var(--font-body-stack);cursor:pointer';
  const fieldStyle = 'width:100%;min-height:2.3rem;min-width:0;border:1px solid var(--color-line-subtle);border-radius:var(--radius-sm);padding:0 .6rem;background:var(--surface-inset);color:var(--color-ink-strong);font:500 var(--type-small)/1 var(--font-body-stack)';

  let assets = [];
  let loading = false;
  let busy = false;
  let status = '';
  let error = '';
  let cacheKey = String(Date.now());
  let incomingKey = '';
  let richConfig = normalizeRichMediaConfig();
  let audioTracks = [];
  let audioShuffle = false;
  let audioLoop = true;
  let audioAutoplay = false;
  let audioVolume = 0.75;
  let audioControls = true;
  let loadedAssetKey = '';
  let videoInput;
  let bannerInput;
  let cursorInput;
  let pointerCursorInput;
  let audioInput;

  $: hasAccess = staff || hasChromadiePlus(entitlements);
  $: assetAccessKey = `${profileId || ''}:${hasAccess ? 'rich' : 'free'}`;
  // Entitlements can arrive after the lazy Media section mounts. Load the
  // private library when access becomes authoritative, not only on mount.
  $: if (profileId && hasAccess && assetAccessKey !== loadedAssetKey) {
    void loadAssets(assetAccessKey);
  }
  $: incomingConfig = normalizeRichMediaConfig(config?.draft || config?.published || {});
  $: nextIncomingKey = `${profileId || ''}:${JSON.stringify(incomingConfig)}`;
  $: if (!busy && nextIncomingKey !== incomingKey) syncIncoming(incomingConfig, nextIncomingKey);
  $: activeAssets = assets.filter(asset => asset.status === 'active');
  $: videoAssets = activeAssets.filter(asset => asset.kind === 'background_video');
  $: bannerAssets = activeAssets.filter(asset => asset.kind === 'banner');
  $: cursorAssets = activeAssets.filter(asset => asset.kind === 'cursor');
  $: pointerCursorAssets = activeAssets.filter(asset => asset.kind === 'pointer_cursor');
  $: audioAssets = activeAssets.filter(asset => asset.kind === 'audio');
  $: activeBackgroundVideo = assetForPath(richConfig.background_video_path);
  $: activeBanner = assetForPath(richConfig.banner_path);
  $: activeCursor = assetForPath(richConfig.cursor_path);
  $: activePointerCursor = assetForPath(richConfig.pointer_cursor_path);
  $: primaryAudioTrack = audioTracks[0] || null;
  $: primaryAudioAsset = primaryAudioTrack ? assetForPath(primaryAudioTrack.path) : null;

  function syncIncoming(next, key) {
    richConfig = next;
    audioShuffle = next.audio_playlist.shuffle;
    audioLoop = next.audio_playlist.loop;
    audioAutoplay = next.audio_playlist.autoplay;
    audioVolume = next.audio_playlist.volume;
    audioControls = next.audio_playlist.controls;
    audioTracks = next.audio_playlist.tracks.map(track => ({ ...track, asset_id: assets.find(asset => asset.storage_path === track.path)?.id || '' }));
    incomingKey = key;
  }

  function setFeedback(nextError = '', nextStatus = '') {
    error = nextError;
    status = nextStatus;
  }

  async function loadAssets(requestKey = '') {
    if (!profileId || !hasAccess) return;
    if (requestKey) loadedAssetKey = requestKey;
    loading = true;
    const { data, error: loadError } = await supabase
      .from('profile_media_assets')
      .select('id, kind, storage_path, label, status, mime_type, byte_size, duration_ms, width, height, metadata, created_at')
      .eq('user_id', profileId)
      .in('kind', PROFILE_RICH_MEDIA_KINDS)
      .order('created_at', { ascending: false });
    loading = false;
    if (loadError) {
      setFeedback(loadError.message || 'The rich media library could not be loaded.');
      return;
    }
    assets = (data || []).filter(asset => asset.status === 'active');
    syncIncoming(incomingConfig, nextIncomingKey);
  }

  function createAssetId() {
    if (typeof crypto?.randomUUID !== 'function') throw new Error('This browser cannot create a secure media asset ID.');
    return crypto.randomUUID();
  }

  function assetForPath(path) {
    return assets.find(asset => asset.storage_path === path) || null;
  }

  function readMediaDuration(file, kind) {
    if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined' || typeof window === 'undefined') return Promise.resolve(0);
    const element = document.createElement(kind === 'audio' ? 'audio' : 'video');
    const sourceUrl = URL.createObjectURL(file);
    element.preload = 'metadata';
    element.src = sourceUrl;
    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(sourceUrl);
        resolve(Number.isFinite(value) ? Math.min(86400000, Math.max(0, Math.round(value * 1000))) : 0);
      };
      element.onloadedmetadata = () => finish(element.duration);
      element.onerror = () => finish(0);
      window.setTimeout(() => finish(0), 4000);
    });
  }

  function selectedAssetId(kind) {
    const field = kind === 'background_video' ? 'background_video_path' : `${kind}_path`;
    return assetForPath(richConfig[field])?.id || null;
  }

  function audioConfigPayload() {
    return {
      tracks: audioTracks.map((track, index) => ({
        asset_id: track.asset_id || assetForPath(track.path)?.id,
        trim_start_ms: Number(track.trim_start_ms) || 0,
        trim_end_ms: Number(track.trim_end_ms) || Number(track.duration_ms) || 0,
        order: index
      })).filter(track => track.asset_id),
      shuffle: audioShuffle,
      loop: audioLoop,
      autoplay: audioAutoplay,
      volume: Number(audioVolume),
      controls: audioControls
    };
  }

  async function saveSelection(next = {}) {
    const { data, error: rpcError } = await supabase.rpc('select_my_profile_rich_media', {
      p_background_video_id: next.background_video_id === undefined ? selectedAssetId('background_video') : next.background_video_id,
      p_banner_id: next.banner_id === undefined ? selectedAssetId('banner') : next.banner_id,
      p_cursor_id: next.cursor_id === undefined ? selectedAssetId('cursor') : next.cursor_id,
      p_pointer_cursor_id: next.pointer_cursor_id === undefined ? selectedAssetId('pointer_cursor') : next.pointer_cursor_id,
      p_audio_config: next.audio_config || audioConfigPayload()
    });
    if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'The rich media selection could not be saved.');
    richConfig = normalizeRichMediaConfig(data);
    incomingKey = `${profileId || ''}:${JSON.stringify(richConfig)}`;
    cacheKey = String(Date.now());
    dispatch('expressionchange', richConfig);
    return data;
  }

  async function selectAsset(kind, asset, force = false) {
    if (!asset || (busy && !force)) return;
    busy = true;
    setFeedback('', `Applying ${asset.label || kind.replace('_', ' ')}…`);
    try {
      if (kind === 'audio') {
        if (audioTracks.some(track => track.asset_id === asset.id)) return;
        if (audioTracks.length >= 5) throw new Error('You can select up to five audio tracks.');
        audioTracks = [...audioTracks, { asset_id: asset.id, path: asset.storage_path, label: asset.label || `Track ${audioTracks.length + 1}`, duration_ms: asset.duration_ms || 0, trim_start_ms: 0, trim_end_ms: asset.duration_ms || 0 }];
        await saveSelection({ audio_config: audioConfigPayload() });
      } else {
        const field = kind === 'background_video' ? 'background_video_path' : `${kind}_path`;
        const idField = kind === 'background_video' ? 'background_video_id' : `${kind}_id`;
        richConfig = { ...richConfig, [field]: asset.storage_path };
        await saveSelection({ [field]: asset.storage_path, [idField]: asset.id });
      }
      setFeedback('', `${kind === 'audio' ? 'Track' : kind.replace('_', ' ')} applied.`);
    } catch (selectionError) {
      setFeedback(selectionError instanceof Error ? selectionError.message : 'The media selection could not be saved.');
    } finally {
      busy = false;
    }
  }

  async function removeAsset(asset) {
    if (!asset?.id || busy) return;
    busy = true;
    setFeedback('', 'Removing rich media…');
    try {
      const { data, error: deleteError } = await supabase.rpc('delete_my_profile_media_asset', { p_asset_id: asset.id });
      if (deleteError || !data?.success) throw new Error(deleteError?.message || data?.error || 'The media asset could not be removed.');
      audioTracks = audioTracks.filter(track => track.asset_id !== asset.id);
      await loadAssets();
      const field = asset.kind === 'background_video' ? 'background_video_path' : `${asset.kind}_path`;
      if (richConfig[field] === asset.storage_path) richConfig = { ...richConfig, [field]: null };
      dispatch('expressionchange', richConfig);
      setFeedback('', 'Rich media removed from your library.');
    } catch (removeError) {
      setFeedback(removeError instanceof Error ? removeError.message : 'The media asset could not be removed.');
    } finally {
      busy = false;
    }
  }

  async function uploadFile(event, kind) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !profileId || busy) return;
    const inputError = validateRichMediaFile(file, kind);
    if (inputError) { setFeedback(inputError); return; }
    busy = true;
    setFeedback('', `Preparing ${kind.replace('_', ' ')}…`);
    try {
      let blob = file;
      let extension = extensionForRichMedia(kind, file);
      const metadata = {};
      if (['banner', 'cursor', 'pointer_cursor'].includes(kind)) {
        blob = await processProfileRichImage(file, kind);
        extension = 'webp';
        if (kind !== 'banner') {
          metadata.width = 128;
          metadata.height = 128;
        }
      } else if (kind === 'audio') {
        blob = await prepareProfileAudioFile(file);
        extension = 'mp3';
      }
      if (['audio', 'background_video'].includes(kind)) metadata.duration_ms = await readMediaDuration(file, kind);
      if (!extension) throw new Error('That file type is not supported.');
      const assetId = createAssetId();
      const storedPath = buildRichMediaStoragePath(kind, profileId, assetId, extension);
      const reference = getRichMediaStorageRef(storedPath);
      if (!reference) throw new Error('The rich media path could not be prepared.');
      const { data: staged, error: stageError } = await supabase.rpc('stage_my_profile_media_asset', {
        p_kind: kind,
        p_asset_id: assetId,
        p_extension: extension,
        p_byte_size: blob.size,
        p_label: file.name.replace(/\.[^.]+$/, '').slice(0, 80),
        p_metadata: metadata
      });
      if (stageError || !staged?.success) throw new Error(stageError?.message || staged?.error || 'The server could not stage this media.');
      const { error: uploadError } = await supabase.storage.from(reference.bucket).upload(reference.objectPath, blob, { contentType: blob.type || file.type, cacheControl: '31536000', upsert: false });
      if (uploadError) {
        await supabase.rpc('delete_my_profile_media_asset', { p_asset_id: staged.id });
        throw new Error(uploadError.message || 'The media upload failed.');
      }
      const { data: finalized, error: finalizeError } = await supabase.rpc('finalize_my_profile_media_asset', { p_asset_id: staged.id });
      if (finalizeError || !finalized?.success) throw new Error(finalizeError?.message || finalized?.error || 'The server could not verify this media.');
      await loadAssets();
      const created = { id: staged.id, kind, storage_path: storedPath, label: file.name.replace(/\.[^.]+$/, '').slice(0, 80), duration_ms: metadata.duration_ms || 0 };
      await selectAsset(kind, created, true);
      setFeedback('', `${kind.replace('_', ' ')} uploaded and selected.`);
    } catch (uploadError) {
      setFeedback(uploadError instanceof Error ? uploadError.message : 'The rich media upload failed.');
    } finally {
      busy = false;
    }
  }

  function updateTrack(trackId, field, value) {
    audioTracks = audioTracks.map(track => track.asset_id === trackId ? { ...track, [field]: Math.max(0, Number(value) || 0) } : track);
  }

  function moveTrack(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= audioTracks.length) return;
    const next = audioTracks.slice();
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    audioTracks = next;
  }

  async function saveAudioSettings() {
    if (busy) return;
    busy = true;
    setFeedback('', 'Saving audio settings…');
    try {
      await saveSelection({ audio_config: audioConfigPayload() });
      setFeedback('', 'Audio playlist settings saved.');
    } catch (saveError) {
      setFeedback(saveError instanceof Error ? saveError.message : 'Audio settings could not be saved.');
    } finally {
      busy = false;
    }
  }

</script>

{#if hasAccess}
  <Module size="wide" tone="quiet" className={compact ? 'rich-media-editor--compact' : ''} title="Rich media" description="Premium expression stays bounded, reusable, and server-verified.">
    {#if compact}
      {#if compactKinds.includes('audio')}
        <article class="rich-media-editor__compact-card">
          <button class="rich-media-editor__compact-preview rich-media-editor__compact-preview--audio" type="button" disabled={busy || audioTracks.length >= 5} on:click={() => audioInput?.click()} aria-label="Add audio track">
            <ProfileMediaIcon kind="audio" />
            <span class="rich-media-editor__compact-overlay" aria-hidden="true"><ProfileMediaIcon kind="upload" /></span>
            <span class="rich-media-editor__compact-upload-hint">{audioTracks.length >= 5 ? 'Library limit reached' : primaryAudioAsset ? `Click to add · ${audioTracks.length}/5` : 'Click to upload'}</span>
          </button>
          <div class="rich-media-editor__compact-copy">
            <strong>Audio</strong>
          </div>
        </article>
      {/if}

      {#if compactKinds.includes('cursor')}
        <article class="rich-media-editor__compact-card">
          <button class="rich-media-editor__compact-preview rich-media-editor__compact-preview--cursor" type="button" disabled={busy} on:click={() => cursorInput?.click()} aria-label={activeCursor ? 'Replace custom cursor' : 'Upload custom cursor'}>
            {#if activeCursor}
              <img src={getProfileMediaUrl(activeCursor.storage_path, cacheKey)} alt="Custom cursor preview" />
            {:else}
              <ProfileMediaIcon kind="cursor" />
            {/if}
            <span class="rich-media-editor__compact-overlay" aria-hidden="true"><ProfileMediaIcon kind="upload" /></span>
            <span class="rich-media-editor__compact-upload-hint">{activeCursor ? 'Click to replace' : 'Click to upload'}</span>
          </button>
          <div class="rich-media-editor__compact-copy">
            <strong>Custom cursor</strong>
          </div>
        </article>
      {/if}

    {/if}
    <details class:rich-media-editor__advanced={compact} open={!compact}>
      {#if compact}<summary>More expression controls <span aria-hidden="true">↘</span></summary>{/if}
    {#if loading}<p class="rich-media-editor__status" role="status">Loading your rich media library…</p>{/if}
    <p class="rich-media-editor__hint">Three muted background videos (MP4/WebM), five MP3 tracks, one banner, and two cursor styles. The library is capped at 150 MB.</p>

    <div class="rich-media-editor__upload-grid">
      <div class="rich-media-editor__upload-card">
        <div class="rich-media-editor__upload-preview rich-media-editor__upload-preview--wide">
          {#if activeBackgroundVideo}<video src={getProfileMediaUrl(activeBackgroundVideo.storage_path, cacheKey)} muted loop autoplay playsinline preload="metadata" aria-label="Active background video"></video>{:else}<span aria-hidden="true">▧</span><small>No video selected</small>{/if}
        </div>
        <strong>Background video</strong><small>Up to 25 MB each · autoplay is muted</small>
        <input bind:this={videoInput} type="file" accept="video/mp4,video/webm,.mp4,.webm" on:change={(event) => uploadFile(event, 'background_video')} />
        <button type="button" style={actionButtonStyle} disabled={busy} on:click={() => videoInput?.click()}>{activeBackgroundVideo ? 'Replace video' : 'Upload video'}</button>
      </div>
      <div class="rich-media-editor__upload-card">
        <div class="rich-media-editor__upload-preview rich-media-editor__upload-preview--wide">
          {#if activeBanner}<img src={getProfileMediaUrl(activeBanner.storage_path, cacheKey)} alt="Active profile banner" />{:else}<span aria-hidden="true">▬</span><small>No banner selected</small>{/if}
        </div>
        <strong>Banner</strong><small>Processed to bounded WebP</small>
        <input bind:this={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'banner')} />
        <button type="button" style={actionButtonStyle} disabled={busy} on:click={() => bannerInput?.click()}>{activeBanner ? 'Replace banner' : 'Upload banner'}</button>
      </div>
      <div class="rich-media-editor__upload-card">
        <div class="rich-media-editor__upload-preview rich-media-editor__upload-preview--cursor">
          {#if activeCursor}<img src={getProfileMediaUrl(activeCursor.storage_path, cacheKey)} alt="Active cursor" />{:else}<span aria-hidden="true">↖</span><small>No cursor selected</small>{/if}
        </div>
        <strong>Normal cursor</strong><small>WebP · 128×128 · 128 KB</small>
        <input bind:this={cursorInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'cursor')} />
        <button type="button" style={actionButtonStyle} disabled={busy} on:click={() => cursorInput?.click()}>{activeCursor ? 'Replace cursor' : 'Upload cursor'}</button>
      </div>
      <div class="rich-media-editor__upload-card">
        <div class="rich-media-editor__upload-preview rich-media-editor__upload-preview--cursor">
          {#if activePointerCursor}<img src={getProfileMediaUrl(activePointerCursor.storage_path, cacheKey)} alt="Active pointer cursor" />{:else}<span aria-hidden="true">✦</span><small>No pointer selected</small>{/if}
        </div>
        <strong>Pointer cursor</strong><small>WebP · 128×128 · 128 KB</small>
        <input bind:this={pointerCursorInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'pointer_cursor')} />
        <button type="button" style={actionButtonStyle} disabled={busy} on:click={() => pointerCursorInput?.click()}>{activePointerCursor ? 'Replace pointer' : 'Upload pointer'}</button>
      </div>
      <div class="rich-media-editor__upload-card">
        <div class="rich-media-editor__upload-preview rich-media-editor__upload-preview--audio">
          {#if primaryAudioAsset}<audio src={getProfileMediaUrl(primaryAudioAsset.storage_path, cacheKey)} controls preload="metadata" aria-label="Active profile audio"></audio>{:else}<span aria-hidden="true">♪</span><small>No audio selected</small>{/if}
        </div>
        <strong>Audio tracks <span class="rich-media-editor__count">{audioTracks.length}/5</span></strong><small>MP3 · up to 10 MB each</small>
        <input bind:this={audioInput} type="file" accept="audio/mpeg,.mp3" on:change={(event) => uploadFile(event, 'audio')} />
        <button type="button" style={actionButtonStyle} disabled={busy || audioTracks.length >= 5} on:click={() => audioInput?.click()}>Add audio</button>
      </div>
    </div>

    {#each [
      ['background_video', 'Background videos', videoAssets, 'background_video_path'],
      ['banner', 'Banners', bannerAssets, 'banner_path'],
      ['cursor', 'Cursors', cursorAssets, 'cursor_path'],
      ['pointer_cursor', 'Pointer cursors', pointerCursorAssets, 'pointer_cursor_path']
    ] as group (group[0])}
      {#if group[2].length}
        <section class="rich-media-editor__library" aria-label={String(group[1])}>
          <h3>{group[1]} <span>{group[2].length}</span></h3>
          <div class="rich-media-editor__asset-row">
            {#each group[2] as asset (asset.id)}
              <article class:rich-media-editor__asset--active={richConfig[group[3]] === asset.storage_path} class="rich-media-editor__asset">
                {#if group[0] === 'background_video'}<video src={getProfileMediaUrl(asset.storage_path, cacheKey)} muted loop playsinline preload="metadata" aria-label={asset.label || 'Background video'}></video>{:else}<img src={getProfileMediaUrl(asset.storage_path, cacheKey)} alt={asset.label || group[1]} loading="lazy" />{/if}
                <div><strong>{asset.label || 'Untitled asset'}</strong><small>{formatRichMediaBytes(asset.byte_size)}</small></div>
                <div class="rich-media-editor__asset-actions"><button type="button" style={quietButtonStyle} disabled={busy} on:click={() => selectAsset(group[0], asset)}>{richConfig[group[3]] === asset.storage_path ? 'Active' : 'Use'}</button><button type="button" style={quietButtonStyle} disabled={busy} on:click={() => removeAsset(asset)}>Remove</button></div>
              </article>
            {/each}
          </div>
        </section>
      {/if}
    {/each}

    {#if audioAssets.length || audioTracks.length}
      <section class="rich-media-editor__library" aria-label="Audio playlist">
        <h3>Audio playlist <span>{audioTracks.length}/5</span></h3>
        {#each audioTracks as track, index (track.asset_id)}
          <div class="rich-media-editor__track">
            <strong>{track.label}</strong>
            <label>Trim start <input style={fieldStyle} type="number" min="0" step="100" value={track.trim_start_ms} on:input={(event) => updateTrack(track.asset_id, 'trim_start_ms', event.currentTarget.value)} /></label>
            <label>Trim end <input style={fieldStyle} type="number" min="0" step="100" value={track.trim_end_ms} on:input={(event) => updateTrack(track.asset_id, 'trim_end_ms', event.currentTarget.value)} /></label>
            <button type="button" style={quietButtonStyle} disabled={busy || index === 0} on:click={() => moveTrack(index, -1)} aria-label="Move track up">↑</button>
            <button type="button" style={quietButtonStyle} disabled={busy || index === audioTracks.length - 1} on:click={() => moveTrack(index, 1)} aria-label="Move track down">↓</button>
            <button type="button" style={quietButtonStyle} disabled={busy} on:click={() => { audioTracks = audioTracks.filter(item => item.asset_id !== track.asset_id); void saveAudioSettings(); }}>Remove</button>
          </div>
        {/each}
        <div class="rich-media-editor__settings">
          <label><input type="checkbox" bind:checked={audioShuffle} /> Shuffle</label>
          <label><input type="checkbox" bind:checked={audioLoop} /> Loop</label>
          <label><input type="checkbox" bind:checked={audioAutoplay} /> Ask visitors to start audio after Enter</label>
          <label><input type="checkbox" bind:checked={audioControls} /> Show playback controls</label>
          <label>Default volume <input type="range" min="0" max="1" step="0.05" bind:value={audioVolume} /></label>
        </div>
        <button type="button" style={actionButtonStyle} disabled={busy} on:click={saveAudioSettings}>Save audio settings</button>
        {#each audioAssets as asset (asset.id)}
          {#if !audioTracks.some(track => track.asset_id === asset.id)}<button type="button" class="rich-media-editor__track-add" disabled={busy || audioTracks.length >= 5} on:click={() => selectAsset('audio', asset)}>Add {asset.label || 'track'}</button>{/if}
        {/each}
      </section>
    {/if}

    {#if error}<p class="rich-media-editor__message rich-media-editor__message--error" role="alert">{error}</p>{/if}
    {#if status}<p class="rich-media-editor__message" role="status" aria-live="polite">{status}</p>{/if}
    </details>
  </Module>
{:else if compact}
  <article class="rich-media-editor__compact-card rich-media-editor__compact-card--locked">
    <div class="rich-media-editor__compact-preview rich-media-editor__compact-preview--locked" aria-hidden="true">
      <ProfileMediaIcon kind="audio" />
      <small>Chromadie Plus</small>
    </div>
    <div class="rich-media-editor__compact-copy">
      <strong>Audio</strong>
      <small>Unlock richer expression</small>
    </div>
  </article>
  <article class="rich-media-editor__compact-card rich-media-editor__compact-card--locked">
    <div class="rich-media-editor__compact-preview rich-media-editor__compact-preview--locked" aria-hidden="true">
      <ProfileMediaIcon kind="cursor" />
      <small>Chromadie Plus</small>
    </div>
    <div class="rich-media-editor__compact-copy">
      <strong>Custom cursor</strong>
      <small>Unlock richer expression</small>
    </div>
  </article>
{:else}
  <Module size="wide" tone="quiet" title="Rich media" description="Make the profile yours with a deeper media library.">
    <p class="rich-media-editor__hint">Chromadie Plus adds bounded video, audio, banner, and cursor expression. Your free profile keeps the full image, atmosphere, Spotify, and earned-cosmetic experience.</p>
  </Module>
{/if}

<style>
  :global(.rich-media-editor--compact) { display: contents; }
  :global(.rich-media-editor--compact > .foundation-module__header) { display: none; }
  :global(.rich-media-editor--compact > .foundation-module__body) { display: contents; }
  .rich-media-editor__compact-card { display: grid; align-content: start; gap: .3rem; min-width: 0; padding: .4rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--surface-inset) 78%, transparent); }
  .rich-media-editor__compact-card--locked { opacity: .72; }
  .rich-media-editor__compact-preview { position: relative; display: grid; width: 100%; min-height: 4.5rem; place-items: center; overflow: hidden; padding: 0; border: 1px solid var(--color-line-subtle); border-radius: calc(var(--radius-sm) - .1rem); background: #090b10; color: var(--color-ink-muted); cursor: pointer; }
  .rich-media-editor__compact-preview--audio, .rich-media-editor__compact-preview--cursor { aspect-ratio: 3 / 1; }
  .rich-media-editor__compact-preview--locked { align-content: center; gap: .4rem; padding: .65rem; cursor: default; }
  .rich-media-editor__compact-preview:disabled { cursor: wait; opacity: .7; }
  .rich-media-editor__compact-preview:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 2px; }
  .rich-media-editor__compact-preview img { width: 4rem; height: 4rem; object-fit: contain; }
  .rich-media-editor__compact-preview small { overflow: hidden; color: var(--color-ink-muted); font-size: var(--type-label); text-overflow: ellipsis; white-space: nowrap; }
  .rich-media-editor__compact-overlay { position: absolute; right: .4rem; bottom: .35rem; display: grid; width: 1.55rem; height: 1.55rem; place-items: center; border: 1px solid color-mix(in srgb, var(--color-accent-bright) 52%, transparent); border-radius: 50%; background: color-mix(in srgb, #090b10 75%, transparent); color: var(--color-ink-strong); font-size: .85rem; opacity: 0; transition: opacity var(--motion-base) var(--motion-ease-standard), transform var(--motion-base) var(--motion-ease-standard); }
  .rich-media-editor__compact-preview:hover .rich-media-editor__compact-overlay, .rich-media-editor__compact-preview:focus-visible .rich-media-editor__compact-overlay { opacity: 1; transform: translateY(-1px); }
  .rich-media-editor__compact-upload-hint { position: absolute; bottom: .35rem; left: .4rem; max-width: calc(100% - 2.4rem); overflow: hidden; padding: .18rem .32rem; border-radius: 999px; background: rgba(5, 6, 9, .72); color: var(--color-ink-strong); font-size: var(--type-label); line-height: 1.1; pointer-events: none; text-overflow: ellipsis; white-space: nowrap; }
  .rich-media-editor__compact-copy { display: grid; min-width: 0; gap: .15rem; }
  .rich-media-editor__compact-copy strong { overflow: hidden; color: var(--color-ink-strong); font-size: var(--type-small); text-overflow: ellipsis; white-space: nowrap; }
  .rich-media-editor__compact-copy small { overflow: hidden; color: var(--color-ink-muted); font-size: var(--type-label); text-overflow: ellipsis; white-space: nowrap; }
  .rich-media-editor__advanced { grid-column: 1 / -1; margin-top: .15rem; padding-top: .75rem; border-top: 1px solid var(--color-line-subtle); }
  .rich-media-editor__advanced summary { display: flex; align-items: center; justify-content: space-between; gap: .75rem; color: var(--color-ink-muted); font-size: var(--type-small); cursor: pointer; list-style: none; }
  .rich-media-editor__advanced summary::-webkit-details-marker { display: none; }
  .rich-media-editor__advanced summary span { color: var(--color-accent-bright); font-size: 1rem; transition: transform var(--motion-base) var(--motion-ease-standard); }
  .rich-media-editor__advanced[open] summary span { transform: rotate(90deg); }
  .rich-media-editor__hint, .rich-media-editor__status, .rich-media-editor__message { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .rich-media-editor__message--error { color: var(--color-danger, #ff9eac); }
  .rich-media-editor__upload-grid { display: grid; grid-template-columns: repeat(5, minmax(10rem, 1fr)); gap: .75rem; margin-top: 1rem; }
  .rich-media-editor__upload-card { display: grid; align-content: start; gap: .45rem; min-width: 0; padding: .65rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--surface-inset) 72%, transparent); }
  .rich-media-editor__upload-card > strong { display: flex; align-items: center; justify-content: space-between; gap: .5rem; color: var(--color-ink-strong); font-size: var(--type-small); }
  .rich-media-editor__upload-preview { display: grid; min-height: 5rem; place-items: center; overflow: hidden; border: 1px solid var(--color-line-subtle); border-radius: calc(var(--radius-sm) - .1rem); background: #090b10; color: var(--color-ink-muted); text-align: center; }
  .rich-media-editor__upload-preview--wide { aspect-ratio: 16 / 7; min-height: 0; }
  .rich-media-editor__upload-preview--cursor { width: 100%; aspect-ratio: 1.7; min-height: 0; }
  .rich-media-editor__upload-preview--audio { align-content: center; gap: .35rem; padding: .4rem; }
  .rich-media-editor__upload-preview img, .rich-media-editor__upload-preview video { width: 100%; height: 100%; object-fit: cover; }
  .rich-media-editor__upload-preview--cursor img { width: 4rem; height: 4rem; object-fit: contain; }
  .rich-media-editor__upload-preview audio { width: 100%; max-width: 100%; }
  .rich-media-editor__upload-preview > span { color: var(--color-accent-bright); font-size: 1.4rem; }
  .rich-media-editor__upload-preview small { padding: 0 .3rem; color: var(--color-ink-muted); font-size: var(--type-label); }
  .rich-media-editor__count { color: var(--color-ink-muted); font: 600 var(--type-label)/1 var(--font-mono-stack); }
  .rich-media-editor__upload-grid small, .rich-media-editor__asset small { color: var(--color-ink-muted); font-size: var(--type-label); }
  .rich-media-editor__upload-grid input[type=file] { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); }
  .rich-media-editor__library { display: grid; gap: .65rem; margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--color-line-subtle); }
  .rich-media-editor__library h3 { display: flex; justify-content: space-between; margin: 0; color: var(--color-ink-strong); font-size: var(--type-small); }
  .rich-media-editor__library h3 span { color: var(--color-ink-muted); font: 600 var(--type-label)/1 var(--font-mono-stack); }
  .rich-media-editor__asset-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .7rem; }
  .rich-media-editor__asset { display: grid; gap: .45rem; min-width: 0; padding: .45rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); }
  .rich-media-editor__asset--active { border-color: var(--color-accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 24%, transparent); }
  .rich-media-editor__asset img, .rich-media-editor__asset video { width: 100%; aspect-ratio: 16 / 7; object-fit: cover; border-radius: calc(var(--radius-sm) - .15rem); background: #090b10; }
  .rich-media-editor__asset-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
  .rich-media-editor__track { display: grid; grid-template-columns: minmax(8rem, 1fr) repeat(2, minmax(5rem, 7rem)) auto auto auto; align-items: end; gap: .45rem; padding: .55rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); }
  .rich-media-editor__track label { display: grid; gap: .25rem; color: var(--color-ink-muted); font-size: var(--type-label); }
  .rich-media-editor__settings { display: flex; flex-wrap: wrap; gap: .75rem 1rem; align-items: center; color: var(--color-ink-muted); font-size: var(--type-small); }
  .rich-media-editor__settings label { display: inline-flex; align-items: center; gap: .35rem; }
  .rich-media-editor__track-add { margin-right: .4rem; border: 0; background: transparent; color: var(--color-ink-muted); cursor: pointer; text-decoration: underline; text-underline-offset: .16em; }
  @media (max-width: 78rem) { .rich-media-editor__upload-grid { grid-template-columns: repeat(3, minmax(10rem, 1fr)); } }
  @media (max-width: 42rem) { .rich-media-editor__upload-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rich-media-editor__track { grid-template-columns: 1fr 1fr; } .rich-media-editor__track strong { grid-column: 1 / -1; } }
  @media (max-width: 28rem) { .rich-media-editor__upload-grid { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) {
    .rich-media-editor__compact-overlay, .rich-media-editor__advanced summary span { transition: none; }
  }
</style>
