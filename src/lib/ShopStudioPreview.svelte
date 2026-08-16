<script>
  import ProfileReferenceCard from './ProfileReferenceCard.svelte';
  import ProfileFullBleedLayout from './profile-layout/ProfileFullBleedLayout.svelte';
  import { createDefaultProfileConfig } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';
  import CursorTrailLayer from './cursor-trail/CursorTrailLayer.svelte';
  import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
  import { resolveProfileLayoutPreviewVariant } from './profile-layout/profileLayouts.js';
  import AtmosphereLayer from './profile-atmosphere/AtmosphereLayer.svelte';
  import { getProfileAppearanceStyle } from './profileAppearanceStyle.js';

  export let loadout = {};
  export let username = 'Your profile';
  export let selectedItem = /** @type {any} */ (null);
  export let displayColor = '#8B7CF6';
  /** @type {any} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let compact = false;
  export let nameRendererMode = '';
  export let links = [];

  $: account = /** @type {any} */ (accountProfile || {});
  $: accountUsername = account.username || username || 'You';
  $: accountDisplayName = account.display_name || username || accountUsername;
  $: resolvedNameRendererMode = nameRendererMode || (compact ? 'static-signature' : 'animated');
  $: previewProfileConfig = profileConfig?.draft || profileConfig?.published || profileConfig || createDefaultProfileConfig(displayColor);
  $: previewMediaReferences = previewProfileConfig.media_references || previewProfileConfig.mediaReferences || {};
  $: previewAvatarSrc = getProfileMediaUrl(previewMediaReferences.avatar || previewProfileConfig.avatar_path);
  $: previewBackgroundSrc = getProfileMediaUrl(previewMediaReferences.background || previewProfileConfig.background_path);
  $: previewAccentColor = previewProfileConfig.appearance?.colors?.accent || displayColor;
  $: previewCardStyle = getProfileAppearanceStyle(previewProfileConfig);
  $: nameRendererLoadout = getNameRendererLoadout(loadout);
  $: previewLayout = resolveProfileLayoutPreviewVariant(loadout, previewProfileConfig);
  $: cursorKey = getCursorTrailKey(loadout?.cursor_trail);
</script>

<section class="studio-preview" class:studio-preview--compact={compact} aria-label="Your cosmetic preview">
  {#if !compact}
  <div class="studio-preview-head">
    <div>
      <span class="studio-eyebrow">Live fitting room</span>
      <h2>Your Look</h2>
    </div>
    <span class="live-indicator"><span aria-hidden="true"></span> Live</span>
  </div>

  {/if}

  <div class="studio-stage context-profile">
    <div class="stage-grid" aria-hidden="true"></div>
    <div class={'studio-profile-card studio-profile-card--' + previewLayout} style={previewCardStyle}>
      {#if previewBackgroundSrc}
        <div class="studio-profile-card__background" style={`background-image: url("${previewBackgroundSrc}");`} aria-hidden="true"></div>
      {/if}
      {#if loadout?.profile_atmosphere}
        <AtmosphereLayer atmosphereKey={loadout.profile_atmosphere} todayColor={displayColor} mode={compact ? 'compact' : 'preview'} active={true} animated={resolvedNameRendererMode === 'animated'} className="studio-atmosphere-layer" />
      {/if}
      {#if cursorKey}
        <CursorTrailLayer trailKey={cursorKey} todayColor={displayColor} active={true} className="studio-cursor-layer" />
      {/if}
      {#if previewLayout === 'full-bleed'}
        <ProfileFullBleedLayout
          displayName={accountDisplayName}
          bio={account.bio || ''}
          avatarSrc={previewAvatarSrc}
          avatarEffectKey={loadout?.avatar_effect}
          nameLoadout={nameRendererLoadout}
          nameTodayColor={previewAccentColor}
          nameBaseColor="#FFFFFF"
          profileBorderKey={loadout?.profile_border}
          showAvatar={true}
          links={links}
          accentColor={previewAccentColor}
        />
      {:else}
        <ProfileReferenceCard
          displayName={accountDisplayName}
          bio={account.bio || ''}
          avatarSrc={previewAvatarSrc}
          avatarEffectKey={loadout?.avatar_effect}
          nameLoadout={nameRendererLoadout}
          nameTodayColor={previewAccentColor}
          nameBaseColor="#FFFFFF"
          profileBorderKey={loadout?.profile_border}
          surfaceStyle={previewCardStyle}
          showAvatar={true}
          links={links}
          accentColor={previewAccentColor}
          presentation="studio"
          ariaLabel="Your cosmetic preview card"
        />
      {/if}
    </div>
  </div>

  {#if !compact}
  <div class="studio-selection" aria-live="polite">
    <span>{selectedItem ? 'Previewing' : 'Studio ready'}</span>
    <strong>{selectedItem?.name || 'Choose an item to try it on'}</strong>
  </div>
  {/if}
</section>

<style>
  .studio-preview {
    width: 100%;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-lg);
    padding: 1rem;
    background:
      radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 35%),
      var(--surface-panel);
    box-shadow: 0 1.5rem 4rem rgba(0,0,0,0.28);
  }
  .studio-preview--compact { border:0; padding:0; background:transparent; box-shadow:none; }
  .studio-preview--compact .studio-stage { min-height:18rem; border:0; border-radius:0; background:transparent; }

  .studio-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .studio-preview-head h2 {
    margin: 3px 0 0;
    color: var(--color-ink-strong);
    font: 700 1.35rem/1.1 var(--font-display-stack);
    letter-spacing: -0.02em;
  }

  .studio-eyebrow {
    color: var(--color-ink-muted);
    font: 700 0.64rem/1 var(--font-mono-stack);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(75,222,165,0.18);
    border-radius: 999px;
    background: rgba(75,222,165,0.07);
    color: #9ae6c8;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .live-indicator span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4bdea5;
    box-shadow: 0 0 12px rgba(75,222,165,0.8);
  }

  .studio-stage {
    position: relative;
    min-height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-md);
    background:
      radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 42%),
      var(--color-canvas-deep);
  }
  .studio-stage.context-profile { min-height: 300px; }
  .studio-profile-card :global(.studio-atmosphere-layer) { z-index: 0; opacity: .82; isolation: auto; filter: blur(var(--profile-surface-blur, 0px)); transform: scale(1.06); transform-origin: center; }
  .studio-profile-card :global(.studio-cursor-layer) { z-index: 3 !important; }

  .stage-grid {
    position: absolute;
    inset: 0;
    opacity: 0.24;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 30px 30px;
    mask-image: linear-gradient(to bottom, #000, transparent 90%);
  }

  .studio-profile-card {
    position: relative;
    z-index: 2;
    width: calc(100% - 32px);
    max-width: 72rem;
    margin-inline: auto;
    box-sizing: border-box;
    overflow: visible;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    box-shadow: none;
  }
  .studio-profile-card__background { position: absolute; inset: 0; z-index: 0; border-radius: inherit; background-position: center; background-size: cover; filter: blur(var(--profile-surface-blur, 0px)); transform: scale(1.06); transform-origin: center; pointer-events: none; }
  .studio-profile-card--compact { width: min(100% - 2rem, 335px); }
  .studio-profile-card--full-bleed { width: min(100% - 1rem, 100%); }
  .studio-profile-card :global(.profile-reference-card__border),
  .studio-profile-card :global(.profile-full-bleed__boundary) { position: relative; z-index: 1; }
  .studio-selection {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 13px 3px 1px;
  }
  .studio-selection span {
    color: var(--color-ink-muted);
    font: 650 0.58rem var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .studio-selection strong {
    overflow: hidden;
    color: var(--color-ink-strong);
    font: 650 0.82rem var(--font-display-stack);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 650px) {
    .studio-preview { padding: 13px; border-radius: 22px; }
    .studio-stage { min-height: 286px; }
    .studio-stage.context-profile { min-height: 210px; }
    .studio-profile-card { width: calc(100% - 14px); }
    .studio-profile-card { min-height: 218px; }
    .studio-profile-card--compact { width: min(100% - 1rem, 335px); }
  }
</style>
