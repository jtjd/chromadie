<script>
  import Media from './foundation/Media.svelte';

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
  export let nameClass = '';
  export let nameStyle = '';
  export let frameClass = '';
  export let frameStyle = '';
  export let avatarSrc = '';
  export let rollState = 'idle';
  export let showToday = true;
  export let titleId = 'identity-card-title';
  export let showAvatarMark = true;
  export let avatarLoading = 'eager';
  export let headingTag = 'h1';

  let failedAvatarSource = '';

  $: safeDisplayName = displayName || username;
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: displayedLinks = (Array.isArray(links) ? links : []).slice(0, 6);
  $: displayedBadges = (Array.isArray(badges) ? badges : [])
    .filter(badge => badge?.id !== 'launch_edition')
    .slice(0, 3);

  function linkIconSource(link) {
    const type = String(link?.type || 'link').toLowerCase();
    return ['/github', '/instagram', '/tiktok', '/twitch', '/youtube'].includes('/' + type)
      ? '/link-icons/' + type + '.svg'
      : '/link-icons/link.svg';
  }
</script>

<section class={'identity-card identity-card--roll-' + rollState} style={'--identity-accent: ' + accentColor + ';'} aria-labelledby={titleId}>
  <div class="identity-card__person">
    <div class={'identity-card__avatar ' + frameClass} style={frameStyle}>
      {#if avatarSrc && failedAvatarSource !== avatarSrc}
        <img class="identity-card__avatar-media" src={avatarSrc} alt={safeDisplayName + ' avatar'} loading={avatarLoading === 'lazy' ? 'lazy' : 'eager'} decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
      {:else}
        <span class="identity-card__avatar-glow" aria-hidden="true"></span>
        <span class="identity-card__avatar-letter" aria-hidden="true">{safeInitial}</span>
        {#if showAvatarMark}<Media src="/logo-mark.svg" alt="" aspect="square" loading="eager" className="identity-card__avatar-mark" />{/if}
      {/if}
    </div>

    <div class="identity-card__copy">
      <div class="identity-card__name-row">
        <svelte:element this={headingTag} id={titleId} class={'identity-card__name ' + nameClass} style={nameStyle}>{safeDisplayName}</svelte:element>
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
      {#if bio}<p class="identity-card__bio">{bio}</p>
      {:else if bioFallback}<p class="identity-card__bio identity-card__bio--fallback">{bioFallback}</p>{/if}

      {#if displayedLinks.length}
        <nav class="identity-card__links" aria-label={safeDisplayName + ' social links'}>
          {#each displayedLinks as link (link.order)}
            <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={String(link.type || 'Link') + ': ' + link.label} title={String(link.type || 'Link')}>
              <span class="identity-card__link-glyph" aria-hidden="true"><img src={linkIconSource(link)} alt="" loading="lazy" /></span>
              <strong>{link.label}</strong>
            </a>
          {/each}
        </nav>
      {/if}
    </div>
  </div>

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
    width: 100%;
    margin: 0 auto;
    padding: clamp(1.5rem, 3.5vw, 2.25rem);
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: var(--radius-lg);
    background: rgba(9, 11, 15, 0.64);
    --identity-avatar-accent: #5D6A73;
    box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.045);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(24px);
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

  .identity-card__avatar {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 clamp(5rem, 8vw, 5.75rem);
    width: clamp(5rem, 8vw, 5.75rem);
    aspect-ratio: 1;
    overflow: hidden;
    border: 1px solid rgba(239, 244, 255, 0.18);
    border-radius: 50%;
    background: radial-gradient(circle at 36% 28%, rgba(255, 255, 255, 0.26), var(--identity-avatar-accent) 42%, rgba(3, 6, 11, 0.92) 100%);
    box-shadow: 0 0 2rem color-mix(in srgb, var(--identity-avatar-accent) 28%, transparent), inset 0 0 1.4rem rgba(255, 255, 255, 0.13);
  }

  .identity-card__avatar-glow { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 56%); filter: blur(0.7rem); opacity: 0.6; }
  .identity-card__avatar-letter { position: relative; z-index: 1; color: rgba(250, 252, 255, 0.94); font: 600 clamp(2.25rem, 6vw, 3.25rem) / 1 var(--font-display-stack); letter-spacing: -0.08em; text-shadow: 0 0 1.5rem color-mix(in srgb, var(--identity-avatar-accent) 70%, transparent); }
  .identity-card__avatar-mark { position: absolute; z-index: 2; inset: 26%; opacity: 0.14; border: 0; border-radius: 0; background: transparent; }
  .identity-card__avatar-media { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 0; background: transparent; }
  .identity-card__avatar-media :global(.foundation-media__fallback) { border: 0; border-radius: 0; }

  .identity-card__copy { min-width: 0; flex: 1; padding-top: 0.15rem; text-align: left; }
  .identity-card__name-row { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.45rem 0.55rem; }
  .identity-card__name { max-width: 100%; margin: 0; color: rgba(248, 250, 255, 0.98); font: 700 clamp(1.85rem, 3.8vw, 2.55rem) / 0.98 var(--font-display-stack); letter-spacing: -0.055em; overflow-wrap: anywhere; }
  .identity-card__badges { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0.28rem; }
  .identity-card__badge { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border: 1px solid color-mix(in srgb, var(--identity-accent) 42%, transparent); border-radius: 50%; background: color-mix(in srgb, var(--identity-accent) 14%, rgba(255, 255, 255, 0.06)); color: color-mix(in srgb, var(--identity-accent) 82%, white); font-size: 0.72rem; line-height: 1; }
  .identity-card__badge--founder { background: color-mix(in srgb, var(--identity-accent) 22%, transparent); }
  .identity-card__badge--staff { display: inline-flex; width: auto; min-width: 3.85rem; gap: 0.22rem; padding: 0 0.42rem; border-color: color-mix(in srgb, var(--color-accent-cyan) 72%, transparent); border-radius: 0.42rem; background: color-mix(in srgb, var(--color-accent-cyan) 18%, transparent); color: var(--color-accent-cyan); font: 700 0.56rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .identity-card__handle-row { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.6rem 0.8rem; margin-top: 0.38rem; }
  .identity-card__handle { display: inline-block; color: rgba(220, 230, 248, 0.62); font: 600 0.75rem / 1.25 var(--font-mono-stack); text-decoration: none; letter-spacing: 0.05em; }
  .identity-card__handle:hover { color: color-mix(in srgb, var(--identity-accent) 85%, white); }
  .identity-card__bio { max-width: 28rem; margin: 0.7rem 0 0; color: rgba(226, 233, 246, 0.72); font-size: 0.84rem; line-height: 1.55; overflow-wrap: anywhere; word-break: break-word; }

  .identity-card__links { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 0.55rem 1rem; margin-top: 0.95rem; }
  .identity-card__links a { display: inline-flex; align-items: center; gap: 0.38rem; min-height: 2rem; max-width: 100%; padding: 0.25rem 0 0.3rem; border: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.16); border-radius: 0; background: transparent; color: rgba(220, 230, 248, 0.7); font-size: 0.78rem; text-decoration: none; transition: border-color var(--motion-base) var(--motion-ease-standard), color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard); }
  .identity-card__links a:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--identity-accent) 72%, white); color: rgba(248, 250, 255, 0.96); }
  .identity-card__link-glyph { display: grid; place-items: center; width: 1rem; height: 1rem; border-radius: 0; background: transparent; color: color-mix(in srgb, var(--identity-accent) 84%, white); font: 700 0.62rem / 1 var(--font-mono-stack); letter-spacing: 0; }
  .identity-card__link-glyph img { display: block; width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.78; }
  .identity-card__links strong { min-width: 0; color: inherit; font-weight: 600; overflow-wrap: anywhere; }
  .identity-card__links a:focus-visible,
  .identity-card__handle:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: 0.25rem; }

  .identity-card__divider { height: 1px; margin: 1.65rem 0 1.45rem; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--identity-accent) 22%, rgba(230, 238, 255, 0.16)), transparent); }
  .identity-card__today :global(.profile-roll--integrated) { width: 100%; }

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

  @media (max-width: 36rem) {
    .identity-card { padding: 1.35rem; border-radius: var(--radius-md); }
    .identity-card__avatar { flex-basis: 4.75rem; width: 4.75rem; }
    .identity-card__name { font-size: clamp(1.75rem, 9vw, 2.35rem); }
    .identity-card__bio { font-size: 0.875rem; }
    .identity-card__links { margin-top: 0.8rem; }
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
    .identity-card--roll-settled .identity-card__today {
      animation: none;
    }
  }
</style>
