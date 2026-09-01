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
  /** @type {(entryKey: string) => void} */
  export let onEntryClick = () => {};

  let failedAvatarSource = '';
  let failedBannerSource = '';

  $: safeDisplayName = String(displayName || 'Unknown Player').trim().slice(0, 80) || 'Unknown Player';
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: activeAvatarSource = avatarSrc && failedAvatarSource !== avatarSrc ? avatarSrc : avatarFallbackSrc;
  $: activeBannerSource = bannerSrc && failedBannerSource !== bannerSrc ? bannerSrc : '';
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
  $: rollHex = normalizeHexColor((/** @type {any} */ (roll || {})).hex_code || (/** @type {any} */ (roll || {})).hex, '');

  function linkIconSource(link) {
    return `/link-icons/${link.definition.icon}.svg`;
  }
</script>

<ProfileBorderEffect
  borderKey={profileBorderKey}
  className="profile-portfolio__boundary profile-border-effect--content"
  animated={true}
>
  <section
    class={`profile-portfolio profile-portfolio--entry-${safeEntryAnimation} ${showAvatar ? 'profile-portfolio--has-avatar' : 'profile-portfolio--no-avatar'} ${rollHex ? 'profile-portfolio--has-roll' : 'profile-portfolio--no-roll'}`}
    style={`${surfaceStyle || ''};--profile-portfolio-accent:${safeAccent};--profile-portfolio-link-scale:${safeLinkScale};--profile-portfolio-link-glow:${safeLinkGlow};`}
    aria-label={`${safeDisplayName} portfolio profile`}
    data-profile-layout-content="portfolio"
  >
    {#if activeBannerSource}
      <div class="profile-portfolio__banner" aria-hidden="true">
        <img src={activeBannerSource} alt="" loading="eager" decoding="async" on:error={() => failedBannerSource = bannerSrc} />
      </div>
    {/if}

    <div class="profile-portfolio__identity">
      {#if showAvatar}
        <div class="profile-portfolio__avatar-shell">
          <AvatarEffect
            effectKey={avatarEffectKey}
            accentColor={safeAccent}
            recentColors={nameRecentColors}
            mode="profile"
            animated={true}
            active={true}
            avatarSrc={activeAvatarSource}
            fallbackText={safeInitial}
            colorizeLiquidBlob={false}
            className="profile-portfolio__avatar-effect"
          >
            {#if activeAvatarSource}
              <img class="profile-portfolio__avatar" src={activeAvatarSource} alt={`${safeDisplayName} avatar`} loading="eager" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
            {:else}
              <span class="profile-portfolio__avatar-fallback" aria-hidden="true">{safeInitial}</span>
            {/if}
          </AvatarEffect>
        </div>
      {/if}

      <div class="profile-portfolio__copy">
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
            semanticClass="profile-portfolio__name"
          />
        {:else}
          <h1 class="profile-portfolio__name">{safeDisplayName}</h1>
        {/if}

        {#if bio}
          <p class={`profile-portfolio__bio profile-portfolio__bio--${safeDescriptionMode}`}>{bio}</p>
        {/if}

        {#if metadata.length}
          <div class="profile-portfolio__metadata" aria-label="Profile details">
            {#each metadata as item, index (item)}
              {#if index}<span aria-hidden="true">·</span>{/if}
              <span>{item}</span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    {#if rollHex}
      <div class="profile-portfolio__roll" data-profile-roll-slot="summary">
        <ProfileRollSummary result={roll} accentColor={safeAccent} label="Daily color" />
      </div>
    {/if}

    {#if visibleLinks.length}
      <nav class="profile-portfolio__links" aria-label={`${safeDisplayName} profile links`}>
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
  :global(.profile-portfolio__boundary) { display: block; width: 100%; min-width: 0; }

  .profile-portfolio {
    display: grid;
    width: min(100%, 72rem);
    min-width: 0;
    margin: 0 auto;
    gap: 1.15rem;
    place-items: center;
    color: var(--profile-text, #f8f8f8);
    text-align: center;
  }

  .profile-portfolio__banner {
    width: 100%;
    height: clamp(7rem, 18vw, 12rem);
    overflow: hidden;
    border-radius: var(--profile-border-radius, 1.5rem);
    opacity: .78;
  }

  .profile-portfolio__banner img { display: block; width: 100%; height: 100%; object-fit: cover; }

  .profile-portfolio__identity {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    width: min(100%, 56rem);
    min-width: 0;
    align-items: center;
    gap: clamp(1rem, 3vw, 2rem);
    text-align: left;
  }

  .profile-portfolio--no-avatar .profile-portfolio__identity { grid-template-columns: minmax(0, 1fr); }

  .profile-portfolio__avatar-shell {
    display: grid;
    width: clamp(8rem, 14vw, 11rem);
    height: clamp(8rem, 14vw, 11rem);
    place-items: center;
    border-radius: 50%;
  }

  :global(.profile-portfolio__avatar-effect) { display: grid; width: 100%; height: 100%; place-items: center; }
  .profile-portfolio__avatar,
  .profile-portfolio__avatar-fallback { display: grid; width: 100%; height: 100%; place-items: center; border-radius: 50%; }
  .profile-portfolio__avatar { object-fit: cover; }
  .profile-portfolio__avatar-fallback { background: rgba(8,9,12,.72); color: var(--profile-highlight, #f8f8f8); font: 600 clamp(3rem, 7vw, 5rem) / 1 'Clash Display', sans-serif; }

  .profile-portfolio__copy { min-width: 0; }
  .profile-portfolio__name { display: block; margin: 0; color: var(--profile-username, #fff); font: 600 clamp(2rem, 5vw, 4rem) / 1 'Clash Display', sans-serif; letter-spacing: -.045em; overflow-wrap: anywhere; }
  :global(.profile-portfolio .name-effect-canvas) { display: block; width: 100%; min-width: 0; }
  :global(.profile-portfolio .name-effect-canvas__semantic.profile-portfolio__name) { display: block; width: 100%; }
  .profile-portfolio__bio { max-width: 42rem; margin: .7rem 0 0; color: var(--profile-description, rgba(248,248,248,.8)); font: 500 clamp(.85rem, 1.3vw, 1.1rem) / 1.5 'Inter', sans-serif; overflow-wrap: anywhere; }
  .profile-portfolio__bio--typewriter { font-family: var(--font-mono-stack, ui-monospace, monospace); letter-spacing: .08em; text-transform: uppercase; }
  .profile-portfolio__metadata { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: .35rem .7rem; margin-top: 1rem; color: var(--profile-secondary-text, rgba(248,248,248,.6)); font: 500 .72rem / 1.3 'Inter', sans-serif; letter-spacing: .06em; }
  .profile-portfolio__metadata span[aria-hidden="true"] { color: var(--profile-portfolio-accent); }

  .profile-portfolio__roll { width: min(100%, 28rem); min-width: 0; }
  .profile-portfolio__links { display: flex; flex-wrap: wrap; justify-content: center; gap: .35rem; max-width: 48rem; }
  .profile-portfolio__links a { display: grid; width: calc(2.7rem * var(--profile-portfolio-link-scale, 1)); height: calc(2.7rem * var(--profile-portfolio-link-scale, 1)); place-items: center; border: 1px solid transparent; border-radius: .75rem; color: var(--profile-text, #fff); text-decoration: none; }
  .profile-portfolio__links a img { display: block; width: calc(2.2rem * var(--profile-portfolio-link-scale, 1)); height: calc(2.2rem * var(--profile-portfolio-link-scale, 1)); object-fit: contain; filter: brightness(0) invert(1) drop-shadow(0 0 calc(.55rem * var(--profile-portfolio-link-glow, 0)) rgba(255,255,255,.98)) drop-shadow(0 0 calc(1.15rem * var(--profile-portfolio-link-glow, 0)) rgba(255,255,255,.48)); opacity: .94; }
  .profile-portfolio__links a span { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .profile-portfolio__links a:hover, .profile-portfolio__links a:focus-visible { border-color: color-mix(in srgb, var(--profile-portfolio-accent) 58%, transparent); background: color-mix(in srgb, var(--profile-portfolio-accent) 12%, transparent); }
  .profile-portfolio__links a:focus-visible { outline: 2px solid var(--profile-portfolio-accent); outline-offset: 4px; }

  .profile-portfolio--entry-fade { animation: profile-portfolio-fade .65s ease both; }
  .profile-portfolio--entry-focus { animation: profile-portfolio-focus .75s cubic-bezier(.22,1,.36,1) both; }
  .profile-portfolio--entry-pop { animation: profile-portfolio-pop .52s cubic-bezier(.18,1.15,.34,1) both; }
  .profile-portfolio--entry-unfold { animation: profile-portfolio-unfold .7s cubic-bezier(.2,.72,.12,1) both; }
  @keyframes profile-portfolio-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes profile-portfolio-focus { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes profile-portfolio-pop {
    0% { transform: scale(.985); }
    62% { transform: scale(1.012); }
    to { transform: scale(1); }
  }
  @keyframes profile-portfolio-unfold {
    from { opacity: .82; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 36rem) {
    .profile-portfolio { gap: .9rem; padding-inline: .75rem; }
    .profile-portfolio__identity { grid-template-columns: minmax(0, 1fr); justify-items: center; gap: .7rem; text-align: center; }
    .profile-portfolio__avatar-shell { width: 8.5rem; height: 8.5rem; }
    .profile-portfolio__copy { width: 100%; }
    .profile-portfolio__name { font-size: clamp(1.8rem, 10vw, 2.75rem); text-align: center; }
    .profile-portfolio__bio { margin-inline: auto; text-align: center; }
    .profile-portfolio__metadata { justify-content: center; text-align: center; }
    .profile-portfolio__roll { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-portfolio--entry-fade,
    .profile-portfolio--entry-focus,
    .profile-portfolio--entry-pop,
    .profile-portfolio--entry-unfold { animation: none; }
  }
</style>
