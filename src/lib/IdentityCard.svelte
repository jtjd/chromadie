<script>
  import Media from './foundation/Media.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';
  import { isProfileLayoutKey } from './profile-layout/profileLayouts.js';
  import { getProfileLinkDefinition } from './profileLinkTypes.js';

  export let username = 'Unknown Player';
  export let displayName = '';
  export let profilePath = '';
  export let bio = '';
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
  export let layoutVariant = 'compact';
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
  $: safeLayoutVariant = isProfileLayoutKey(layoutVariant) ? layoutVariant : 'compact';
  /** @type {any} */
  let safeLinkStyle;
  $: safeLinkStyle = linkStyle || {};

  function linkIconSource(link) {
    return '/link-icons/' + getProfileLinkDefinition(link?.type).icon + '.svg';
  }
</script>

<section class={'identity-card identity-card--roll-' + rollState + ' identity-card--layout-' + safeLayoutVariant + (defaultPresentation ? ' identity-card--default' : '') + (previewDevice === 'mobile' ? ' identity-card--preview-mobile' : '') + ' identity-card--entry-' + entryAnimation} data-profile-path={profilePath || undefined} style={'--identity-accent: ' + accentColor + '; --identity-base-color: ' + nameRendererBaseColor + '; --profile-link-align: ' + (safeLinkStyle.alignment || 'left') + '; --profile-link-size: ' + (1 + Number(safeLinkStyle.size || 0) * .08) + '; --profile-link-glow: ' + (Number(safeLinkStyle.glow || 0) * .18) + ';'} aria-labelledby={titleId}>
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
      {#if bio}<p class={'identity-card__bio identity-card__bio--' + descriptionMode}>{bio}</p>{/if}
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
    <nav class={'identity-card__links' + (safeLayoutVariant === 'minimal' ? ' identity-card__links--labeled' : '')} aria-label={safeDisplayName + ' social links'}>
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
  .identity-card__links a:focus-visible { outline: 2px solid var(--profile-highlight, var(--color-accent-bright)); outline-offset: 4px; border-radius: 0.25rem; }

  .identity-card__divider { height: 1px; margin: 1.65rem 0 1.45rem; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--identity-accent) 22%, rgba(230, 238, 255, 0.16)), transparent); }
  .identity-card__today :global(.profile-roll--integrated) { width: 100%; }

  .identity-card__bio--typewriter {
    max-width: 100%;
    overflow: visible;
    border-right-color: transparent;
    white-space: normal;
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

  }

  @media (prefers-reduced-motion: reduce) {
    .identity-card__links a { transition-duration: 0.001ms; }

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

  /* The active catalog is intentionally small and background-first. These
     rules are kept together so the five layouts share the same identity,
     social-link and cosmetic renderers without importing theme-specific
     geometry. */
  .identity-card--default {
    min-height: 0;
    background-color: var(--profile-surface-fill, rgba(9, 11, 15, .64));
    background-image: none;
    box-shadow: 0 .9rem 2.5rem rgba(0, 0, 0, .24);
  }

  .identity-card--layout-compact,
  .identity-card--layout-sleek,
  .identity-card--layout-minimal,
  .identity-card--layout-modern,
  .identity-card--layout-portfolio {
    box-sizing: border-box;
    max-width: 100%;
    padding: 1.1rem;
  }

  .identity-card--layout-compact { max-width: 300px; }
  .identity-card--layout-sleek { max-width: 335px; padding: 1rem; }
  .identity-card--layout-modern { max-width: 310px; padding: 1rem; }
  .identity-card--layout-portfolio { max-width: 320px; padding: 1rem; background: transparent; border-color: transparent; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .identity-card--layout-minimal { max-width: 280px; padding: .25rem 0; border-color: transparent; background: transparent; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }

  .identity-card--layout-compact .identity-card__person { flex-direction: row; align-items: center; gap: .75rem; }
  .identity-card--layout-minimal .identity-card__person,
  .identity-card--layout-portfolio .identity-card__person { flex-direction: column; align-items: center; gap: .7rem; }
  .identity-card--layout-compact .identity-card__copy { width: auto; padding-top: 0; text-align: left; }
  .identity-card--layout-minimal .identity-card__copy,
  .identity-card--layout-portfolio .identity-card__copy { width: 100%; padding-top: 0; text-align: center; }
  .identity-card--layout-compact .identity-card__name-row,
  .identity-card--layout-minimal .identity-card__name-row,
  .identity-card--layout-portfolio .identity-card__name-row,
  .identity-card--layout-compact .identity-card__metadata,
  .identity-card--layout-minimal .identity-card__metadata,
  .identity-card--layout-portfolio .identity-card__metadata { justify-content: center; }
  .identity-card--layout-compact .identity-card__bio,
  .identity-card--layout-minimal .identity-card__bio,
  .identity-card--layout-portfolio .identity-card__bio { margin-inline: auto; }

  .identity-card--layout-sleek .identity-card__person,
  .identity-card--layout-modern .identity-card__person { gap: .8rem; }
  .identity-card--layout-compact :global(.identity-card__avatar) { flex-basis: 54px; width: 54px; }
  .identity-card--layout-sleek :global(.identity-card__avatar) { flex-basis: 52px; width: 52px; border-radius: 14px; }
  .identity-card--layout-modern :global(.identity-card__avatar) { flex-basis: 50px; width: 50px; border-radius: 13px; }
  .identity-card--layout-minimal :global(.identity-card__avatar) { flex-basis: 74px; width: 74px; }
  .identity-card--layout-portfolio :global(.identity-card__avatar) { flex-basis: 72px; width: 72px; }
  .identity-card--layout-sleek :global(.identity-card__avatar-media),
  .identity-card--layout-modern :global(.identity-card__avatar-media) { border-radius: inherit; clip-path: none; }
  .identity-card--layout-compact :global(.identity-card__avatar-letter),
  .identity-card--layout-sleek :global(.identity-card__avatar-letter),
  .identity-card--layout-modern :global(.identity-card__avatar-letter) { font-size: 1.9rem; }
  .identity-card--layout-portfolio :global(.identity-card__avatar-letter) { font-size: 2.4rem; }

  .identity-card--layout-compact .identity-card__name { font-size: clamp(1.25rem, 5vw, 1.45rem); line-height: 1; }
  .identity-card--layout-modern .identity-card__name { font-size: clamp(1.3rem, 5vw, 1.5rem); line-height: 1; }
  .identity-card--layout-sleek .identity-card__name { font-size: clamp(1.4rem, 6vw, 1.7rem); line-height: 1; }
  .identity-card--layout-minimal .identity-card__name { font-size: clamp(1.65rem, 7vw, 1.95rem); line-height: 1; }
  .identity-card--layout-portfolio .identity-card__name { font-size: clamp(1.55rem, 7vw, 1.8rem); line-height: 1; }
  .identity-card--layout-compact .identity-card__bio,
  .identity-card--layout-sleek .identity-card__bio,
  .identity-card--layout-modern .identity-card__bio,
  .identity-card--layout-portfolio .identity-card__bio { margin-top: .5rem; font-size: .78rem; line-height: 1.45; }
  .identity-card--layout-minimal .identity-card__bio { margin-top: .45rem; font-size: .86rem; line-height: 1.5; }
  .identity-card--layout-compact .identity-card__metadata,
  .identity-card--layout-sleek .identity-card__metadata,
  .identity-card--layout-modern .identity-card__metadata,
  .identity-card--layout-portfolio .identity-card__metadata { margin-top: .5rem; font-size: .58rem; }

  .identity-card--layout-compact .identity-card__links,
  .identity-card--layout-sleek .identity-card__links,
  .identity-card--layout-modern .identity-card__links,
  .identity-card--layout-portfolio .identity-card__links { justify-content: center; gap: .25rem; margin-top: .7rem; padding-top: .65rem; border-top: 1px solid color-mix(in srgb, var(--identity-accent) 22%, rgba(255,255,255,.1)); }
  .identity-card--layout-minimal .identity-card__links { display: grid; gap: .25rem; margin-top: .8rem; }
  .identity-card--layout-compact .identity-card__links a,
  .identity-card--layout-sleek .identity-card__links a,
  .identity-card--layout-modern .identity-card__links a,
  .identity-card--layout-portfolio .identity-card__links a { display: grid; width: 2.5rem; height: 2.5rem; min-height: 2.5rem; place-items: center; padding: 0; border: 0; border-radius: 50%; }
  .identity-card--layout-compact .identity-card__links a:hover,
  .identity-card--layout-sleek .identity-card__links a:hover,
  .identity-card--layout-modern .identity-card__links a:hover,
  .identity-card--layout-portfolio .identity-card__links a:hover { background: color-mix(in srgb, var(--identity-accent) 12%, transparent); transform: none; }
  .identity-card--layout-compact .identity-card__links strong,
  .identity-card--layout-sleek .identity-card__links strong,
  .identity-card--layout-modern .identity-card__links strong,
  .identity-card--layout-portfolio .identity-card__links strong { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .identity-card--layout-compact .identity-card__link-glyph,
  .identity-card--layout-sleek .identity-card__link-glyph,
  .identity-card--layout-minimal .identity-card__link-glyph,
  .identity-card--layout-modern .identity-card__link-glyph,
  .identity-card--layout-portfolio .identity-card__link-glyph { width: 1.05rem; height: 1.05rem; }
  .identity-card--layout-minimal .identity-card__links--labeled a { display: flex; width: 100%; height: auto; min-height: 2.5rem; justify-content: space-between; padding: .25rem .35rem; border-bottom: 1px solid color-mix(in srgb, var(--identity-accent) 18%, transparent); border-radius: 0; }
  .identity-card--layout-minimal .identity-card__links--labeled strong { position: static; width: auto; height: auto; overflow: visible; clip: auto; clip-path: none; color: inherit; font-size: .72rem; white-space: normal; }
  .identity-card--layout-minimal .identity-card__links--labeled a:hover { background: color-mix(in srgb, var(--identity-accent) 8%, transparent); transform: none; }
  .identity-card__badge { width: 1.1rem; height: 1.1rem; font-size: .62rem; }
  .identity-card__badge--staff { min-width: 3.25rem; font-size: .5rem; }

  @container identity-card (max-width: 24rem) {
    .identity-card--layout-sleek,
    .identity-card--layout-modern { padding: .9rem; }
    .identity-card--layout-sleek .identity-card__person,
    .identity-card--layout-modern .identity-card__person { align-items: flex-start; }
  }

  @media (max-width: 36rem) {
    .identity-card--layout-compact,
    .identity-card--layout-sleek,
    .identity-card--layout-modern,
    .identity-card--layout-portfolio { padding: .95rem; }
    .identity-card--layout-minimal { padding-inline: 0; }
  }
</style>
