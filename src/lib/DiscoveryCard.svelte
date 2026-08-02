<script>
  import { createEventDispatcher } from 'svelte';
  import { addToast } from './stores';
  import { getBadgeMeta } from './badgeData';
  import CompactRollPreview from './CompactRollPreview.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import { getLbTheme, getOrbShape, getProfileBorder, getRollEffect, getStaffTitleText, getTitleText } from './cosmetics';
  import { getPublicProfilePath, getProfileShareText } from './discoveryData.js';
  import { getAppOrigin } from './authUrls.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';

  export let item;
  export let featured = false;
  export let showFollow = false;
  export let isFollowed = false;
  export let canFollow = false;
  export let onToggleFollow = null;

  const dispatch = createEventDispatcher();

  let failedAvatarSource = '';

  $: profilePath = getPublicProfilePath(item?.username);
  $: theme = getLbTheme(item?.equippedCosmetics);
  $: border = getProfileBorder(item?.equippedCosmetics);
  $: nameRendererKey = String(item?.equippedCosmetics?.name_effect || '');
  $: nameRendererLoadout = getNameRendererLoadout(item?.equippedCosmetics);
  $: title = getTitleText(item?.equippedCosmetics);
  $: staffTitle = getStaffTitleText(item?.isStaff);
  $: displayName = item?.displayName || item?.username || 'Unknown player';
  $: profileAccent = item?.profileAccent || '#8B7CF6';
  $: rollColor = item?.hexCode || profileAccent;
  $: orbShape = getOrbShape(item?.equippedCosmetics);
  $: rollEffect = getRollEffect(item?.equippedCosmetics);
  $: avatarSrc = getProfileMediaUrl(item?.avatarPath);
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: scoreLabel = item?.score === null || item?.score === undefined ? 'No roll yet' : `${item.score.toLocaleString()} EP`;
  $: rollLabel = item?.score === null || item?.score === undefined
    ? 'Profile preview'
    : item?.identity || 'Latest color';
  $: dateLabel = formatDate(item?.rollDate);
  $: profileDateLabel = formatDate(item?.profileCreatedAt);
  $: profileBadges = (item?.equippedBadges || [])
    .filter(badgeId => badgeId !== 'launch_edition')
    .map(badgeId => ({ id: badgeId, ...getBadgeMeta(badgeId) }))
    .filter(badge => badge.symbol !== '❓')
    .slice(0, 3);
  $: cardStyle = `--discovery-profile-accent: ${profileAccent}; --discovery-roll-color: ${rollColor}; ${theme.style || ''}; ${border.style || ''}`;

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
        await navigator.share({ title: `${displayName} | ChromaDie`, text, url });
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
    <div class="discovery-card__rank-lockup">
      <span class="discovery-card__rank">{item?.rank ? `#${item.rank}` : 'Profile'}</span>
      <span class="discovery-card__surface-label">{featured ? 'Featured' : item?.kind === 'profile' ? 'Profile' : 'Color roll'}</span>
    </div>
    {#if dateLabel}
      <time datetime={item.rollDate}>{dateLabel}</time>
    {:else if profileDateLabel}
      <time datetime={item.profileCreatedAt}>Joined {profileDateLabel}</time>
    {/if}
  </div>

  <div class="discovery-card__main">
    <div class="discovery-card__profile">
      <a class="discovery-card__avatar" href={profilePath || '/leaderboard'} on:click={viewProfile} aria-label={`Open ${displayName}'s public profile`}>
        {#if avatarSrc && avatarSrc !== failedAvatarSource}
          <img src={avatarSrc} alt="" loading="lazy" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
        {:else}
          <span class="discovery-card__avatar-initial" aria-hidden="true">{displayName.slice(0, 1).toUpperCase() || '✦'}</span>
        {/if}
        <span class="discovery-card__avatar-accent" aria-hidden="true"></span>
      </a>

      <div class="discovery-card__identity">
        <div class="discovery-card__name-line">
          {#if nameRendererKey || nameRendererLoadout}
            <NameEffectCanvas
              text={displayName}
              rendererKey={nameRendererKey}
              loadout={nameRendererLoadout}
              todayColor={rollColor}
              context="card"
              compact={true}
              mode="static-signature"
              semanticTag="a"
              semanticClass="discovery-card__name"
              href={profilePath || '/leaderboard'}
              semanticOnClick={viewProfile}
            />
          {:else}
            <a class="discovery-card__name" href={profilePath || '/leaderboard'} on:click={viewProfile}>{displayName}</a>
          {/if}
          {#if title}<span class="title-chip">{title}</span>{/if}
          {#if staffTitle}<span class="title-chip staff-title">{staffTitle}</span>{/if}
          {#if item?.equippedBadges?.includes('launch_edition')}<span class="launch-edition-badge" title="Launch Edition player" aria-label="Launch Edition player">LE</span>{/if}
          {#each profileBadges as badge (badge.id)}
            <span class="profile-badge" title={badge.name} aria-label={badge.name + ' badge'}>{badge.symbol}</span>
          {/each}
        </div>
        <a class="discovery-card__handle" href={profilePath || '/leaderboard'} on:click={viewProfile}>@{item.username}</a>
        {#if item?.bio}<p class="discovery-card__bio">{item.bio}</p>{/if}
      </div>
    </div>

    <div class="discovery-card__roll">
      <CompactRollPreview
        displayColor={rollColor}
        rarity={item?.rarity || 'Common'}
        effectCls={rollEffect.cls}
        effectStyle={rollEffect.style}
        orbCls={orbShape.cls}
        size="3.5rem"
        scale={0.34}
      />
      <div class="discovery-card__roll-copy">
        <span>Color</span>
        <strong>{rollLabel}</strong>
        {#if item?.rarity}<small>{item.rarity}</small>{/if}
      </div>
    </div>

    <div class="discovery-card__score">
      <strong>{scoreLabel}</strong>
      <span>{item?.score === null || item?.score === undefined ? 'Not ranked yet' : 'Roll score'}</span>
    </div>
  </div>

  <div class="discovery-card__stats" aria-label={`${displayName} public profile summary`}>
    <span><b>{item?.currentStreak || 0}</b> day streak</span>
    <span><b>{item?.totalRolls || 0}</b> rolls</span>
    {#if item?.hexCode}<span class="discovery-card__hex">{item.hexCode}</span>{/if}
  </div>

  <div class="discovery-card__actions">
    <a class="discovery-card__cta" href={profilePath || '/leaderboard'} on:click={viewProfile}>Open profile <span aria-hidden="true">↗</span></a>
    <div class="discovery-card__secondary-actions">
      {#if showFollow && canFollow && item?.userId}
        <button type="button" class:active={isFollowed} class="discovery-card__icon-button" on:click={toggleFollow} aria-label={isFollowed ? `Remove ${item.username} from rivals` : `Add ${item.username} as a rival`} title={isFollowed ? 'Remove rival' : 'Add rival'}>
          {isFollowed ? '✓' : '+'}
        </button>
      {/if}
      <button type="button" class="discovery-card__share" on:click={shareProfile} aria-label={`Share ${displayName}'s public profile`}>Share</button>
    </div>
  </div>
</article>

<style>
  .discovery-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1rem;
    overflow: hidden;
    padding: 1.15rem;
    border: 1px solid color-mix(in srgb, var(--discovery-profile-accent) 24%, var(--color-line-subtle));
    border-radius: var(--radius-md);
    background: linear-gradient(125deg, color-mix(in srgb, var(--discovery-profile-accent) 8%, var(--surface-panel)), var(--surface-panel) 58%, color-mix(in srgb, var(--discovery-roll-color) 5%, var(--surface-panel)));
    box-shadow: 0 1.4rem 3rem rgba(0, 0, 0, 0.16);
    transition: transform var(--motion-fast) var(--motion-ease-standard), border-color var(--motion-fast) var(--motion-ease-standard), box-shadow var(--motion-fast) var(--motion-ease-standard);
  }

  .discovery-card::before { position: absolute; inset: 0 auto auto 0; width: 32%; height: 1px; background: linear-gradient(90deg, var(--discovery-profile-accent), transparent); content: ''; opacity: 0.86; }
  .discovery-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--discovery-profile-accent) 54%, var(--color-line-subtle)); box-shadow: 0 1.8rem 3.4rem rgba(0, 0, 0, 0.24); }
  .discovery-card--featured { grid-column: span 2; padding: 1.35rem; border-color: color-mix(in srgb, var(--discovery-profile-accent) 48%, var(--color-line-subtle)); background: linear-gradient(115deg, color-mix(in srgb, var(--discovery-profile-accent) 13%, var(--surface-panel)), var(--surface-panel) 52%, color-mix(in srgb, var(--discovery-roll-color) 8%, var(--surface-panel))); }

  .discovery-card__topline,
  .discovery-card__rank-lockup,
  .discovery-card__stats,
  .discovery-card__actions,
  .discovery-card__name-line { display: flex; align-items: center; }
  .discovery-card__topline { justify-content: space-between; gap: 0.75rem; color: var(--color-ink-muted); font: 700 0.6rem/1.2 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .discovery-card__rank-lockup { gap: 0.55rem; min-width: 0; }
  .discovery-card__rank { color: color-mix(in srgb, var(--discovery-profile-accent) 72%, white); font-weight: 800; }
  .discovery-card__surface-label { overflow: hidden; color: var(--color-ink-muted); font-size: 0.56rem; font-weight: 600; letter-spacing: 0.1em; text-overflow: ellipsis; white-space: nowrap; }
  .discovery-card__topline time { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; letter-spacing: 0.02em; text-transform: none; }

  .discovery-card__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; align-items: center; min-width: 0; }
  .discovery-card__profile { display: flex; grid-column: 1; align-items: center; gap: 0.85rem; min-width: 0; }
  .discovery-card__avatar { position: relative; display: grid; place-items: center; flex: 0 0 4rem; width: 4rem; height: 4rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--discovery-profile-accent) 56%, white 12%); border-radius: 1.1rem; background: radial-gradient(circle at 32% 24%, color-mix(in srgb, var(--discovery-profile-accent) 72%, white), var(--discovery-profile-accent) 48%, var(--surface-inset) 100%); box-shadow: 0 0 1.8rem color-mix(in srgb, var(--discovery-profile-accent) 18%, transparent), inset 0 0 0 1px rgba(255,255,255,0.1); text-decoration: none; }
  .discovery-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .discovery-card__avatar-initial { position: relative; z-index: 1; color: var(--color-ink-strong); font: 700 1.8rem/1 var(--font-display-stack); letter-spacing: -0.08em; }
  .discovery-card__avatar-accent { position: absolute; right: 0.28rem; bottom: 0.28rem; width: 0.55rem; height: 0.55rem; border: 2px solid var(--surface-panel); border-radius: 50%; background: var(--discovery-roll-color); box-shadow: 0 0 0.8rem var(--discovery-roll-color); }
  .discovery-card__avatar:focus-visible,
  .discovery-card__name:focus-visible,
  .discovery-card__handle:focus-visible,
  .discovery-card__cta:focus-visible,
  .discovery-card__share:focus-visible,
  .discovery-card__icon-button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .discovery-card__identity { min-width: 0; }
  .discovery-card__name-line { flex-wrap: wrap; gap: 0.34rem 0.42rem; min-width: 0; }
  .discovery-card__name { overflow: hidden; color: var(--color-ink-strong); font: 700 1.08rem/1.05 var(--font-display-stack); letter-spacing: -0.035em; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  .discovery-card__name:hover { color: #fff; text-decoration: underline; text-underline-offset: 0.16em; }
  .discovery-card__handle { display: block; width: fit-content; margin-top: 0.3rem; color: var(--color-ink-muted); font: 600 0.64rem/1.2 var(--font-mono-stack); letter-spacing: 0.04em; text-decoration: none; }
  .discovery-card__handle:hover { color: color-mix(in srgb, var(--discovery-profile-accent) 78%, white); }
  .discovery-card__bio { display: -webkit-box; overflow: hidden; max-width: 36rem; margin: 0.4rem 0 0; color: var(--color-ink-muted); font-size: 0.75rem; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }

  .discovery-card__roll { display: flex; grid-column: 1 / -1; align-items: center; gap: 0.7rem; min-width: 0; padding-top: 0.85rem; border-top: 1px solid var(--color-line-subtle); }
  .discovery-card__roll-copy { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .discovery-card__roll-copy > span { color: var(--color-ink-muted); font: 700 0.54rem/1 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: uppercase; }
  .discovery-card__roll-copy strong { overflow: hidden; color: var(--color-ink-strong); font-size: 0.78rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .discovery-card__roll-copy small { color: color-mix(in srgb, var(--discovery-roll-color) 68%, white); font: 700 0.56rem/1 var(--font-mono-stack); letter-spacing: 0.07em; text-transform: uppercase; }
  .discovery-card__score { display: flex; grid-column: 2; grid-row: 1; flex-direction: column; align-items: flex-end; gap: 0.28rem; min-width: 7rem; text-align: right; }
  .discovery-card__score strong { color: color-mix(in srgb, var(--discovery-profile-accent) 76%, white); font: 900 0.98rem/1 var(--font-mono-stack); white-space: nowrap; }
  .discovery-card__score span { color: var(--color-ink-muted); font: 700 0.54rem/1 var(--font-mono-stack); letter-spacing: 0.06em; text-transform: uppercase; }

  .discovery-card__stats { flex-wrap: wrap; gap: 0.45rem 0.85rem; padding-top: 0.8rem; border-top: 1px solid var(--color-line-subtle); color: var(--color-ink-muted); font: 600 0.64rem/1.2 var(--font-mono-stack); }
  .discovery-card__stats b { color: var(--color-ink-strong); }
  .discovery-card__hex { margin-left: auto; color: var(--color-ink-strong); }
  .discovery-card__actions { justify-content: space-between; gap: 0.75rem; margin-top: auto; }
  .discovery-card__cta { color: color-mix(in srgb, var(--discovery-profile-accent) 78%, white); font-size: 0.76rem; font-weight: 800; text-decoration: none; }
  .discovery-card__cta:hover { color: #fff; }
  .discovery-card__secondary-actions { display: flex; align-items: center; gap: 0.4rem; }
  .discovery-card__share, .discovery-card__icon-button { min-height: 2rem; border: 1px solid var(--color-line-strong); border-radius: 999px; background: transparent; color: var(--color-ink-muted); cursor: pointer; font: 700 0.62rem/1 var(--font-mono-stack); }
  .discovery-card__share { padding: 0.45rem 0.7rem; }
  .discovery-card__icon-button { width: 2rem; padding: 0; }
  .discovery-card__share:hover, .discovery-card__icon-button:hover, .discovery-card__icon-button.active { border-color: color-mix(in srgb, var(--discovery-profile-accent) 60%, transparent); background: color-mix(in srgb, var(--discovery-profile-accent) 12%, transparent); color: var(--color-ink-strong); }
  .title-chip { color: color-mix(in srgb, var(--discovery-profile-accent) 70%, white); font: 700 0.58rem/1 var(--font-mono-stack); }
  .staff-title { color: var(--color-accent-cyan); }
  .profile-badge { display: inline-grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 1px solid color-mix(in srgb, var(--discovery-profile-accent) 42%, transparent); border-radius: 50%; background: color-mix(in srgb, var(--discovery-profile-accent) 12%, transparent); font-size: 0.64rem; line-height: 1; }
  .launch-edition-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.35rem; height: 1.05rem; padding: 0 0.22rem; border: 1px solid color-mix(in srgb, var(--discovery-profile-accent) 55%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--discovery-profile-accent) 14%, transparent); color: color-mix(in srgb, var(--discovery-profile-accent) 72%, white); font: 700 0.54rem/1 var(--font-mono-stack); letter-spacing: 0.05em; }

  .discovery-card--featured .discovery-card__main { grid-template-columns: minmax(0, 1.3fr) minmax(12rem, 0.9fr) auto; }
  .discovery-card--featured .discovery-card__profile { grid-column: auto; }
  .discovery-card--featured .discovery-card__roll { grid-column: auto; padding-top: 0; padding-left: 1rem; border-top: 0; border-left: 1px solid var(--color-line-subtle); }
  .discovery-card--featured .discovery-card__avatar { flex-basis: 4.7rem; width: 4.7rem; height: 4.7rem; }
  .discovery-card--featured .discovery-card__name { font-size: 1.28rem; }
  .discovery-card--featured .discovery-card__score { grid-column: auto; grid-row: auto; }

  @media (max-width: 700px) {
    .discovery-card--featured { grid-column: span 1; }
    .discovery-card--featured .discovery-card__main { grid-template-columns: minmax(0, 1fr) auto; }
    .discovery-card--featured .discovery-card__profile { grid-column: 1 / -1; }
    .discovery-card--featured .discovery-card__roll { grid-column: 1 / -1; padding-top: 0.85rem; padding-left: 0; border-top: 1px solid var(--color-line-subtle); border-left: 0; }
    .discovery-card--featured .discovery-card__score { grid-column: 2; grid-row: 1; }
  }

  @media (max-width: 460px) {
    .discovery-card, .discovery-card--featured { padding: 0.95rem; }
    .discovery-card__main, .discovery-card--featured .discovery-card__main { grid-template-columns: minmax(0, 1fr); }
    .discovery-card__profile { grid-column: 1; }
    .discovery-card__score, .discovery-card--featured .discovery-card__score { grid-column: 1; grid-row: auto; align-items: flex-start; text-align: left; }
    .discovery-card__avatar, .discovery-card--featured .discovery-card__avatar { flex-basis: 3.5rem; width: 3.5rem; height: 3.5rem; border-radius: 0.9rem; }
    .discovery-card--featured .discovery-card__roll { grid-column: 1; }
    .discovery-card__hex { margin-left: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .discovery-card { transition: none; }
    .discovery-card:hover { transform: none; }
  }

  /* Profile tiles stay quiet so the person and their color carry the surface. */
  .discovery-card {
    gap: 0.78rem;
    padding: 1rem;
    border-color: var(--color-line-subtle);
    border-radius: 0.35rem;
    background: color-mix(in srgb, var(--surface-panel) 48%, transparent);
    box-shadow: none;
  }

  .discovery-card::before {
    inset: 0 0 auto;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--discovery-profile-accent) 72%, transparent), transparent 72%);
    opacity: 0.72;
  }

  .discovery-card:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--discovery-profile-accent) 38%, var(--color-line-subtle));
    background: color-mix(in srgb, var(--surface-panel) 74%, transparent);
    box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.18);
  }

  .discovery-card__topline { font-size: 0.55rem; letter-spacing: 0.075em; }
  .discovery-card__rank { color: var(--color-accent-bright); }
  .discovery-card__surface-label { color: var(--color-ink-muted); font-weight: 500; }
  .discovery-card__avatar {
    flex-basis: 3.8rem;
    width: 3.8rem;
    height: 3.8rem;
    border-radius: 0.72rem;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--discovery-profile-accent) 12%, transparent);
  }
  .discovery-card__avatar-accent { right: 0.25rem; bottom: 0.25rem; width: 0.46rem; height: 0.46rem; }
  .discovery-card__name { font-size: 1.04rem; }
  .discovery-card__handle { margin-top: 0.24rem; font-size: 0.58rem; }
  .discovery-card__bio { margin-top: 0.34rem; font-size: 0.7rem; line-height: 1.35; }
  .discovery-card__score { min-width: 6.8rem; gap: 0.24rem; }
  .discovery-card__score strong { color: var(--color-ink-strong); font-size: 0.92rem; }
  .discovery-card__score span { color: var(--color-ink-muted); font-size: 0.5rem; }
  .discovery-card__roll { gap: 0.58rem; padding-top: 0.68rem; border-top-color: color-mix(in srgb, var(--color-line-subtle) 76%, transparent); }
  .discovery-card__roll-copy { gap: 0.16rem; }
  .discovery-card__roll-copy > span { color: var(--color-ink-muted); font-size: 0.5rem; letter-spacing: 0.08em; }
  .discovery-card__roll-copy strong { font-size: 0.74rem; }
  .discovery-card__roll-copy small { font-size: 0.5rem; }
  .discovery-card__stats { gap: 0.4rem 0.72rem; padding-top: 0.62rem; border-top-color: color-mix(in srgb, var(--color-line-subtle) 76%, transparent); font-size: 0.58rem; }
  .discovery-card__hex { color: var(--color-ink-muted); }
  .discovery-card__actions { gap: 0.6rem; }
  .discovery-card__cta { color: var(--color-accent-bright); font: 700 0.62rem/1 var(--font-mono-stack); letter-spacing: 0.03em; text-transform: uppercase; }
  .discovery-card__share,
  .discovery-card__icon-button { min-height: 1.75rem; border-color: transparent; font-size: 0.58rem; }
  .discovery-card__share { padding: 0.35rem 0; }
  .discovery-card__icon-button { width: 1.75rem; }
  .discovery-card__share:hover,
  .discovery-card__icon-button:hover,
  .discovery-card__icon-button.active { border-color: transparent; background: transparent; color: var(--color-ink-strong); }

  .discovery-card--featured {
    padding: 1.15rem;
    border-color: color-mix(in srgb, var(--discovery-profile-accent) 38%, var(--color-line-subtle));
    background: color-mix(in srgb, var(--surface-panel) 68%, transparent);
  }

  .discovery-card--featured .discovery-card__avatar { flex-basis: 4.2rem; width: 4.2rem; height: 4.2rem; }
  .discovery-card--featured .discovery-card__name { font-size: 1.16rem; }
  .discovery-card--featured .discovery-card__score strong { color: var(--color-accent-bright); font-size: 1rem; }

  @media (max-width: 700px) {
    .discovery-card--featured { padding: 1rem; }
  }

  @media (max-width: 460px) {
    .discovery-card, .discovery-card--featured { padding: 0.9rem; }
    .discovery-card__avatar, .discovery-card--featured .discovery-card__avatar { flex-basis: 3.35rem; width: 3.35rem; height: 3.35rem; }
  }
</style>
