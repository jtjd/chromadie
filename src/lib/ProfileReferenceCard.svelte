<script>
  import { normalizeHexColor } from './utils.js';
  import { PROFILE_IDENTITY_DESCRIPTION_MODES, PROFILE_IDENTITY_ENTRY_ANIMATIONS } from './profileIdentityPresentation.js';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';
  import { getAvatarEffectDefinition } from './avatar-effect/avatarEffects.js';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import ProfileRollSummary from './ProfileRollSummary.svelte';
  import { getNameFontCssFamily } from './name/nameFonts.js';
  import { getProfileLinkDefinition } from './profileLinkTypes.js';
  import { PROFILE_LINK_LIMITS } from './profileConfig.js';

  export let displayName = 'Unknown Player';
  export let bio = '';
  export let secondaryLine = '';
  export let meta = '';
  export let avatarSrc = '';
  export let avatarFallbackSrc = '';
  export let bannerSrc = '';
  export let avatarEffectKey = '';
  export let nameLoadout = null;
  export let nameTodayColor = '';
  export let nameBaseColor = '#FFFFFF';
  export let nameRecentColors = [];
  export let profileBorderKey = '';
  export let surfaceStyle = '';
  export let showAvatar = true;
  export let descriptionMode = 'plain';
  export let entryAnimation = 'none';
  export let links = [];
  export let linkStyle = null;
  export let roll = null;
  export let accentColor = '#00FFB3';
  export let audioAvailable = false;
  export let audioLabel = 'Profile audio';
  export let audioStatus = '▶';
  export let rollLabel = 'Daily roll';
  export let presentation = 'homepage';
  export let layoutVariant = '';
  export let className = '';
  export let ariaLabel = 'Profile preview';
  /** @type {(entryKey: string) => void} */
  export let onEntryClick = () => {};

  let failedAvatarSource = '';
  let failedBannerSource = '';

  $: safeAccent = normalizeHexColor(accentColor, '#00FFB3');
  $: safeDisplayName = String(displayName || 'Unknown Player').slice(0, 80);
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: activeAvatarSource = avatarSrc && failedAvatarSource !== avatarSrc ? avatarSrc : avatarFallbackSrc;
  $: activeBannerSource = bannerSrc && failedBannerSource !== bannerSrc ? bannerSrc : '';
  $: safeNameTodayColor = normalizeHexColor(nameTodayColor, safeAccent);
  $: safeNameBaseColor = normalizeHexColor(nameBaseColor, '#FFFFFF');
  $: safeDescriptionMode = PROFILE_IDENTITY_DESCRIPTION_MODES.includes(descriptionMode) ? descriptionMode : 'plain';
  $: safeEntryAnimation = PROFILE_IDENTITY_ENTRY_ANIMATIONS.includes(entryAnimation) ? entryAnimation : 'none';
  $: avatarEffectCanonicalKey = getAvatarEffectDefinition(avatarEffectKey)?.key || '';
  $: framedLayout = layoutVariant === 'framed' || presentation === 'framed';
  $: profileBorderFrameClass = framedLayout
    ? 'profile-reference-card__border--framed'
    : presentation === 'profile' || presentation === 'studio'
      ? 'profile-reference-card__border--compact'
      : 'profile-reference-card__border--homepage';
  $: iconLinks = framedLayout || presentation === 'profile' || presentation === 'studio';
  $: visibleLinks = (Array.isArray(links) ? links : [])
    .filter(link => link && typeof link.url === 'string' && link.url)
    .slice(0, PROFILE_LINK_LIMITS.maxLinks)
    .map(link => ({ ...link, definition: getProfileLinkDefinition(link.type) }));
  $: rollHex = normalizeHexColor((/** @type {any} */ (roll || {})).hex_code || (/** @type {any} */ (roll || {})).hex, '');
  $: cardClass = [
    'profile-reference-card',
    `profile-reference-card--${presentation}`,
    framedLayout ? 'profile-reference-card--framed' : '',
    showAvatar ? '' : 'profile-reference-card--no-avatar',
    ['butterfly-orbit', 'bat-orbit'].includes(avatarEffectCanonicalKey) ? 'profile-reference-card--avatar-orbit' : '',
    `profile-reference-card--description-${safeDescriptionMode}`,
    `profile-reference-card--entry-${safeEntryAnimation}`,
    className
  ].filter(Boolean).join(' ');
  $: selectedNameFont = (/** @type {any} */ (nameLoadout || {})).fontKey
    || (/** @type {any} */ (nameLoadout || {})).name_font
    || '';
  $: nameTypeface = selectedNameFont ? getNameFontCssFamily(selectedNameFont) : '';
  $: cardStyle = `${surfaceStyle || ''};--profile-reference-accent:${safeAccent};--profile-reference-name-size:${presentation === 'homepage' ? '1.95rem' : '1.78rem'};--profile-reference-name-typeface:${nameTypeface};`;
  $: safeLinkScale = 1 + Number((/** @type {any} */ (linkStyle || {})).size || 0) * .16;
  $: safeLinkGlow = Number((/** @type {any} */ (linkStyle || {})).glow || 0);

</script>

<ProfileBorderEffect
  borderKey={profileBorderKey}
  surfaceStyle={surfaceStyle}
  className={`profile-reference-card__border profile-border-effect--content ${profileBorderFrameClass}`}
>
  <article class={cardClass} style={cardStyle} aria-label={ariaLabel} data-profile-reference-card data-profile-layout-content={layoutVariant || (framedLayout ? 'framed' : 'compact')}>
    {#if activeBannerSource && !framedLayout}
      <div class="profile-reference-card__banner" aria-hidden="true">
        <img src={activeBannerSource} alt="" loading="eager" decoding="async" on:error={() => failedBannerSource = bannerSrc} />
      </div>
    {/if}
    <div class="profile-reference-card__opening">
      <div class="profile-reference-card__identity">
        {#if showAvatar}
          <div class="profile-reference-card__avatar-shell">
            <AvatarEffect
              effectKey={avatarEffectKey}
              accentColor={safeAccent}
              recentColors={nameRecentColors}
              mode="profile"
              animated={true}
              active={true}
              avatarSrc={activeAvatarSource}
              fallbackText={safeInitial}
              className="profile-reference-card__avatar-effect"
            >
              {#if activeAvatarSource}
                <img class="profile-reference-card__avatar" src={activeAvatarSource} alt={`${safeDisplayName} avatar`} loading="eager" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
              {:else}
                <span class="profile-reference-card__avatar-fallback" aria-hidden="true">{safeInitial}</span>
              {/if}
            </AvatarEffect>
          </div>
        {/if}

        {#if nameLoadout}
          <NameEffectCanvas
            text={safeDisplayName}
            loadout={nameLoadout}
            todayColor={safeNameTodayColor}
            baseColor={safeNameBaseColor}
            recentColors={nameRecentColors}
            context="profile"
            mode="animated"
            semanticTag="h2"
            semanticClass="profile-reference-card__name"
          />
        {:else}
          <h2 class="profile-reference-card__name">{safeDisplayName}</h2>
        {/if}
        {#if bio}<p class={`profile-reference-card__bio profile-reference-card__bio--${safeDescriptionMode}`}>{bio}</p>{/if}
        {#if secondaryLine}<p class="profile-reference-card__secondary">{secondaryLine}</p>{/if}
        {#if meta}<div class="profile-reference-card__meta">{meta}</div>{/if}

        {#if audioAvailable && !framedLayout}
          <div class="profile-reference-card__audio" aria-label={audioLabel}>
            <span>{audioLabel}</span>
            <strong>{audioStatus}</strong>
          </div>
        {/if}
      </div>

      {#if rollHex}
        <div class="profile-reference-card__roll profile-reference-card__roll--summary" data-profile-roll-slot="summary">
          <ProfileRollSummary result={roll} accentColor={safeAccent} label={rollLabel} compact={framedLayout} />
        </div>
      {/if}
    </div>

    {#if visibleLinks.length}
      <nav class:profile-reference-card__links--icons={iconLinks} class="profile-reference-card__links" style={`--profile-reference-link-scale:${safeLinkScale};--profile-reference-link-glow:${safeLinkGlow};`} aria-label={`${safeDisplayName} profile links`}>
        {#each visibleLinks as link (link.key || link.order || link.url)}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class:profile-reference-card__link--icon={iconLinks}
            aria-label={link.label || link.definition.label}
            title={iconLinks ? (link.label || link.definition.label) : undefined}
            on:click={() => onEntryClick(link.key || `link-${link.order ?? link.url}`)}
          >
            {#if iconLinks}
              <img src={`/link-icons/${link.definition.icon}.svg`} alt="" loading="lazy" aria-hidden="true" />
              <span class="profile-reference-card__link-label">{link.label || link.definition.label}</span>
            {:else}
              {link.label || link.type || 'Link'}
            {/if}
          </a>
        {/each}
      </nav>
    {/if}
  </article>
</ProfileBorderEffect>

<style>
  .profile-reference-card {
    --profile-reference-accent: #00FFB3;
    position: relative;
    container: profile-reference-card / inline-size;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
    padding: 28px 25px 23px;
    /* The appearance layer owns only neutral surface geometry. A colored
       outline belongs exclusively to an equipped profile-border cosmetic. */
    border: var(--profile-border-width, 1px) solid color-mix(in srgb, #ffffff calc(var(--profile-border-opacity, .11) * 100%), transparent);
    border-radius: var(--profile-border-radius, 20px);
    background: var(--profile-surface-fill, rgba(10,10,12,.58));
    box-shadow: 0 30px 65px rgba(0,0,0,.52);
    backdrop-filter: blur(var(--profile-surface-blur, 30px)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 30px)) saturate(160%);
    color: var(--profile-text, #f8f8f8);
    text-align: center;
  }

  .profile-reference-card--avatar-orbit { overflow: visible; }

  .profile-reference-card--homepage {
    padding: 51px 28px 29px;
    background: var(--profile-surface-fill, rgba(10,10,13,.52));
    box-shadow: 0 34px 80px rgba(0,0,0,.5);
    backdrop-filter: blur(32px) saturate(160%);
    -webkit-backdrop-filter: blur(32px) saturate(160%);
  }

  .profile-reference-card--studio {
    /* Studio shows the selected profile-border cosmetic on the outer
       renderer. Keep the reference card's own edge neutral so appearance
       border tokens cannot create a second colored outline. */
    border: 1px solid rgba(255,255,255,.11);
  }

  .profile-reference-card__opening,
  .profile-reference-card__identity {
    display: contents;
  }

  .profile-reference-card__banner {
    width: calc(100% + 2rem);
    height: clamp(7.5rem, 20vw, 9.4rem);
    margin: -2.2rem -1rem 1.2rem;
    overflow: hidden;
    border-radius: var(--profile-reference-banner-radius, var(--profile-border-radius, 1.1rem)) var(--profile-reference-banner-radius, var(--profile-border-radius, 1.1rem)) .35rem .35rem;
    background: rgba(255,255,255,.04);
  }

  .profile-reference-card__banner img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Default follows the real profile-card rhythm: one centered identity,
     one small roll widget, and one finite icon rail. */
  .profile-reference-card--profile:not(.profile-reference-card--framed),
  .profile-reference-card--studio:not(.profile-reference-card--framed) {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
    width: 100%;
    max-width: 40rem;
    padding: 2.2rem 1rem 1rem;
    text-align: center;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__opening,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__opening {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 1rem;
    min-width: 0;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__identity,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__identity {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__avatar-shell,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__avatar-shell {
    margin: 0 auto 1rem;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__name,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__name {
    text-align: center;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__bio,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__bio {
    max-width: 18rem;
    margin-inline: auto;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__secondary,
  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__meta,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__secondary,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__meta {
    text-align: center;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__audio,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__audio {
    width: 100%;
    box-sizing: border-box;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__roll,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__roll {
    grid-column: 1;
    justify-self: center;
    width: min(100%, 26rem);
    min-width: 0;
    margin-top: 0;
  }

  .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__links,
  .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__links {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-width: 0;
    margin-top: 0;
    padding-top: .9rem;
    border-top: 1px solid color-mix(in srgb, var(--profile-reference-accent) 22%, rgba(255,255,255,.12));
  }

  /* Modern is a wide identity surface with a horizontal identity row and
     widget-sized roll summary. Media widgets remain separate surfaces below
     the card, matching the public layout's second-surface rhythm. */
  .profile-reference-card--framed {
    display: grid;
    gap: .9rem;
    min-height: 0;
    overflow: hidden;
    padding: 1.65rem 1.65rem 1.25rem;
    border-color: color-mix(in srgb, #ffffff 30%, transparent);
    border-radius: var(--profile-border-radius, 1.25rem);
    background: var(--profile-surface-fill, rgba(10,10,12,.58));
    box-shadow: 0 1.8rem 4rem rgba(0, 0, 0, .34), inset 0 1px 0 rgba(255, 255, 255, .06);
    text-align: left;
  }

  .profile-reference-card--framed .profile-reference-card__opening {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: .75rem;
    min-width: 0;
  }

  .profile-reference-card--framed .profile-reference-card__identity {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
    column-gap: 1rem;
    align-items: center;
    min-width: 0;
    text-align: left;
  }

  .profile-reference-card--framed .profile-reference-card__avatar-shell {
    position: static;
    grid-column: 1;
    grid-row: 1 / span 4;
    width: clamp(5.5rem, 11vw, 7.5rem);
    height: clamp(5.5rem, 11vw, 7.5rem);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
  }

  .profile-reference-card--framed .profile-reference-card__name {
    grid-column: 2;
    grid-row: 1;
    max-width: 100%;
    font-size: clamp(1.55rem, 3vw, 2.1rem);
  }

  .profile-reference-card--framed :global(.name-effect-canvas) {
    display: inline-block;
    width: fit-content;
    max-width: 100%;
    text-align: left;
  }

  .profile-reference-card--framed :global(.name-effect-canvas__semantic.profile-reference-card__name) {
    display: inline-block;
    width: auto;
    text-align: left;
  }

  .profile-reference-card--framed .profile-reference-card__bio {
    grid-column: 2;
    grid-row: 2;
    max-width: 34rem;
    margin: .32rem 0 0;
    font-size: clamp(.78rem, 1.3vw, .95rem);
    font-family: var(--profile-reference-name-typeface, 'Inter', sans-serif);
  }

  .profile-reference-card--framed .profile-reference-card__secondary,
  .profile-reference-card--framed .profile-reference-card__meta {
    grid-column: 2;
    font-family: var(--profile-reference-name-typeface, 'Inter', sans-serif);
    text-align: left;
  }

  .profile-reference-card--framed .profile-reference-card__secondary { grid-row: 3; }
  .profile-reference-card--framed .profile-reference-card__meta { grid-row: 4; }
  .profile-reference-card--framed.profile-reference-card--no-avatar .profile-reference-card__name,
  .profile-reference-card--framed.profile-reference-card--no-avatar .profile-reference-card__bio,
  .profile-reference-card--framed.profile-reference-card--no-avatar .profile-reference-card__secondary,
  .profile-reference-card--framed.profile-reference-card--no-avatar .profile-reference-card__meta { grid-column: 1 / -1; }

  .profile-reference-card--framed .profile-reference-card__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: .45rem;
    margin-top: .15rem;
    padding-top: .85rem;
    border-top: 1px solid color-mix(in srgb, var(--profile-reference-accent) 20%, rgba(255,255,255,.1));
  }

  .profile-reference-card--framed .profile-reference-card__links a {
    display: grid;
    width: calc(2.35rem * var(--profile-reference-link-scale, 1));
    min-height: 2.35rem;
    height: calc(2.35rem * var(--profile-reference-link-scale, 1));
    padding: 0;
    place-items: center;
    border-color: transparent;
    border-radius: .7rem;
    background: transparent;
  }

  .profile-reference-card--framed .profile-reference-card__links a img {
    display: block;
    width: calc(1.75rem * var(--profile-reference-link-scale, 1));
    height: calc(1.75rem * var(--profile-reference-link-scale, 1));
    object-fit: contain;
    /* Keep the glow on the icon alpha itself. The anchor stays transparent so
       framed links do not read as glowing empty buttons. */
    filter: brightness(0) invert(1) drop-shadow(0 0 calc(.55rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.98)) drop-shadow(0 0 calc(1.15rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.48));
    opacity: .92;
  }

  /* Keep Modern links transparent at the anchor level so only the icon pixels
     carry the same direct white glow as Simplistic links. */
  .profile-reference-card--framed .profile-reference-card__links a.profile-reference-card__link--icon {
    border-color: transparent !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .profile-reference-card--framed .profile-reference-card__link-label {
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

  .profile-reference-card--framed .profile-reference-card__links a:hover,
  .profile-reference-card--framed .profile-reference-card__links a:focus-visible {
    border-color: color-mix(in srgb, var(--profile-reference-accent) 62%, transparent);
    background: color-mix(in srgb, var(--profile-reference-accent) 13%, transparent);
  }

  .profile-reference-card--framed .profile-reference-card__links a:focus-visible { outline-offset: 3px; }

  /* Default and Modern use the same safe icon contract. The visible label is
     preserved in aria/title so links remain discoverable without text boxes. */
  .profile-reference-card__links--icons {
    display: flex !important;
    flex-wrap: wrap;
    justify-content: center;
    gap: .35rem;
    padding-top: .85rem;
    border-top: 1px solid color-mix(in srgb, var(--profile-reference-accent) 20%, rgba(255,255,255,.1));
  }

  .profile-reference-card__links--icons a {
    display: grid !important;
    width: calc(2.45rem * var(--profile-reference-link-scale, 1));
    min-height: calc(2.45rem * var(--profile-reference-link-scale, 1));
    height: calc(2.45rem * var(--profile-reference-link-scale, 1));
    padding: 0;
    place-items: center;
    overflow: visible;
    border-color: transparent;
    border-radius: .7rem;
    background: transparent;
    box-shadow: none;
  }

  .profile-reference-card__links--icons a img {
    display: block;
    width: calc(1.8rem * var(--profile-reference-link-scale, 1));
    height: calc(1.8rem * var(--profile-reference-link-scale, 1));
    object-fit: contain;
    filter: brightness(0) invert(1) drop-shadow(0 0 calc(.55rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.98)) drop-shadow(0 0 calc(1.15rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.48));
    opacity: .94;
  }

  .profile-reference-card__links--icons a:hover,
  .profile-reference-card__links--icons a:focus-visible {
    border-color: color-mix(in srgb, var(--profile-reference-accent) 54%, transparent);
    background: color-mix(in srgb, var(--profile-reference-accent) 10%, transparent);
  }

  .profile-reference-card__links--icons .profile-reference-card__link-label {
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

  .profile-reference-card__avatar-shell {
    display: grid;
    width: 86px;
    height: 86px;
    margin: 22px auto 14px;
    overflow: visible;
    place-items: center;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }

  .profile-reference-card--homepage:not(.profile-reference-card--framed) .profile-reference-card__avatar-shell {
    width: 100px;
    height: 100px;
    margin: 24px auto 15px;
  }

  .profile-reference-card__avatar,
  .profile-reference-card__avatar-fallback {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    border-radius: 50%;
  }

  .profile-reference-card__avatar { object-fit: cover; }
  .profile-reference-card__avatar-fallback { position: relative; z-index: 2; color: rgba(248,248,248,.78); font: 600 1.7rem/1 'Clash Display', sans-serif; }
  :global(.profile-reference-card__avatar-effect) { display: grid; width: 100%; height: 100%; place-items: center; }

  :global(.profile-reference-card__border) { width: 100%; min-width: 0; }
  :global(.profile-reference-card__border .profile-border-effect__content) { width: 100%; min-width: 0; }

  /* The public/studio default card is capped at 40rem, while its layout
     opening is intentionally wider. Size the effect host to the card's
     actual content box plus the frame inset so every border renderer follows
     the same edge. */
  :global(.profile-reference-card__border--compact) {
    width: calc(40rem + var(--profile-border-frame-inset, 0px));
    max-width: calc(100% + var(--profile-border-frame-inset, 0px));
    margin-inline: auto;
  }

  :global(.profile-reference-card__border--framed),
  :global(.profile-reference-card__border--homepage) {
    width: 100%;
  }

  :global(.profile-reference-card__border:not(.profile-border-effect--none) .profile-reference-card) {
    border-radius: var(--profile-border-content-radius, var(--profile-border-radius, 20px));
  }

  .profile-reference-card__name {
    margin: 0;
    color: var(--profile-username, #f8f8f8);
    font: 600 1.78rem/1 'Clash Display', sans-serif;
    letter-spacing: -.035em;
    overflow-wrap: anywhere;
  }

  :global(.profile-reference-card .name-effect-canvas) { display: block; width: 100%; min-width: 0; }
  :global(.profile-reference-card .name-effect-canvas__semantic.profile-reference-card__name) { display: block; width: 100%; }

  .profile-reference-card--homepage .profile-reference-card__name { font-size: 1.95rem; }

  .profile-reference-card__bio {
    max-width: 260px;
    margin: 8px auto 0;
    color: var(--profile-description, rgba(245,245,247,.54));
    font: 400 .78rem/1.45 'Inter', sans-serif;
  }

  .profile-reference-card__bio--typewriter {
    overflow: hidden;
    border-right: 1px solid color-mix(in srgb, var(--profile-reference-accent) 70%, transparent);
    white-space: nowrap;
    animation: profile-reference-typewriter 2.2s steps(42, end) both, profile-reference-caret .9s step-end infinite;
  }

  .profile-reference-card__secondary {
    margin: 3px 0 0;
    color: var(--profile-secondary-text, rgba(245,245,247,.42));
    font: 400 .72rem/1.2 'Inter', sans-serif;
    font-style: italic;
  }

  .profile-reference-card__meta {
    margin-top: 6px;
    color: var(--profile-secondary-text, #6f7078);
    font: 400 .61rem/1.2 'Inter', sans-serif;
  }

  .profile-reference-card__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
    margin-top: 19px;
  }

  .profile-reference-card--homepage .profile-reference-card__links { margin-top: 22px; }

  .profile-reference-card__links a {
    display: flex;
    min-height: 37px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 8px;
    background: rgba(255,255,255,.04);
    color: var(--profile-text, rgba(245,245,247,.86));
    font: 500 calc(.69rem * var(--profile-reference-link-scale, 1))/1 'Inter', sans-serif;
    box-shadow: 0 0 calc(.8rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.9), 0 0 calc(1.8rem * var(--profile-reference-link-glow, 0)) rgba(255,255,255,.4);
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-reference-card__links a:hover,
  .profile-reference-card__links a:focus-visible { border-color: var(--profile-reference-accent); color: #f8f8f8; }
  .profile-reference-card__links a:focus-visible { outline: 2px solid var(--profile-reference-accent); outline-offset: 2px; }

  .profile-reference-card__audio {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 9px;
    padding: 9px 11px;
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 8px;
    background: rgba(0,0,0,.3);
    text-align: left;
  }

  .profile-reference-card__audio { color: var(--profile-secondary-text, #85868e); font: 400 .62rem/1 'Inter', sans-serif; }
  .profile-reference-card__audio strong { color: var(--profile-reference-accent); font-weight: 600; }
  .profile-reference-card__roll {
    min-width: 0;
    margin-top: 9px;
    text-align: left;
  }

  .profile-reference-card__roll--summary :global(.profile-roll-summary) { margin: 0; }

  .profile-reference-card--profile .profile-reference-card__name {
    text-wrap: balance;
  }

  .profile-reference-card--profile .profile-reference-card__links a {
    min-width: 0;
    overflow-wrap: normal;
    text-overflow: ellipsis;
  }

  .profile-reference-card--entry-fade { animation: profile-reference-entry-fade .65s var(--motion-ease-standard, ease) both; }
  .profile-reference-card--entry-rise { animation: profile-reference-entry-rise .7s var(--motion-ease-emphasis, cubic-bezier(.23, 1, .32, 1)) both; }
  .profile-reference-card--entry-focus { animation: profile-reference-entry-focus .75s var(--motion-ease-emphasis, cubic-bezier(.23, 1, .32, 1)) both; }
  .profile-reference-card--entry-pop { animation: profile-reference-entry-pop .52s cubic-bezier(.18, 1.15, .34, 1) both; }
  .profile-reference-card--entry-unfold { animation: profile-reference-entry-unfold .7s cubic-bezier(.2, .72, .12, 1) both; }

  @keyframes profile-reference-typewriter { from { max-width: 0; } to { max-width: 260px; } }
  @keyframes profile-reference-caret { 50% { border-right-color: transparent; } }
  @keyframes profile-reference-entry-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes profile-reference-entry-rise { from { opacity: 0; transform: translateY(.75rem); } to { opacity: 1; transform: translateY(0); } }
  @keyframes profile-reference-entry-focus { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } }
  @keyframes profile-reference-entry-pop {
    0% { transform: scale(.985); }
    62% { transform: scale(1.012); }
    to { transform: scale(1); }
  }
  @keyframes profile-reference-entry-unfold {
    from { opacity: .82; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @container profile-reference-card (max-width: 36rem) {
    .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__opening,
    .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__opening {
      grid-template-columns: minmax(0, 1fr);
    }

    .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__roll,
    .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__roll {
      grid-column: 1;
    }

    .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__links,
    .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__links {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 460px) {
    .profile-reference-card--profile:not(.profile-reference-card--framed),
    .profile-reference-card--studio:not(.profile-reference-card--framed) {
      padding: 1.65rem .9rem .85rem;
    }
    .profile-reference-card--homepage { padding: 38px 18px 21px; border-radius: 18px; }
    .profile-reference-card--homepage:not(.profile-reference-card--framed) .profile-reference-card__avatar-shell { width: 90px; height: 90px; }
    .profile-reference-card--homepage .profile-reference-card__name { font-size: 1.75rem; }
    .profile-reference-card--framed {
      padding-inline: 1.15rem;
    }
    .profile-reference-card--profile:not(.profile-reference-card--framed) .profile-reference-card__banner,
    .profile-reference-card--studio:not(.profile-reference-card--framed) .profile-reference-card__banner {
      margin-top: -1.65rem;
      margin-right: -.9rem;
      margin-left: -.9rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-reference-card--entry-fade,
    .profile-reference-card--entry-rise,
    .profile-reference-card--entry-focus,
    .profile-reference-card--entry-pop,
    .profile-reference-card--entry-unfold,
    .profile-reference-card__bio--typewriter {
      animation: none;
      max-width: 260px;
      border-right-color: transparent;
    }
  }
</style>
