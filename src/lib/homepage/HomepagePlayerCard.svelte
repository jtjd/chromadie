<script>
  import { getProfileMediaUrl } from '../profileMedia.js';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import UserAvatarFallback from '../UserAvatarFallback.svelte';

  export let player;
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
  href={getCanonicalProfilePath(player.username)}
  style={`--player-accent:${accent}; --player-roll:${rollColor}; --player-rarity:${rarity.color}`}
  aria-label={`Open ${name}’s profile`}
>

  <div class="homepage-player__identity">
    <span class="homepage-player__avatar">
      {#if avatar && failedAvatar !== avatar}
        <img src={avatar} alt="" width="120" height="120" loading="lazy" decoding="async" on:error={() => failedAvatar = avatar} />
      {:else}
        <UserAvatarFallback initial={name} />
      {/if}
    </span>
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
  .homepage-player { display: flex; min-width: 0; flex-direction: column; padding: 28px 24px; color: var(--homepage-text); text-decoration: none; transition: background-color 180ms ease; }
  .homepage-player:hover { background: var(--homepage-panel); }
  .homepage-player:focus-visible { outline: 2px solid var(--homepage-text); outline-offset: 4px; }
  .homepage-player__identity { display: flex; align-items: center; gap: 16px; min-width: 0; }
  .homepage-player__identity > div { min-width: 0; }
  .homepage-player__avatar { display: block; width: 56px; height: 56px; flex: 0 0 56px; overflow: hidden; border: 1px solid var(--player-accent); border-radius: 50%; }
  .homepage-player__avatar img { width: 100%; height: 100%; object-fit: cover; }
  h3 { margin: 0 0 6px; overflow-wrap: anywhere; font: 600 1.125rem / 1.3 var(--homepage-display); letter-spacing: -.025em; }
  .homepage-player__identity div > span { color: var(--homepage-muted); font-size: .8125rem; overflow-wrap: anywhere; }
  .homepage-player__bio { display: -webkit-box; margin: 18px 0 0; overflow: hidden; color: var(--homepage-secondary-muted); font-size: .875rem; line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .homepage-player__roll { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 14px; margin-top: auto; padding-top: 28px; }
  .homepage-player__swatch { width: 32px; height: 40px; border-radius: 4px; background: var(--player-roll); }
  .homepage-player__roll-copy { display: grid; min-width: 0; gap: 6px; }
  .homepage-player__roll-copy > span { color: var(--homepage-muted); font-size: .75rem; }
  .homepage-player__roll-copy strong { min-width: 0; overflow: hidden; font: 600 .875rem / 1.3 var(--homepage-display); text-overflow: ellipsis; white-space: nowrap; }
  .homepage-player__roll-copy small { display: flex; flex-wrap: wrap; min-width: 0; gap: 6px 10px; align-items: center; color: var(--homepage-muted); font-size: .75rem; }
  .homepage-player__roll-copy b { color: var(--player-rarity); font-weight: 500; }
  @media (max-width: 700px) { .homepage-player { padding: 28px 0; } }
  @media (prefers-reduced-motion: reduce) { .homepage-player { transition: none; } }
</style>
