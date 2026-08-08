<script>
  import { createEventDispatcher } from 'svelte';
  import { hasChromadiePlus } from './premiumEntitlements.js';
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
  <Module size="wide" tone="quiet" title="Rich media" description="Premium expression stays bounded, reusable, and server-verified.">
    {#if loading}<p class="rich-media-editor__status" role="status">Loading your rich media library…</p>{/if}
    <p class="rich-media-editor__hint">Three muted background videos (MP4/WebM), five MP3 tracks, one banner, and two cursor styles. The library is capped at 150 MB.</p>

    <div class="rich-media-editor__upload-grid">
      <div><strong>Background video</strong><small>Up to 25 MB each · autoplay is muted</small><input bind:this={videoInput} type="file" accept="video/mp4,video/webm,.mp4,.webm" on:change={(event) => uploadFile(event, 'background_video')} /><button type="button" style={actionButtonStyle} disabled={busy} on:click={() => videoInput?.click()}>Upload video</button></div>
      <div><strong>Banner</strong><small>Processed to bounded WebP</small><input bind:this={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'banner')} /><button type="button" style={actionButtonStyle} disabled={busy} on:click={() => bannerInput?.click()}>Upload banner</button></div>
      <div><strong>Normal cursor</strong><small>WebP · 128×128 · 128 KB</small><input bind:this={cursorInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'cursor')} /><button type="button" style={actionButtonStyle} disabled={busy} on:click={() => cursorInput?.click()}>Upload cursor</button></div>
      <div><strong>Pointer cursor</strong><small>WebP · 128×128 · 128 KB</small><input bind:this={pointerCursorInput} type="file" accept="image/jpeg,image/png,image/webp" on:change={(event) => uploadFile(event, 'pointer_cursor')} /><button type="button" style={actionButtonStyle} disabled={busy} on:click={() => pointerCursorInput?.click()}>Upload pointer</button></div>
      <div><strong>Audio track</strong><small>MP3 · up to 10 MB · five tracks</small><input bind:this={audioInput} type="file" accept="audio/mpeg,.mp3" on:change={(event) => uploadFile(event, 'audio')} /><button type="button" style={actionButtonStyle} disabled={busy} on:click={() => audioInput?.click()}>Upload MP3</button></div>
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
  </Module>
{:else}
  <Module size="wide" tone="quiet" title="Rich media" description="Make the profile yours with a deeper media library.">
    <p class="rich-media-editor__hint">Chromadie Plus adds bounded video, audio, banner, and cursor expression. Your free profile keeps the full image, atmosphere, Spotify, and earned-cosmetic experience.</p>
  </Module>
{/if}

<style>
  .rich-media-editor__hint, .rich-media-editor__status, .rich-media-editor__message { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .rich-media-editor__message--error { color: var(--color-danger, #ff9eac); }
  .rich-media-editor__upload-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .8rem; margin-top: 1rem; }
  .rich-media-editor__upload-grid > div { display: grid; gap: .45rem; padding: .8rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--surface-inset) 72%, transparent); }
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
  @media (max-width: 42rem) { .rich-media-editor__track { grid-template-columns: 1fr 1fr; } .rich-media-editor__track strong { grid-column: 1 / -1; } }
</style>
