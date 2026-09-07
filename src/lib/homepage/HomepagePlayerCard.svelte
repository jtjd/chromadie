<script>
  import { getProfileMediaUrl } from '../profileMedia.js';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { getRarityPresentation } from '../rarityPresentation.js';

  export let player;
  export let position = 0;
  let failedAvatar = '';

  $: avatar = getProfileMediaUrl(player?.avatarReference);
  $: name = player?.displayName || player?.username || '';
  $: accent = player?.profileAccent || player?.hexCode || '#8d8c92';
  $: rollColor = player?.hexCode || accent;
  $: rarity = getRarityPresentation(player?.rarity || 'Common');
  $: rollLabel = player?.rollDate ? player.rollDate.slice(0, 10) : 'Latest roll';
</script>

<a
  class="homepage-player"
  class:homepage-player--featured={position === 0}
  href={getCanonicalProfilePath(player.username)}
  style={`--player-accent:${accent}; --player-roll:${rollColor}; --player-rarity:${rarity.color}`}
  aria-label={`Open ${name}’s profile`}
>
  <div class="homepage-player__wash" aria-hidden="true"></div>

  <div class="homepage-player__identity">
    {#if avatar && failedAvatar !== avatar}
      <img src={avatar} alt="" width="64" height="64" loading="lazy" decoding="async" on:error={() => failedAvatar = avatar} />
    {:else}
      <span class="homepage-player__initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
    {/if}
    <div>
      <h3>{name}</h3>
      <span>chm.lol/{player.username}</span>
    </div>
  </div>

  {#if player.bio}
    <p class="homepage-player__bio">{player.bio}</p>
  {/if}

  <div class="homepage-player__roll">
    <span class="homepage-player__swatch" aria-hidden="true"></span>
    <div class="homepage-player__roll-copy">
      <span>{rollLabel}</span>
      <strong>{player.identity || player.hexCode || 'Daily color'}</strong>
      <small><span>{player.hexCode || '—'}</span><b>{rarity.name}</b></small>
    </div>
  </div>
</a>

<style>
  .homepage-player {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 300px;
    flex-direction: column;
    overflow: hidden;
    padding: 28px;
    border-top: 1px solid color-mix(in srgb, var(--player-accent) 58%, var(--homepage-border));
    background: linear-gradient(180deg, color-mix(in srgb, var(--player-accent) 5%, #111114), #111114 72%);
    color: var(--homepage-text);
    text-decoration: none;
    isolation: isolate;
    transition: transform .2s ease, border-color .2s ease;
  }

  .homepage-player--featured { min-height: 338px; padding: 32px; }

  .homepage-player__wash {
    position: absolute;
    z-index: -1;
    width: 220px;
    height: 220px;
    top: -90px;
    right: -60px;
    border-radius: 50%;
    background: var(--player-accent);
    filter: blur(60px);
    opacity: .12;
    pointer-events: none;
  }

  .homepage-player:hover { border-color: var(--player-accent); transform: translateY(-2px); }
  .homepage-player:focus-visible { outline: 2px solid var(--homepage-text); outline-offset: 5px; }

  .homepage-player__identity { display: flex; align-items: center; gap: 15px; min-width: 0; }
  .homepage-player__identity > div { min-width: 0; }

  img,
  .homepage-player__initial {
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid color-mix(in srgb, var(--player-accent) 55%, rgba(255,255,255,.2));
    box-shadow: 0 0 32px -16px var(--player-accent);
  }

  .homepage-player__initial {
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--player-accent) 18%, #1b1b20);
    color: #fff;
    font: 600 1.35rem / 1 var(--homepage-display);
  }

  h3 {
    margin: 0 0 5px;
    overflow-wrap: anywhere;
    font: 600 1.25rem / 1.2 var(--homepage-display);
    letter-spacing: -.025em;
  }

  .homepage-player__identity div > span {
    color: var(--homepage-secondary-muted);
    font-size: .82rem;
    overflow-wrap: anywhere;
  }

  .homepage-player__bio {
    display: -webkit-box;
    max-width: 34ch;
    margin: 24px 0 0;
    overflow: hidden;
    color: var(--homepage-secondary-muted);
    font-size: .93rem;
    line-height: 1.55;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .homepage-player__roll {
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    margin-top: auto;
    padding-top: 32px;
  }

  .homepage-player__swatch {
    width: 68px;
    height: 68px;
    border-radius: 12px;
    background: var(--player-roll);
    box-shadow: 0 16px 38px -22px var(--player-roll);
  }

  .homepage-player__roll-copy { display: grid; min-width: 0; gap: 5px; }
  .homepage-player__roll-copy > span { color: var(--homepage-muted); font-size: .72rem; }

  .homepage-player__roll-copy strong {
    min-width: 0;
    overflow: hidden;
    font: 600 .98rem / 1.25 var(--homepage-display);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .homepage-player__roll-copy small {
    display: flex;
    min-width: 0;
    gap: 10px;
    align-items: center;
    color: var(--homepage-muted);
    font-size: .75rem;
  }

  .homepage-player__roll-copy b { color: var(--player-rarity); font-weight: 600; }

  @media (max-width: 780px) {
    .homepage-player,
    .homepage-player--featured { min-height: 260px; padding: 24px 0 22px; }
    .homepage-player__wash { right: -90px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-player { transition: none; }
    .homepage-player:hover { transform: none; }
  }
</style>
