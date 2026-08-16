<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileMotionEffect from './profile-motion/ProfileMotionEffect.svelte';
  import ProfileReferenceCard from './ProfileReferenceCard.svelte';
  import ProfileFullBleedLayout from './profile-layout/ProfileFullBleedLayout.svelte';
  import { requestNameFontLoad } from './name/nameFonts.js';

  /** @type {any} */
  export let previewRenderSnapshot = null;
  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  export let previewDevice = 'desktop';
  export let isMobileViewport = false;

  const dispatch = createEventDispatcher();
  let previewStage;

  $: previewReady = Boolean(previewRenderSnapshot?.profile);
  $: identity = previewRenderSnapshot?.identity || {};
  $: appearance = previewRenderSnapshot?.appearance || {};
  $: accentColor = previewRenderSnapshot?.colors?.signature || appearance.colors?.accent || '#00FFB3';
  $: links = previewRenderSnapshot?.links?.opening || [];
  $: latestRoll = previewRenderSnapshot?.roll?.latest || previewRenderSnapshot?.roll?.best || null;
  $: media = previewRenderSnapshot?.media || {};
  $: playlist = media.playlist || {};
  $: audioAvailable = Boolean(media.audioUrl || media.audioPath || playlist.tracks?.length);
  $: firstTrack = playlist.tracks?.[0] || null;
  $: audioStatus = firstTrack?.duration_ms ? `▶ ${formatDuration(firstTrack.duration_ms)}` : '▶';
  $: metadata = [
    identity.location,
    identity.timezone,
    identity.showJoinDate && identity.joinedLabel ? `Joined ${identity.joinedLabel}` : ''
  ].filter(Boolean).join(' · ');
  $: motionKey = previewRenderSnapshot?.cosmetics?.profileMotionKey || '';
  $: nameLoadout = previewRenderSnapshot?.cosmetics?.name || null;
  $: nameTodayColor = previewRenderSnapshot?.colors?.nameToday || accentColor;
  $: nameBaseColor = previewRenderSnapshot?.colors?.nameBase || '#FFFFFF';
  $: nameRecentColors = previewRenderSnapshot?.colors?.nameRecent || [];
  $: appearanceStyle = previewRenderSnapshot?.surface?.style || '';
  $: avatarEffectKey = previewRenderSnapshot?.cosmetics?.avatarEffectKey || '';
  $: profileBorderKey = previewRenderSnapshot?.cosmetics?.borderKey || '';
  $: linkStyle = previewRenderSnapshot?.configuration?.linkStyle || {};
  $: layoutVariant = previewRenderSnapshot?.layout?.variant || 'compact';
  $: profileWideNameFontEnabled = previewRenderSnapshot?.typography?.profileWideNameFont === true;
  $: profileWideNameFontKey = previewRenderSnapshot?.typography?.nameFontKey || '';
  $: profileWideNameFontFamily = profileWideNameFontEnabled
    ? previewRenderSnapshot?.typography?.family || ''
    : '';
  $: previewTypographyStyle = profileWideNameFontFamily
    ? `--profile-font-family:${profileWideNameFontFamily}`
    : '';
  $: previewFontRequestKey = `${profileWideNameFontKey}:${identity.displayName || identity.username || ''}`;
  let requestedProfileWideFontKey = '';

  function requestPreviewProfileWideFont(fontKey, text) {
    if (!fontKey || requestedProfileWideFontKey === previewFontRequestKey) return;
    requestedProfileWideFontKey = previewFontRequestKey;
    void requestNameFontLoad(fontKey, 28, text).then(loaded => {
      if (!loaded && requestedProfileWideFontKey === previewFontRequestKey) requestedProfileWideFontKey = '';
    });
  }

  $: if (profileWideNameFontEnabled && profileWideNameFontKey) {
    requestPreviewProfileWideFont(profileWideNameFontKey, identity.displayName || identity.username || 'Chromadie');
  }

  function formatDuration(value) {
    const seconds = Math.max(0, Math.round(Number(value) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function togglePreview() {
    dispatch('toggle');
  }

  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') dispatch('devicechange', device);
  }
</script>

<div class="profile-studio-preview" data-preview-tab={activeCustomizeTab} data-preview-section={activeSection} data-preview-layout={layoutVariant}>
  <header class="profile-studio-preview__header">
    <div class="profile-studio-preview__label"><i></i><span>Live public-profile preview</span></div>
    {#if isMobileViewport}
      <button class="profile-studio-preview__close" type="button" aria-label="Close live preview" on:click={togglePreview}>×</button>
    {/if}
  </header>

  {#if previewReady}
    <div class="profile-studio-preview__canvas" class:profile-studio-preview__canvas--mobile={previewDevice === 'mobile'}>
      <div class="profile-studio-preview__viewport" data-preview-device={previewDevice}>
        <div
          bind:this={previewStage}
          class={'profile-studio-preview__stage' + (profileWideNameFontEnabled ? ' profile-studio-preview__stage--profile-wide-name-font' : '')}
          style={previewTypographyStyle}
          data-preview-device={previewDevice}
        >
          <ProfileMotionEffect
            motionKey={motionKey}
            inputSurface="container"
            surfaceElement={previewStage}
            disabled={previewDevice === 'mobile'}
            className="profile-studio-preview__motion"
          >
            {#key layoutVariant}
            {#if layoutVariant === 'full-bleed'}
              <ProfileFullBleedLayout
                displayName={identity.displayName || identity.username}
                bio={identity.bio}
                avatarSrc={identity.avatarUrl}
                avatarEffectKey={avatarEffectKey}
                {nameLoadout}
                {nameTodayColor}
                {nameBaseColor}
                {nameRecentColors}
                profileBorderKey={profileBorderKey}
                location={identity.location}
                timezone={identity.timezone}
                joinedLabel={identity.joinedLabel}
                showJoinDate={identity.showJoinDate}
                showAvatar={identity.showAvatar !== false}
                descriptionMode={identity.descriptionMode}
                entryAnimation={identity.entryAnimation}
                {links}
                {accentColor}
              />
            {:else}
              <ProfileReferenceCard
                displayName={identity.displayName || identity.username}
                bio={identity.bio}
                meta={metadata}
                avatarSrc={identity.avatarUrl}
                avatarEffectKey={avatarEffectKey}
                {nameLoadout}
                {nameTodayColor}
                {nameBaseColor}
                {nameRecentColors}
                profileBorderKey={profileBorderKey}
                surfaceStyle={appearanceStyle}
                showAvatar={identity.showAvatar !== false}
                descriptionMode={identity.descriptionMode}
                entryAnimation={identity.entryAnimation}
                {links}
                {linkStyle}
                roll={latestRoll}
                {accentColor}
                {audioAvailable}
                audioStatus={audioStatus}
                rollLabel="Today's color"
                presentation="studio"
                ariaLabel="Live public-profile preview card"
              />
            {/if}
            {/key}
          </ProfileMotionEffect>
        </div>
      </div>
    </div>
  {:else}
    <div class="profile-studio-preview__loading" role="status" aria-live="polite"><span aria-hidden="true">✦</span> Preparing your live canvas…</div>
  {/if}

  <footer class="profile-studio-preview__footer">
    <div class="profile-studio-preview__devices" role="group" aria-label="Preview device">
      <button type="button" class:active={previewDevice === 'desktop'} aria-pressed={previewDevice === 'desktop'} on:click={() => setPreviewDevice('desktop')}>Desktop</button>
      <button type="button" class:active={previewDevice === 'mobile'} aria-pressed={previewDevice === 'mobile'} on:click={() => setPreviewDevice('mobile')}>Mobile</button>
    </div>
  </footer>
</div>

<style>
  .profile-studio-preview { display: grid; align-content: start; width: 100%; max-width: 100%; min-width: 0; min-height: 0; height: 100%; overflow: visible; }
  .profile-studio-preview__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: min(350px, 100%); min-height: 2rem; margin: 0 auto 17px; }
  .profile-studio-preview__label { display: inline-flex; align-items: center; gap: 8px; color: #8b8c94; font: 500 .63rem/1 'Inter', sans-serif; letter-spacing: .1em; text-transform: uppercase; }
  .profile-studio-preview__label i { width: 6px; height: 6px; border-radius: 50%; background: #00ffb3; box-shadow: 0 0 8px rgba(0,255,179,.24); }
  .profile-studio-preview__close { display: grid; width: 2rem; height: 2rem; place-items: center; border: 1px solid rgba(255,255,255,.1); border-radius: .4rem; background: transparent; color: #8f9099; font-size: 1.1rem; cursor: pointer; }
  .profile-studio-preview__close:hover, .profile-studio-preview__close:focus-visible { border-color: #00ffb3; color: #f8f8f8; }
  .profile-studio-preview__canvas { display: grid; width: 100%; min-width: 0; place-items: start center; overflow: visible; }
  .profile-studio-preview__viewport { width: min(350px, 100%); min-width: 0; }
  .profile-studio-preview__stage { width: 100%; min-width: 0; overflow: visible; }
  .profile-studio-preview__loading { display: grid; min-height: 22rem; place-items: center; gap: .55rem; color: #8f9099; font: 400 .8rem/1.45 'Inter', sans-serif; text-align: center; }
  .profile-studio-preview__loading span { color: #00ffb3; font-size: 1.2rem; }
  .profile-studio-preview__footer { display: flex; align-items: center; justify-content: flex-end; gap: .7rem; width: min(350px, 100%); min-height: 2.8rem; margin: 15px auto 0; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.12); color: #777881; font: 400 .6rem/1 'Inter', sans-serif; }
  .profile-studio-preview__devices { display: inline-flex; align-items: center; gap: .2rem; }
  .profile-studio-preview__devices button { min-height: 1.8rem; padding: .25rem .45rem; border: 0; border-radius: .3rem; background: transparent; color: #777881; font: 500 .6rem/1 'Inter', sans-serif; cursor: pointer; }
  .profile-studio-preview__devices button.active { background: rgba(255,255,255,.08); color: #bfc0c5; }
  .profile-studio-preview__devices button:hover, .profile-studio-preview__devices button:focus-visible { color: #f8f8f8; }

  /* Match the public renderer's explicit typography scope while keeping the
     Studio chrome in its own Inter-based type system. */
  .profile-studio-preview__stage--profile-wide-name-font,
  .profile-studio-preview__stage--profile-wide-name-font :global(*) {
    font-family: var(--profile-font-family) !important;
  }

  @media (max-width: 1100px) {
    .profile-studio-preview { height: auto; }
  }

  @media (min-width: 1101px) {
    .profile-studio-preview { padding-top: 5.1rem; }
  }

  @media (max-width: 700px) {
    .profile-studio-preview__header { margin-bottom: 11px; }
    .profile-studio-preview__canvas { padding: .5rem 0 1rem; }
    .profile-studio-preview__viewport { width: min(350px, 100%); }
    .profile-studio-preview__footer { margin-top: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-studio-preview__stage { scroll-behavior: auto; }
  }
</style>
