<script>
  import { afterUpdate, onDestroy } from 'svelte';
  import { authUser, followedUsers, isAuthenticated, profile, session, toggleFollow } from './stores';
  import { supabase } from './supabase';
  import { getFrameEffect, getNameEffect, getProfileBg, getProfileBorder } from './cosmetics';
  import { getBadgeMeta } from './badgeData';
  import { getRank, getRankState } from './ranks';
  import { loadProfileContext } from './profileData';
  import { isOwnProfileTarget } from './profileContract';
  import { formatCount, normalizeHexColor } from './utils';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Module from './foundation/Module.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileRoll from './ProfileRoll.svelte';
  import ProfileTimeline from './ProfileTimeline.svelte';
  import ProfileCollection from './ProfileCollection.svelte';
  import { getProfileStoryUnlocks } from './profileStory.js';
  import { createDefaultProfileConfig, getProfileStoryVisible, getVisibleProfileLinks, normalizeProfileConfig } from './profileConfig.js';
  import { getProfileComposition } from './profileComposition.js';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';
  import ProfileMusic from './ProfileMusic.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import TodayColor from './TodayColor.svelte';
  import FeaturedCollection from './FeaturedCollection.svelte';
  import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let profileUsername = null;
  export let userId = null;
  export let previewMode = false;
  export let previewProfile = null;
  export let previewProfileConfig = null;
  export let visualFixture = '';

  let targetProfile = null;
  let targetScores = [];
  let timelineEvents = [];
  let collectionItems = [];
  let profileConfig = null;
  let previewConfig = null;
  let allAchievements = [];
  let loading = true;
  let loadError = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let trackedProfileViewKey = null;
  let followLoading = false;
  let canonicalDailyColor = null;
  let profileRollState = 'idle';
  let profileRollColor = '';
  let profileRollEffectTimer = null;
  let mediaCacheKey = '';

  function resetShellState(nextLoading = false) {
    targetProfile = null;
    targetScores = [];
    timelineEvents = [];
    collectionItems = [];
    profileConfig = null;
    previewConfig = null;
    allAchievements = [];
    canonicalDailyColor = null;
    profileRollState = 'idle';
    profileRollColor = '';
    mediaCacheKey = '';
    if (profileRollEffectTimer) {
      clearTimeout(profileRollEffectTimer);
      profileRollEffectTimer = null;
    }
    loading = nextLoading;
    loadError = '';
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
          display_name: previewProfile?.display_name ?? null,
          bio: previewProfile?.bio ?? null,
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
    mediaCacheKey = String(Date.now());
    previewConfig = null;
    allAchievements = context.allAchievements;
    loadError = context.loadError;
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

  function handleRollStart(event) {
    profileRollState = 'rolling';
    profileRollColor = colorFor(event.detail?.hex || dailyAccentColor);
    if (profileRollEffectTimer) {
      clearTimeout(profileRollEffectTimer);
      profileRollEffectTimer = null;
    }
  }

  function settleProfileRoll(nextColor = '') {
    if (nextColor) profileRollColor = colorFor(nextColor);
    profileRollState = 'settled';
    if (profileRollEffectTimer) clearTimeout(profileRollEffectTimer);
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    profileRollEffectTimer = setTimeout(() => {
      profileRollState = 'idle';
      profileRollColor = '';
      profileRollEffectTimer = null;
    }, reducedMotion ? 420 : 1400);
  }

  function handleRollCancel() {
    profileRollState = 'idle';
    profileRollColor = '';
    if (profileRollEffectTimer) {
      clearTimeout(profileRollEffectTimer);
      profileRollEffectTimer = null;
    }
  }

  function handleRollPreview(event) {
    const nextColor = event.detail?.hex;
    if (profileRollState === 'rolling' && nextColor) {
      profileRollColor = colorFor(nextColor);
    }
  }

  async function handleRollComplete(event) {
    if (profileRollState === 'rolling') {
      settleProfileRoll(event.detail?.canonical?.hex || event.detail?.data?.hex || event.detail?.data?.hex_code);
    }
    await loadProfileData();
  }

  function handleRollColor(event) {
    const nextColor = event.detail?.hex;
    if (!nextColor) return;
    canonicalDailyColor = colorFor(nextColor);
    if (profileRollState === 'rolling') settleProfileRoll(nextColor);
  }

  async function handleFollow() {
    if (!targetProfile?.id || followLoading) return;
    followLoading = true;
    await toggleFollow(targetProfile.id);
    followLoading = false;
  }

  function getAchievement(id) {
    const safeId = String(id || '');
    if (safeId === 'launch_edition') {
      return {
        id: safeId,
        name: 'Launch Edition',
        icon: '✦',
        description: 'A founding color identity from the launch window.'
      };
    }
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
  $: profileDisplayName = username;
  $: isOwnProfile = previewMode
    ? false
    : ['owner', 'pre-roll'].includes(visualFixture)
      ? true
      : isOwnProfileTarget({
        isAuthenticated: $isAuthenticated,
        sessionUserId: $session?.user?.id,
        profileId: targetProfile?.id
      });
  $: cosmetics = targetProfile?.equipped_cosmetics || {};
  $: nameEff = getNameEffect(cosmetics);
  $: frameEff = getFrameEffect(cosmetics);
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
  $: latestRoll = targetScores
    .slice()
    .sort((left, right) => String(right.roll_date || '').localeCompare(String(left.roll_date || '')))[0] || null;
  $: profileBio = typeof targetProfile?.bio === 'string' ? targetProfile.bio.trim().slice(0, 160) : '';
  $: profileBioFallback = profileBio ? '' : 'No bio added yet.';
  $: dailyAccentColor = colorFor(
    canonicalDailyColor || latestRoll?.hex_code || displayBestRoll?.hex_code || targetProfile?.mood_color,
    colorFor(effectiveProfileConfig.signatureColor)
  );
  $: visibleLinks = getVisibleProfileLinks(effectiveProfileConfig);
  $: avatarSrc = getProfileMediaUrl(effectiveProfileConfig.avatar_path, mediaCacheKey);
  $: backgroundSrc = getProfileMediaUrl(effectiveProfileConfig.background_path, mediaCacheKey);
  $: showExpression = Boolean(effectiveProfileConfig.spotify_type && effectiveProfileConfig.spotify_id)
    || PROFILE_MUSIC_ENABLED
    || (import.meta.env.DEV && visualFixture === 'music');
  $: composition = getProfileComposition(effectiveProfileConfig, {
    isOwner: isOwnProfile,
    hasLinks: visibleLinks.length > 0,
    hasPinnedAchievements: pinnedAchievements.length > 0,
    hasCollection: collectionItems.length > 0,
    hasTimeline: timelineEvents.length > 0
  });
  $: activeModules = composition.activeModules;
  $: secondaryModules = composition.secondaryModules;
  $: rollModule = activeModules.find(module => module.id === 'roll') || { size: 'wide' };
  $: layoutVariant = effectiveProfileConfig.layoutVariant;
  $: isFollowed = Boolean(targetProfile?.id && $followedUsers.includes(targetProfile.id));
  $: pinnedAchievements = (targetProfile?.equipped_badges || []).map(getAchievement);
  $: recentScores = targetScores.slice(0, 6);
  $: profilePath = getCanonicalProfilePath(username) || '/profile';

  onDestroy(() => {
    if (profileRollEffectTimer) clearTimeout(profileRollEffectTimer);
  });
</script>

<main class={'profile-shell-page profile-shell-page--' + layoutVariant + (previewMode ? ' profile-shell-page--preview' : '') + (profileRollState !== 'idle' ? ' profile-shell-page--roll-' + profileRollState : '') + ' foundation-page'} style={'--profile-accent: ' + dailyAccentColor + ';'} aria-busy={loading}>
  {#if !previewMode}
    <ProfileAtmosphere accent={dailyAccentColor} secondaryAccent={colorFor(effectiveProfileConfig.signatureColor, '#71D6FF')} backgroundSrc={backgroundSrc} rollState={profileRollState} rollColor={profileRollColor || dailyAccentColor} />
  {/if}

  {#if !loading && targetProfile}
    <div class="profile-shell__approved-canvas">
      <div class="profile-shell__approved-main">
        <div class="profile-shell__opening profile-shell__approved-opening" data-profile-region="identity">
          <div class={'profile-shell__identity-boundary ' + borderEff.cls} style={borderEff.style}>
            {#if bgEff.cls || bgEff.style}
              <div class={'profile-shell__cosmetic-bg ' + bgEff.cls} style={bgEff.style} aria-hidden="true"></div>
            {/if}
            <IdentityCard
              username={username}
              displayName={profileDisplayName}
              profilePath={profilePath}
              bio={profileBio}
              bioFallback={profileBioFallback}
              links={visibleLinks}
              badges={pinnedAchievements}
              staff={Boolean(targetProfile?.is_staff)}
              avatarSrc={avatarSrc}
              founder={targetProfile.equipped_badges?.includes('launch_edition')}
              accentColor={dailyAccentColor}
              nameClass={nameEff.cls}
              nameStyle={nameEff.style}
              frameClass={frameEff.cls}
              frameStyle={frameEff.style}
              rollState={profileRollState}
              showToday={false}
            />
          </div>
        </div>

        <div class="profile-shell__approved-game" data-profile-region="roll" aria-label={isOwnProfile ? 'Today’s color roll' : 'Latest color'}>
          {#if isOwnProfile}
            <ProfileRoll moduleSize={rollModule.size} compact={true} integrated={true} quiet={true} visualFixture={visualFixture} fixtureResult={latestRoll} on:rollstart={handleRollStart} on:rollcancel={handleRollCancel} on:rollcomplete={handleRollComplete} on:colorpreview={handleRollPreview} on:colorchange={handleRollColor} />
          {:else}
            <TodayColor result={latestRoll} quiet={true} accentColor={dailyAccentColor} cosmetics={cosmetics} />
          {/if}
        </div>

        <div class="profile-shell__approved-featured" data-profile-region="featured" aria-label={username + ' color archive'}>
          <FeaturedCollection
            items={collectionItems}
            samples={recentScores}
            accentColor={dailyAccentColor}
            unlocked={storyUnlocks.collectionUnlocked}
            rollsRequired={storyUnlocks.collectionRollsRequired}
            totalRolls={storyUnlocks.totalRolls}
          />
        </div>
      </div>

      {#if !previewMode && showExpression}
        <div class="profile-shell__supporting profile-shell__approved-supporting" data-profile-composition aria-label={username + ' expression'}>
          <div class="profile-shell__supporting-region profile-shell__supporting-region--expression" data-profile-region="expression">
            <ProfileMusic bestRoll={latestRoll || displayBestRoll} accentColor={dailyAccentColor} spotifyType={effectiveProfileConfig.spotify_type} spotifyId={effectiveProfileConfig.spotify_id} visualFixture={visualFixture} />
          </div>
        </div>
      {/if}
    </div>

    {#if !previewMode}

      {#if getProfileStoryVisible(effectiveProfileConfig) && (rank && rankState || secondaryModules.length)}
        <section class="profile-shell__story-section" aria-labelledby="profile-story-title">
          <div class="profile-shell__story-heading">
            <div>
              <p class="profile-shell__story-eyebrow">Color story</p>
              <h3 id="profile-story-title">History, milestones, and collected conditions</h3>
            </div>
          </div>
          <div class="profile-shell__details-grid">
            {#if rank && rankState}
              <Module size="wide" tone="quiet" eyebrow="Progress" title={rank.name + ' rank'} description="A quiet record of the progress behind this identity.">
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
              </Module>
            {/if}

            {#each secondaryModules as module (module.id)}
              {#if module.id === 'stats'}
                <Module size={module.size} tone="quiet" eyebrow="Progress" title="A record of color" description="The milestones behind this identity.">
                  <div class="profile-shell__stats" aria-label="Profile statistics">
                    <div><strong>{formatStat(targetProfile.current_streak)}</strong><span>Current streak</span></div>
                    <div><strong>{formatStat(targetProfile.longest_streak)}</strong><span>Longest streak</span></div>
                    <div><strong>{formatStat(targetProfile.lifetime_ep)}</strong><span>Lifetime EP</span></div>
                    <div><strong>{formatStat(targetProfile.total_rolls)}</strong><span>Total rolls</span></div>
                  </div>
                </Module>
              {:else if module.id === 'signature'}
                <Module size={module.size} eyebrow="Signature roll" title="The color worth remembering" description={displayBestRoll ? (displayBestRoll.rarity || 'Unranked') + ' from the public record.' : 'This profile is waiting for its first roll.'}>
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
                <Module size={module.size} eyebrow="Personal links" title="A few places to find me" description="Structured links remain available as part of this profile’s expression.">
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
                    <div class="profile-shell__empty">No public links yet.</div>
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
              {/if}
            {/each}
          </div>
        </section>
      {/if}

      {#if !isOwnProfile}
        <section class="profile-shell__social-section" aria-label={username + ' community and safety details'}>
          <div class="profile-shell__social-tools">
          {#if !isOwnProfile && $isAuthenticated}
            <button
              type="button"
              class="profile-shell__action profile-shell__action--secondary"
              disabled={followLoading}
              aria-label={isFollowed ? 'Remove ' + username + ' from rivals' : 'Add ' + username + ' as a rival'}
              on:click={handleFollow}
            >
              {followLoading ? 'Updating…' : isFollowed ? 'Remove rival' : 'Add to rivals'}
            </button>
          {/if}
          </div>
        </section>
      {/if}
    {/if}
  {:else if !loading}
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

  .profile-shell__opening,
  .profile-shell__supporting,
  .profile-shell__story-section,
  .profile-shell__social-section,
  .profile-shell-warning {
    position: relative;
    z-index: 1;
    width: min(100%, var(--content-profile));
    margin-inline: auto;
  }

  .profile-shell__opening {
    position: relative;
    overflow: hidden;
    padding: clamp(2rem, 5vw, 5rem) clamp(1.25rem, 5vw, 5rem);
    border-top: 1px solid var(--color-line-subtle);
    border-bottom: 1px solid var(--color-line-subtle);
    background:
      radial-gradient(circle at 76% 50%, color-mix(in srgb, var(--profile-accent) 14%, transparent), transparent 28rem),
      linear-gradient(110deg, color-mix(in srgb, var(--surface-panel-strong) 76%, transparent), color-mix(in srgb, var(--surface-panel) 34%, transparent));
  }

  .profile-shell__social-section {
    width: min(100%, 46rem);
    margin-top: var(--space-6);
  }

  .profile-shell-page--roll-rolling .profile-shell__opening.profile-shell__approved-opening {
    border-color: color-mix(in srgb, var(--profile-accent) 58%, var(--color-line-subtle));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--profile-accent) 20%, transparent), 0 1.5rem 4rem color-mix(in srgb, var(--profile-accent) 12%, transparent);
  }

  .profile-shell-page--roll-settled .profile-shell__opening.profile-shell__approved-opening {
    animation: profile-shell-roll-settle 1.05s var(--motion-ease-emphasis);
  }

  @keyframes profile-shell-roll-settle {
    0% { transform: scale(0.997); box-shadow: 0 0 0 1px color-mix(in srgb, var(--profile-accent) 30%, transparent), 0 1.5rem 4rem color-mix(in srgb, var(--profile-accent) 18%, transparent); }
    42% { transform: scale(1.002); box-shadow: 0 0 0 1px color-mix(in srgb, var(--profile-accent) 48%, transparent), 0 0 3rem color-mix(in srgb, var(--profile-accent) 28%, transparent); }
    100% { transform: scale(1); box-shadow: none; }
  }

  .profile-shell__cosmetic-bg { position: absolute; inset: 0; opacity: 0.33; pointer-events: none; }
  .profile-shell__opening-content { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(20rem, 0.95fr); align-items: center; gap: clamp(2rem, 6vw, 7rem); width: min(100%, 70rem); margin-inline: auto; }
  .profile-shell__identity { min-width: 0; }

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

  .profile-shell__identity-row,
  .profile-shell__name-row,
  .profile-shell__rank-row {
    display: flex;
    align-items: center;
  }

  .profile-shell__section-label,
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

  .profile-shell__section-label,
  .profile-shell__eyebrow { margin: 0; color: var(--profile-accent); }
  .profile-shell__mode { color: var(--color-ink-muted); }

  .profile-shell__section-label { font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.13em; text-transform: uppercase; }
  .profile-shell__identity-row { align-items: flex-start; gap: clamp(var(--space-4), 3vw, var(--space-8)); }
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
  .profile-shell__name { max-width: 100%; margin: 0; color: var(--color-ink-strong); font: 600 clamp(3.1rem, 8vw, 7rem) / 0.9 var(--font-display-stack); letter-spacing: -0.075em; overflow-wrap: anywhere; }
  .profile-shell__staff { color: var(--color-accent-cyan); }
  .profile-shell__launch { color: var(--color-warning); letter-spacing: 0.04em; }
  .profile-shell__subline { margin: var(--space-4) 0 0; color: var(--color-ink-muted); font-size: var(--type-body); }
  .profile-shell__mood { display: inline-flex; align-items: center; gap: var(--space-2); margin: var(--space-5) 0 0; color: var(--color-ink-muted); letter-spacing: 0.08em; }
  .profile-shell__mood span { display: inline-block; width: 0.75rem; height: 0.75rem; border-radius: 50%; box-shadow: 0 0 1rem var(--profile-accent); }

  .profile-shell__opening-roll { min-width: 0; padding-left: clamp(1.5rem, 4vw, 4.5rem); border-left: 1px solid color-mix(in srgb, var(--profile-accent) 32%, var(--color-line-subtle)); }
  .profile-shell__opening-roll > :global(*) { width: 100%; }

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

  .profile-shell__supporting { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: clamp(2rem, 6vw, 7rem); margin-top: clamp(2rem, 5vw, 4.5rem); padding: 0 clamp(1.25rem, 5vw, 5rem) clamp(1rem, 3vw, 2rem); }
  .profile-shell__supporting-region { min-width: 0; }
  .profile-shell__supporting-region--featured { padding-left: clamp(1.5rem, 4vw, 4.5rem); border-left: 1px solid var(--color-line-subtle); }
  .profile-latest { min-width: 0; }
  .profile-latest__content { display: grid; grid-template-columns: clamp(7rem, 10vw, 10rem) minmax(0, 1fr); align-items: center; gap: clamp(var(--space-4), 3vw, var(--space-8)); }
  .profile-latest__color { display: block; width: clamp(7rem, 10vw, 10rem); aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 3.5rem color-mix(in srgb, var(--profile-accent) 34%, transparent), inset 0 0 0 1px rgba(255,255,255,0.22); }
  .profile-latest__date { margin: var(--space-2) 0 0; color: var(--color-ink-faint); font: 600 var(--type-label) / 1.2 var(--font-mono-stack); }
  .profile-latest__value { display: grid; gap: var(--space-1); margin-top: var(--space-5); }
  .profile-latest__value strong { color: var(--color-ink-strong); font: 600 var(--type-body) / 1 var(--font-mono-stack); letter-spacing: 0.04em; }
  .profile-latest__value span { color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.45; }
  .profile-latest__empty { display: grid; gap: var(--space-3); }
  .profile-latest__empty p:last-child { max-width: 20rem; color: var(--color-ink-muted); line-height: 1.5; }
  .profile-shell__story-section { margin-top: var(--space-4); border-top: 1px solid var(--color-line-subtle); }
  .profile-shell__details-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--module-gap); padding-bottom: var(--space-6); }
  .profile-shell__details-grid :global(.foundation-module) { grid-column: span 6; }
  .profile-shell__details-grid :global(.foundation-module--wide) { grid-column: span 12; }
  .profile-shell__owner-tools,
  .profile-shell__social-tools { display: grid; gap: var(--module-gap); padding-bottom: var(--space-6); }
  .profile-shell__compatibility { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); padding: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .profile-shell__compatibility h3 { margin: var(--space-1) 0 0; color: var(--color-ink-strong); font: 600 var(--type-h3) / 1.1 var(--font-display-stack); }
  .profile-shell__compatibility p:not(.profile-shell__story-eyebrow) { max-width: 42rem; margin: var(--space-2) 0 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }
  .profile-shell__compatibility-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }
  .profile-shell__social-tools > .profile-shell__action { justify-self: start; }
  .profile-shell-page--editorial .profile-shell__opening { background: linear-gradient(110deg, color-mix(in srgb, var(--profile-accent) 10%, var(--surface-panel-strong)), color-mix(in srgb, var(--surface-panel) 34%, transparent)); }
  .profile-shell-page--focus .profile-shell__opening-content { max-width: 64rem; }
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

  .profile-shell__empty { padding: var(--space-4); border: 1px dashed var(--color-line-subtle); border-radius: var(--radius-sm); color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.5; }

  .profile-shell-state { width: min(100%, 42rem); margin: clamp(var(--space-8), 12vh, var(--space-20)) auto; }
  .profile-shell-state h1 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h1) / var(--type-line-tight) var(--font-display-stack); }
  .profile-shell-state p:not(.profile-shell-state__eyebrow) { color: var(--color-ink-muted); line-height: 1.6; }
  .profile-shell-state__eyebrow { margin: 0 0 var(--space-3); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .profile-shell-warning { margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-warning) 8%, transparent); color: var(--color-warning); font-size: var(--type-small); }

  @media (max-width: 64rem) {
    .profile-shell__opening-content { gap: var(--space-8); }
    .profile-shell__opening-roll { padding-left: var(--space-6); }
  }

  @media (max-width: 48rem) {
    .profile-shell__opening { padding: var(--space-8) var(--space-5); }
    .profile-shell__opening-content { grid-template-columns: 1fr; gap: var(--space-8); }
    .profile-shell__opening-roll { padding-top: var(--space-8); padding-left: 0; border-top: 1px solid color-mix(in srgb, var(--profile-accent) 32%, var(--color-line-subtle)); border-left: 0; }
    .profile-shell__identity-row { gap: var(--space-4); }
    .profile-shell__avatar { flex-basis: 4.75rem; width: 4.75rem; border-radius: var(--radius-lg); }
    .profile-shell__avatar-letter { font-size: 2.25rem; }
    .profile-shell__name { font-size: clamp(2.25rem, 12vw, 4rem); }
    .profile-shell__supporting { grid-template-columns: 1fr; gap: var(--space-8); margin-top: var(--space-8); padding: 0 var(--space-5) var(--space-5); }
    .profile-shell__supporting-region--featured { padding-top: var(--space-8); padding-left: 0; border-top: 1px solid var(--color-line-subtle); border-left: 0; }
    .profile-shell__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-shell__details-grid :global(.foundation-module),
    .profile-shell__details-grid :global(.foundation-module--wide) { grid-column: 1 / -1; }
    .profile-shell__compatibility { align-items: flex-start; flex-direction: column; }
    .profile-shell__compatibility-actions { justify-content: flex-start; }
    .profile-shell__story-heading { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__story-heading > span { text-align: left; }
  }

  @media (max-width: 36rem) {
    .profile-shell-page { padding: var(--space-3); }
    .profile-shell__opening { padding: var(--space-6) var(--space-4); }
    .profile-shell__opening-content { gap: var(--space-6); }
    .profile-shell__identity-row { align-items: center; }
    .profile-shell__identity-copy { flex-basis: calc(100% - 5.75rem); }
    .profile-shell__subline { font-size: var(--type-small); }
    .profile-shell__mood { margin-top: var(--space-4); font-size: 0.6rem; }
    .profile-shell__supporting { margin-top: var(--space-6); padding-inline: var(--space-4); }
    .profile-latest__content { grid-template-columns: 5.5rem minmax(0, 1fr); gap: var(--space-4); }
    .profile-latest__color { width: 5.5rem; }
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
  .profile-shell-page--preview .profile-shell__ambient { display: none; }
  .profile-shell-page--preview .profile-shell__opening { width: 100%; margin: 0; border-radius: 16px; box-shadow: 0 1rem 2.5rem rgba(0,0,0,0.28); }
  .profile-shell-page--preview .profile-shell__opening-content { grid-template-columns: 1fr; }
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
  /* Phase 10.2 approved mockup convergence: one atmosphere, one identity surface. */
  .profile-shell-page {
    min-height: calc(100dvh - 4.75rem);
    overflow: visible;
    padding: 0 clamp(0.9rem, 3vw, 2.5rem) 1.5rem;
    background: transparent;
    isolation: isolate;
  }

  .profile-shell__approved-canvas {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: stretch;
    min-height: calc(100dvh - 4.75rem);
    padding: 0 0 1.5rem;
  }

  .profile-shell__approved-main {
    grid-row: 1;
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .profile-shell__opening.profile-shell__approved-opening {
    width: min(100%, 46rem);
    align-self: center;
    justify-self: center;
    margin: 0 auto;
    padding: 0;
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-shell__identity-boundary {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: var(--radius-lg);
    isolation: isolate;
  }

  .profile-shell__identity-boundary > .profile-shell__cosmetic-bg {
    position: absolute;
    z-index: 0;
    inset: 0;
    border-radius: inherit;
    opacity: 0.34;
    pointer-events: none;
  }

  .profile-shell__identity-boundary :global(.identity-card) { z-index: 1; }

  .profile-shell__approved-game,
  .profile-shell__approved-featured { min-width: 0; }

  .profile-shell__approved-game {
    width: min(100%, 46rem);
    margin-top: clamp(1.5rem, 4vw, 2.5rem);
    padding: 1.25rem 0.5rem 0;
    border-top: 1px solid color-mix(in srgb, var(--profile-accent) 24%, var(--color-line-subtle));
  }

  .profile-shell__approved-game :global(.profile-roll--integrated) {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-shell__approved-game :global(.profile-roll--integrated .foundation-module__body) { padding: 0; }

  .profile-shell__approved-featured {
    width: min(100%, 46rem);
    margin-top: 1.5rem;
    padding: 0 0.5rem;
  }

  .profile-shell__approved-supporting {
    display: grid;
    grid-template-columns: 1fr;
    grid-row: 2;
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 0;
  }

  .profile-shell__approved-supporting .profile-shell__supporting-region--expression {
    width: 100%;
    padding: 0;
    border: 0;
  }

  .profile-shell-page > .profile-shell__story-section {
    z-index: 2;
    margin-top: 1rem;
  }

  .profile-shell__owner-status {
    margin: 0;
    padding: 0 var(--space-5) var(--space-5);
    color: var(--color-ink-faint);
    font-size: var(--type-label);
  }

  .profile-shell-page--preview .profile-shell__approved-canvas {
    min-height: 0;
    padding: 0;
  }

  .profile-shell-page--preview .profile-shell__approved-main {
    min-height: 0;
  }

  .profile-shell-page--preview .profile-shell__approved-game,
  .profile-shell-page--preview .profile-shell__approved-featured,
  .profile-shell-page--preview .profile-shell__approved-supporting {
    display: none;
  }

  .profile-shell-page--preview .profile-shell__approved-opening {
    width: 100%;
  }

  @media (max-width: 36rem) {
    .profile-shell-page { padding-inline: 1.5rem; padding-bottom: 1rem; }
    .profile-shell__approved-canvas { display: flex; flex-direction: column; min-height: calc(100dvh - 3.85rem); padding: clamp(3.75rem, 9vh, 5rem) 0 1.5rem; }
    .profile-shell__approved-main { width: 100%; flex: 0 0 auto; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: stretch; }
    .profile-shell__approved-game { margin-top: 1.75rem; padding-inline: 0.25rem; }
    .profile-shell__approved-featured { margin-top: 1.25rem; padding-inline: 0.25rem; }
    .profile-shell__approved-supporting { margin-top: clamp(3rem, 8vh, 4.5rem); }
    .profile-shell-page > .profile-shell__story-section { margin-top: 0.75rem; }
  }

  @media (min-width: 36.01rem) and (max-height: 47.5rem) {
    .profile-shell__approved-canvas { display: flex; flex-direction: column; min-height: 0; padding: 1.25rem 0 1.25rem; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: center; }
    .profile-shell-page :global(.identity-card) { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .profile-shell-page :global(.identity-card__person) { gap: 0.8rem; margin-top: 0; }
    .profile-shell-page :global(.identity-card__divider) { margin-top: 1rem; margin-bottom: 1rem; }
    .profile-shell-page :global(.profile-shell__approved-featured) { margin-top: 1.25rem; }
    .profile-shell__approved-supporting { margin-top: 1.5rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-shell-page--roll-settled .profile-shell__opening.profile-shell__approved-opening {
      animation: none;
    }
  }
</style>
