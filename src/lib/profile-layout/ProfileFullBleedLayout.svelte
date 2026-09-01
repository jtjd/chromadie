<script>
  import AvatarEffect from '../avatar-effect/AvatarEffect.svelte';
  import NameEffectCanvas from '../name/NameEffectCanvas.svelte';
  import ProfileBorderEffect from '../profile-border/ProfileBorderEffect.svelte';
  import ProfileRollSummary from '../ProfileRollSummary.svelte';
  import { getProfileLinkDefinition } from '../profileLinkTypes.js';
  import { PROFILE_LINK_LIMITS } from '../profileConfig.js';
  import { normalizeHexColor } from '../utils.js';

  export let displayName = 'Unknown Player';
  export let bio = '';
  export let avatarSrc = '';
  export let avatarFallbackSrc = '';
  export let bannerSrc = '';
  export let avatarEffectKey = '';
  export let nameLoadout = null;
  export let nameTodayColor = '#8B7CF6';
  export let nameBaseColor = '#FFFFFF';
  export let nameRecentColors = [];
  export let profileBorderKey = '';
  export let location = '';
  export let timezone = '';
  export let joinedLabel = '';
  export let showJoinDate = false;
  export let showAvatar = true;
  export let descriptionMode = 'plain';
  export let entryAnimation = 'none';
  export let links = [];
  export let linkStyle = null;
  export let accentColor = '#00FFB3';
  export let roll = null;
  export let surfaceStyle = '';
  export let layoutVariant = 'full-bleed';
  export let colorizeAvatarEffect = false;
  export let onEntryClick = entryKey => { void entryKey; };

  let failedAvatarSource = '';
  let failedBannerSource = '';

  $: safeDisplayName = String(displayName || 'Unknown Player').trim().slice(0, 80) || 'Unknown Player';
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: activeAvatarSource = avatarSrc && failedAvatarSource !== avatarSrc ? avatarSrc : avatarFallbackSrc;
  $: activeBannerSource = bannerSrc && failedBannerSource !== bannerSrc ? bannerSrc : '';
  $: rollHex = normalizeHexColor((/** @type {any} */ (roll || {})).hex_code || (/** @type {any} */ (roll || {})).hex, '');
  $: safeDescriptionMode = descriptionMode === 'typewriter' ? 'typewriter' : 'plain';
  $: safeEntryAnimation = ['none', 'fade', 'focus', 'pop', 'unfold'].includes(entryAnimation) ? entryAnimation : 'none';
  $: safeAccent = normalizeHexColor(accentColor, '#00FFB3');
  $: safeLinkScale = 1 + Number((/** @type {any} */ (linkStyle || {})).size || 0) * .16;
  $: safeLinkGlow = Number((/** @type {any} */ (linkStyle || {})).glow || 0);
  $: visibleLinks = (Array.isArray(links) ? links : [])
    .filter(link => link && typeof link.url === 'string' && link.url)
    .slice(0, PROFILE_LINK_LIMITS.maxLinks)
    .map(link => ({ ...link, definition: getProfileLinkDefinition(link.type) }));
  $: metadata = [
    location,
    timezone,
    showJoinDate && joinedLabel ? `Joined ${joinedLabel}` : ''
  ].filter(Boolean);

  function linkIconSource(link) {
    return `/link-icons/${link.definition.icon}.svg`;
  }
</script>

<ProfileBorderEffect
  borderKey={profileBorderKey}
  surfaceStyle={surfaceStyle}
  className="profile-full-bleed__boundary profile-border-effect--content"
  animated={true}
>
  <section
    class={`profile-full-bleed profile-full-bleed--${layoutVariant} profile-full-bleed--entry-${safeEntryAnimation} ${rollHex ? 'profile-full-bleed--has-roll' : 'profile-full-bleed--no-roll'} ${showAvatar ? 'profile-full-bleed--has-avatar' : 'profile-full-bleed--no-avatar'} ${activeBannerSource && layoutVariant === 'sleek' ? 'profile-full-bleed--has-banner' : 'profile-full-bleed--no-banner'}`}
    style={`${surfaceStyle || ''};--profile-full-bleed-accent:${safeAccent};--profile-full-bleed-link-scale:${safeLinkScale};--profile-full-bleed-link-glow:${safeLinkGlow};`}
    aria-label={`${safeDisplayName} profile`}
    data-profile-layout-content={layoutVariant}
  >
    {#if activeBannerSource && layoutVariant === 'sleek'}
      <div class="profile-full-bleed__banner" aria-hidden="true">
        <img src={activeBannerSource} alt="" loading="eager" decoding="async" on:error={() => failedBannerSource = bannerSrc} />
      </div>
    {/if}
    {#if showAvatar}
      <div class="profile-full-bleed__avatar-shell">
        <AvatarEffect
          effectKey={avatarEffectKey}
          accentColor={safeAccent}
          recentColors={nameRecentColors}
          mode="profile"
          animated={true}
          active={true}
          avatarSrc={activeAvatarSource}
          fallbackText={safeInitial}
          colorizeLiquidBlob={colorizeAvatarEffect}
          className="profile-full-bleed__avatar-effect"
        >
          {#if activeAvatarSource}
            <img
              class="profile-full-bleed__avatar"
              src={activeAvatarSource}
              alt={`${safeDisplayName} avatar`}
              loading="eager"
              decoding="async"
              on:error={() => failedAvatarSource = avatarSrc}
            />
          {:else}
            <span class="profile-full-bleed__avatar-fallback" aria-hidden="true">{safeInitial}</span>
          {/if}
        </AvatarEffect>
      </div>
    {/if}

    {#if nameLoadout}
      <NameEffectCanvas
        text={safeDisplayName}
        loadout={nameLoadout}
        todayColor={nameTodayColor}
        baseColor={nameBaseColor}
        recentColors={nameRecentColors}
        context="profile"
        mode="animated"
        semanticTag="h1"
        semanticClass="profile-full-bleed__name"
      />
    {:else}
      <h1 class="profile-full-bleed__name">{safeDisplayName}</h1>
    {/if}

    {#if bio}
      <p class={`profile-full-bleed__bio profile-full-bleed__bio--${safeDescriptionMode}`}>{bio}</p>
    {/if}

    {#if metadata.length}
      <div class="profile-full-bleed__metadata" aria-label="Profile details">
        {#each metadata as item, index (item)}
          {#if index}<span aria-hidden="true">·</span>{/if}
          <span>{item}</span>
        {/each}
      </div>
    {/if}

    {#if rollHex}
      <div class="profile-full-bleed__roll" data-profile-roll-slot="summary">
        <ProfileRollSummary result={roll} accentColor={safeAccent} label="Daily color" compact={layoutVariant === 'sleek'} />
      </div>
    {/if}

    {#if visibleLinks.length}
      <nav class="profile-full-bleed__links" aria-label={`${safeDisplayName} profile links`}>
        {#each visibleLinks as link, index (link.key || link.order || link.url || index)}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label || link.definition.label}
            title={link.label || link.definition.label}
            on:click={() => onEntryClick(link.key || `link-${link.order ?? index}`)}
          >
            <img src={linkIconSource(link)} alt="" loading="lazy" aria-hidden="true" />
            <span>{link.label || link.definition.label}</span>
          </a>
        {/each}
      </nav>
    {/if}
  </section>
</ProfileBorderEffect>

<style>
  :global(.profile-full-bleed__boundary) {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .profile-full-bleed {
    display: grid;
    width: min(100%, 56rem);
    min-width: 0;
    margin: 0 auto;
    place-items: center;
    color: var(--profile-text, #f8f8f8);
    text-align: center;
  }

  .profile-full-bleed__banner {
    width: min(100%, 40rem);
    height: clamp(6rem, 18vw, 9rem);
    margin: 0 auto 1.2rem;
    overflow: hidden;
    border-radius: var(--profile-border-radius, 2rem);
    background: rgba(255,255,255,.04);
  }

  .profile-full-bleed__banner img { display: block; width: 100%; height: 100%; object-fit: cover; }

  .profile-full-bleed--sleek .profile-full-bleed__avatar-shell {
    width: clamp(6.25rem, 12vw, 8rem);
    height: clamp(6.25rem, 12vw, 8rem);
  }

  .profile-full-bleed--sleek .profile-full-bleed__links { margin-top: .85rem; }

  .profile-full-bleed--sleek {
    position: relative;
    display: grid;
    width: min(100%, 40rem);
    min-height: 16.875rem;
    box-sizing: border-box;
    align-content: start;
    justify-items: start;
    padding: 6.4rem 2rem 1.65rem;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .18) * 100%), transparent);
    border-radius: var(--profile-border-radius, 3.125rem);
    background: var(--profile-surface-fill, rgba(25,25,25,.49));
    box-shadow: 0 1.8rem 4rem rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035);
    text-align: left;
  }

  .profile-full-bleed--sleek .profile-full-bleed__banner {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
    height: 7rem;
    margin: 0;
    border-radius: var(--profile-border-radius, 2rem) var(--profile-border-radius, 2rem) 0 0;
    opacity: .55;
  }

  .profile-full-bleed--sleek .profile-full-bleed__avatar-shell {
    position: absolute;
    top: 0;
    left: 2rem;
    z-index: 2;
    width: clamp(6rem, 11vw, 7.5rem);
    height: clamp(6rem, 11vw, 7.5rem);
    margin: 0;
    transform: translateY(-48%);
  }

  .profile-full-bleed--sleek .profile-full-bleed__name { max-width: min(100%, 24rem); text-align: left; }
  .profile-full-bleed--sleek .profile-full-bleed__bio { max-width: 29rem; margin-left: 0; text-align: left; }
  .profile-full-bleed--sleek.profile-full-bleed--no-roll .profile-full-bleed__name,
  .profile-full-bleed--sleek.profile-full-bleed--no-roll .profile-full-bleed__bio { max-width: 34rem; }
  .profile-full-bleed--sleek.profile-full-bleed--no-avatar.profile-full-bleed--no-banner { padding-top: 2rem; }
  .profile-full-bleed--sleek.profile-full-bleed--no-avatar.profile-full-bleed--has-banner { padding-top: 8.2rem; }
  .profile-full-bleed--sleek .profile-full-bleed__metadata { justify-content: flex-start; margin-top: .75rem; text-align: left; }
  .profile-full-bleed--sleek .profile-full-bleed__roll { position: absolute; top: 1.2rem; right: 1.4rem; width: min(42%, 14rem); }
  .profile-full-bleed--sleek .profile-full-bleed__links { justify-content: flex-start; margin-top: 1rem; }

  .profile-full-bleed__roll {
    width: min(100%, 26rem);
    min-width: 0;
    margin: 1rem auto 0;
  }

  .profile-full-bleed--sleek .profile-full-bleed__roll :global(.profile-roll-summary) { width: 100%; }

  .profile-full-bleed__avatar-shell {
    display: grid;
    width: clamp(8.5rem, 15vw, 11rem);
    height: clamp(8.5rem, 15vw, 11rem);
    margin: 0 auto clamp(.7rem, 1.5vw, 1rem);
    place-items: center;
    border-radius: 50%;
  }

  :global(.profile-full-bleed__avatar-effect) {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
  }

  .profile-full-bleed__avatar,
  .profile-full-bleed__avatar-fallback {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    border-radius: 50%;
  }

  .profile-full-bleed__avatar { object-fit: cover; }
  .profile-full-bleed__avatar-fallback {
    background: rgba(8, 9, 12, .72);
    color: var(--profile-highlight, #f8f8f8);
    font: 600 clamp(3rem, 7vw, 4.8rem) / 1 'Clash Display', sans-serif;
  }

  .profile-full-bleed__name,
  :global(.profile-full-bleed .profile-full-bleed__name) {
    display: block;
    max-width: min(92vw, 68rem);
    margin: 0;
    color: var(--profile-username, #ffffff);
    font: 600 clamp(1.55rem, 1.6vw, 2.05rem) / 1 'Clash Display', sans-serif;
    letter-spacing: -.035em;
    overflow-wrap: anywhere;
  }

  :global(.profile-full-bleed .name-effect-canvas) {
    display: block;
    width: min(100%, 72rem);
    min-width: 0;
  }

  :global(.profile-full-bleed .name-effect-canvas__semantic.profile-full-bleed__name) {
    display: block;
    width: 100%;
  }

  .profile-full-bleed__bio {
    max-width: min(90vw, 26rem);
    margin: .5rem auto 0;
    color: var(--profile-description, rgba(248, 248, 248, .88));
    font: 500 clamp(.78rem, 1vw, 1rem) / 1.45 'Inter', sans-serif;
    letter-spacing: .01em;
    overflow-wrap: anywhere;
  }

  .profile-full-bleed__bio--typewriter {
    font-family: var(--font-mono-stack, ui-monospace, monospace);
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .profile-full-bleed__metadata {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .35rem .7rem;
    margin-top: 1rem;
    color: var(--profile-secondary-text, rgba(248, 248, 248, .65));
    font: 500 .72rem / 1.3 'Inter', sans-serif;
    letter-spacing: .06em;
  }

  .profile-full-bleed__metadata span[aria-hidden="true"] { color: var(--profile-full-bleed-accent); }

  .profile-full-bleed__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    column-gap: .25rem;
    row-gap: .35rem;
    max-width: min(92vw, 52rem);
    margin: 1.15rem auto 0;
  }

  .profile-full-bleed__links a {
    display: grid;
    width: calc(2.4rem * var(--profile-full-bleed-link-scale, 1));
    height: calc(2.4rem * var(--profile-full-bleed-link-scale, 1));
    place-items: center;
    border: 1px solid transparent;
    border-radius: 50%;
    color: var(--profile-text, #ffffff);
    text-decoration: none;
    transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
  }

  .profile-full-bleed__links a img {
    display: block;
    width: calc(2.2rem * var(--profile-full-bleed-link-scale, 1));
    height: calc(2.2rem * var(--profile-full-bleed-link-scale, 1));
    object-fit: contain;
    filter: brightness(0) invert(1) drop-shadow(0 0 calc(.45rem * var(--profile-full-bleed-link-glow, 0)) rgba(255,255,255,.95));
    opacity: .9;
  }

  .profile-full-bleed__links a span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .profile-full-bleed__links a:hover,
  .profile-full-bleed__links a:focus-visible {
    border-color: color-mix(in srgb, var(--profile-full-bleed-accent) 65%, transparent);
    background: color-mix(in srgb, var(--profile-full-bleed-accent) 14%, transparent);
    transform: translateY(-3px) scale(1.04);
  }

  .profile-full-bleed__links a:focus-visible {
    outline: 2px solid var(--profile-full-bleed-accent);
    outline-offset: 4px;
  }

  .profile-full-bleed--entry-fade { animation: profile-full-bleed-fade 620ms ease both; }
  .profile-full-bleed--entry-focus { animation: profile-full-bleed-focus 760ms cubic-bezier(.22, 1, .36, 1) both; }
  .profile-full-bleed--entry-pop { animation: profile-full-bleed-pop 520ms cubic-bezier(.18, 1.15, .34, 1) both; }
  .profile-full-bleed--entry-unfold { animation: profile-full-bleed-unfold 700ms cubic-bezier(.2, .72, .12, 1) both; }

  @keyframes profile-full-bleed-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes profile-full-bleed-focus { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  @keyframes profile-full-bleed-pop {
    0% { transform: scale(.985); }
    62% { transform: scale(1.012); }
    to { transform: scale(1); }
  }
  @keyframes profile-full-bleed-unfold {
    from { opacity: .82; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 36rem) {
    .profile-full-bleed { padding-inline: .75rem; }
    .profile-full-bleed__avatar-shell { margin-bottom: .55rem; }
    .profile-full-bleed__name { font-size: clamp(1.45rem, 7vw, 1.9rem); }
    .profile-full-bleed__bio { max-width: 22rem; font-size: clamp(.76rem, 4vw, 1rem); }
    .profile-full-bleed__links {
      column-gap: .2rem;
      row-gap: .3rem;
      margin-top: 1rem;
    }

    .profile-full-bleed--sleek {
      width: 100%;
      min-height: 19.4rem;
      padding: 6.1rem 1.8rem 1.5rem;
      border-radius: var(--profile-border-radius, 2rem);
    }

    .profile-full-bleed--sleek .profile-full-bleed__avatar-shell { left: 1.8rem; width: 7.5rem; height: 7.5rem; }
    .profile-full-bleed--sleek .profile-full-bleed__roll { position: static; width: min(100%, 20rem); margin: .85rem 0 0; }
    .profile-full-bleed--sleek.profile-full-bleed--no-roll { min-height: 15.5rem; }
    .profile-full-bleed--sleek.profile-full-bleed--no-avatar.profile-full-bleed--no-banner { min-height: 0; padding-top: 1.8rem; }
    .profile-full-bleed--sleek.profile-full-bleed--no-avatar.profile-full-bleed--has-banner { padding-top: 7.8rem; }
    .profile-full-bleed--sleek .profile-full-bleed__links { margin-top: .8rem; }
    .profile-full-bleed--sleek .profile-full-bleed__metadata { margin-top: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-full-bleed--entry-fade,
    .profile-full-bleed--entry-focus,
    .profile-full-bleed--entry-pop,
    .profile-full-bleed--entry-unfold { animation: none; }
    .profile-full-bleed__links a { transition: none; }
    .profile-full-bleed__links a:hover,
    .profile-full-bleed__links a:focus-visible { transform: none; }
  }
</style>
