<script>
  import ProfileBorderEffect from '../profile-border/ProfileBorderEffect.svelte';
  import { normalizeHexColor } from '../utils.js';

  export let username = 'Player';
  export let displayName = 'Player';
  /** @type {any} */
  export let profile = null;
  export let accentColor = '#CDD2FF';
  export let surfaceStyle = '';
  export let profileBorderKey = '';
  export let bestRoll = null;
  export let recentScores = [];
  /** @type {any} */
  export let rank = null;
  /** @type {any} */
  export let rankState = null;
  export let prefersReducedMotion = false;
  export let previewMode = false;
  export let onReturn = () => {};

  function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function formatCount(value) {
    return safeCount(value).toLocaleString();
  }

  function colorFor(value, fallback = accentColor) {
    return normalizeHexColor(value, normalizeHexColor(fallback, '#CDD2FF'));
  }

  function formatDate(value) {
    const date = new Date(`${String(value || '')}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? 'Recent'
      : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  $: safeUsername = String(username || 'Player').trim().slice(0, 32) || 'Player';
  $: safeDisplayName = String(displayName || safeUsername).trim().slice(0, 80) || safeUsername;
  $: accent = normalizeHexColor(accentColor, '#CDD2FF');
  $: totalRolls = safeCount(profile?.total_rolls);
  $: currentStreak = safeCount(profile?.current_streak);
  $: longestStreak = safeCount(profile?.longest_streak);
  $: rankName = String(rank?.name || 'Unranked').trim().slice(0, 32) || 'Unranked';
  $: lifetimeEp = safeCount(rankState?.lifetimeEp ?? profile?.lifetime_ep);
  $: rankPercent = rankState?.next
    ? Math.max(0, Math.min(100, Math.round(Number(rankState.progress) * 100 || 0)))
    : 100;
  $: nextRankLabel = rankState?.next
    ? `${rankState.next.name} at ${formatCount(rankState.next.min)} EP`
    : 'Highest rank reached';
  $: safeBestRoll = bestRoll && typeof bestRoll === 'object' ? bestRoll : null;
  $: bestHex = colorFor(safeBestRoll?.hex_code || safeBestRoll?.hex);
  $: recentRolls = (Array.isArray(recentScores) ? recentScores : [])
    .filter(score => score && typeof score === 'object')
    .slice()
    .sort((left, right) => String(right.roll_date || '').localeCompare(String(left.roll_date || '')))
    .slice(0, 6);
</script>

<section class="profile-game-progress" class:profile-game-progress--preview={previewMode} data-profile-page="progress" aria-labelledby="profile-game-progress-title" style={`--profile-game-progress-accent:${accent};`}>
  {#if !previewMode}<button type="button" class="profile-game-progress__back" on:click={onReturn} aria-label="Return to profile card">
    <span aria-hidden="true">↑</span>
    <span>Profile</span>
  </button>{/if}

  <div class="profile-game-progress__frame">
    <ProfileBorderEffect
      borderKey={profileBorderKey}
      surfaceStyle={surfaceStyle}
      className="profile-game-progress__border"
      animated={!prefersReducedMotion}
    >
      <article class="profile-game-progress__card" aria-label={`${safeDisplayName} game progress`}>
        <header class="profile-game-progress__heading">
          <div>
            <p class="profile-game-progress__eyebrow">{safeUsername} · GAME PROGRESS</p>
            <h2 id="profile-game-progress-title">A life in color.</h2>
            <p class="profile-game-progress__intro">Every daily roll adds another mark to this profile.</p>
          </div>
          <div class="profile-game-progress__rank" aria-label={`${rankName} rank`}>
            <span class="profile-game-progress__rank-mark" aria-hidden="true">✦</span>
            <span>{rankName}</span>
          </div>
        </header>

        <div class="profile-game-progress__stats" aria-label="Roll and streak totals">
          <div class="profile-game-progress__stat profile-game-progress__stat--rolls">
            <strong>{formatCount(totalRolls)}</strong>
            <span>lifetime rolls</span>
          </div>
          <div class="profile-game-progress__stat">
            <strong>{formatCount(currentStreak)}</strong>
            <span>current streak</span>
          </div>
          <div class="profile-game-progress__stat">
            <strong>{formatCount(longestStreak)}</strong>
            <span>longest streak</span>
          </div>
        </div>

        <section class="profile-game-progress__rank-track" aria-label="Rank progress">
          <div class="profile-game-progress__rank-copy">
            <div>
              <span class="profile-game-progress__section-label">Rank progression</span>
              <strong>{rankName}</strong>
            </div>
            <span class="profile-game-progress__ep">{formatCount(lifetimeEp)} EP</span>
          </div>
          <div class="profile-game-progress__bar" role="progressbar" aria-label={`${rankName} rank progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={rankPercent}>
            <span style={`width:${rankPercent}%;`}></span>
          </div>
          <p>{nextRankLabel}</p>
        </section>

        <div class="profile-game-progress__rolls">
          <section class="profile-game-progress__best" aria-label="Personal best roll">
            <div class="profile-game-progress__best-swatch" style={`--roll-color:${bestHex};`} aria-hidden="true"></div>
            <div>
              <span class="profile-game-progress__section-label">Personal best</span>
              {#if safeBestRoll}
                <strong>{formatCount(safeBestRoll.score)} <small>score</small></strong>
                <p><span>{bestHex}</span>{#if safeBestRoll.rarity}<span aria-hidden="true"> · </span><span>{safeBestRoll.rarity}</span>{/if}</p>
              {:else}
                <strong>The first color is still ahead</strong>
                <p>Rolls become part of this profile’s story.</p>
              {/if}
            </div>
          </section>

          <section class="profile-game-progress__recent" aria-labelledby="profile-game-progress-recent-title">
            <div class="profile-game-progress__recent-heading">
              <span class="profile-game-progress__section-label" id="profile-game-progress-recent-title">Recent colors</span>
              <span>last 30 days</span>
            </div>
            {#if recentRolls.length}
              <ol class="profile-game-progress__recent-list">
                {#each recentRolls as roll, index (`${roll.roll_date || 'recent'}-${index}`)}
                  {@const rollHex = colorFor(roll.hex_code || roll.hex)}
                  <li>
                    <span class="profile-game-progress__recent-swatch" style={`--roll-color:${rollHex};`} aria-hidden="true"></span>
                    <span class="profile-game-progress__recent-date">{formatDate(roll.roll_date)}</span>
                    <strong>{rollHex}</strong>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="profile-game-progress__empty">No recent colors are available to show.</p>
            {/if}
          </section>
        </div>
      </article>
    </ProfileBorderEffect>
  </div>
</section>

<style>
  .profile-game-progress {
    position: relative;
    display: grid;
    min-height: 100dvh;
    box-sizing: border-box;
    place-items: center;
    padding: clamp(3.5rem, 8vh, 5.5rem) 0 clamp(2rem, 6vh, 4rem);
    scroll-snap-align: start;
    scroll-snap-stop: always;
    color: var(--profile-text, #f4f6fb);
    font-family: var(--font-body-stack, Inter, sans-serif);
  }

  .profile-game-progress--preview { min-height: 100%; padding: 1.25rem; scroll-snap-align: none; }

  .profile-game-progress__back {
    position: absolute;
    z-index: 3;
    top: 1.25rem;
    left: max(.25rem, calc((100% - 58rem) / 2));
    display: inline-flex;
    min-height: 2.5rem;
    align-items: center;
    gap: .55rem;
    padding: .4rem .7rem;
    border: 1px solid color-mix(in srgb, var(--profile-game-progress-accent) 34%, var(--color-line-subtle));
    border-radius: var(--radius-pill, 999px);
    background: color-mix(in srgb, var(--color-canvas-deep, #07080b) 60%, transparent);
    color: var(--color-ink-muted, #aeb6c4);
    font: 600 .7rem/1 var(--font-body-stack, Inter, sans-serif);
    cursor: pointer;
  }

  .profile-game-progress__back:hover { color: var(--color-ink-strong, #f4f6fb); border-color: var(--profile-game-progress-accent); }
  .profile-game-progress__back:focus-visible { outline: 2px solid var(--profile-game-progress-accent); outline-offset: 3px; }
  .profile-game-progress__back span:first-child { font-size: 1rem; }
  .profile-game-progress__frame { width: min(100%, 56rem); min-width: 0; }
  :global(.profile-game-progress__border) { width: 100%; }

  .profile-game-progress__card {
    display: grid;
    gap: clamp(1rem, 2.5vh, 1.65rem);
    min-width: 0;
    padding: clamp(1.15rem, 3.1vw, 2.25rem);
    border-radius: var(--profile-border-content-radius, 1.25rem);
    background: transparent;
    color: var(--profile-text, #f4f6fb);
  }

  .profile-game-progress__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.25rem; }
  .profile-game-progress__eyebrow, .profile-game-progress__section-label { display: block; margin: 0; color: color-mix(in srgb, var(--profile-game-progress-accent) 78%, var(--color-ink-muted, #aeb6c4)); font: 700 .62rem/1.35 var(--font-mono-stack, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .profile-game-progress__heading h2 { margin: .38rem 0 0; color: var(--profile-text, #f4f6fb); font: 600 clamp(1.65rem, 3.7vw, 2.8rem)/1.02 var(--font-display-stack, sans-serif); letter-spacing: -.045em; }
  .profile-game-progress__intro { margin: .48rem 0 0; color: var(--color-ink-muted, #aeb6c4); font-size: .8rem; line-height: 1.5; }
  .profile-game-progress__rank { display: inline-flex; flex: 0 0 auto; align-items: center; gap: .45rem; padding: .48rem .65rem; border: 1px solid color-mix(in srgb, var(--profile-game-progress-accent) 42%, var(--color-line-subtle)); border-radius: var(--radius-pill, 999px); color: var(--profile-game-progress-accent); font: 700 .67rem/1 var(--font-mono-stack, monospace); }
  .profile-game-progress__rank-mark { font-size: .8rem; }

  .profile-game-progress__stats { display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-block: 1px solid var(--color-line-subtle, rgba(255,255,255,.1)); }
  .profile-game-progress__stat { display: grid; align-content: center; gap: .35rem; min-width: 0; padding: .8rem clamp(.55rem, 2vw, 1.25rem); border-left: 1px solid var(--color-line-subtle, rgba(255,255,255,.1)); }
  .profile-game-progress__stat:first-child { border-left: 0; padding-left: 0; }
  .profile-game-progress__stat strong { color: var(--color-ink-strong, #f4f6fb); font: 600 clamp(1.45rem, 3vw, 2.15rem)/1 var(--font-display-stack, sans-serif); letter-spacing: -.035em; }
  .profile-game-progress__stat--rolls strong { color: var(--profile-game-progress-accent); font-size: clamp(1.8rem, 4.5vw, 3rem); }
  .profile-game-progress__stat span { color: var(--color-ink-muted, #aeb6c4); font-size: .68rem; line-height: 1.35; }

  .profile-game-progress__rank-track { display: grid; gap: .55rem; }
  .profile-game-progress__rank-copy { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
  .profile-game-progress__rank-copy > div { display: grid; gap: .25rem; }
  .profile-game-progress__rank-copy strong { color: var(--color-ink-strong, #f4f6fb); font: 600 .92rem/1.2 var(--font-display-stack, sans-serif); }
  .profile-game-progress__ep { color: var(--color-ink-secondary, #cbd1dc); font: 600 .7rem/1 var(--font-mono-stack, monospace); }
  .profile-game-progress__bar { height: .42rem; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--profile-game-progress-accent) 14%, var(--surface-inset, #11141b)); }
  .profile-game-progress__bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, color-mix(in srgb, var(--profile-game-progress-accent) 65%, #fff), var(--profile-game-progress-accent)); transition: width 260ms ease; }
  .profile-game-progress__rank-track > p { margin: 0; color: var(--color-ink-muted, #aeb6c4); font-size: .66rem; line-height: 1.3; }

  .profile-game-progress__rolls { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: clamp(1rem, 2.5vw, 1.75rem); padding-top: .35rem; border-top: 1px solid var(--color-line-subtle, rgba(255,255,255,.1)); }
  .profile-game-progress__best { display: grid; grid-template-columns: 3.8rem minmax(0, 1fr); align-items: center; gap: .75rem; min-width: 0; }
  .profile-game-progress__best-swatch { width: 3.8rem; aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--color-ink-strong, #fff) 24%, transparent); border-radius: .8rem; background: var(--roll-color); box-shadow: 0 0 2.4rem color-mix(in srgb, var(--roll-color) 34%, transparent); }
  .profile-game-progress__best > div:last-child { display: grid; gap: .28rem; min-width: 0; }
  .profile-game-progress__best strong { color: var(--color-ink-strong, #f4f6fb); font: 600 .9rem/1.2 var(--font-display-stack, sans-serif); overflow-wrap: anywhere; }
  .profile-game-progress__best strong small { color: var(--color-ink-muted, #aeb6c4); font: 500 .62rem/1 var(--font-body-stack, Inter, sans-serif); }
  .profile-game-progress__best p { margin: 0; color: var(--color-ink-muted, #aeb6c4); font: 500 .64rem/1.35 var(--font-mono-stack, monospace); }

  .profile-game-progress__recent { display: grid; align-content: start; gap: .48rem; min-width: 0; }
  .profile-game-progress__recent-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .65rem; }
  .profile-game-progress__recent-heading > span:last-child { color: var(--color-ink-muted, #aeb6c4); font-size: .59rem; }
  .profile-game-progress__recent-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .42rem; margin: 0; padding: 0; list-style: none; }
  .profile-game-progress__recent-list li { display: grid; grid-template-columns: .58rem minmax(0, 1fr); align-items: center; column-gap: .4rem; row-gap: .18rem; min-width: 0; }
  .profile-game-progress__recent-swatch { grid-row: span 2; width: .58rem; aspect-ratio: 1; border-radius: 50%; background: var(--roll-color); box-shadow: 0 0 .9rem color-mix(in srgb, var(--roll-color) 42%, transparent); }
  .profile-game-progress__recent-date { overflow: hidden; color: var(--color-ink-muted, #aeb6c4); font-size: .58rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-game-progress__recent-list strong { overflow: hidden; color: var(--color-ink-secondary, #cbd1dc); font: 500 .58rem/1.2 var(--font-mono-stack, monospace); text-overflow: ellipsis; }
  .profile-game-progress__empty { margin: 0; color: var(--color-ink-muted, #aeb6c4); font-size: .68rem; line-height: 1.4; }

  @media (max-width: 38rem) {
    .profile-game-progress { align-content: start; min-height: 100dvh; padding-top: 4.25rem; }
    .profile-game-progress__back { top: .75rem; }
    .profile-game-progress__heading { flex-direction: column-reverse; gap: .75rem; }
    .profile-game-progress__rank { padding: .4rem .55rem; }
    .profile-game-progress__stats { grid-template-columns: 1fr 1fr; }
    .profile-game-progress__stat { min-height: 4.1rem; border-left: 1px solid var(--color-line-subtle, rgba(255,255,255,.1)); }
    .profile-game-progress__stat--rolls { grid-column: 1 / -1; border-bottom: 1px solid var(--color-line-subtle, rgba(255,255,255,.1)); border-left: 0; padding-left: 0; }
    .profile-game-progress__stat:nth-child(2) { border-left: 0; padding-left: 0; }
    .profile-game-progress__rolls { grid-template-columns: minmax(0, 1fr); }
    .profile-game-progress__recent-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-game-progress__bar span { transition: none; }
    .profile-game-progress__back { scroll-behavior: auto; }
  }
</style>
