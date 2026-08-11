<script>
  import Media from './foundation/Media.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';
  import { isProfileLayoutKey } from './profile-layout/profileLayouts.js';

  export let username = 'Unknown Player';
  export let displayName = '';
  export let profilePath = '';
  export let bio = '';
  export let bioFallback = '';
  export let links = [];
  export let badges = [];
  export let staff = false;
  export let founder = false;
  export let accentColor = '#8B7CF6';
  export let avatarSrc = '';
  export let rollState = 'idle';
  export let showToday = true;
  export let titleId = 'identity-card-title';
  export let showAvatarMark = true;
  export let avatarLoading = 'eager';
  export let headingTag = 'h1';
  export let nameRendererLoadout = null;
  export let nameRendererContext = 'profile';
  export let nameRendererMode = 'animated';
  export let nameRendererRecentColors = [];
  export let nameRendererTodayColor = '';
  export let nameRendererBaseColor = '#FFFFFF';
  export let avatarEffectKey = '';
  export let avatarEffectMode = 'profile';
  export let avatarEffectAnimated = true;
  export let avatarEffectActive = false;
  export let layoutVariant = 'immersive';
  export let defaultPresentation = false;
  export let location = '';
  export let timezone = '';
  export let joinedLabel = '';
  export let showJoinDate = false;
  export let showAvatar = true;
  export let descriptionMode = 'plain';
  export let entryAnimation = 'none';
  export let linkStyle = null;
  export let previewDevice = 'desktop';
  /** @type {(entryKey: string) => void} */
  export let onEntryClick = () => {};

  let failedAvatarSource = '';

  $: safeDisplayName = displayName || username;
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: activeAvatarSource = avatarSrc && failedAvatarSource !== avatarSrc ? avatarSrc : '';
  $: displayedLinks = (Array.isArray(links) ? links : []).slice(0, 6);
  $: displayedBadges = (Array.isArray(badges) ? badges : [])
    .filter(badge => badge?.id !== 'launch_edition')
    .slice(0, 3);
  $: safeLayoutVariant = isProfileLayoutKey(layoutVariant) ? layoutVariant : 'immersive';
  /** @type {any} */
  let safeLinkStyle;
  $: safeLinkStyle = linkStyle || {};

  function linkIconSource(link) {
    const type = String(link?.type || 'link').toLowerCase();
    return ['/github', '/instagram', '/tiktok', '/twitch', '/youtube'].includes('/' + type)
      ? '/link-icons/' + type + '.svg'
      : '/link-icons/link.svg';
  }
</script>

<section class={'identity-card identity-card--roll-' + rollState + ' identity-card--layout-' + safeLayoutVariant + (defaultPresentation ? ' identity-card--default' : '') + (previewDevice === 'mobile' ? ' identity-card--preview-mobile' : '') + ' identity-card--entry-' + entryAnimation} style={'--identity-accent: ' + accentColor + '; --identity-base-color: ' + nameRendererBaseColor + '; --profile-link-align: ' + (safeLinkStyle.alignment || 'left') + '; --profile-link-size: ' + (1 + Number(safeLinkStyle.size || 0) * .08) + '; --profile-link-glow: ' + (Number(safeLinkStyle.glow || 0) * .18) + ';'} aria-labelledby={titleId}>
  <div class="identity-card__person">
    {#if showAvatar}
    <AvatarEffect
      effectKey={avatarEffectKey}
      accentColor={accentColor}
      recentColors={nameRendererRecentColors}
      mode={avatarEffectMode}
      animated={avatarEffectAnimated}
      active={avatarEffectActive}
      avatarSrc={activeAvatarSource}
      fallbackText={safeInitial}
      className="identity-card__avatar"
    >
      {#if activeAvatarSource}
        <img class="identity-card__avatar-media" src={avatarSrc} alt={safeDisplayName + ' avatar'} loading={avatarLoading === 'lazy' ? 'lazy' : 'eager'} decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
      {:else}
        <span class="identity-card__avatar-glow" aria-hidden="true"></span>
        <span class="identity-card__avatar-letter" aria-hidden="true">{safeInitial}</span>
        {#if showAvatarMark}<Media src="/logo-mark.svg" alt="" aspect="square" loading="eager" className="identity-card__avatar-mark" />{/if}
    {/if}
    </AvatarEffect>
    {/if}

    <div class="identity-card__copy">
      <div class="identity-card__name-row">
        {#if nameRendererLoadout}
          <NameEffectCanvas
            text={safeDisplayName}
            loadout={nameRendererLoadout}
            todayColor={nameRendererTodayColor || accentColor}
            baseColor={nameRendererBaseColor}
            recentColors={nameRendererRecentColors}
            context={nameRendererContext}
            mode={nameRendererMode}
            semanticTag={headingTag}
            semanticClass="identity-card__name"
            {titleId}
          />
        {:else}
          <svelte:element this={headingTag} id={titleId} class="identity-card__name">{safeDisplayName}</svelte:element>
        {/if}
        {#if staff || founder || displayedBadges.length}
          <div class="identity-card__badges" aria-label="Profile badges">
            {#if staff}<span class="identity-card__badge identity-card__badge--staff" title="Staff" aria-label="Staff badge"><span aria-hidden="true">✦</span><span>STAFF</span></span>{/if}
            {#if founder}<span class="identity-card__badge identity-card__badge--founder" title="Launch Edition" aria-label="Launch Edition badge">✦</span>{/if}
            {#each displayedBadges as badge (badge.id)}
              <span class="identity-card__badge" title={badge.name} aria-label={badge.name + ' badge'}>{badge.icon}</span>
            {/each}
          </div>
        {/if}
      </div>
      <div class="identity-card__handle-row">
        <a class="identity-card__handle" href={profilePath || undefined}>@{username}</a>
      </div>
      {#if bio}<p class={'identity-card__bio identity-card__bio--' + descriptionMode}>{bio}</p>
      {:else if bioFallback}<p class="identity-card__bio identity-card__bio--fallback">{bioFallback}</p>{/if}
      {#if location || timezone || (showJoinDate && joinedLabel)}
        <div class="identity-card__metadata" aria-label="Profile details">
          {#if location}<span>{location}</span>{/if}
          {#if timezone}<span>{timezone}</span>{/if}
          {#if showJoinDate && joinedLabel}<span>Joined {joinedLabel}</span>{/if}
        </div>
      {/if}
    </div>

  </div>

  {#if displayedLinks.length}
    <nav class="identity-card__links" aria-label={safeDisplayName + ' social links'}>
      {#each displayedLinks as link (link.order)}
        <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={String(link.type || 'Link') + ': ' + link.label} title={String(link.type || 'Link')} on:click={() => onEntryClick(link.key || `link-${link.order}`)}>
          <span class="identity-card__link-glyph" aria-hidden="true"><img src={linkIconSource(link)} alt="" loading="lazy" /></span>
          <strong>{link.label}</strong>
        </a>
      {/each}
    </nav>
  {/if}

  {#if showToday}
    <div class="identity-card__divider" aria-hidden="true"></div>

    <div class="identity-card__today" data-identity-surface="today">
      <slot name="today"></slot>
    </div>
  {/if}
</section>

<style>
  .identity-card {
    position: relative;
    container: identity-card / inline-size;
    width: 100%;
    margin: 0 auto;
    padding: clamp(1.5rem, 3.5vw, 2.25rem);
    border: var(--profile-border-width, 1px) solid color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .11) * 100%), transparent);
    border-radius: var(--profile-border-radius, var(--radius-lg));
    background: var(--profile-surface-fill, color-mix(in srgb, var(--profile-surface, #090b0f) calc(var(--profile-surface-opacity, .64) * 100%), transparent));
    --identity-avatar-accent: #5D6A73;
    box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.045);
    backdrop-filter: blur(var(--profile-surface-blur, 20px));
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
  }

  @supports (backdrop-filter: blur(0)) {
    .identity-card { backdrop-filter: blur(var(--profile-surface-blur, 20px)); }
  }

  .identity-card__name-row,
  .identity-card__links,
  .identity-card__today { min-width: 0; }

  .identity-card__person {
    display: flex;
    align-items: flex-start;
    gap: clamp(0.9rem, 2.5vw, 1.2rem);
    margin-top: 0;
  }

  /* AvatarEffect owns the wrapper DOM. Keep the sizing contract global so the
     effect layer cannot fall back to the uploaded image's intrinsic size when
     it is rendered from a child component. */
  :global(.identity-card__avatar) {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 clamp(5rem, 8vw, 5.75rem);
    width: clamp(5rem, 8vw, 5.75rem);
    aspect-ratio: 1;
    overflow: visible;
    border: 1px solid rgba(239, 244, 255, 0.18);
    border-radius: 50%;
    background: radial-gradient(circle at 36% 28%, rgba(255, 255, 255, 0.26), var(--identity-avatar-accent) 42%, rgba(3, 6, 11, 0.92) 100%);
    box-shadow: 0 0 2rem color-mix(in srgb, var(--identity-avatar-accent) 28%, transparent), inset 0 0 1.4rem rgba(255, 255, 255, 0.13);
  }

  :global(.identity-card__avatar-glow) { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 56%); filter: blur(0.7rem); opacity: 0.6; }
  :global(.identity-card__avatar-letter) { position: relative; z-index: 1; color: var(--profile-highlight, rgba(250, 252, 255, 0.94)); font: 600 clamp(2.25rem, 6vw, 3.25rem) / 1 var(--font-display-stack); letter-spacing: -0.08em; text-shadow: 0 0 1.5rem color-mix(in srgb, var(--identity-avatar-accent) 70%, transparent); }
  :global(.identity-card__avatar-mark) { position: absolute; z-index: 2; inset: 26%; opacity: 0.14; border: 0; border-radius: 0; background: transparent; }
  :global(.identity-card__avatar-media) { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 0; background: transparent; }
  :global(.identity-card__avatar-media) { border-radius: 50%; clip-path: circle(50% at 50% 50%); }
  :global(.identity-card__avatar-media) :global(.foundation-media__fallback) { border: 0; border-radius: 0; }

  .identity-card__copy { min-width: 0; flex: 1; padding-top: 0.15rem; text-align: left; color: var(--profile-text, rgba(244, 246, 251, 0.92)); }
  .identity-card__name-row { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.45rem 0.55rem; }
  .identity-card__name { max-width: 100%; margin: 0; color: var(--identity-base-color, var(--profile-username, rgba(248, 250, 255, 0.98))); font: 700 clamp(1.85rem, 3.8vw, 2.55rem) / 0.98 var(--font-display-stack); letter-spacing: -0.055em; overflow-wrap: anywhere; }
  .identity-card__badges { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0.28rem; }
  .identity-card__badge { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border: 1px solid color-mix(in srgb, var(--identity-accent) 42%, transparent); border-radius: 50%; background: color-mix(in srgb, var(--identity-accent) 14%, rgba(255, 255, 255, 0.06)); color: color-mix(in srgb, var(--identity-accent) 82%, white); font-size: 0.72rem; line-height: 1; }
  .identity-card__badge--founder { background: color-mix(in srgb, var(--identity-accent) 22%, transparent); }
  .identity-card__badge--staff { display: inline-flex; width: auto; min-width: 3.85rem; gap: 0.22rem; padding: 0 0.42rem; border-color: color-mix(in srgb, var(--color-accent-cyan) 72%, transparent); border-radius: 0.42rem; background: color-mix(in srgb, var(--color-accent-cyan) 18%, transparent); color: var(--color-accent-cyan); font: 700 0.56rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .identity-card__handle-row { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.6rem 0.8rem; margin-top: 0.38rem; }
  .identity-card__handle { display: inline-block; color: var(--profile-secondary-text, rgba(220, 230, 248, 0.62)); font: 600 0.75rem / 1.25 var(--font-mono-stack); text-decoration: none; letter-spacing: 0.05em; }
  .identity-card__handle:hover { color: var(--profile-highlight, color-mix(in srgb, var(--identity-accent) 85%, white)); }
  .identity-card__bio { max-width: 28rem; margin: 0.7rem 0 0; color: var(--profile-description, rgba(226, 233, 246, 0.72)); font-size: 0.84rem; line-height: 1.55; overflow-wrap: anywhere; word-break: break-word; }
  .identity-card__bio--typewriter { overflow: hidden; border-right: 1px solid color-mix(in srgb, var(--identity-accent) 70%, transparent); white-space: nowrap; animation: identity-card-typewriter 2.2s steps(42, end) both, identity-card-caret 0.9s step-end infinite; }
  .identity-card__metadata { display: flex; flex-wrap: wrap; gap: .35rem .65rem; margin-top: .65rem; color: var(--profile-secondary-text, rgba(220, 230, 248, .58)); font: .62rem / 1.3 var(--font-mono-stack); }
  .identity-card__metadata span + span::before { content: '·'; margin-right: .65rem; color: color-mix(in srgb, var(--identity-accent) 60%, transparent); }

  .identity-card__links { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 0.55rem 1rem; margin-top: 0.95rem; }
  .identity-card__links a { display: inline-flex; align-items: center; gap: 0.38rem; min-height: 2rem; max-width: 100%; padding: 0.25rem 0 0.3rem; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--profile-text, #dce6f8) 30%, transparent); border-radius: 0; background: transparent; color: var(--profile-text, rgba(220, 230, 248, 0.7)); font-size: 0.78rem; text-decoration: none; transition: border-color var(--motion-base) var(--motion-ease-standard), color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard); }
  .identity-card__links a:hover { transform: translateY(-1px); border-color: var(--profile-highlight, color-mix(in srgb, var(--identity-accent) 72%, white)); color: var(--profile-highlight, rgba(248, 250, 255, 0.96)); }
  .identity-card__links { justify-content: var(--profile-link-align); }
  .identity-card__links a { font-size: calc(.78rem * var(--profile-link-size)); box-shadow: 0 0 calc(1rem * var(--profile-link-glow)) color-mix(in srgb, var(--identity-accent) 35%, transparent); }
  .identity-card__link-glyph { display: grid; place-items: center; width: 1rem; height: 1rem; border-radius: 0; background: transparent; color: color-mix(in srgb, var(--identity-accent) 84%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0; }
  .identity-card__link-glyph img { display: block; width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.78; }
  .identity-card__links strong { min-width: 0; color: inherit; font-weight: 600; overflow-wrap: anywhere; }
  .identity-card__links a:focus-visible,
  .identity-card__handle:focus-visible { outline: 2px solid var(--profile-highlight, var(--color-accent-bright)); outline-offset: 4px; border-radius: 0.25rem; }

  .identity-card__divider { height: 1px; margin: 1.65rem 0 1.45rem; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--identity-accent) 22%, rgba(230, 238, 255, 0.16)), transparent); }
  .identity-card__today :global(.profile-roll--integrated) { width: 100%; }

  /* Profile layouts are card compositions. They deliberately never reach the
     profile shell's roll/page containers. */
  .identity-card--layout-editorial { border-radius: var(--profile-border-radius, 0); border-top: 2px solid color-mix(in srgb, var(--identity-accent) 58%, rgba(255, 255, 255, 0.12)); background: linear-gradient(105deg, color-mix(in srgb, var(--identity-accent) 8%, var(--profile-surface-fill, rgba(9, 11, 15, 0.72))), var(--profile-surface-fill, rgba(9, 11, 15, 0.64)) 62%); box-shadow: none; }
  .identity-card--layout-editorial .identity-card__person { gap: 1.35rem; }
  .identity-card--layout-editorial .identity-card__links { padding-top: 0.8rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 28%, rgba(255, 255, 255, 0.12)); }

  .identity-card--layout-focus { display: flex; flex-direction: column; align-items: center; text-align: center; border-color: color-mix(in srgb, var(--identity-accent) 44%, rgba(255, 255, 255, 0.14)); border-radius: var(--profile-border-radius, var(--radius-lg)); background: radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--identity-accent) 14%, transparent), var(--profile-surface-fill, rgba(9, 11, 15, 0.68)) 48%); }
  .identity-card--layout-focus .identity-card__person { flex-direction: column; align-items: center; gap: 1.1rem; width: 100%; }
  .identity-card--layout-focus .identity-card__copy { width: 100%; text-align: center; }
  .identity-card--layout-focus .identity-card__name-row,
  .identity-card--layout-focus .identity-card__handle-row { justify-content: center; }
  .identity-card--layout-focus .identity-card__bio { margin-inline: auto; }
  .identity-card--layout-focus .identity-card__links { justify-content: center; width: 100%; margin-top: 1.25rem; padding-top: 0.9rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }

  /* The first profile should feel like a finished identity, not an empty
     template. Keep this presentation opt-in so authored layouts retain their
     own surface and link treatment. */
  .identity-card--default {
    min-height: 18rem;
    padding: 1.55rem 1.25rem 1.05rem;
    border-color: color-mix(in srgb, #89b4fa 58%, rgba(255, 255, 255, 0.18));
    background-color: #08172e;
    background-image: url('/profile-default/starfield-blue.webp');
    background-position: center;
    background-size: cover;
    box-shadow: 0 1.6rem 3rem rgba(2, 9, 24, 0.42), inset 0 1px 0 rgba(196, 220, 255, 0.12);
  }

  .identity-card--default .identity-card__person { flex: 1 1 auto; }
  .identity-card--default .identity-card__copy { display: flex; flex-direction: column; align-items: center; }
  .identity-card--default .identity-card__name-row { order: 1; }
  .identity-card--default .identity-card__handle-row { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .identity-card--default .identity-card__metadata { order: 3; }
  .identity-card--default .identity-card__bio { order: 4; }
  .identity-card--default .identity-card__metadata { justify-content: center; margin-top: 0.7rem; }
  .identity-card--default .identity-card__links {
    align-self: stretch;
    justify-content: center;
    width: auto;
    margin-top: auto;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(186, 214, 255, 0.18);
  }
  .identity-card--default .identity-card__links a {
    position: relative;
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    min-height: 2.25rem;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(186, 214, 255, 0.22);
    border-radius: 50%;
    background: rgba(7, 20, 43, 0.58);
  }
  .identity-card--default .identity-card__links a:hover,
  .identity-card--default .identity-card__links a:focus-visible {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.16);
  }
  .identity-card--default .identity-card__links strong {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .identity-card--default .identity-card__link-glyph { width: 1.05rem; height: 1.05rem; }

  .identity-card--layout-split-signal { display: grid; grid-template-columns: minmax(6rem, 0.38fr) minmax(0, 0.62fr); grid-template-rows: auto auto; column-gap: 1.5rem; border-left: 2px solid color-mix(in srgb, var(--identity-accent) 58%, rgba(255, 255, 255, 0.12)); border-radius: var(--profile-border-radius, 0 var(--radius-lg) var(--radius-lg) 0); }
  .identity-card--layout-split-signal .identity-card__person,
  .identity-card--layout-archive-index .identity-card__person,
  .identity-card--layout-prism-mosaic .identity-card__person,
  .identity-card--layout-night-terminal .identity-card__person { display: contents; }
  .identity-card--layout-split-signal :global(.identity-card__avatar) { grid-column: 1; grid-row: 1 / span 2; align-self: center; justify-self: center; }
  .identity-card--layout-split-signal .identity-card__copy { grid-column: 2; grid-row: 1; padding-left: 1.25rem; border-left: 1px solid color-mix(in srgb, var(--identity-accent) 28%, rgba(255, 255, 255, 0.12)); }
  .identity-card--layout-split-signal .identity-card__links { grid-column: 2; grid-row: 2; padding: 0.9rem 0 0 1.25rem; border-left: 1px solid color-mix(in srgb, var(--identity-accent) 28%, rgba(255, 255, 255, 0.12)); }

  .identity-card--layout-archive-index { display: grid; grid-template-columns: minmax(4.75rem, 0.3fr) minmax(0, 0.7fr); grid-template-rows: auto auto auto; column-gap: 1.35rem; border-radius: var(--profile-border-radius, 0); box-shadow: none; }
  .identity-card--layout-archive-index::before { content: '01 / IDENTITY'; grid-column: 1 / -1; display: block; margin-bottom: 1rem; color: color-mix(in srgb, var(--identity-accent) 82%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.14em; }
  .identity-card--layout-archive-index :global(.identity-card__avatar) { grid-column: 1; grid-row: 2 / span 2; align-self: start; justify-self: center; }
  .identity-card--layout-archive-index .identity-card__copy { grid-column: 2; grid-row: 2; padding-top: 0; }
  .identity-card--layout-archive-index .identity-card__links { grid-column: 2; grid-row: 3; padding-top: 0.7rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }

  .identity-card--layout-prism-mosaic { display: grid; grid-template-columns: minmax(7rem, 0.46fr) minmax(0, 0.54fr); grid-template-rows: auto auto; column-gap: 1.4rem; border-color: color-mix(in srgb, var(--identity-accent) 45%, rgba(255, 255, 255, 0.14)); box-shadow: 0 1.5rem 3rem color-mix(in srgb, var(--identity-accent) 12%, transparent), inset 0 1px 0 color-mix(in srgb, var(--identity-accent) 22%, transparent); }
  .identity-card--layout-prism-mosaic :global(.identity-card__avatar) { grid-column: 1; grid-row: 1 / span 2; align-self: center; justify-self: center; }
  .identity-card--layout-prism-mosaic .identity-card__copy { grid-column: 2; grid-row: 1; padding: 0 0 0 1rem; border-left: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }
  .identity-card--layout-prism-mosaic .identity-card__name-row { padding-bottom: 0.7rem; border-bottom: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }
  .identity-card--layout-prism-mosaic .identity-card__links { grid-column: 2; grid-row: 2; padding: 0.8rem 0 0 1rem; border-left: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }

  .identity-card--layout-night-terminal { display: grid; grid-template-columns: minmax(4.5rem, 0.28fr) minmax(0, 0.72fr); grid-template-rows: auto auto auto; column-gap: 1rem; border: 1px solid color-mix(in srgb, var(--identity-accent) 38%, rgba(255, 255, 255, 0.12)); border-radius: var(--profile-border-radius, 2px); background: var(--profile-surface-fill, rgba(3, 8, 12, 0.84)); }
  .identity-card--layout-night-terminal::before { content: 'PROFILE / LIVE'; grid-column: 1 / -1; display: block; margin-bottom: 1rem; color: color-mix(in srgb, var(--identity-accent) 82%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0.14em; }
  .identity-card--layout-night-terminal :global(.identity-card__avatar) { grid-column: 1; grid-row: 2; align-self: start; justify-self: center; }
  .identity-card--layout-night-terminal .identity-card__copy { grid-column: 2; grid-row: 2; font-family: var(--font-mono-stack); }
  .identity-card--layout-night-terminal .identity-card__links { grid-column: 1 / -1; grid-row: 3; gap: 0.4rem 0.75rem; padding-top: 0.8rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); font-family: var(--font-mono-stack); }
  .identity-card--layout-night-terminal .identity-card__handle { font-family: var(--font-mono-stack); }
  .identity-card--layout-night-terminal .identity-card__name { letter-spacing: -0.04em; }

  .identity-card--layout-story-stack { padding-block: clamp(2rem, 5vw, 3.5rem); border-radius: var(--radius-xl) var(--radius-md) var(--radius-xl) var(--radius-md); }
  .identity-card--layout-story-stack .identity-card__person { flex-direction: column; align-items: stretch; gap: 1.4rem; }
  .identity-card--layout-story-stack :global(.identity-card__avatar) { flex-basis: clamp(6.5rem, 12vw, 8rem); width: clamp(6.5rem, 12vw, 8rem); }
  .identity-card--layout-story-stack .identity-card__copy { width: 100%; padding-top: 0; }
  .identity-card--layout-story-stack .identity-card__links { margin-top: 1.2rem; padding-top: 0.9rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, 0.12)); }
  .identity-card--layout-story-stack .identity-card__bio { max-width: 34rem; font-size: 1rem; }

  /* Paid layouts can be rendered inside public cards, Studio previews, or
     other narrow hosts. Adapt to the card's actual width instead of keeping
     a two-column identity rail until its text has nowhere left to go. */
  @container identity-card (max-width: 24rem) {
    .identity-card--layout-split-signal,
    .identity-card--layout-archive-index,
    .identity-card--layout-prism-mosaic,
    .identity-card--layout-night-terminal {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .identity-card--layout-split-signal .identity-card__person,
    .identity-card--layout-archive-index .identity-card__person,
    .identity-card--layout-prism-mosaic .identity-card__person,
    .identity-card--layout-night-terminal .identity-card__person {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .identity-card--layout-split-signal :global(.identity-card__avatar),
    .identity-card--layout-archive-index :global(.identity-card__avatar),
    .identity-card--layout-prism-mosaic :global(.identity-card__avatar),
    .identity-card--layout-night-terminal :global(.identity-card__avatar) {
      align-self: center;
      justify-self: auto;
    }

    .identity-card--layout-split-signal .identity-card__copy,
    .identity-card--layout-split-signal .identity-card__links,
    .identity-card--layout-archive-index .identity-card__copy,
    .identity-card--layout-archive-index .identity-card__links,
    .identity-card--layout-prism-mosaic .identity-card__copy,
    .identity-card--layout-prism-mosaic .identity-card__links,
    .identity-card--layout-night-terminal .identity-card__copy,
    .identity-card--layout-night-terminal .identity-card__links {
      width: 100%;
      box-sizing: border-box;
      padding-left: 0;
      border-left: 0;
    }

    .identity-card--layout-split-signal .identity-card__links,
    .identity-card--layout-archive-index .identity-card__links,
    .identity-card--layout-prism-mosaic .identity-card__links,
    .identity-card--layout-night-terminal .identity-card__links {
      margin-top: .9rem;
      padding-top: .8rem;
      border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, .12));
    }

    .identity-card__bio--typewriter {
      max-width: 100%;
      overflow: visible;
      border-right-color: transparent;
      white-space: normal;
      animation: none;
    }
  }

  /* Explicitly stack the card when rendered inside the dashboard phone. The
     canvas can be narrow while the browser viewport remains desktop-sized. */
  .identity-card--preview-mobile { display: flex; width: 100%; box-sizing: border-box; flex-direction: column; align-items: stretch; gap: 1rem; padding: 1.1rem; }
  .identity-card--preview-mobile .identity-card__person { display: flex; flex-direction: column; align-items: stretch; gap: 1rem; width: 100%; }
  .identity-card--preview-mobile :global(.identity-card__avatar) { align-self: center; justify-self: auto; flex-basis: 5.2rem; width: 5.2rem; }
  .identity-card--preview-mobile .identity-card__copy,
  .identity-card--preview-mobile .identity-card__links { grid-column: auto; grid-row: auto; width: 100%; box-sizing: border-box; padding-left: 0; border-left: 0; }
  .identity-card--preview-mobile .identity-card__copy { padding-top: 0; }
  .identity-card--preview-mobile .identity-card__name-row { align-items: flex-start; }
  .identity-card--preview-mobile .identity-card__name { font-size: clamp(1.55rem, 9vw, 2.2rem); line-height: 1; }
  .identity-card--preview-mobile .identity-card__links { margin-top: .9rem; padding-top: .8rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 30%, rgba(255, 255, 255, .12)); }

  /* An equipped profile border owns the card perimeter. Keep accent styling
     available for the profile interior, but remove the competing card edge. */
  :global(.profile-border-effect:not(.profile-border-effect--none) .identity-card) {
    border: 0;
    border-radius: inherit;
    box-shadow: none;
  }

  .identity-card__person,
  .identity-card__links,
  .identity-card__divider,
  .identity-card__today {
    transition: opacity var(--motion-base) var(--motion-ease-standard), transform var(--motion-base) var(--motion-ease-standard), filter var(--motion-base) var(--motion-ease-standard);
  }

  .identity-card--roll-rolling .identity-card__person,
  .identity-card--roll-rolling .identity-card__links,
  .identity-card--roll-rolling .identity-card__divider {
    opacity: 0.42;
    filter: saturate(0.68);
  }

  .identity-card--roll-rolling .identity-card__person {
    transform: translateY(0.2rem) scale(0.985);
  }

  .identity-card--roll-rolling .identity-card__today {
    transform: scale(1.018);
  }

  .identity-card--roll-settled .identity-card__person {
    animation: identity-card-roll-person 0.9s var(--motion-ease-emphasis);
  }

  .identity-card--roll-settled .identity-card__today {
    animation: identity-card-roll-today 0.78s var(--motion-ease-emphasis);
  }

  @keyframes identity-card-roll-person {
    0% { transform: translateY(0.2rem) scale(0.985); filter: saturate(0.68); }
    45% { transform: translateY(-0.12rem) scale(1.012); filter: saturate(1.14); }
    100% { transform: translateY(0) scale(1); filter: saturate(1); }
  }

  @keyframes identity-card-roll-today {
    0% { transform: scale(1.018); }
    40% { transform: scale(0.99); }
    100% { transform: scale(1); }
  }
  @keyframes identity-card-typewriter { from { max-width: 0; } to { max-width: 28rem; } }
  @keyframes identity-card-caret { 50% { border-color: transparent; } }

  .identity-card--entry-fade { animation: identity-card-entry-fade .65s var(--motion-ease-standard) both; }
  .identity-card--entry-rise { animation: identity-card-entry-rise .7s var(--motion-ease-emphasis) both; }
  .identity-card--entry-focus { animation: identity-card-entry-focus .75s var(--motion-ease-emphasis) both; }
  @keyframes identity-card-entry-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes identity-card-entry-rise { from { opacity: 0; transform: translateY(.75rem); } to { opacity: 1; transform: translateY(0); } }
  @keyframes identity-card-entry-focus { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } }

  @media (max-width: 36rem) {
    .identity-card { padding: 1.35rem; border-radius: var(--radius-md); }
    :global(.identity-card__avatar) { flex-basis: 4.75rem; width: 4.75rem; }
    .identity-card__name { font-size: clamp(1.75rem, 9vw, 2.35rem); }
    .identity-card__bio { font-size: 0.875rem; }
    .identity-card__links { margin-top: 0.8rem; }

    .identity-card--layout-editorial { border-radius: var(--profile-border-radius, 0); }
    .identity-card--layout-focus { border-radius: var(--profile-border-radius, var(--radius-md)); }
    .identity-card--layout-split-signal,
    .identity-card--layout-archive-index,
    .identity-card--layout-prism-mosaic,
    .identity-card--layout-night-terminal { grid-template-columns: minmax(4.5rem, 0.33fr) minmax(0, 0.67fr); column-gap: 0.85rem; }
    .identity-card--layout-split-signal .identity-card__copy,
    .identity-card--layout-split-signal .identity-card__links,
    .identity-card--layout-prism-mosaic .identity-card__copy,
    .identity-card--layout-prism-mosaic .identity-card__links { padding-left: 0.8rem; }
    .identity-card--layout-archive-index::before,
    .identity-card--layout-night-terminal::before { margin-bottom: 0.75rem; }
    .identity-card--layout-story-stack { padding-block: 1.8rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .identity-card__links a,
    .identity-card__handle { transition-duration: 0.001ms; }

    .identity-card__person,
    .identity-card__links,
    .identity-card__divider,
    .identity-card__today {
      transition-duration: 0.001ms;
    }

    .identity-card--roll-settled .identity-card__person,
    .identity-card--roll-settled .identity-card__today,
    .identity-card--entry-fade,
    .identity-card--entry-rise,
    .identity-card--entry-focus,
    .identity-card__bio--typewriter {
      animation: none;
      max-width: 28rem;
      border-right-color: transparent;
    }
  }
</style>
