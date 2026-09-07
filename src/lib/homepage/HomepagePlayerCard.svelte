<script>
  import { getProfileMediaUrl } from '../profileMedia.js';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import ProfileRollSummary from '../ProfileRollSummary.svelte';
  export let player;
  let failedAvatar = '';
  $: avatar = getProfileMediaUrl(player?.avatarReference);
  $: name = player?.displayName || player?.username || '';
</script>

<a class="homepage-player" href={getCanonicalProfilePath(player.username)} style={`--player-accent:${player.profileAccent || player.hexCode || '#8d8c92'}`} aria-label={`Open ${name}’s profile`}>
  <div class="homepage-player__identity">
    {#if avatar && failedAvatar !== avatar}<img src={avatar} alt="" width="48" height="48" loading="lazy" decoding="async" on:error={() => failedAvatar = avatar} />
    {:else}<span class="homepage-player__initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>{/if}
    <div><h3>{name}</h3><span>chm.lol/{player.username}</span></div>
  </div>
  {#if player.bio}<p>{player.bio}</p>{/if}
  <div class="homepage-player__roll">
    <ProfileRollSummary result={player.hexCode ? { hex_code: player.hexCode, identity: player.identity, rarity: player.rarity } : null} label={player.rollDate ? `Rolled ${player.rollDate.slice(0, 10)}` : 'Latest public roll'} />
  </div>
</a>

<style>
  .homepage-player { display: flex; flex-direction: column; min-width: 0; padding: 28px; border: 1px solid var(--homepage-border); border-top: 3px solid var(--player-accent); border-radius: var(--homepage-radius); background: linear-gradient(155deg, color-mix(in srgb, var(--player-accent) 12%, #151519), #151519 65%); text-decoration: none; }
  .homepage-player:hover { border-color: var(--player-accent); }
  .homepage-player:focus-visible { outline: 2px solid var(--homepage-text); outline-offset: 5px; }
  .homepage-player__identity { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .homepage-player__identity > div { min-width: 0; }
  img, .homepage-player__initial { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 50%; object-fit: cover; }
  .homepage-player__initial { display: grid; place-items: center; background: #26262e; color: #fff; font: 600 1.25rem / 1 var(--homepage-display); }
  h3 { margin: 0 0 5px; overflow-wrap: anywhere; font: 600 1.15rem / 1.3 var(--homepage-display); }
  .homepage-player__identity div > span { font-size: .875rem; color: var(--homepage-secondary-muted); overflow-wrap: anywhere; }
  p { color: var(--homepage-secondary-muted); font-size: 1rem; line-height: 1.6; overflow-wrap: anywhere; }
  .homepage-player__roll { margin-top: auto; padding-top: 28px; }
  .homepage-player__roll :global(.profile-roll-summary__label) { font-size: .875rem; letter-spacing: 0; text-transform: none; }
  .homepage-player__roll :global(.profile-roll-summary__identity) { font-size: 1rem; }
  .homepage-player__roll :global(.profile-roll-summary__meta) { font-size: .875rem; }
  @media (max-width: 460px) { .homepage-player { padding: 24px; } }
</style>
