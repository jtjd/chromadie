<script>
  import { createEventDispatcher } from 'svelte';
  import { addToast } from './stores';
  import { getLbTheme, getNameEffect, getOrbShape, getProfileBorder, getStaffTitleText, getTitleText } from './cosmetics';
  import { getPublicProfilePath, getProfileShareText } from './discoveryData.js';
  import { getAppOrigin } from './authUrls.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let item;
  export let featured = false;
  export let showFollow = false;
  export let isFollowed = false;
  export let canFollow = false;
  export let onToggleFollow = null;

  const dispatch = createEventDispatcher();

  $: profilePath = getPublicProfilePath(item?.username);
  $: theme = getLbTheme(item?.equippedCosmetics);
  $: border = getProfileBorder(item?.equippedCosmetics);
  $: orb = getOrbShape(item?.equippedCosmetics);
  $: nameEffect = getNameEffect(item?.equippedCosmetics);
  $: title = getTitleText(item?.equippedCosmetics);
  $: staffTitle = getStaffTitleText(item?.isStaff);
  $: scoreLabel = item?.score === null || item?.score === undefined ? 'Waiting for a first roll' : `${item.score.toLocaleString()} EP`;
  $: dateLabel = formatDate(item?.rollDate);
  $: profileDateLabel = formatDate(item?.profileCreatedAt);
  $: cardStyle = `${theme.style || ''}; ${border.style || ''}`;

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed);
  }

  function viewProfile(event) {
    event?.preventDefault?.();
    if (!profilePath) return;
    dispatch('navigate', { view: 'profile', username: item.username, userId: item.userId || null });
  }

  function toggleFollow(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof onToggleFollow === 'function' && item?.userId) onToggleFollow(item.userId);
  }

  async function shareProfile(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const origin = getAppOrigin();
    const text = getProfileShareText(item, origin);
    const url = profilePath && origin ? new URL(profilePath, origin).toString() : profilePath;
    if (!text || !url) return;

    try {
      let method = 'clipboard';
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: `${item.username} | ChromaDie`, text, url });
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        addToast('Profile link copied.', 'success');
      } else {
        throw new Error('Profile sharing is not supported in this browser.');
      }
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') method = 'native';
      trackProductEvent('profile_shared', { surface: 'discovery', method });
      dispatch('shared', { username: item.username });
    } catch (error) {
      if (error?.name !== 'AbortError') addToast('Could not share this profile.', 'error');
    }
  }
</script>

<article class={'discovery-card' + (featured ? ' discovery-card--featured' : '') + ' ' + theme.cls + ' ' + border.cls} style={cardStyle}>
  <div class="discovery-card__topline">
    <span class="discovery-card__eyebrow">
      {#if item?.rank}#{item.rank}{:else if item?.kind === 'profile'}Public profile{:else}Color roll{/if}
    </span>
    {#if dateLabel}
      <time datetime={item.rollDate}>{dateLabel}</time>
    {:else if profileDateLabel}
      <time datetime={item.profileCreatedAt}>Joined {profileDateLabel}</time>
    {/if}
  </div>

  <div class="discovery-card__identity">
    <a class={'discovery-card__color ' + orb.cls} href={profilePath || '/leaderboard'} on:click={viewProfile} aria-label={`Open ${item.username}'s public profile`} style={`background-color: ${item.hexCode || '#8B7CF6'}; ${orb.style || ''}`}>
      <span aria-hidden="true">{item?.hexCode || '✦'}</span>
    </a>

    <div class="discovery-card__name-block">
      <div class="discovery-card__name-line">
        {#if title}<span class="title-chip">[{title}]</span>{/if}
        {#if staffTitle}<span class="title-chip staff-title">[{staffTitle}]</span>{/if}
        <a class={'discovery-card__name ' + nameEffect.cls} href={profilePath || '/leaderboard'} on:click={viewProfile} data-text={item.username}>{item.username}</a>
        {#if item?.equippedBadges?.includes('launch_edition')}<span class="launch-edition-badge" title="Launch Edition player" aria-label="Launch Edition player">LE</span>{/if}
      </div>
      <p class="discovery-card__subline">
        {#if item?.identity}{item.identity}{:else if item?.kind === 'profile' && item?.totalRolls === 0}Ready for a first color story{:else}{item?.rarity || 'Color explorer'} profile{/if}
      </p>
    </div>

    <div class="discovery-card__score">
      <strong>{scoreLabel}</strong>
      {#if item?.rarity}<span>{item.rarity}</span>{/if}
    </div>
  </div>

  <div class="discovery-card__stats" aria-label={`${item.username} public profile summary`}>
    <span><b>{item?.currentStreak || 0}</b> day streak</span>
    <span><b>{item?.totalRolls || 0}</b> rolls</span>
    {#if item?.kind === 'roll' && item?.hexCode}<span class="discovery-card__hex">{item.hexCode}</span>{/if}
  </div>

  <div class="discovery-card__actions">
    <a class="discovery-card__cta" href={profilePath || '/leaderboard'} on:click={viewProfile}>View profile <span aria-hidden="true">→</span></a>
    <div class="discovery-card__secondary-actions">
      {#if showFollow && canFollow && item?.userId}
        <button type="button" class:active={isFollowed} class="discovery-card__icon-button" on:click={toggleFollow} aria-label={isFollowed ? `Remove ${item.username} from rivals` : `Add ${item.username} as a rival`} title={isFollowed ? 'Remove rival' : 'Add rival'}>
          {isFollowed ? '✓' : '+'}
        </button>
      {/if}
      <button type="button" class="discovery-card__share" on:click={shareProfile} aria-label={`Share ${item.username}'s public profile`}>Share</button>
    </div>
  </div>
</article>

<style>
  .discovery-card { display: flex; flex-direction: column; min-width: 0; gap: 0.85rem; padding: 1.05rem; border: 1px solid rgba(157, 166, 194, 0.24); border-radius: 1.15rem; background: linear-gradient(145deg, rgba(255,255,255,0.065), rgba(139,124,246,0.055)); box-shadow: 0 14px 28px rgba(0,0,0,0.16); transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
  .discovery-card:hover { transform: translateY(-2px); border-color: rgba(139,124,246,0.52); box-shadow: 0 18px 34px rgba(0,0,0,0.23); }
  .discovery-card--featured { grid-column: span 2; padding: 1.3rem; border-color: rgba(241,196,15,0.42); background: radial-gradient(circle at 8% 0%, rgba(241,196,15,0.15), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(139,124,246,0.09)); }
  .discovery-card__topline, .discovery-card__actions, .discovery-card__stats, .discovery-card__name-line { display: flex; align-items: center; }
  .discovery-card__topline { justify-content: space-between; gap: 0.75rem; color: var(--text-muted); font: 700 0.62rem/1.2 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .discovery-card__eyebrow { color: #ffd34f; }
  .discovery-card__topline time { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; letter-spacing: 0.02em; text-transform: none; }
  .discovery-card__identity { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr) auto; gap: 0.9rem; align-items: center; min-width: 0; }
  .discovery-card__color { display: grid; place-items: center; width: 4.2rem; height: 4.2rem; border: 1px solid rgba(255,255,255,0.42); border-radius: 1.15rem; color: rgba(255,255,255,0.88); font: 800 0.56rem/1 var(--font-mono-stack); text-decoration: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.16), 0 8px 18px rgba(0,0,0,0.2); }
  .discovery-card__color:focus-visible, .discovery-card__name:focus-visible, .discovery-card__cta:focus-visible, .discovery-card__share:focus-visible, .discovery-card__icon-button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
  .discovery-card__color span { padding: 0.25rem; border-radius: 0.35rem; background: rgba(0,0,0,0.22); }
  .discovery-card__name-block { min-width: 0; }
  .discovery-card__name-line { flex-wrap: wrap; gap: 0.36rem; min-width: 0; }
  .discovery-card__name { overflow: hidden; color: #f3f5ff; font-size: 1.02rem; font-weight: 800; letter-spacing: -0.02em; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  .discovery-card__name:hover { color: #fff; text-decoration: underline; text-underline-offset: 0.16em; }
  .discovery-card__subline { overflow: hidden; margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.72rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
  .discovery-card__score { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; min-width: 5rem; text-align: right; }
  .discovery-card__score strong { color: #ffd34f; font: 900 0.92rem/1 var(--font-mono-stack); white-space: nowrap; }
  .discovery-card__score span { color: var(--text-muted); font: 700 0.6rem/1 var(--font-mono-stack); text-transform: uppercase; }
  .discovery-card__stats { flex-wrap: wrap; gap: 0.45rem 0.8rem; padding-top: 0.75rem; border-top: 1px solid rgba(157,166,194,0.16); color: var(--text-muted); font: 600 0.68rem/1.2 var(--font-mono-stack); }
  .discovery-card__stats b { color: #e6eaff; }
  .discovery-card__hex { margin-left: auto; color: #e6eaff; }
  .discovery-card__actions { justify-content: space-between; gap: 0.75rem; margin-top: auto; }
  .discovery-card__cta { color: #c8c1ff; font-size: 0.78rem; font-weight: 800; text-decoration: none; }
  .discovery-card__cta:hover { color: #fff; }
  .discovery-card__secondary-actions { display: flex; align-items: center; gap: 0.4rem; }
  .discovery-card__share, .discovery-card__icon-button { min-height: 2rem; border: 1px solid rgba(157,166,194,0.3); border-radius: 999px; background: rgba(255,255,255,0.04); color: var(--text-muted); cursor: pointer; font: 700 0.66rem/1 var(--font-mono-stack); }
  .discovery-card__share { padding: 0.45rem 0.7rem; }
  .discovery-card__icon-button { width: 2rem; padding: 0; }
  .discovery-card__share:hover, .discovery-card__icon-button:hover, .discovery-card__icon-button.active { border-color: rgba(139,124,246,0.6); background: rgba(139,124,246,0.14); color: #fff; }
  .title-chip { color: #d9cbff; font: 700 0.6rem/1 var(--font-mono-stack); }
  .staff-title { color: #ffd34f; }
  .launch-edition-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.45rem; height: 1.05rem; padding: 0 0.25rem; border: 1px solid rgba(161, 92, 255, 0.55); border-radius: 999px; background: linear-gradient(135deg, rgba(94, 234, 212, 0.16), rgba(161, 92, 255, 0.2)); color: #d8c7ff; font: 700 0.58rem/1 var(--font-mono-stack); letter-spacing: 0.05em; }
  @media (max-width: 700px) {
    .discovery-card--featured { grid-column: span 1; }
  }
  @media (max-width: 460px) {
    .discovery-card { padding: 0.9rem; }
    .discovery-card__identity { grid-template-columns: 3.45rem minmax(0, 1fr); gap: 0.7rem; }
    .discovery-card__color { width: 3.45rem; height: 3.45rem; border-radius: 0.9rem; }
    .discovery-card__score { grid-column: 2; align-items: flex-start; text-align: left; }
    .discovery-card__hex { margin-left: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .discovery-card { transition: none; }
    .discovery-card:hover { transform: none; }
  }
</style>
