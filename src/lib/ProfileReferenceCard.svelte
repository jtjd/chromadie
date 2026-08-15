<script>
  import { normalizeHexColor } from './utils.js';

  export let displayName = 'Unknown Player';
  export let bio = '';
  export let secondaryLine = '';
  export let meta = '';
  export let avatarSrc = '';
  export let links = [];
  export let roll = null;
  export let accentColor = '#00FFB3';
  export let showHeader = false;
  export let headerValue = 'Compact';
  export let audioAvailable = false;
  export let audioLabel = 'Profile audio';
  export let audioStatus = '▶';
  export let rollLabel = "Today's roll";
  export let presentation = 'homepage';
  export let className = '';
  export let ariaLabel = 'Profile preview';

  let failedAvatarSource = '';

  $: safeAccent = normalizeHexColor(accentColor, '#00FFB3');
  $: safeDisplayName = String(displayName || 'Unknown Player').slice(0, 80);
  $: safeInitial = safeDisplayName.slice(0, 1).toUpperCase() || '✦';
  $: activeAvatarSource = avatarSrc && failedAvatarSource !== avatarSrc ? avatarSrc : '';
  $: visibleLinks = (Array.isArray(links) ? links : [])
    .filter(link => link && typeof link.url === 'string' && link.url)
    .slice(0, 4);
  $: rollHex = String((/** @type {any} */ (roll || {})).hex_code || '').trim().toUpperCase();
  $: cardClass = [
    'profile-reference-card',
    `profile-reference-card--${presentation}`,
    showHeader ? 'profile-reference-card--with-header' : '',
    className
  ].filter(Boolean).join(' ');

</script>

<article class={cardClass} style={`--profile-reference-accent: ${safeAccent};`} aria-label={ariaLabel} data-profile-reference-card>
  {#if showHeader}
    <div class="profile-reference-card__head">
      <span>Profile preview</span>
      <span>{headerValue}</span>
    </div>
  {/if}

  <div class="profile-reference-card__avatar-shell">
    {#if activeAvatarSource}
      <img class="profile-reference-card__avatar" src={activeAvatarSource} alt={`${safeDisplayName} avatar`} loading="eager" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
    {:else}
      <span class="profile-reference-card__avatar-fallback" aria-hidden="true">{safeInitial}</span>
    {/if}
  </div>

  <h2 class="profile-reference-card__name">{safeDisplayName}</h2>
  {#if bio}<p class="profile-reference-card__bio">{bio}</p>{/if}
  {#if secondaryLine}<p class="profile-reference-card__secondary">{secondaryLine}</p>{/if}
  {#if meta}<div class="profile-reference-card__meta">{meta}</div>{/if}

  {#if visibleLinks.length}
    <nav class="profile-reference-card__links" aria-label={`${safeDisplayName} profile links`}>
      {#each visibleLinks as link (link.order || link.url)}
        <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || link.type || 'Link'}</a>
      {/each}
    </nav>
  {/if}

  {#if audioAvailable}
    <div class="profile-reference-card__audio" aria-label={audioLabel}>
      <span>{audioLabel}</span>
      <strong>{audioStatus}</strong>
    </div>
  {/if}

  {#if rollHex}
    <div class="profile-reference-card__roll">
      <div>
        <small>{rollLabel}</small>
        <strong>{rollHex}</strong>
      </div>
      <i aria-hidden="true"></i>
    </div>
  {/if}
</article>

<style>
  .profile-reference-card {
    --profile-reference-accent: #00FFB3;
    position: relative;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
    padding: 28px 25px 23px;
    border: 1px solid rgba(255,255,255,.11);
    border-radius: 20px;
    background: rgba(10,10,12,.58);
    box-shadow: 0 30px 65px rgba(0,0,0,.52);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    color: #f8f8f8;
    text-align: center;
  }

  .profile-reference-card--homepage {
    padding: 51px 28px 29px;
    background: rgba(10,10,13,.52);
    box-shadow: 0 34px 80px rgba(0,0,0,.5);
    backdrop-filter: blur(32px) saturate(160%);
    -webkit-backdrop-filter: blur(32px) saturate(160%);
  }

  .profile-reference-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,.075);
    color: #6b6c74;
    font: 500 .6rem/1 'Inter', sans-serif;
    letter-spacing: .07em;
    text-transform: uppercase;
  }

  .profile-reference-card__avatar-shell {
    display: grid;
    width: 86px;
    height: 86px;
    margin: 22px auto 14px;
    overflow: hidden;
    place-items: center;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }

  .profile-reference-card--homepage .profile-reference-card__avatar-shell {
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
  .profile-reference-card__avatar-fallback { color: rgba(248,248,248,.78); font: 600 1.7rem/1 'Clash Display', sans-serif; }

  .profile-reference-card__name {
    margin: 0;
    color: #f8f8f8;
    font: 600 1.78rem/1 'Clash Display', sans-serif;
    letter-spacing: -.035em;
    overflow-wrap: anywhere;
  }

  .profile-reference-card--homepage .profile-reference-card__name { font-size: 1.95rem; }

  .profile-reference-card__bio {
    max-width: 260px;
    margin: 8px auto 0;
    color: rgba(245,245,247,.54);
    font: 400 .78rem/1.45 'Inter', sans-serif;
  }

  .profile-reference-card__secondary {
    margin: 3px 0 0;
    color: rgba(245,245,247,.42);
    font: 400 .72rem/1.2 'Inter', sans-serif;
    font-style: italic;
  }

  .profile-reference-card__meta {
    margin-top: 6px;
    color: #6f7078;
    font: 400 .61rem/1.2 'Inter', sans-serif;
  }

  .profile-reference-card__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
    margin-top: 19px;
  }

  .profile-reference-card--homepage .profile-reference-card__links { margin-top: 22px; }
  .profile-reference-card--homepage .profile-reference-card__secondary + .profile-reference-card__links { margin-top: 10px; }

  .profile-reference-card__links a {
    display: flex;
    min-height: 37px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 8px;
    background: rgba(255,255,255,.04);
    color: rgba(245,245,247,.86);
    font: 500 .69rem/1 'Inter', sans-serif;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-reference-card__links a:hover,
  .profile-reference-card__links a:focus-visible { border-color: var(--profile-reference-accent); color: #f8f8f8; }
  .profile-reference-card__links a:focus-visible { outline: 2px solid var(--profile-reference-accent); outline-offset: 2px; }

  .profile-reference-card__audio,
  .profile-reference-card__roll {
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

  .profile-reference-card__audio { color: #85868e; font: 400 .62rem/1 'Inter', sans-serif; }
  .profile-reference-card__audio strong { color: var(--profile-reference-accent); font-weight: 600; }
  .profile-reference-card__roll { padding: 12px; background: rgba(0,0,0,.38); }
  .profile-reference-card__roll small { display: block; color: #73747b; font: 400 .57rem/1 'Inter', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
  .profile-reference-card__roll strong { display: block; margin-top: 4px; color: var(--profile-reference-accent); font: 600 .82rem/1 'Clash Display', sans-serif; }
  .profile-reference-card__roll i { width: 29px; height: 29px; flex: 0 0 auto; border-radius: 50%; background: var(--profile-reference-accent); }

  @media (max-width: 460px) {
    .profile-reference-card--homepage { padding: 38px 18px 21px; border-radius: 18px; }
    .profile-reference-card--homepage .profile-reference-card__avatar-shell { width: 90px; height: 90px; }
    .profile-reference-card--homepage .profile-reference-card__name { font-size: 1.75rem; }
  }
</style>
