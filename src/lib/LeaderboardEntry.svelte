<script>
  import { createEventDispatcher } from 'svelte';
  import { addToast } from './stores';
  import { getBadgeMeta } from './badgeData';
  import CompactRollPreview from './CompactRollPreview.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import { getStaffTitleText, getTitleText } from './cosmetics';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import { getPublicProfilePath, getProfileShareText } from './discoveryData.js';
  import { getAppOrigin } from './authUrls.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';

  export let item;
  export let position = 0;
  export let featured = false;
  export let showFollow = false;
  export let isFollowed = false;
  export let canFollow = false;
  export let onToggleFollow = null;

  const dispatch = createEventDispatcher();

  let failedAvatarSource = '';

  $: profilePath = getPublicProfilePath(item?.username);
  $: nameRendererLoadout = getNameRendererLoadout(item?.equippedCosmetics);
  $: title = getTitleText(item?.equippedCosmetics);
  $: staffTitle = getStaffTitleText(item?.isStaff);
  $: displayName = item?.displayName || item?.username || 'Unknown player';
  $: profileAccent = item?.profileAccent || '#00ffb3';
  $: rollColor = item?.hexCode || profileAccent;
  $: avatarSrc = getProfileMediaUrl(item?.avatarReference || item?.avatarPath);
  $: if (avatarSrc && avatarSrc !== failedAvatarSource) failedAvatarSource = '';
  $: hasScore = item?.score !== null && item?.score !== undefined;
  $: scoreLabel = hasScore ? `${item.score.toLocaleString()} EP` : 'No roll yet';
  $: rollLabel = hasScore ? item?.identity || 'Latest color' : 'Profile preview';
  $: dateLabel = formatDate(item?.rollDate);
  $: profileDateLabel = formatDate(item?.profileCreatedAt);
  $: profileBadges = (item?.equippedBadges || [])
    .filter(badgeId => badgeId !== 'launch_edition')
    .map(badgeId => ({ id: badgeId, ...getBadgeMeta(badgeId) }))
    .filter(badge => badge.symbol !== '❓')
    .slice(0, 3);
  $: entryStyle = `--entry-accent: ${profileAccent}; --entry-roll: ${rollColor};`;
  $: visiblePosition = item?.rank || position + 1;

  function formatDate(value) {
    if (!value) return '';
    const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(parsed);
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
      const browserNavigator = typeof navigator !== 'undefined' ? navigator : null;
      if (typeof browserNavigator?.share === 'function') {
        await browserNavigator.share({ title: `${displayName} | ChromaDie`, text, url });
        method = 'native';
      } else if (browserNavigator?.clipboard?.writeText) {
        await browserNavigator.clipboard.writeText(text);
        addToast('Profile link copied.', 'success');
      } else {
        throw new Error('Profile sharing is not supported in this browser.');
      }
      trackProductEvent('profile_shared', { surface: 'discovery', method });
      dispatch('shared', { username: item.username });
    } catch (error) {
      if (error?.name !== 'AbortError') addToast('Could not share this profile.', 'error');
    }
  }
</script>

<ProfileBorderEffect borderKey={item?.equippedCosmetics?.profile_border} compact={true} className="leaderboard-entry-border">
  <article class:leaderboard-entry--featured={featured} class="leaderboard-entry" style={entryStyle}>
    <div class="leaderboard-entry__rank" aria-label={`Rank ${visiblePosition}`}>
      <span class="leaderboard-entry__rank-number">{item?.rank ? `#${item.rank}` : `#${position + 1}`}</span>
      <span class="leaderboard-entry__rank-label">{featured ? 'Top signal' : item?.kind === 'profile' ? 'Profile' : 'Roll'}</span>
    </div>

    <a class="leaderboard-entry__avatar" href={profilePath || '/leaderboard'} on:click={viewProfile} aria-label={`Open ${displayName}'s public profile`}>
      <AvatarEffect
        effectKey={item?.equippedCosmetics?.avatar_effect}
        accentColor={profileAccent}
        mode="compact"
        animated={false}
        avatarSrc={avatarSrc && avatarSrc !== failedAvatarSource ? avatarSrc : ''}
        fallbackText={displayName.slice(0, 1).toUpperCase() || '✦'}
        className="leaderboard-entry__avatar-effect"
      >
        {#if avatarSrc && avatarSrc !== failedAvatarSource}
          <img src={avatarSrc} alt="" loading="lazy" decoding="async" on:error={() => failedAvatarSource = avatarSrc} />
        {:else}
          <span class="leaderboard-entry__avatar-initial" aria-hidden="true">{displayName.slice(0, 1).toUpperCase() || '✦'}</span>
        {/if}
        <span class="leaderboard-entry__avatar-dot" aria-hidden="true"></span>
      </AvatarEffect>
    </a>

    <div class="leaderboard-entry__identity">
      <div class="leaderboard-entry__name-line">
        {#if nameRendererLoadout}
          <NameEffectCanvas
            text={displayName}
            loadout={nameRendererLoadout}
            todayColor={rollColor}
            context="card"
            compact={true}
            mode="static-signature"
            semanticTag="a"
            semanticClass="leaderboard-entry__name"
            href={profilePath || '/leaderboard'}
            semanticOnClick={viewProfile}
          />
        {:else}
          <a class="leaderboard-entry__name" href={profilePath || '/leaderboard'} on:click={viewProfile}>{displayName}</a>
        {/if}
        {#if title}<span class="leaderboard-entry__title-chip">{title}</span>{/if}
        {#if staffTitle}<span class="leaderboard-entry__title-chip leaderboard-entry__title-chip--staff">{staffTitle}</span>{/if}
        {#if item?.equippedBadges?.includes('launch_edition')}<span class="leaderboard-entry__launch-badge" title="Launch Edition player" aria-label="Launch Edition player">LE</span>{/if}
        {#each profileBadges as badge (badge.id)}
          <span class="leaderboard-entry__badge" title={badge.name} aria-label={badge.name + ' badge'}>{badge.symbol}</span>
        {/each}
      </div>
      <a class="leaderboard-entry__handle" href={profilePath || '/leaderboard'} on:click={viewProfile}>@{item.username}</a>
      {#if item?.bio}<p class="leaderboard-entry__bio">{item.bio}</p>{/if}
      <div class="leaderboard-entry__stats" aria-label={`${displayName} public profile summary`}>
        <span><b>{item?.currentStreak || 0}</b> day streak</span>
        <span><b>{item?.totalRolls || 0}</b> rolls</span>
        {#if item?.hexCode}<span class="leaderboard-entry__hex"><i style={`background:${rollColor}`} aria-hidden="true"></i>{item.hexCode}</span>{/if}
      </div>
    </div>

    <div class="leaderboard-entry__roll">
      <CompactRollPreview displayColor={rollColor} rarity={item?.rarity || 'Common'} size="2.8rem" scale={0.28} />
      <div class="leaderboard-entry__roll-copy">
        <span>Signature color</span>
        <strong>{rollLabel}</strong>
        {#if item?.rarity}<small>{item.rarity}</small>{/if}
        {#if dateLabel}<time datetime={item.rollDate}>{dateLabel}</time>{:else if profileDateLabel}<time datetime={item.profileCreatedAt}>Joined {profileDateLabel}</time>{/if}
      </div>
    </div>

    <div class="leaderboard-entry__score">
      <strong>{scoreLabel}</strong>
      <span>{hasScore ? 'Roll score' : 'Not ranked yet'}</span>
    </div>

    <div class="leaderboard-entry__actions">
      <a class="leaderboard-entry__open" href={profilePath || '/leaderboard'} on:click={viewProfile}>View profile <span aria-hidden="true">↗</span></a>
      <div class="leaderboard-entry__secondary-actions">
        {#if showFollow && canFollow && item?.userId}
          <button type="button" class:active={isFollowed} class="leaderboard-entry__icon-button" on:click={toggleFollow} aria-label={isFollowed ? `Remove ${item.username} from rivals` : `Add ${item.username} as a rival`} title={isFollowed ? 'Remove rival' : 'Add rival'}>
            {isFollowed ? '✓' : '+'}
          </button>
        {/if}
        <button type="button" class="leaderboard-entry__share" on:click={shareProfile} aria-label={`Share ${displayName}'s public profile`}>Share</button>
      </div>
    </div>
  </article>
</ProfileBorderEffect>

<style>
  :global(.leaderboard-entry-border) { display: block; height: 100%; }
  .leaderboard-entry {
    --entry-line: rgba(255, 255, 255, .1);
    position: relative;
    display: grid;
    grid-template-columns: 4.25rem minmax(3.25rem, auto) minmax(12rem, 1.45fr) minmax(11rem, .85fr) minmax(6.25rem, auto) auto;
    gap: 1rem;
    align-items: center;
    min-width: 0;
    min-height: 8rem;
    box-sizing: border-box;
    padding: 1rem 1.15rem;
    border-top: 1px solid var(--entry-line);
    background: rgba(10, 10, 12, .38);
    color: #f8f8f8;
    transition: background-color 160ms ease, border-color 160ms ease;
  }
  :global(.leaderboard-entry-border:first-child .leaderboard-entry) { border-top: 0; }
  .leaderboard-entry:hover { background: rgba(255, 255, 255, .045); }
  .leaderboard-entry--featured { background: color-mix(in srgb, var(--entry-accent) 6%, rgba(10, 10, 12, .62)); }
  .leaderboard-entry--featured::before { position: absolute; inset: 0 auto 0 0; width: 2px; background: var(--entry-accent); box-shadow: 0 0 1rem color-mix(in srgb, var(--entry-accent) 30%, transparent); content: ''; }

  .leaderboard-entry__rank,
  .leaderboard-entry__stats,
  .leaderboard-entry__name-line,
  .leaderboard-entry__actions,
  .leaderboard-entry__secondary-actions,
  .leaderboard-entry__hex { display: flex; align-items: center; }
  .leaderboard-entry__rank { flex-direction: column; align-items: flex-start; gap: .34rem; min-width: 0; padding-left: .3rem; }
  .leaderboard-entry__rank-number { color: var(--entry-accent); font: 650 1.1rem/1 'Clash Display', var(--font-display-stack, sans-serif); letter-spacing: -.035em; }
  .leaderboard-entry__rank-label { color: #686971; font: 500 .56rem/1 'Inter', var(--font-body-stack, sans-serif); letter-spacing: .08em; text-transform: uppercase; }

  .leaderboard-entry__avatar { position: relative; display: grid; place-items: center; width: 3.25rem; height: 3.25rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--entry-accent) 58%, rgba(255,255,255,.18)); border-radius: .55rem; background: color-mix(in srgb, var(--entry-accent) 14%, #0a0a0c); text-decoration: none; }
  .leaderboard-entry__avatar img { width: 100%; height: 100%; object-fit: cover; }
  :global(.leaderboard-entry__avatar-effect) { display: grid; place-items: center; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }
  :global(.leaderboard-entry__avatar-initial) { position: relative; z-index: 2; color: #f8f8f8; font: 600 1.45rem/1 'Clash Display', var(--font-display-stack, sans-serif); letter-spacing: -.08em; }
  .leaderboard-entry__avatar-dot { position: absolute; right: .24rem; bottom: .24rem; z-index: 4; width: .4rem; height: .4rem; border: 2px solid #0a0a0c; border-radius: 50%; background: var(--entry-roll); }

  .leaderboard-entry__identity { min-width: 0; }
  .leaderboard-entry__name-line { flex-wrap: wrap; gap: .28rem .38rem; min-width: 0; }
  :global(.leaderboard-entry__name) { overflow: hidden; max-width: 100%; color: #f8f8f8; font: 600 1rem/1.05 'Clash Display', var(--font-display-stack, sans-serif); letter-spacing: -.025em; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  :global(.leaderboard-entry__name:hover) { color: #fff; text-decoration: underline; text-underline-offset: .16em; }
  .leaderboard-entry__handle { display: block; width: fit-content; margin-top: .27rem; color: #8f9099; font: 500 .68rem/1.2 'Inter', var(--font-body-stack, sans-serif); text-decoration: none; }
  .leaderboard-entry__handle:hover { color: var(--entry-accent); }
  .leaderboard-entry__bio { display: -webkit-box; overflow: hidden; max-width: 34rem; margin: .35rem 0 0; color: #8f9099; font: 400 .74rem/1.4 'Inter', var(--font-body-stack, sans-serif); -webkit-box-orient: vertical; -webkit-line-clamp: 1; line-clamp: 1; }
  .leaderboard-entry__stats { flex-wrap: wrap; gap: .35rem .75rem; margin-top: .6rem; color: #686971; font: 500 .6rem/1.2 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-entry__stats b { color: #bfc0c5; font-weight: 600; }
  .leaderboard-entry__hex { gap: .3rem; color: #bfc0c5; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .leaderboard-entry__hex i { width: .42rem; height: .42rem; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; }

  .leaderboard-entry__roll { display: flex; align-items: center; gap: .65rem; min-width: 0; padding-left: 1rem; border-left: 1px solid var(--entry-line); }
  .leaderboard-entry__roll-copy { display: flex; flex-direction: column; gap: .19rem; min-width: 0; }
  .leaderboard-entry__roll-copy > span { color: #686971; font: 500 .56rem/1 'Inter', var(--font-body-stack, sans-serif); letter-spacing: .08em; text-transform: uppercase; }
  .leaderboard-entry__roll-copy strong { overflow: hidden; color: #bfc0c5; font: 500 .78rem/1.15 'Inter', var(--font-body-stack, sans-serif); text-overflow: ellipsis; white-space: nowrap; }
  .leaderboard-entry__roll-copy small { color: var(--entry-roll); font: 600 .58rem/1 'Inter', var(--font-body-stack, sans-serif); text-transform: uppercase; }
  .leaderboard-entry__roll-copy time { color: #686971; font: 400 .58rem/1.1 'Inter', var(--font-body-stack, sans-serif); }

  .leaderboard-entry__score { display: flex; flex-direction: column; align-items: flex-end; gap: .25rem; min-width: 0; text-align: right; }
  .leaderboard-entry__score strong { color: #f8f8f8; font: 600 .92rem/1 'Inter', var(--font-body-stack, sans-serif); white-space: nowrap; }
  .leaderboard-entry__score span { color: #686971; font: 500 .58rem/1 'Inter', var(--font-body-stack, sans-serif); white-space: nowrap; }

  .leaderboard-entry__actions { justify-content: flex-end; gap: .65rem; min-width: 0; }
  .leaderboard-entry__open { color: var(--entry-accent); font: 600 .68rem/1 'Inter', var(--font-body-stack, sans-serif); text-decoration: none; white-space: nowrap; }
  .leaderboard-entry__open:hover { color: #f8f8f8; }
  .leaderboard-entry__secondary-actions { gap: .25rem; }
  .leaderboard-entry__share,
  .leaderboard-entry__icon-button { min-height: 2.25rem; border: 1px solid rgba(255,255,255,.1); border-radius: .4rem; background: transparent; color: #8f9099; cursor: pointer; font: 500 .64rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-entry__share { padding: .35rem .55rem; }
  .leaderboard-entry__icon-button { width: 2.25rem; padding: 0; }
  .leaderboard-entry__share:hover,
  .leaderboard-entry__icon-button:hover,
  .leaderboard-entry__icon-button.active { border-color: var(--entry-accent); background: color-mix(in srgb, var(--entry-accent) 8%, transparent); color: #f8f8f8; }
  .leaderboard-entry__title-chip,
  .leaderboard-entry__launch-badge,
  .leaderboard-entry__badge { display: inline-flex; align-items: center; justify-content: center; }
  .leaderboard-entry__title-chip { color: var(--entry-accent); font: 500 .56rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-entry__title-chip--staff { color: #f5c26f; }
  .leaderboard-entry__launch-badge { min-width: 1.2rem; height: 1rem; padding: 0 .2rem; border: 1px solid rgba(245,194,111,.45); border-radius: .25rem; color: #f5c26f; font: 600 .5rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-entry__badge { width: 1.05rem; height: 1.05rem; border: 1px solid color-mix(in srgb, var(--entry-accent) 38%, transparent); border-radius: 50%; background: color-mix(in srgb, var(--entry-accent) 10%, transparent); font-size: .58rem; }

  :global(.leaderboard-entry a:focus-visible),
  :global(.leaderboard-entry button:focus-visible) { outline: 2px solid #00ffb3; outline-offset: 3px; }

  @media (max-width: 1120px) {
    .leaderboard-entry { grid-template-columns: 3.5rem minmax(3rem, auto) minmax(11rem, 1fr) minmax(9.5rem, .8fr) auto; }
    .leaderboard-entry__actions { grid-column: 3 / -1; justify-content: flex-start; padding-top: .65rem; border-top: 1px solid var(--entry-line); }
  }

  @media (max-width: 760px) {
    .leaderboard-entry { grid-template-columns: 3.2rem minmax(0, 1fr) auto; gap: .8rem; padding: 1rem; }
    .leaderboard-entry__rank { grid-row: 1 / span 2; }
    .leaderboard-entry__avatar { grid-column: 2; grid-row: 1; }
    .leaderboard-entry__identity { grid-column: 2 / -1; grid-row: 2; }
    .leaderboard-entry__roll { grid-column: 1 / -1; grid-row: 3; padding: .75rem 0 0; border-top: 1px solid var(--entry-line); border-left: 0; }
    .leaderboard-entry__score { grid-column: 3; grid-row: 1; align-items: flex-end; }
    .leaderboard-entry__actions { grid-column: 1 / -1; grid-row: 4; padding-top: .75rem; }
    .leaderboard-entry__bio { -webkit-line-clamp: 2; line-clamp: 2; }
  }

  @media (max-width: 460px) {
    .leaderboard-entry { grid-template-columns: 2.7rem minmax(0, 1fr); }
    .leaderboard-entry__rank { grid-row: 1; }
    .leaderboard-entry__avatar { grid-column: 2; grid-row: 1; width: 2.9rem; height: 2.9rem; }
    .leaderboard-entry__score { grid-column: 2; grid-row: 2; align-items: flex-start; padding-top: .1rem; text-align: left; }
    .leaderboard-entry__identity { grid-column: 1 / -1; grid-row: 3; }
    .leaderboard-entry__roll { grid-column: 1 / -1; grid-row: 4; }
    .leaderboard-entry__actions { grid-row: 5; flex-wrap: wrap; }
    .leaderboard-entry__open { min-height: 2.75rem; display: inline-flex; align-items: center; }
    .leaderboard-entry__share, .leaderboard-entry__icon-button { min-height: 2.75rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaderboard-entry { transition: none; }
  }
</style>
