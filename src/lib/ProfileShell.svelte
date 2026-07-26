<script>
  import { afterUpdate } from 'svelte';
  import { authUser, followedUsers, isAuthenticated, profile, session, toggleFollow } from './stores';
  import { supabase } from './supabase';
  import { getFrameEffect, getNameEffect, getProfileBg, getProfileBorder, getStaffTitleText, getTitleText } from './cosmetics';
  import { getBadgeMeta } from './badgeData';
  import { getRank, getRankState } from './ranks';
  import { loadProfileContext } from './profileData';
  import { isOwnProfileTarget } from './profileContract';
  import { formatCount, normalizeHexColor } from './utils';
  import Button from './foundation/Button.svelte';
  import Media from './foundation/Media.svelte';
  import Module from './foundation/Module.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileRoll from './ProfileRoll.svelte';
  import ProfileEditor from './ProfileEditor.svelte';
  import ProfileTimeline from './ProfileTimeline.svelte';
  import ProfileCollection from './ProfileCollection.svelte';
  import ProfileSocial from './ProfileSocial.svelte';
  import { getProfileStoryUnlocks } from './profileStory.js';
  import { createDefaultProfileConfig, getVisibleProfileLinks, getVisibleProfileModules, normalizeProfileConfig } from './profileConfig.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let profileUsername = null;
  export let userId = null;
  export let previewMode = false;
  export let previewProfile = null;
  export let previewProfileConfig = null;

  let targetProfile = null;
  let targetScores = [];
  let timelineEvents = [];
  let collectionItems = [];
  let profileConfig = null;
  let social = null;
  let socialSettings = null;
  let previewConfig = null;
  let allAchievements = [];
  let loading = true;
  let loadError = '';
  let dataWarning = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let trackedProfileViewKey = null;
  let followLoading = false;

  function resetShellState(nextLoading = false) {
    targetProfile = null;
    targetScores = [];
    timelineEvents = [];
    collectionItems = [];
    profileConfig = null;
    social = null;
    socialSettings = null;
    previewConfig = null;
    allAchievements = [];
    loading = nextLoading;
    loadError = '';
    dataWarning = '';
  }

  function syncProfileData() {
    if (previewMode) {
      const nextPreviewKey = 'decoration-preview:' + JSON.stringify({ profile: previewProfile, config: previewProfileConfig });
      if (nextPreviewKey !== activeProfileKey) {
        activeProfileKey = nextPreviewKey;
        loadRequestId += 1;
        resetShellState(false);
        const fallbackColor = previewProfile?.mood_color || '#8B7CF6';
        targetProfile = {
          id: 'decoration-studio-preview',
          username: previewProfile?.username || 'Chromanaut',
          current_streak: Number(previewProfile?.current_streak) || 0,
          longest_streak: Number(previewProfile?.longest_streak) || 0,
          lifetime_ep: Number(previewProfile?.lifetime_ep) || 0,
          total_rolls: Number(previewProfile?.total_rolls) || 0,
          is_staff: false,
          equipped_cosmetics: previewProfile?.equipped_cosmetics || {},
          equipped_badges: Array.isArray(previewProfile?.equipped_badges) ? previewProfile.equipped_badges : [],
          mood_color: fallbackColor,
          best_roll_score: previewProfile?.best_roll_score ?? null,
          best_roll_hex: previewProfile?.best_roll_hex ?? null,
          best_roll_rarity: previewProfile?.best_roll_rarity ?? null
        };
        const config = normalizeProfileConfig(
          previewProfileConfig || createDefaultProfileConfig(fallbackColor),
          fallbackColor
        );
        profileConfig = { draft: null, published: config };
        loading = false;
      }
      return;
    }

    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const sessionId = $session?.user?.id || '';
    const nextProfileKey = profileUsername
      ? 'username:' + profileUsername + ':' + currentUsername + ':' + sessionId
      : userId
        ? 'id:' + userId + ':' + sessionId
        : $isAuthenticated
          ? 'self:' + ($session?.user?.id || '') + ':' + currentUsername
          : null;

    if (nextProfileKey !== activeProfileKey) {
      activeProfileKey = nextProfileKey;
      loadRequestId += 1;

      if (!nextProfileKey) {
        resetShellState(false);
        return;
      }

      resetShellState(true);
      void loadProfileData();
    }
  }

  afterUpdate(syncProfileData);

  async function loadProfileData() {
    if (previewMode) return;
    const requestId = ++loadRequestId;
    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const context = await loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: $isAuthenticated,
      sessionUserId: $session?.user?.id,
      currentUsername,
      profileUsername,
      userId
    });

    if (requestId !== loadRequestId) return;

    targetProfile = context.targetProfile;
    targetScores = context.targetScores;
    timelineEvents = context.timelineEvents;
    collectionItems = context.collectionItems;
    profileConfig = context.profileConfig;
    social = context.social;
    socialSettings = context.socialSettings;
    previewConfig = null;
    allAchievements = context.allAchievements;
    loadError = context.loadError;
    dataWarning = context.dataWarning;
    loading = false;

    if (targetProfile && activeProfileKey && trackedProfileViewKey !== activeProfileKey) {
      trackedProfileViewKey = activeProfileKey;
      trackProductEvent('public_profile_view', {
        viewer: isOwnProfileTarget({
          isAuthenticated: $isAuthenticated,
          sessionUserId: $session?.user?.id,
          profileId: targetProfile?.id
        }) ? 'owner' : 'visitor'
      });
    }
  }

  async function handleRollComplete() {
    await loadProfileData();
  }

  async function handleSocialChange() {
    await loadProfileData();
  }

  function handleConfigPreview(event) {
    previewConfig = event.detail?.config || null;
  }

  function handleConfigSaved(event) {
    const fallbackColor = targetProfile?.mood_color || '#8B7CF6';
    profileConfig = {
      ...(profileConfig || {}),
      draft: normalizeProfileConfig(event.detail?.draft, fallbackColor),
      published: normalizeProfileConfig(event.detail?.published, fallbackColor)
    };
  }

  function handleConfigPublished(event) {
    const fallbackColor = targetProfile?.mood_color || '#8B7CF6';
    profileConfig = {
      ...(profileConfig || {}),
      draft: normalizeProfileConfig(event.detail?.draft, fallbackColor),
      published: normalizeProfileConfig(event.detail?.published, fallbackColor)
    };
    previewConfig = null;
  }

  async function handleFollow() {
    if (!targetProfile?.id || followLoading) return;
    followLoading = true;
    await toggleFollow(targetProfile.id);
    followLoading = false;
  }

  function getAchievement(id) {
    const safeId = String(id || '');
    const record = allAchievements.find(achievement => achievement.id === safeId);
    const fallback = getBadgeMeta(safeId);
    return {
      id: safeId,
      name: record?.name || fallback.name || safeId,
      icon: record?.icon || fallback.symbol || '✦',
      description: record?.description || fallback.desc || 'A pinned color achievement.'
    };
  }

  function colorFor(value, fallback = '#8B7CF6') {
    return normalizeHexColor(value, fallback);
  }

  function formatStat(value) {
    return formatCount(Number(value) || 0);
  }

  function formatFullValue(value) {
    return (Number(value) || 0).toLocaleString();
  }

  $: username = targetProfile?.username || 'Unknown Player';
  $: isOwnProfile = previewMode ? false : isOwnProfileTarget({
    isAuthenticated: $isAuthenticated,
    sessionUserId: $session?.user?.id,
    profileId: targetProfile?.id
  });
  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameEff = getNameEffect(cosmetics);
  $: frameEff = getFrameEffect(cosmetics);
  $: titleTxt = getTitleText(cosmetics);
  $: staffTitleTxt = getStaffTitleText(targetProfile?.is_staff);
  $: bgEff = getProfileBg(cosmetics);
  $: borderEff = getProfileBorder(cosmetics);
  $: rank = targetProfile ? getRank(targetProfile.lifetime_ep || 0) : null;
  $: rankState = targetProfile ? getRankState(targetProfile.lifetime_ep || 0) : null;
  $: bestRoll = targetScores.length > 0
    ? targetScores.reduce((max, score) => score.score > max.score ? score : max, targetScores[0])
    : null;
  $: profileBestRoll = targetProfile?.best_roll_score !== null && targetProfile?.best_roll_score !== undefined
    ? {
        score: targetProfile.best_roll_score,
        hex_code: targetProfile.best_roll_hex,
        rarity: targetProfile.best_roll_rarity
      }
    : null;
  $: displayBestRoll = profileBestRoll || bestRoll;
  $: effectiveProfileConfig = normalizeProfileConfig(
    previewConfig || profileConfig?.published,
    targetProfile?.mood_color || colorFor(displayBestRoll?.hex_code)
  );
  $: storyUnlocks = getProfileStoryUnlocks(targetProfile);
  $: activeModules = getVisibleProfileModules(effectiveProfileConfig, isOwnProfile);
  $: visibleLinks = getVisibleProfileLinks(effectiveProfileConfig);
  $: layoutVariant = effectiveProfileConfig.layoutVariant;
  $: accentColor = colorFor(effectiveProfileConfig.signatureColor, colorFor(displayBestRoll?.hex_code));
  $: isFollowed = Boolean(targetProfile?.id && $followedUsers.includes(targetProfile.id));
  $: pinnedAchievements = (targetProfile?.equipped_badges || []).map(getAchievement);
  $: recentScores = targetScores.slice(0, 6);
  $: initial = username.slice(0, 1).toUpperCase();
  $: legacyHref = profileUsername
    ? '/u/' + encodeURIComponent(profileUsername) + '?legacy=1'
    : userId
      ? '/?view=profile&profile=' + encodeURIComponent(userId) + '&legacy=1'
      : '/profile?legacy=1';
</script>

<main class={'profile-shell-page profile-shell-page--' + layoutVariant + (previewMode ? ' profile-shell-page--preview' : '') + ' foundation-page'} style={'--profile-accent: ' + accentColor + ';'}>
  {#if loading}
    <div class="profile-shell-state" role="status" aria-live="polite">
      <Surface variant="panel" padding="lg">
        <p class="profile-shell-state__eyebrow">Profile</p>
        <h1>Loading color identity…</h1>
        <p>Gathering the public profile, recent colors, and earned presentation.</p>
      </Surface>
    </div>
  {:else if targetProfile}
    {#if dataWarning}
      <p class="profile-shell-warning" role="status">{dataWarning}</p>
    {/if}

    <div class="profile-shell__ambient profile-shell__ambient--one" aria-hidden="true"></div>
    <div class="profile-shell__ambient profile-shell__ambient--two" aria-hidden="true"></div>

    <Surface as="article" variant="hero" padding="lg" className={'profile-shell__hero ' + borderEff.cls}>
      {#if bgEff.style}
        <div class="profile-shell__cosmetic-bg" style={bgEff.style} aria-hidden="true"></div>
      {/if}
      <div class="profile-shell__hero-content">
        <div class="profile-shell__hero-topline">
          <span class="profile-shell__eyebrow">{isOwnProfile ? 'Your color identity' : 'Public color identity'}</span>
          <span class="profile-shell__mode">{isOwnProfile ? 'Owner view' : 'Visitor view'}</span>
        </div>

        <div class="profile-shell__identity-row">
          <div class={'profile-shell__avatar ' + frameEff.cls} style={'--avatar-color: ' + accentColor + ';' + frameEff.style} aria-label={username + ' profile mark'}>
            <span class="profile-shell__avatar-letter" aria-hidden="true">{initial}</span>
            <Media src="/logo-mark.svg" alt="" aspect="square" loading="eager" className="profile-shell__avatar-mark" />
          </div>

          <div class="profile-shell__identity-copy">
            {#if titleTxt}
              <p class="profile-shell__title">[{titleTxt}]</p>
            {/if}
            <div class="profile-shell__name-row">
              <h1 class={'profile-shell__name ' + nameEff.cls} style={nameEff.style} data-text={username}>{username}</h1>
              {#if staffTitleTxt}<span class="profile-shell__staff">[{staffTitleTxt}]</span>{/if}
              {#if targetProfile.equipped_badges?.includes('launch_edition')}
                <span class="profile-shell__launch">Launch Edition</span>
              {/if}
            </div>
            <p class="profile-shell__subline">{rank?.name || 'Color explorer'} · {formatStat(targetProfile.total_rolls)} daily roll{Number(targetProfile.total_rolls) === 1 ? '' : 's'}</p>
            <p class="profile-shell__mood"><span style={'background: ' + accentColor + ';'}></span> Signature color {accentColor}</p>
          </div>

          <div class="profile-shell__actions">
            {#if previewMode}
              <span class="profile-shell__preview-label">Studio preview</span>
            {:else if isOwnProfile}
              <Button href={legacyHref} variant="secondary" size="sm">Open profile controls</Button>
              <Button href="/shop" variant="ghost" size="sm">Style in shop</Button>
            {:else if $isAuthenticated}
              <button
                type="button"
                class="profile-shell__action profile-shell__action--secondary"
                disabled={followLoading}
                aria-label={isFollowed ? 'Remove ' + username + ' from rivals' : 'Add ' + username + ' as a rival'}
                on:click={handleFollow}
              >
                {followLoading ? 'Updating…' : isFollowed ? 'Remove rival' : 'Add to rivals'}
              </button>
            {:else}
              <Button href="/" variant="ghost" size="sm">Roll your color</Button>
            {/if}
          </div>
        </div>

        {#if rank && rankState}
          <div class="profile-shell__rank-row">
            <div>
              <span class="profile-shell__rank-label">{rank.name} rank</span>
              <span class="profile-shell__rank-value">{formatStat(rankState.lifetimeEp)} EP</span>
            </div>
            <div class="profile-shell__rank-track" aria-label={Math.round(rankState.progress * 100) + ' percent toward the next rank'}>
              <span style={'width: ' + Math.round(rankState.progress * 100) + '%; background: ' + rank.color + ';'}></span>
            </div>
            <span class="profile-shell__rank-next">{rankState.next ? rankState.next.name + ' at ' + formatStat(rankState.next.min) + ' EP' : 'Highest rank reached'}</span>
          </div>
        {/if}
      </div>
    </Surface>

    {#if !previewMode}
    <div class="profile-shell__grid">
      {#if isOwnProfile}
        <ProfileEditor
          draftConfig={profileConfig?.draft}
          publishedConfig={profileConfig?.published}
          on:configpreview={handleConfigPreview}
          on:configsaved={handleConfigSaved}
          on:configpublished={handleConfigPublished}
        />
      {/if}

      {#each activeModules as module (module.id)}
        {#if module.id === 'roll' && isOwnProfile}
          <ProfileRoll moduleSize={module.size} on:rollcomplete={handleRollComplete} />
        {:else if module.id === 'stats'}
          <Module size={module.size} tone="accent" eyebrow="The long game" title="A profile that keeps a score" description="The public milestones that make this color identity recognizable.">
            <div class="profile-shell__stats" aria-label="Profile statistics">
              <div><strong>{formatStat(targetProfile.current_streak)}</strong><span>Current streak</span></div>
              <div><strong>{formatStat(targetProfile.longest_streak)}</strong><span>Longest streak</span></div>
              <div><strong>{formatStat(targetProfile.lifetime_ep)}</strong><span>Lifetime EP</span></div>
              <div><strong>{formatStat(targetProfile.total_rolls)}</strong><span>Total rolls</span></div>
            </div>
          </Module>
        {:else if module.id === 'signature'}
          <Module size={module.size} eyebrow="Signature roll" title="The color worth remembering" description={displayBestRoll ? (displayBestRoll.rarity || 'Unranked') + ' presentation from the current public record.' : 'This profile is waiting for its first roll.'}>
            {#if displayBestRoll}
              <div class="profile-shell__best-roll">
                <div class="profile-shell__best-color" style={'background: ' + colorFor(displayBestRoll.hex_code) + ';'} title={displayBestRoll.hex_code || 'Color unavailable'}></div>
                <div>
                  <p class="profile-shell__hex">{colorFor(displayBestRoll.hex_code, '#000000')}</p>
                  <p class="profile-shell__score">{formatFullValue(displayBestRoll.score)} EP</p>
                  <p class="profile-shell__rarity">{displayBestRoll.rarity || 'Unranked'}</p>
                </div>
              </div>
            {:else}
              <div class="profile-shell__empty">No rolls yet. The first color will give this profile its opening note.</div>
            {/if}
          </Module>
        {:else if module.id === 'links'}
          <Module size={module.size} eyebrow="Personal links" title="A few places to find me" description="Structured links give this profile a life beyond the daily roll.">
            {#if visibleLinks.length}
              <nav class="profile-shell__links" aria-label={username + ' links'}>
                {#each visibleLinks as link (link.order)}
                  <a class="profile-shell__link" href={link.url} target="_blank" rel="noopener noreferrer">
                    <span class="profile-shell__link-type">{link.type}</span>
                    <strong>{link.label}</strong>
                    <span aria-hidden="true">↗</span>
                  </a>
                {/each}
              </nav>
            {:else}
              <div class="profile-shell__empty">No public links yet. This profile is still complete without them.</div>
            {/if}
          </Module>
        {:else if module.id === 'recent'}
          <Module size={module.size} eyebrow="Recent color story" title="The last 30 days" description={targetScores.length + ' public roll' + (targetScores.length === 1 ? '' : 's') + ' in the available recent history.'}>
            {#if recentScores.length}
              <div class="profile-shell__color-list" aria-label="Recent public colors">
                {#each recentScores as score (score.roll_date)}
                  <div class="profile-shell__color-entry">
                    <span class="profile-shell__color-dot" style={'background: ' + colorFor(score.hex_code) + ';'}></span>
                    <span>{score.roll_date}</span>
                    <strong>{colorFor(score.hex_code, '#000000')}</strong>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="profile-shell__empty">No recent colors are available yet.</div>
            {/if}
            <div class="profile-shell__story-divider" aria-hidden="true"></div>
            <div class="profile-shell__story-heading">
              <div>
                <p class="profile-shell__story-eyebrow">Durable story</p>
                <h3>Color timeline</h3>
              </div>
              <span>{storyUnlocks.timelineLimit} visible chapter{storyUnlocks.timelineLimit === 1 ? '' : 's'}</span>
            </div>
            <ProfileTimeline events={timelineEvents} maxItems={storyUnlocks.timelineLimit} />
          </Module>
        {:else if module.id === 'achievements'}
          <Module size={module.size} eyebrow="Pinned identity" title="Achievements on display" description={pinnedAchievements.length ? 'A small public selection from this player’s earned history.' : 'No achievements are pinned to the public profile yet.'}>
            {#if pinnedAchievements.length}
              <div class="profile-shell__achievement-list">
                {#each pinnedAchievements as achievement (achievement.id)}
                  <article class="profile-shell__achievement">
                    <span class="profile-shell__achievement-icon" aria-hidden="true">{achievement.icon}</span>
                    <div><strong>{achievement.name}</strong><p>{achievement.description}</p></div>
                  </article>
                {/each}
              </div>
            {:else}
              <div class="profile-shell__empty">Pinned badges will appear here when this player chooses them.</div>
            {/if}
            <div class="profile-shell__story-divider" aria-hidden="true"></div>
            <div class="profile-shell__story-heading">
              <div>
                <p class="profile-shell__story-eyebrow">Lifetime discoveries</p>
                <h3>Condition collection</h3>
              </div>
              {#if storyUnlocks.collectionUnlocked}
                <span>{collectionItems.length} discovered</span>
              {:else}
                <span>{storyUnlocks.totalRolls}/{storyUnlocks.collectionRollsRequired} rolls</span>
              {/if}
            </div>
            {#if storyUnlocks.collectionUnlocked}
              <ProfileCollection items={collectionItems} />
            {:else}
              <div class="profile-shell__story-locked">
                <strong>Keep rolling to open the collection showcase.</strong>
                <p>Your first {storyUnlocks.collectionRollsRequired} daily rolls reveal the conditions that define this color identity.</p>
                <div class="profile-shell__story-progress" aria-label={storyUnlocks.totalRolls + ' of ' + storyUnlocks.collectionRollsRequired + ' rolls toward the collection showcase'}>
                  <span style={'width: ' + Math.min(100, Math.round((storyUnlocks.totalRolls / storyUnlocks.collectionRollsRequired) * 100)) + '%;'}></span>
                </div>
              </div>
            {/if}
          </Module>
        {:else if module.id === 'boundary'}
          <Module size={module.size} tone="quiet" eyebrow="Public boundary" title="What visitors can see" description="Public profile presentation stays separate from private account progress.">
            <ul class="profile-shell__boundary-list">
              <li>Rank, streaks, total rolls, EP, cosmetics, best roll, recent colors, and pinned badges.</li>
              <li>Private achievement unlock progress and account controls remain owner-only.</li>
              <li>Cosmetics and links are rendered from validated structured configuration.</li>
            </ul>
          </Module>
        {:else if module.id === 'explore'}
          <Module size={module.size} tone="quiet" eyebrow="Keep exploring" title={isOwnProfile ? 'Your profile controls stay close' : 'Explore ' + username + '’s color identity'}>
            <div class="profile-shell__footer-actions">
              {#if isOwnProfile}
                <p>Use the temporary controls path for mood editing, pinned badges, rivals, and account management while the shell migration continues.</p>
                <Button href={legacyHref} variant="primary">Open legacy controls</Button>
              {:else}
                <p>Profiles are the game board: return when a new daily color gives this identity another chapter.</p>
                <Button href="/" variant="primary">Roll a color</Button>
              {/if}
            </div>
          </Module>
        {/if}
      {/each}

      <ProfileSocial
        profileId={targetProfile.id}
        {username}
        {isOwnProfile}
        isAuthenticated={$isAuthenticated}
        {social}
        settings={socialSettings}
        on:socialchange={handleSocialChange}
      />
    </div>

    <p class="profile-shell__footer-note">Public profile data is limited to the current profile contract. No private account progress is rendered here.</p>
    {/if}
  {:else}
    <div class="profile-shell-state" role="alert">
      <Surface variant="panel" padding="lg">
        <p class="profile-shell-state__eyebrow">Profile unavailable</p>
        <h1>{loadError || 'Player not found.'}</h1>
        <p>That public profile could not be found or is temporarily unavailable.</p>
        {#if loadError}
          <button type="button" class="profile-shell__action profile-shell__action--primary" on:click={loadProfileData}>Retry</button>
        {/if}
      </Surface>
    </div>
  {/if}
</main>

<style>
  .profile-shell-page {
    position: relative;
    min-height: 100%;
    overflow: hidden;
    padding: clamp(var(--space-4), 3vw, var(--space-8));
    color: var(--color-ink);
    background:
      radial-gradient(circle at 8% 12%, color-mix(in srgb, var(--profile-accent) 14%, transparent), transparent 28rem),
      radial-gradient(circle at 94% 76%, color-mix(in srgb, var(--color-accent-cyan) 9%, transparent), transparent 30rem),
      var(--color-canvas-deep);
  }

  .profile-shell__hero,
  .profile-shell__grid,
  .profile-shell__footer-note,
  .profile-shell-warning {
    position: relative;
    z-index: 1;
    width: min(100%, var(--content-profile));
    margin-inline: auto;
  }

  .profile-shell__hero { overflow: hidden; }
  .profile-shell__cosmetic-bg { position: absolute; inset: 0; opacity: 0.33; pointer-events: none; }
  .profile-shell__hero-content { position: relative; z-index: 1; }

  .profile-shell__ambient {
    position: absolute;
    width: 30rem;
    aspect-ratio: 1;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0.18;
    filter: blur(0.3rem);
    background: radial-gradient(circle, color-mix(in srgb, var(--profile-accent) 42%, transparent), transparent 68%);
  }

  .profile-shell__ambient--one { top: 12rem; left: -18rem; }
  .profile-shell__ambient--two { right: -17rem; bottom: 10rem; background: radial-gradient(circle, color-mix(in srgb, var(--color-accent-cyan) 34%, transparent), transparent 68%); }

  .profile-shell__hero-topline,
  .profile-shell__identity-row,
  .profile-shell__name-row,
  .profile-shell__rank-row,
  .profile-shell__footer-actions {
    display: flex;
    align-items: center;
  }

  .profile-shell__hero-topline { justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-8); }
  .profile-shell__eyebrow,
  .profile-shell__mode,
  .profile-shell__rank-label,
  .profile-shell__rank-next,
  .profile-shell__mood,
  .profile-shell__staff,
  .profile-shell__launch {
    font: 700 var(--type-label) / 1.2 var(--font-mono-stack);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .profile-shell__eyebrow { margin: 0; color: var(--profile-accent); }
  .profile-shell__mode { color: var(--color-ink-muted); }

  .profile-shell__identity-row { align-items: flex-start; gap: var(--space-6); }
  .profile-shell__avatar {
    position: relative;
    flex: 0 0 6.5rem;
    width: 6.5rem;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--avatar-color) 65%, white 10%);
    border-radius: var(--radius-xl);
    background: radial-gradient(circle at 28% 22%, color-mix(in srgb, var(--avatar-color) 75%, white), var(--avatar-color) 45%, #08090d 100%);
    box-shadow: 0 1.25rem 2.5rem color-mix(in srgb, var(--avatar-color) 30%, transparent);
  }

  .profile-shell__avatar-letter { position: relative; z-index: 1; color: white; font: 600 3rem / 1 var(--font-display-stack); text-shadow: 0 0.2rem 1rem rgba(0, 0, 0, 0.4); }
  :global(.profile-shell__avatar-mark) { position: absolute; right: 0.4rem; bottom: 0.4rem; width: 1.5rem; opacity: 0.75; border: 0; border-radius: var(--radius-sm); }

  .profile-shell__identity-copy { min-width: 0; flex: 1; }
  .profile-shell__title { margin: 0 0 var(--space-2); color: var(--profile-accent); font: 700 var(--type-small) / 1.3 var(--font-mono-stack); }
  .profile-shell__name-row { flex-wrap: wrap; gap: var(--space-3); }
  .profile-shell__name { max-width: 100%; margin: 0; color: var(--color-ink-strong); font: 600 var(--type-display) / 0.95 var(--font-display-stack); letter-spacing: -0.06em; overflow-wrap: anywhere; }
  .profile-shell__staff { color: var(--color-accent-cyan); }
  .profile-shell__launch { padding: var(--space-2) var(--space-3); border: 1px solid color-mix(in srgb, var(--color-warning) 45%, transparent); border-radius: var(--radius-pill); color: var(--color-warning); letter-spacing: 0.04em; }
  .profile-shell__subline { margin: var(--space-3) 0 0; color: var(--color-ink-muted); font-size: var(--type-body); }
  .profile-shell__mood { display: inline-flex; align-items: center; gap: var(--space-2); margin: var(--space-4) 0 0; color: var(--color-ink-muted); letter-spacing: 0.06em; }
  .profile-shell__mood span { display: inline-block; width: 0.75rem; height: 0.75rem; border-radius: 50%; box-shadow: 0 0 1rem var(--profile-accent); }

  .profile-shell__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }
  .profile-shell__action { display: inline-flex; align-items: center; justify-content: center; min-height: 2.35rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-4); color: var(--color-ink-strong); font: 600 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard); }
  .profile-shell__action:hover:not(:disabled) { transform: translateY(-2px); }
  .profile-shell__action:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-shell__action:disabled { cursor: wait; opacity: 0.6; }
  .profile-shell__action--primary { background: var(--color-ink-strong); color: var(--color-canvas-deep); }
  .profile-shell__action--secondary { border-color: color-mix(in srgb, var(--profile-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-accent) 14%, transparent); color: var(--color-accent-bright); }

  .profile-shell__rank-row { flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .profile-shell__rank-row > div:first-child { display: flex; align-items: baseline; gap: var(--space-3); }
  .profile-shell__rank-label { color: var(--profile-accent); }
  .profile-shell__rank-value { color: var(--color-ink-strong); font: 600 var(--type-small) / 1 var(--font-mono-stack); }
  .profile-shell__rank-track { flex: 1 1 12rem; min-width: 8rem; height: 0.45rem; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-inset); }
  .profile-shell__rank-track span { display: block; height: 100%; border-radius: inherit; transition: width var(--motion-slow) var(--motion-ease-emphasis); }
  .profile-shell__rank-next { color: var(--color-ink-muted); letter-spacing: 0.04em; }

  .profile-shell__grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--module-gap); margin-top: var(--module-gap); }
  .profile-shell-page--editorial .profile-shell__hero { border-radius: var(--radius-md); background: linear-gradient(145deg, color-mix(in srgb, var(--profile-accent) 10%, var(--surface-panel)), var(--surface-panel)); }
  .profile-shell-page--editorial .profile-shell__grid { gap: var(--space-4); }
  .profile-shell-page--focus .profile-shell__grid { max-width: 64rem; }
  .profile-shell-page--focus .profile-shell__hero { box-shadow: 0 1.5rem 4rem color-mix(in srgb, var(--profile-accent) 16%, transparent); }
  .profile-shell__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
  .profile-shell__stats > div { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-inset); }
  .profile-shell__stats strong { display: block; color: var(--color-ink-strong); font: 600 clamp(1.45rem, 3vw, 2.25rem) / 1 var(--font-display-stack); }
  .profile-shell__stats span { display: block; margin-top: var(--space-2); color: var(--color-ink-muted); font-size: var(--type-label); }

  .profile-shell__best-roll { display: grid; grid-template-columns: minmax(5rem, 8rem) 1fr; gap: var(--space-5); align-items: center; }
  .profile-shell__best-color { min-height: 8rem; border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 1rem 2rem rgba(0, 0, 0, 0.24); }
  .profile-shell__hex { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-body) / 1 var(--font-mono-stack); }
  .profile-shell__score { margin: var(--space-3) 0 0; color: var(--profile-accent); font: 600 var(--type-h2) / 1 var(--font-display-stack); }
  .profile-shell__rarity { margin: var(--space-2) 0 0; color: var(--color-ink-muted); font-size: var(--type-small); }

  .profile-shell__color-list { display: grid; gap: var(--space-2); }
  .profile-shell__color-entry { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-3); min-width: 0; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--surface-inset); color: var(--color-ink-muted); font: 600 var(--type-label) / 1.2 var(--font-mono-stack); }
  .profile-shell__color-entry strong { color: var(--color-ink-strong); font-weight: 600; }
  .profile-shell__color-dot { width: 1.25rem; height: 1.25rem; border: 1px solid rgba(255, 255, 255, 0.24); border-radius: 50%; }
  .profile-shell__links { display: grid; gap: var(--space-2); }
  .profile-shell__link { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-3); min-width: 0; padding: var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); color: var(--color-ink); text-decoration: none; transition: transform var(--motion-fast) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard); }
  .profile-shell__link:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--profile-accent) 55%, var(--color-line-subtle)); background: color-mix(in srgb, var(--profile-accent) 8%, var(--surface-inset)); }
  .profile-shell__link:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-shell__link-type { color: var(--profile-accent); font: 700 0.625rem / 1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-shell__link strong { min-width: 0; overflow-wrap: anywhere; font-size: var(--type-small); }
  .profile-shell__link > span:last-child { color: var(--color-ink-muted); font-size: 1rem; }

  .profile-shell__achievement-list { display: grid; gap: var(--space-3); }
  .profile-shell__achievement { display: grid; grid-template-columns: auto 1fr; gap: var(--space-3); align-items: start; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--surface-inset); }
  .profile-shell__achievement-icon { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: color-mix(in srgb, var(--profile-accent) 18%, transparent); color: var(--profile-accent); font-size: 1.1rem; }
  .profile-shell__achievement strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-shell__achievement p { margin: var(--space-1) 0 0; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.4; }
  .profile-shell__story-divider { height: 1px; margin: var(--space-6) 0; background: var(--color-line-subtle); }
  .profile-shell__story-heading { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
  .profile-shell__story-heading h3 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h3) / 1.1 var(--font-display-stack); }
  .profile-shell__story-heading > span { color: var(--color-ink-faint); font: 600 var(--type-label) / 1.2 var(--font-mono-stack); text-align: right; }
  .profile-shell__story-eyebrow { margin: 0 0 var(--space-1); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .profile-shell__story-locked { display: grid; gap: var(--space-2); padding: var(--space-4); border: 1px dashed color-mix(in srgb, var(--profile-accent) 45%, var(--color-line-subtle)); border-radius: var(--radius-md); background: color-mix(in srgb, var(--profile-accent) 6%, var(--surface-inset)); }
  .profile-shell__story-locked strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-shell__story-locked p { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .profile-shell__story-progress { height: 0.4rem; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-panel); }
  .profile-shell__story-progress span { display: block; height: 100%; border-radius: inherit; background: var(--profile-accent); transition: width var(--motion-base) var(--motion-ease-standard); }

  .profile-shell__boundary-list { display: grid; gap: var(--space-3); margin: 0; padding-left: 1.2rem; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.6; }
  .profile-shell__boundary-list li::marker { color: var(--profile-accent); }
  .profile-shell__footer-actions { justify-content: space-between; gap: var(--space-6); }
  .profile-shell__footer-actions p { max-width: 42rem; margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.6; }
  .profile-shell__footer-note { margin-top: var(--space-5); color: var(--color-ink-faint); font: var(--type-label) / 1.5 var(--font-mono-stack); text-align: center; }
  .profile-shell__empty { padding: var(--space-4); border: 1px dashed var(--color-line-subtle); border-radius: var(--radius-sm); color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }

  .profile-shell-state { width: min(100%, 42rem); margin: clamp(var(--space-8), 12vh, var(--space-20)) auto; }
  .profile-shell-state h1 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h1) / var(--type-line-tight) var(--font-display-stack); }
  .profile-shell-state p:not(.profile-shell-state__eyebrow) { color: var(--color-ink-muted); line-height: 1.6; }
  .profile-shell-state__eyebrow { margin: 0 0 var(--space-3); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-shell-warning { margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-warning) 8%, transparent); color: var(--color-warning); font-size: var(--type-small); }

  @media (max-width: 64rem) {
    .profile-shell__identity-row { flex-wrap: wrap; }
    .profile-shell__actions { width: 100%; justify-content: flex-start; padding-left: calc(6.5rem + var(--space-6)); }
  }

  @media (max-width: 48rem) {
    .profile-shell__hero { padding: var(--space-5); }
    .profile-shell__hero-topline { margin-bottom: var(--space-6); }
    .profile-shell__identity-row { gap: var(--space-4); }
    .profile-shell__avatar { flex-basis: 4.75rem; width: 4.75rem; border-radius: var(--radius-lg); }
    .profile-shell__avatar-letter { font-size: 2.25rem; }
    .profile-shell__name { font-size: clamp(2.25rem, 12vw, 4rem); }
    .profile-shell__actions { padding-left: 0; }
    .profile-shell__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-shell__footer-actions { align-items: flex-start; flex-direction: column; }
    .profile-shell__story-heading { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__story-heading > span { text-align: left; }
  }

  @media (max-width: 36rem) {
    .profile-shell-page { padding: var(--space-3); }
    .profile-shell__hero-topline { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__identity-row { align-items: center; }
    .profile-shell__identity-copy { flex-basis: calc(100% - 5.75rem); }
    .profile-shell__subline { font-size: var(--type-small); }
    .profile-shell__rank-row { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__rank-track { width: 100%; }
    .profile-shell__rank-next { font-size: 0.625rem; }
    .profile-shell__best-roll { grid-template-columns: 5.5rem 1fr; gap: var(--space-3); }
    .profile-shell__best-color { min-height: 5.5rem; }
    .profile-shell__story-heading h3 { font-size: var(--type-h3); }
  }

  .profile-shell-page--preview {
    min-height: 0;
    overflow: hidden;
    padding: 0;
    background: transparent;
  }
  .profile-shell-page--preview .profile-shell__ambient,
  .profile-shell-page--preview .profile-shell__actions { display: none; }
  .profile-shell-page--preview .profile-shell__hero { width: 100%; margin: 0; border-radius: 16px; box-shadow: 0 1rem 2.5rem rgba(0,0,0,0.28); }
  .profile-shell-page--preview .profile-shell__hero-topline { margin-bottom: var(--space-4); }
  .profile-shell-page--preview .profile-shell__identity-row { gap: var(--space-4); }
  .profile-shell-page--preview .profile-shell__avatar { flex-basis: 4.25rem; width: 4.25rem; border-radius: var(--radius-lg); }
  .profile-shell-page--preview .profile-shell__avatar-letter { font-size: 1.9rem; }
  .profile-shell-page--preview .profile-shell__name { font-size: clamp(1.45rem, 5vw, 2.7rem); }
  .profile-shell-page--preview .profile-shell__subline { margin-top: var(--space-2); font-size: var(--type-small); }
  .profile-shell-page--preview .profile-shell__mood { margin-top: var(--space-2); font-size: 0.58rem; }
  .profile-shell-page--preview .profile-shell__rank-row { gap: var(--space-2) var(--space-3); margin-top: var(--space-4); padding-top: var(--space-3); }
  .profile-shell-page--preview .profile-shell__rank-label,
  .profile-shell-page--preview .profile-shell__rank-next { font-size: 0.54rem; }
  .profile-shell-page--preview .profile-shell__rank-value { font-size: 0.62rem; }
  .profile-shell__preview-label { color: var(--profile-accent); font: 700 0.58rem / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: uppercase; }

  @media (prefers-reduced-motion: reduce) {
    .profile-shell__action,
    .profile-shell__rank-track span,
    .profile-shell__link,
    .profile-shell__story-progress span { transition-duration: 0.001ms; }
    .profile-shell__action:hover:not(:disabled) { transform: none; }
    .profile-shell__link:hover { transform: none; }
  }
</style>
