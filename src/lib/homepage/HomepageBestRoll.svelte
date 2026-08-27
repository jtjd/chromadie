<script>
  import { onMount } from 'svelte';
  import { getPublicProfilePath } from '../discoveryData.js';
  import { getProfileMediaUrl } from '../profileMedia.js';
  import RollResultBreakdown from '../RollResultBreakdown.svelte';
  import { getRarityPresentation } from '../rarityPresentation.js';
  import { normalizeHexColor } from '../utils.js';

  export let rows = [];
  export let loading = true;
  export let error = '';

  let resetLabel = '—';
  let resetTimer;
  let failedAvatarSource = '';

  $: bestRoll = getBestRoll(rows);
  $: profilePath = getPublicProfilePath(bestRoll?.username);
  $: profileHref = profilePath || '/leaderboard';
  $: displayName = bestRoll?.displayName || bestRoll?.username || 'Unknown player';
  $: avatarSrc = getProfileMediaUrl(bestRoll?.avatarReference || bestRoll?.avatarPath);
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: avatarInitials = getAvatarInitials(displayName);
  $: avatarAccent = normalizeHexColor(bestRoll?.profileAccent || bestRoll?.hexCode, '#a855f7');
  $: rollHex = bestRoll?.hexCode ? normalizeHexColor(bestRoll.hexCode, '') : '';
  $: rollColor = normalizeHexColor(bestRoll?.hexCode || bestRoll?.profileAccent, '#77747f');
  $: score = Number.isSafeInteger(Number(bestRoll?.score)) ? Number(bestRoll.score) : 0;
  $: rarity = getRarityPresentation(bestRoll?.rarity || 'Common');
  $: identity = bestRoll?.identity || 'Unidentified color';
  $: rankLabel = bestRoll?.rank ? `#${bestRoll.rank} TODAY` : 'TOP TODAY';
  $: spotlightStyle = `--best-roll-color: ${rollColor}; --best-roll-rarity: ${rarity.color}; --best-roll-avatar-accent: ${avatarAccent};`;

  function getBestRoll(items) {
    if (!Array.isArray(items)) return null;
    return items.reduce((best, item) => {
      if (!item) return best;
      if (!best) return item;
      const itemScore = Number(item.score);
      const bestScore = Number(best.score);
      return Number.isFinite(itemScore) && (!Number.isFinite(bestScore) || itemScore > bestScore) ? item : best;
    }, null);
  }

  function getAvatarInitials(value) {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? parts.slice(0, 2).map(part => part[0]).join('')
      : String(parts[0] || '✦').slice(0, 2);
    return initials.toUpperCase();
  }

  function updateResetLabel() {
    const now = new Date();
    const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const seconds = Math.max(0, Math.floor((nextReset - now.getTime()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    resetLabel = [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  onMount(() => {
    function scheduleResetLabel() {
      updateResetLabel();
      resetTimer = setTimeout(scheduleResetLabel, 1000);
    }
    scheduleResetLabel();
    return () => clearTimeout(resetTimer);
  });
</script>

<section class="homepage-best-roll" class:homepage-best-roll--active={Boolean(bestRoll)} style={spotlightStyle} aria-labelledby="homepage-best-roll-title" aria-busy={loading}>
  <div class="homepage-best-roll__panel">
    <div class="homepage-best-roll__heading">
      <span class="homepage-best-roll__heading-mark" aria-hidden="true"></span>
      <h2 id="homepage-best-roll-title" class="homepage-best-roll__title">Today’s top roll</h2>
    </div>

    {#if loading && !bestRoll}
      <div class="homepage-best-roll__state" role="status">Finding today’s best roll…</div>
    {:else if error && !bestRoll}
      <div class="homepage-best-roll__state" role="alert">{error}</div>
    {:else if bestRoll}
      <div class="homepage-best-roll__identity-row">
        <a class="homepage-best-roll__identity-link" href={profileHref} aria-label={`View ${displayName}'s profile`}>
          <span class="homepage-best-roll__avatar">
            {#if avatarSrc && avatarSrc !== failedAvatarSource}
              <img src={avatarSrc} alt="" loading="lazy" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
            {:else}
              <span aria-hidden="true">{avatarInitials}</span>
            {/if}
          </span>
          <span class="homepage-best-roll__identity-copy">
            <span class="homepage-best-roll__identity-label">Rolled by</span>
            <strong class="homepage-best-roll__identity-name">{displayName}</strong>
          </span>
        </a>
        <span class="homepage-best-roll__rank" aria-label={bestRoll.rank ? `Rank ${bestRoll.rank} today` : 'Top roll today'}>{rankLabel}</span>
      </div>

      <a class="homepage-best-roll__color-display" href={profileHref} aria-label={`View ${displayName}'s ${rollHex || 'color'} roll`}>
        <span class="homepage-best-roll__color-tile" style={`background: ${rollColor};`} aria-hidden="true"></span>
        <span class="homepage-best-roll__color-info">
          <strong class="homepage-best-roll__color-name">{identity}</strong>
          <span class="homepage-best-roll__color-meta">
            <span class="homepage-best-roll__color-hex">{rollHex || '—'}</span>
            <span class="homepage-best-roll__rarity" style={`--homepage-best-rarity: ${rarity.color};`}>{rarity.name}</span>
          </span>
        </span>
      </a>

      <div class="homepage-best-roll__result-summary" style={`--roll-accent: ${rollColor}; --roll-score-color: var(--color-earned, #f5c26f);`}>
        <RollResultBreakdown
          contributors={bestRoll.contributors}
          totalScore={score}
        />
      </div>

      <div class="homepage-best-roll__footer">
        <span role="timer" aria-label={`Today’s top roll resets in ${resetLabel}`}><span aria-hidden="true">◷</span> Resets in <strong>{resetLabel}</strong></span>
      </div>
    {:else}
      <div class="homepage-best-roll__state">
        <strong>No public roll yet.</strong>
        <span>Be the first color on today’s board.</span>
      </div>
    {/if}

    {#if error && bestRoll}
      <p class="homepage-best-roll__quiet" role="status">Live board unavailable; the latest public roll is still shown.</p>
    {/if}
  </div>
</section>

<style>
  .homepage-best-roll {
    position: relative;
    width: 100%;
    color: var(--homepage-text);
    isolation: isolate;
  }

  .homepage-best-roll--active::before {
    position: absolute;
    z-index: -1;
    inset: -16px;
    border-radius: 32px;
    background: var(--best-roll-color);
    content: '';
    filter: blur(28px);
    opacity: .14;
    pointer-events: none;
    transform: scale(.985);
    animation: homepage-best-roll-glow 4.8s ease-in-out infinite;
  }

  @keyframes homepage-best-roll-glow {
    0%, 100% {
      opacity: .11;
      transform: scale(.985);
    }

    50% {
      opacity: .24;
      transform: scale(1.015);
    }
  }

  .homepage-best-roll__panel {
    width: 100%;
    padding: 21px 22px 17px;
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: 17px;
    background: #19191d;
    box-shadow: 0 24px 52px -34px color-mix(in srgb, var(--best-roll-color) 58%, transparent);
  }

  .homepage-best-roll__heading {
    display: grid;
    justify-items: center;
    gap: 9px;
    margin-bottom: 16px;
  }

  .homepage-best-roll__heading-mark {
    width: 28px;
    height: 3px;
    border-radius: 999px;
    background: var(--best-roll-color);
    box-shadow: 0 0 16px color-mix(in srgb, var(--best-roll-color) 64%, transparent);
  }

  .homepage-best-roll__title {
    min-width: 0;
    margin: 0;
    color: var(--homepage-text);
    font: 800 1.45rem / 1 var(--homepage-display);
    letter-spacing: -.035em;
  }

  .homepage-best-roll__identity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--best-roll-color) 24%, rgba(255, 255, 255, .1));
    border-radius: 14px;
    background: color-mix(in srgb, var(--best-roll-color) 7%, #1d1d21);
  }

  .homepage-best-roll__identity-link {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    align-items: center;
    gap: 12px;
    color: var(--homepage-text);
    text-decoration: none;
  }

  .homepage-best-roll__avatar {
    display: flex;
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 2px solid var(--best-roll-avatar-accent);
    border-radius: 50%;
    background: color-mix(in srgb, var(--best-roll-avatar-accent) 42%, #25252c);
    color: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--best-roll-avatar-accent) 12%, transparent);
    font: 800 .82rem / 1 var(--font-mono-stack, monospace);
    text-align: center;
    text-transform: lowercase;
  }

  .homepage-best-roll__avatar img { width: 100%; height: 100%; object-fit: cover; }

  .homepage-best-roll__identity-copy {
    display: grid;
    min-width: 0;
    gap: 5px;
  }

  .homepage-best-roll__identity-label {
    color: var(--homepage-muted);
    font: 700 .62rem / 1 var(--font-mono-stack, monospace);
    letter-spacing: .11em;
    text-transform: uppercase;
  }

  .homepage-best-roll__identity-name {
    min-width: 0;
    color: var(--homepage-text);
    font: 800 1.05rem / 1.2 'Inter', sans-serif;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .homepage-best-roll__rank {
    flex: 0 0 auto;
    padding: 7px 10px;
    border: 1px solid color-mix(in srgb, var(--color-earned, #f5c26f) 58%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-earned, #f5c26f) 12%, transparent);
    color: var(--color-earned, #f5c26f);
    font: 750 .64rem / 1 var(--font-mono-stack, monospace);
    letter-spacing: .04em;
    text-shadow: 0 0 14px color-mix(in srgb, var(--color-earned, #f5c26f) 36%, transparent);
    white-space: nowrap;
  }

  .homepage-best-roll__color-display {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
    padding: 16px;
    border: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    border-radius: 16px;
    background: #1d1d21;
    box-shadow: 0 0 28px -18px var(--best-roll-color);
    color: var(--homepage-text);
    text-decoration: none;
    transition: filter .18s ease, transform .18s ease;
  }

  .homepage-best-roll__color-display:hover { filter: brightness(1.04); transform: translateY(-1px); }

  .homepage-best-roll__color-display:focus-visible,
  .homepage-best-roll__identity-link:focus-visible {
    outline: 2px solid var(--homepage-accent);
    outline-offset: 4px;
  }

  .homepage-best-roll__color-tile {
    width: 88px;
    height: 88px;
    flex: 0 0 88px;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
    box-shadow:
      0 10px 24px -8px color-mix(in srgb, var(--best-roll-color) 38%, transparent),
      0 0 26px -8px color-mix(in srgb, var(--best-roll-color) 24%, transparent);
  }

  .homepage-best-roll__color-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
  }

  .homepage-best-roll__color-name {
    min-width: 0;
    overflow: hidden;
    color: var(--homepage-text);
    font: 800 1.28rem / 1.05 var(--homepage-display);
    letter-spacing: -.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .homepage-best-roll__color-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .homepage-best-roll__color-hex {
    color: var(--homepage-muted);
    font: 400 .78rem / 1 var(--font-mono-stack, monospace);
    font-variant-numeric: tabular-nums;
  }

  .homepage-best-roll__rarity {
    padding: 4px 7px;
    border: 1px solid color-mix(in srgb, var(--homepage-best-rarity) 56%, rgba(255, 255, 255, .16));
    border-radius: 999px;
    background: color-mix(in srgb, var(--homepage-best-rarity) 13%, transparent);
    color: var(--homepage-best-rarity);
    font: 600 .68rem / 1 'Inter', sans-serif;
    letter-spacing: .02em;
    text-transform: none;
    text-shadow: 0 0 14px color-mix(in srgb, var(--homepage-best-rarity) 78%, transparent);
    filter: saturate(1.2);
  }

  .homepage-best-roll__result-summary { margin-top: 16px; }

  .homepage-best-roll__footer {
    display: flex;
    justify-content: center;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, .08);
    color: var(--homepage-muted);
    font: 500 .68rem / 1.3 'Inter', sans-serif;
  }

  .homepage-best-roll__footer > span { display: inline-flex; align-items: center; gap: 7px; }
  .homepage-best-roll__footer [aria-hidden='true'] { color: var(--homepage-secondary-muted); font-size: .78rem; }
  .homepage-best-roll__footer strong { color: var(--homepage-text); font: 700 .68rem / 1 var(--font-mono-stack, monospace); letter-spacing: .03em; }

  .homepage-best-roll__state { display: grid; min-height: 280px; place-items: center; align-content: center; gap: 7px; padding: 22px; border: 1px dashed rgba(255, 255, 255, .16); border-radius: 13px; color: var(--homepage-secondary-muted); font: 600 .75rem / 1.45 'Inter', sans-serif; text-align: center; }
  .homepage-best-roll__state strong { color: var(--homepage-text); font: 700 .95rem / 1 var(--homepage-display); }
  .homepage-best-roll__quiet { margin: 9px 0 0; color: var(--homepage-muted); font: 600 .6rem / 1.35 'Inter', sans-serif; text-align: center; }

  @media (max-width: 600px) {
    .homepage-best-roll__panel { padding: 20px 16px 16px; }
    .homepage-best-roll__identity-row { gap: 10px; padding: 12px; }
    .homepage-best-roll__avatar { width: 44px; height: 44px; flex-basis: 44px; }
    .homepage-best-roll__color-display { gap: 14px; padding: 14px; }
    .homepage-best-roll__color-tile { width: 80px; height: 80px; flex-basis: 80px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-best-roll__color-display { transition: none; }
    .homepage-best-roll--active::before { animation: none; opacity: .15; transform: none; }
  }
</style>
