<script>
  import ProfileMotionEffect from './profile-motion/ProfileMotionEffect.svelte';
  import ProfileReferenceCard from './ProfileReferenceCard.svelte';
  import ProfileFullBleedLayout from './profile-layout/ProfileFullBleedLayout.svelte';
  import ProfilePortfolioLayout from './profile-layout/ProfilePortfolioLayout.svelte';
  import { requestNameFontLoad } from './name/nameFonts.js';

  /** @type {any} */
  export let previewRenderSnapshot = null;
  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  let previewStage;

  $: previewReady = Boolean(previewRenderSnapshot?.profile);
  $: identity = previewRenderSnapshot?.identity || {};
  $: appearance = previewRenderSnapshot?.appearance || {};
  $: accentColor = previewRenderSnapshot?.colors?.signature || appearance.colors?.accent || '#FFFFFF';
  $: links = previewRenderSnapshot?.links?.opening || [];
  $: showRoll = previewRenderSnapshot?.roll?.show === true;
  $: visibleRoll = showRoll ? previewRenderSnapshot?.roll?.latest || previewRenderSnapshot?.roll?.best || null : null;
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

</script>

<div class="profile-studio-preview" data-preview-tab={activeCustomizeTab} data-preview-section={activeSection} data-preview-layout={layoutVariant} data-preview-roll-widget={showRoll ? 'visible' : 'hidden'}>
  {#if previewReady}
    <div class="profile-studio-preview__canvas">
      <div class="profile-studio-preview__viewport">
        <div
          bind:this={previewStage}
          class={'profile-studio-preview__stage' + (profileWideNameFontEnabled ? ' profile-studio-preview__stage--profile-wide-name-font' : '')}
          style={previewTypographyStyle}
        >
          <ProfileMotionEffect
            motionKey={motionKey}
            inputSurface="container"
            surfaceElement={previewStage}
            className="profile-studio-preview__motion"
          >
            {#key layoutVariant}
            {#if layoutVariant === 'portfolio'}
              <ProfilePortfolioLayout
                displayName={identity.displayName || identity.username}
                bio={identity.bio}
                avatarSrc={identity.avatarUrl}
                bannerSrc={media.bannerUrl || ''}
                avatarEffectKey={avatarEffectKey}
                {nameLoadout}
                {nameTodayColor}
                {nameBaseColor}
                {nameRecentColors}
                profileBorderKey={profileBorderKey}
                surfaceStyle={appearanceStyle}
                location={identity.location}
                timezone={identity.timezone}
                joinedLabel={identity.joinedLabel}
                showJoinDate={identity.showJoinDate}
                showAvatar={identity.showAvatar !== false}
                descriptionMode={identity.descriptionMode}
                entryAnimation={identity.entryAnimation}
                {links}
                {linkStyle}
                roll={visibleRoll}
                {accentColor}
              />
            {:else if ['full-bleed', 'sleek'].includes(layoutVariant)}
              <ProfileFullBleedLayout
                displayName={identity.displayName || identity.username}
                bio={identity.bio}
                avatarSrc={identity.avatarUrl}
                bannerSrc={media.bannerUrl || ''}
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
                {linkStyle}
                {accentColor}
                roll={visibleRoll}
                surfaceStyle={appearanceStyle}
                layoutVariant={layoutVariant}
              />
            {:else}
              <ProfileReferenceCard
                displayName={identity.displayName || identity.username}
                bio={identity.bio}
                meta={metadata}
                avatarSrc={identity.avatarUrl}
                bannerSrc={media.bannerUrl || ''}
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
                roll={visibleRoll}
                {accentColor}
                {audioAvailable}
                audioStatus={audioStatus}
                rollLabel="Daily roll"
                presentation="studio"
                {layoutVariant}
                ariaLabel="Profile preview card"
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

</div>

<style>
  .profile-studio-preview { position: relative; display: grid; align-items: center; width: 100%; max-width: 100%; min-width: 0; min-height: 0; height: 100%; overflow: visible; }
  .profile-studio-preview__canvas { position: relative; z-index: 1; display: grid; width: 100%; height: 100%; min-width: 0; min-height: 0; place-items: center; overflow: visible; }
  .profile-studio-preview__viewport { width: min(52rem, 100%); min-width: 0; }
  .profile-studio-preview__stage { width: 100%; min-width: 0; overflow: visible; }
  .profile-studio-preview__loading { position: relative; z-index: 1; display: grid; min-height: 22rem; place-items: center; gap: .55rem; color: var(--studio-atmosphere-muted, #f4f4f4); font: 400 .8rem/1.45 'Inter', sans-serif; text-align: center; mix-blend-mode: difference; }
  .profile-studio-preview__loading span { color: var(--studio-accent, var(--white, #ffffff)); font-size: 1.2rem; }

  /* Match the public renderer's explicit typography scope while keeping the
     Studio chrome in its own Inter-based type system. */
  .profile-studio-preview__stage--profile-wide-name-font,
  .profile-studio-preview__stage--profile-wide-name-font :global(*) {
    font-family: var(--profile-font-family) !important;
  }

  @media (max-width: 1100px) {
    .profile-studio-preview { height: auto; align-items: start; }
    .profile-studio-preview__canvas { height: auto; padding-top: 1.5rem; }
  }

  @media (min-width: 1101px) {
    .profile-studio-preview__canvas { padding: 0; }
  }

  @media (max-width: 700px) {
    .profile-studio-preview__canvas { padding: .5rem 0 1rem; }
    .profile-studio-preview__viewport { width: min(52rem, 100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-studio-preview__stage { scroll-behavior: auto; }
  }
</style>
