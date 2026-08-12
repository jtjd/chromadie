<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { authUser, followedUsers, isAuthenticated, profile, session, toggleFollow } from './stores';
  import { supabase } from './supabase';
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
  import { createDefaultProfileConfig, getProfileRollVisible, getProfileStoryVisible, getVisibleProfileLinks, normalizeProfileConfig } from './profileConfig.js';
  import { getProfileComposition } from './profileComposition.js';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import ProfileMusic from './ProfileMusic.svelte';
  import ProfileWidgets from './ProfileWidgets.svelte';
  import ProfileContent from './ProfileContent.svelte';
  import ProfileSocial from './ProfileSocial.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import TodayColor from './TodayColor.svelte';
  import ProfileDailyRoll from './ProfileDailyRoll.svelte';
  import FeaturedCollection from './FeaturedCollection.svelte';
  import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
  import { trackProductEvent } from './productAnalytics.js';
  import { recordPublicProfileView } from './profileViewAnalytics.js';
  import { recordProfileInsightEvent } from './profileInsightAnalytics.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';
  import CursorTrailLayer from './cursor-trail/CursorTrailLayer.svelte';
  import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
  import { resolveProfileLayoutVariant } from './profile-layout/profileLayouts.js';
  import AtmosphereLayer from './profile-atmosphere/LazyAtmosphereLayer.svelte';
  import { getProfileAppearanceStyle, getProfileCanvasStyle } from './profileAppearanceStyle.js';
  import { hasVisibleProfileContent } from './profileContentLegacy.js';
  import { getVisibleProfileWidgets } from './profileWidgetsLegacy.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { normalizeRichMediaConfig } from './profileRichMedia.js';
  import { isProfileFeatureEnabled, resolveProfileFeatureFlags } from './profileFeatureFlags.js';

  export let profileUsername = null;
  export let userId = null;
  export let previewMode = false;
  export let previewIdentityOnly = false;
  export let previewProfile = null;
  export let previewProfileConfig = null;
  export let previewScores = [];
  export let previewTimelineEvents = [];
  export let previewCollectionItems = [];
  export let previewAllAchievements = [];
  export let visualFixture = '';
  // The dashboard preview passes an explicit renderer context. Public profile
  // callers keep the historical default while compact catalog controls can
  // use the same renderer without inheriting profile-page geometry.
  export let renderContext = 'profile';
  export let previewDevice = 'desktop';

  const profileShellStyle = '--profile-accent: var(--color-accent-roll); --profile-surface-accent: var(--color-accent-cyan); --profile-control-accent: var(--color-accent);';
  let targetProfile = null;
  let targetScores = [];
  let timelineEvents = [];
  let collectionItems = [];
  let profileConfig = null;
  let social = createEmptyProfileSocial();
  let socialSettings = createDefaultProfileSocialSettings();
  let previewConfig = null;
  let allAchievements = [];
  let loading = true;
  let loadError = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let activePreviewConfigKey = '';
  let trackedProfileViewKey = null;
  let followLoading = false;
  let profileRollState = 'idle';
  let profileRollEffectTimer = null;
  let mediaCacheKey = '';
  let refreshing = false;
  let profileMoreActive = false;
  let profilePageElement;
  let prefersReducedMotion = false;
  let identityCardComponent = null;
  let identityCardRequest = null;
  let profileLayoutFrameComponent = null;
  const defaultProfilePresentation = false;

  function ensureIdentityCard() {
    if (identityCardComponent || identityCardRequest) return identityCardRequest;
    identityCardRequest = import('./IdentityCard.svelte')
      .then(module => { identityCardComponent = module.default; })
      .catch(() => { identityCardComponent = null; })
      .finally(() => { identityCardRequest = null; });
    return identityCardRequest;
  }

  function loadProfileLayoutFrame() {
    return import('./ProfileLayoutFrame.svelte')
      .then(module => { profileLayoutFrameComponent = module.default; })
      .catch(() => { profileLayoutFrameComponent = null; });
  }


  function resetShellState(nextLoading = false) {
    targetProfile = null;
    targetScores = [];
    timelineEvents = [];
    collectionItems = [];
    profileConfig = null;
    social = createEmptyProfileSocial();
    socialSettings = createDefaultProfileSocialSettings();
    previewConfig = null;
    allAchievements = [];
    profileRollState = 'idle';
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
      // Configuration changes are ordinary editor updates. Keep the live
      // preview shell mounted so sliders, media and cosmetics do not reset
      // roll/social state or timers on every keystroke. Only a change to the
      // preview's identity/data context warrants a full reconstruction.
      const nextPreviewKey = 'profile-preview:' + JSON.stringify({
        profile: previewProfile,
        scores: previewScores,
        timeline: previewTimelineEvents,
        collection: previewCollectionItems,
        achievements: previewAllAchievements
      });
      const nextPreviewConfigKey = JSON.stringify(previewProfileConfig || null);
      if (nextPreviewKey !== activeProfileKey) {
        activeProfileKey = nextPreviewKey;
        activePreviewConfigKey = nextPreviewConfigKey;
        loadRequestId += 1;
        resetShellState(false);
        const fallbackColor = '#CDD2FF';
        targetProfile = {
          id: previewProfile?.id || 'profile-studio-preview',
          username: previewProfile?.username || 'Chromanaut',
          display_name: previewProfile?.display_name ?? null,
          bio: previewProfile?.bio ?? null,
          current_streak: Number(previewProfile?.current_streak) || 0,
          longest_streak: Number(previewProfile?.longest_streak) || 0,
          lifetime_ep: Number(previewProfile?.lifetime_ep) || 0,
          total_rolls: Number(previewProfile?.total_rolls) || 0,
          is_staff: Boolean(previewProfile?.is_staff),
          equipped_cosmetics: previewProfile?.equipped_cosmetics || {},
          equipped_badges: Array.isArray(previewProfile?.equipped_badges) ? previewProfile.equipped_badges : [],
          mood_color: fallbackColor,
          best_roll_score: previewProfile?.best_roll_score ?? null,
          best_roll_hex: previewProfile?.best_roll_hex ?? null,
          best_roll_rarity: previewProfile?.best_roll_rarity ?? null
        };
        const config = normalizeProfileConfig(
          previewProfileConfig || createDefaultProfileConfig(),
          fallbackColor
        );
        profileConfig = { draft: null, published: config };
        social = createEmptyProfileSocial();
        socialSettings = createDefaultProfileSocialSettings();
        targetScores = Array.isArray(previewScores) ? previewScores : [];
        timelineEvents = Array.isArray(previewTimelineEvents) ? previewTimelineEvents : [];
        collectionItems = Array.isArray(previewCollectionItems) ? previewCollectionItems : [];
        allAchievements = Array.isArray(previewAllAchievements) ? previewAllAchievements : [];
        loading = false;
      } else if (nextPreviewConfigKey !== activePreviewConfigKey) {
        activePreviewConfigKey = nextPreviewConfigKey;
        previewConfig = null;
        profileConfig = {
          draft: null,
          published: normalizeProfileConfig(
            previewProfileConfig || createDefaultProfileConfig(),
            '#CDD2FF'
          )
        };
        mediaCacheKey = String(Date.now());
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

  onMount(() => {
    void ensureIdentityCard();
    void loadProfileLayoutFrame();
    const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const syncMotionPreference = () => { prefersReducedMotion = Boolean(motionQuery?.matches); };
    syncMotionPreference();
    motionQuery?.addEventListener?.('change', syncMotionPreference);
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || previewMode || loading || refreshing || !targetProfile) return;
      refreshing = true;
      void loadProfileData().finally(() => { refreshing = false; });
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('pageshow', refreshOnReturn);
    const getProfileOffsetTop = element => {
      if (!profilePageElement || !element) return 0;
      return element.getBoundingClientRect().top
        - profilePageElement.getBoundingClientRect().top
        + profilePageElement.scrollTop;
    };
    const updateProfileScrollState = () => {
      const more = document.getElementById('profile-more');
      if (!profilePageElement || !more) {
        profileMoreActive = false;
        return;
      }
      const moreTop = getProfileOffsetTop(more);
      profileMoreActive = profilePageElement.scrollTop >= moreTop - profilePageElement.clientHeight * 0.45;
    };
    profilePageElement?.addEventListener('scroll', updateProfileScrollState, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('pageshow', refreshOnReturn);
      profilePageElement?.removeEventListener('scroll', updateProfileScrollState);
      motionQuery?.removeEventListener?.('change', syncMotionPreference);
    };
  });

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
    mediaCacheKey = String(Date.now());
    previewConfig = null;
    allAchievements = context.allAchievements;
    loadError = context.loadError;
    loading = false;

    if (targetProfile && activeProfileKey && trackedProfileViewKey !== activeProfileKey) {
      trackedProfileViewKey = activeProfileKey;
      const viewingOwnProfile = isOwnProfileTarget({
          isAuthenticated: $isAuthenticated,
          sessionUserId: $session?.user?.id,
          profileId: targetProfile?.id
        });
      trackProductEvent('public_profile_view', {
        viewer: viewingOwnProfile ? 'owner' : 'visitor'
      });
      // Compatibility contract: recordPublicProfileView(supabase, targetProfile.username)
      if (!viewingOwnProfile) {
        const expandedAnalyticsEnabled = isProfileFeatureEnabled('expandedAnalytics', {
          userId: targetProfile?.id,
          isStaff: Boolean(targetProfile?.is_staff)
        });
        void recordPublicProfileView(supabase, targetProfile.username, { edge: expandedAnalyticsEnabled });
      }
    }
  }

  function handleRollStart() {
    profileRollState = 'rolling';
    if (profileRollEffectTimer) {
      clearTimeout(profileRollEffectTimer);
      profileRollEffectTimer = null;
    }
  }

  function settleProfileRoll() {
    profileRollState = 'settled';
    if (profileRollEffectTimer) clearTimeout(profileRollEffectTimer);
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    profileRollEffectTimer = setTimeout(() => {
      profileRollState = 'idle';
      profileRollEffectTimer = null;
    }, reducedMotion ? 420 : 1400);
  }

  function recordProfileClick(entryKey) {
    if (previewMode || isOwnProfile || !targetProfile?.username || !entryKey || !expandedAnalyticsEnabled) return;
    void recordProfileInsightEvent({
      profileUsername: targetProfile.username,
      metric: 'click',
      entryKey
    });
  }

  function scrollToProfileMore() {
    profileMoreActive = true;
    const more = document.getElementById('profile-more');
    if (!profilePageElement || !more) return;
    profilePageElement.scrollTo({
      top: more.getBoundingClientRect().top
        - profilePageElement.getBoundingClientRect().top
        + profilePageElement.scrollTop,
      behavior: 'smooth'
    });
  }

  function scrollToProfileHero() {
    profileMoreActive = false;
    profilePageElement?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRollCancel() {
    profileRollState = 'idle';
    if (profileRollEffectTimer) {
      clearTimeout(profileRollEffectTimer);
      profileRollEffectTimer = null;
    }
  }

  async function handleRollComplete() {
    if (profileRollState === 'rolling') {
      settleProfileRoll();
    }
    await loadProfileData();
  }

  async function handleFollow() {
    if (previewMode || !targetProfile?.id || followLoading) return;
    followLoading = true;
    await toggleFollow(targetProfile.id);
    followLoading = false;
  }

  async function handleSocialChange() {
    await loadProfileData();
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
  $: profileFeatureFlags = resolveProfileFeatureFlags({
    userId: targetProfile?.id,
    isStaff: Boolean(targetProfile?.is_staff)
  });
  $: expandedAnalyticsEnabled = profileFeatureFlags.expandedAnalytics;
  $: socialDepthEnabled = profileFeatureFlags.socialDepth;
  // profileDisplayName = username is the safe fallback for legacy profiles.
  $: profileDisplayName = targetProfile?.display_name || username;
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
  $: nameRendererLoadout = getNameRendererLoadout(cosmetics);
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
    '#CDD2FF'
  );
  $: appearance = effectiveProfileConfig.appearance;
  $: storyUnlocks = getProfileStoryUnlocks(targetProfile);
  $: latestRoll = targetScores
    .slice()
    .sort((left, right) => String(right.roll_date || '').localeCompare(String(left.roll_date || '')))[0] || null;
  $: profileBio = typeof targetProfile?.bio === 'string' ? targetProfile.bio.trim().slice(0, 160) : '';
  // V2 identity fields arrive through the server-normalized public
  // configuration; legacy profiles simply use the empty presentation.
  $: identityPresentation = effectiveProfileConfig.identityPresentation || {};
  $: joinedLabel = targetProfile?.created_at
    ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(targetProfile.created_at))
    : '';
  $: signatureColor = colorFor(appearance.colors.accent);
  $: nameRendererBaseColor = colorFor(appearance.colors.username, '#FFFFFF');
  $: nameRendererTodayColor = colorFor(latestRoll?.hex_code || '#8B7CF6');
  $: cursorTrailKey = getCursorTrailKey(cosmetics?.cursor_trail);
  $: atmosphereKey = cosmetics?.profile_atmosphere || '';
  $: colorEffectsEnabled = effectiveProfileConfig.colorEffectsEnabled === true;
  $: profileControlAccent = signatureColor;
  $: visibleLinks = getVisibleProfileLinks(effectiveProfileConfig);
  $: avatarSrc = getProfileMediaUrl(effectiveProfileConfig.avatar_path, mediaCacheKey);
  $: backgroundSrc = getProfileMediaUrl(effectiveProfileConfig.background_path, mediaCacheKey);
  $: audioSrc = getProfileMediaUrl(effectiveProfileConfig.audio_path, mediaCacheKey);
  $: richMedia = profileFeatureFlags.richMedia
    ? normalizeRichMediaConfig(effectiveProfileConfig)
    : normalizeRichMediaConfig({});
  $: backgroundVideoSrc = getProfileMediaUrl(richMedia.background_video_path, mediaCacheKey);
  $: bannerSrc = getProfileMediaUrl(richMedia.banner_path, mediaCacheKey);
  $: cursorSrc = getProfileMediaUrl(richMedia.cursor_path, mediaCacheKey);
  $: pointerCursorSrc = getProfileMediaUrl(richMedia.pointer_cursor_path, mediaCacheKey);
  $: richAudioPlaylist = richMedia.audio_playlist;
  $: profileContent = effectiveProfileConfig.content;
  $: hasProfileContent = hasVisibleProfileContent(profileContent);
  $: profileWidgets = getVisibleProfileWidgets(effectiveProfileConfig.widgets, effectiveProfileConfig);
  $: hasSpotifyWidget = profileWidgets.some(widget => widget.provider === 'spotify');
  $: showExpression = Boolean(audioSrc)
    || Boolean(backgroundVideoSrc)
    || richAudioPlaylist.tracks.length > 0
    || Boolean(effectiveProfileConfig.spotify_type && effectiveProfileConfig.spotify_id)
    || profileWidgets.length > 0
    || PROFILE_MUSIC_ENABLED
    || (import.meta.env.DEV && visualFixture === 'music')
    || hasProfileContent;
  $: hasProfileMusic = Boolean(audioSrc)
    || richAudioPlaylist.tracks.length > 0
    || Boolean(effectiveProfileConfig.spotify_type && effectiveProfileConfig.spotify_id)
    || (import.meta.env.DEV && visualFixture === 'music');
  $: composition = getProfileComposition(effectiveProfileConfig, {
    isOwner: isOwnProfile,
    hasLinks: visibleLinks.length > 0,
    hasPinnedAchievements: pinnedAchievements.length > 0,
    hasCollection: collectionItems.length > 0,
    hasTimeline: timelineEvents.length > 0
  });
  $: secondaryModules = composition.secondaryModules;
  const rollModule = Object.freeze({ size: 'wide' });
  $: layoutVariant = resolveProfileLayoutVariant(effectiveProfileConfig);
  $: showRoll = getProfileRollVisible(effectiveProfileConfig);
  $: showLowerExpression = showExpression && (layoutVariant !== 'sleek' || profileWidgets.length > 0 || hasProfileContent);
  $: hasProfileMore = showRoll || showLowerExpression || (getProfileStoryVisible(effectiveProfileConfig) && secondaryModules.length > 0);
  $: isFollowed = Boolean(targetProfile?.id && $followedUsers.includes(targetProfile.id));
  $: pinnedAchievements = (targetProfile?.equipped_badges || []).map(getAchievement);
  $: recentScores = targetScores.slice(0, 6);
  $: nameRendererRecentColors = recentScores.map(score => score?.hex_code).filter(Boolean);
  $: profilePath = getCanonicalProfilePath(username) || '/profile';
  // Layout is structure only. Keep the default class off the renderer so a
  // new Compact profile never receives a baked-in starfield or color theme.
  $: profilePresentationLayoutVariant = layoutVariant;
  $: profileCardStyle = getProfileAppearanceStyle(effectiveProfileConfig);
  $: profilePageStyle = `${profileShellStyle};${getProfileCanvasStyle(effectiveProfileConfig)}${cursorSrc ? `;cursor:url("${cursorSrc}") 16 16, auto` : ''}${pointerCursorSrc ? `;--profile-pointer-cursor:url("${pointerCursorSrc}")` : ''}`;

  onDestroy(() => {
    if (profileRollEffectTimer) clearTimeout(profileRollEffectTimer);
  });
</script>

  <main bind:this={profilePageElement} class={'profile-shell-page profile-shell-page--' + profilePresentationLayoutVariant + (defaultProfilePresentation ? ' profile-shell-page--default' : '') + (previewMode ? ' profile-shell-page--preview' : '') + (previewMode && previewDevice === 'mobile' ? ' profile-shell-page--preview-mobile' : '') + (previewIdentityOnly ? ' profile-shell-page--identity-only' : '') + (profileRollState !== 'idle' ? ' profile-shell-page--roll-' + profileRollState : '') + (pointerCursorSrc ? ' profile-shell-page--rich-pointer' : '') + ' foundation-page'} data-render-context={renderContext} data-preview-device={previewMode ? previewDevice : undefined} style={profilePageStyle} aria-busy={loading}>
  {#if backgroundSrc}
    <img class="profile-shell__media-image" src={backgroundSrc} alt="" loading="eager" decoding="async" aria-hidden="true" />
  {/if}
  {#if backgroundSrc}
    <div class="profile-shell__media-overlay" aria-hidden="true"></div>
  {/if}
  {#if backgroundVideoSrc && !prefersReducedMotion}
    <video class="profile-shell__media-video" src={backgroundVideoSrc} autoplay muted loop playsinline poster={backgroundSrc || undefined} aria-hidden="true"></video>
  {/if}
  {#if atmosphereKey}
    <AtmosphereLayer atmosphereKey={atmosphereKey} todayColor={nameRendererTodayColor} recentColors={nameRendererRecentColors} active={true} animated={true} mode="profile" className="profile-shell__page-atmosphere-layer" />
  {/if}
  {#if cursorTrailKey}
    <CursorTrailLayer trailKey={cursorTrailKey} recentColors={nameRendererRecentColors} todayColor={nameRendererTodayColor} active={true} className="profile-shell__page-cursor-layer" />
  {/if}
  {#if !loading && targetProfile}
    <div class="profile-shell__composition">
    <div class="profile-shell__approved-canvas">
      <div class="profile-shell__approved-main">
        <div class="profile-shell__opening profile-shell__approved-opening" data-profile-region="identity" style={profileCardStyle}>
          {#if profileLayoutFrameComponent}
            <svelte:component
              this={profileLayoutFrameComponent}
              variant={profilePresentationLayoutVariant}
              {username}
              isOwner={isOwnProfile}
              hasMusic={hasProfileMusic}
              showRoll={showRoll && !refreshing && profilePresentationLayoutVariant !== 'portfolio'}
            >
              <div slot="identity" class="profile-shell__layout-identity">
                <div class="profile-shell__surface-backdrop" aria-hidden="true"></div>
                <ProfileBorderEffect borderKey={cosmetics?.profile_border} className="profile-shell__identity-boundary">
                  {#if bannerSrc}
                    <img class="profile-shell__rich-banner" src={bannerSrc} alt="" loading="lazy" aria-hidden="true" />
                  {/if}
                  {#if identityCardComponent}
                    <svelte:component this={identityCardComponent}
                      username={username}
                      displayName={profileDisplayName}
                      profilePath={profilePath}
                      bio={profileBio}
                      links={visibleLinks}
                      badges={pinnedAchievements}
                      staff={Boolean(targetProfile?.is_staff)}
                      avatarSrc={avatarSrc}
                      founder={targetProfile.equipped_badges?.includes('launch_edition')}
                      accentColor={signatureColor}
                      nameRendererLoadout={nameRendererLoadout}
                      nameRendererContext="profile"
                      nameRendererMode="animated"
                      nameRendererRecentColors={nameRendererRecentColors}
                      nameRendererTodayColor={nameRendererTodayColor}
                      nameRendererBaseColor={nameRendererBaseColor}
                      avatarEffectKey={cosmetics?.avatar_effect}
                      avatarEffectMode="profile"
                      avatarEffectAnimated={true}
                      layoutVariant={profilePresentationLayoutVariant}
                      defaultPresentation={defaultProfilePresentation}
                      location={identityPresentation.location}
                      timezone={identityPresentation.timezone}
                      joinedLabel={joinedLabel}
                      showJoinDate={identityPresentation.showJoinDate}
                      showAvatar={identityPresentation.showAvatar}
                      descriptionMode={identityPresentation.descriptionMode}
                      entryAnimation={prefersReducedMotion ? 'none' : identityPresentation.entryAnimation}
                      linkStyle={effectiveProfileConfig.linkStyle}
                      onEntryClick={recordProfileClick}
                      rollState={profileRollState}
                      showToday={false}
                      previewDevice={previewMode ? previewDevice : 'desktop'}
                    />
                  {:else}
                    <div class="profile-shell__identity-loading" aria-busy="true" aria-label="Identity pending"></div>
                  {/if}
                </ProfileBorderEffect>
              </div>

              <div slot="roll">
                {#if profilePresentationLayoutVariant !== 'portfolio' && showRoll && !refreshing}
                  <ProfileDailyRoll
                    isOwner={isOwnProfile}
                    result={latestRoll}
                    accentColor={signatureColor}
                    variant={profilePresentationLayoutVariant}
                    {visualFixture}
                    on:rollstart={handleRollStart}
                    on:rollcancel={handleRollCancel}
                    on:rollcomplete={handleRollComplete}
                  />
                {/if}
              </div>

              <div slot="music">
                {#if profilePresentationLayoutVariant === 'sleek' && hasProfileMusic}
                  <ProfileMusic bestRoll={latestRoll || displayBestRoll} accentColor={profileControlAccent} colorEffectsEnabled={colorEffectsEnabled} audioSrc={audioSrc} audioPlaylist={richAudioPlaylist} spotifyType={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_type} spotifyId={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_id} visualFixture={visualFixture} deferMedia={previewMode} reducedMotion={prefersReducedMotion} />
                {/if}
              </div>
            </svelte:component>
          {:else}
            <div class="profile-shell__identity-loading" aria-busy="true" aria-label="Profile layout pending"></div>
          {/if}
        </div>

      {#if !previewMode && hasProfileMore && profilePresentationLayoutVariant === 'portfolio' && !profileMoreActive}
        <button type="button" class="profile-shell__more-cue" aria-controls="profile-more" on:click={scrollToProfileMore}>
          <span class="profile-shell__more-cue-label">Explore profile</span>
          <span class="profile-shell__more-cue-arrow" aria-hidden="true">↓</span>
        </button>
      {/if}
      </div>

    </div>

    <div id="profile-more" class="profile-shell__more">
        {#if !previewMode && hasProfileMore && profileMoreActive}
          <button type="button" class="profile-shell__more-back" aria-label="Return to profile top" on:click={scrollToProfileHero}>
            <span aria-hidden="true">↑</span>
          </button>
        {/if}
        {#if showRoll && !refreshing && profilePresentationLayoutVariant === 'portfolio'}
          <div class="profile-shell__approved-game" data-profile-region="roll" aria-label={isOwnProfile ? 'Today’s color roll' : 'Latest color'}>
            {#if isOwnProfile}
              <ProfileRoll moduleSize={rollModule.size} compact={true} integrated={true} quiet={true} visualFixture={visualFixture} fixtureResult={latestRoll} on:rollstart={handleRollStart} on:rollcancel={handleRollCancel} on:rollcomplete={handleRollComplete} />
            {:else}
              <TodayColor result={latestRoll} quiet={true} accentColor={signatureColor} />
            {/if}
          </div>
        {/if}

        {#if getProfileStoryVisible(effectiveProfileConfig)}
          <div class="profile-shell__approved-featured" data-profile-region="featured" aria-label={username + ' color archive'}>
            <FeaturedCollection
              items={collectionItems}
              samples={recentScores}
              accentColor={signatureColor}
              unlocked={storyUnlocks.collectionUnlocked}
              rollsRequired={storyUnlocks.collectionRollsRequired}
              totalRolls={storyUnlocks.totalRolls}
            />
          </div>
        {/if}
        {#if showLowerExpression}
          <div class="profile-shell__supporting profile-shell__approved-supporting" data-profile-composition aria-label={username + ' expression'}>
            <div class="profile-shell__supporting-region profile-shell__supporting-region--expression" data-profile-region="expression">
              {#if profilePresentationLayoutVariant !== 'sleek'}
                <ProfileMusic bestRoll={latestRoll || displayBestRoll} accentColor={profileControlAccent} colorEffectsEnabled={colorEffectsEnabled} audioSrc={audioSrc} audioPlaylist={richAudioPlaylist} spotifyType={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_type} spotifyId={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_id} visualFixture={visualFixture} deferMedia={previewMode} reducedMotion={prefersReducedMotion} />
              {/if}
              <ProfileWidgets widgets={profileWidgets} deferMedia={previewMode} onEntryClick={recordProfileClick} />
              {#if hasProfileContent}
                <ProfileContent content={profileContent} onEntryClick={recordProfileClick} />
              {/if}
            </div>
          </div>
        {/if}
    </div>
    </div>

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
                        <a class="profile-shell__link" href={link.url} target="_blank" rel="noopener noreferrer" on:click={() => recordProfileClick(link.key || `link-${link.order}`)}>
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

      {#if !previewMode && !isOwnProfile}
        <section class="profile-shell__social-section" aria-label={username + ' community and safety details'}>
          <ProfileSocial
            profileId={targetProfile.id}
            username={username}
            isOwnProfile={false}
            isAuthenticated={$isAuthenticated}
            social={social}
            settings={socialSettings}
            socialDepthEnabled={socialDepthEnabled}
            on:socialchange={handleSocialChange}
          />
          {#if $isAuthenticated}
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
        </section>
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
    color: var(--profile-text, var(--color-ink));
    background:
      radial-gradient(circle at 8% 12%, color-mix(in srgb, var(--profile-surface-accent) 14%, transparent), transparent 28rem),
      radial-gradient(circle at 94% 76%, color-mix(in srgb, var(--color-accent-cyan) 9%, transparent), transparent 30rem),
      var(--color-canvas-deep);
  }

  /* A fresh profile gets a quiet blue night canvas. This class is only added
     when the validated Signal defaults are still active and no authored media
     or atmosphere is present, so a saved background always wins. */
  .profile-shell-page.profile-shell-page--default {
    background-color: #07152c;
    background-image: none;
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
      radial-gradient(circle at 76% 50%, color-mix(in srgb, var(--profile-surface-accent) 14%, transparent), transparent 28rem),
      linear-gradient(110deg, color-mix(in srgb, var(--surface-panel-strong) 76%, transparent), color-mix(in srgb, var(--surface-panel) 34%, transparent));
  }

  .profile-shell__identity-loading { min-height: 20rem; border-radius: var(--radius-md, 1rem); background: color-mix(in srgb, var(--profile-surface, #11141b) 70%, transparent); }

  .profile-shell__social-section {
    width: min(100%, 46rem);
    margin-top: var(--space-6);
  }

  .profile-shell-page--roll-rolling .profile-shell__opening.profile-shell__approved-opening {
    border-color: var(--color-line-strong);
    box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.08), 0 1.5rem 4rem rgba(0, 0, 0, 0.2);
  }

  .profile-shell-page--roll-settled .profile-shell__opening.profile-shell__approved-opening {
    animation: profile-shell-roll-settle 1.05s var(--motion-ease-emphasis);
  }

  @keyframes profile-shell-roll-settle {
    0% { transform: scale(0.997); box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.08), 0 1.5rem 4rem rgba(0, 0, 0, 0.2); }
    42% { transform: scale(1.002); box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.14), 0 0 3rem rgba(0, 0, 0, 0.26); }
    100% { transform: scale(1); box-shadow: none; }
  }

  .profile-shell__media-image,
  .profile-shell__media-video { position: fixed; inset: 0; z-index: 0; display: block; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
  .profile-shell__media-video { opacity: .92; }
  .profile-shell-page--preview .profile-shell__media-image { position: absolute; }
  .profile-shell-page--preview .profile-shell__media-video { position: absolute; }
  .profile-shell__media-image,
  .profile-shell__media-video { opacity: var(--profile-background-image-opacity, 1); filter: blur(var(--profile-background-blur, 0px)); transform: scale(1.04); }
  .profile-shell-page--preview .profile-shell__media-image,
  .profile-shell-page--preview .profile-shell__media-video { transform: none; }
  .profile-shell__media-overlay { position: absolute; inset: 0; z-index: 0; background: var(--profile-background-overlay, transparent); opacity: var(--profile-background-overlay-opacity, 0); pointer-events: none; }
  .profile-shell__surface-backdrop { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: var(--profile-border-radius, var(--radius-lg)); background: rgba(0, 0, 0, 0.001); backdrop-filter: blur(var(--profile-surface-blur, 0px)); -webkit-backdrop-filter: blur(var(--profile-surface-blur, 0px)); pointer-events: none; }
  @supports (backdrop-filter: blur(0)) {
    .profile-shell__surface-backdrop { backdrop-filter: blur(var(--profile-surface-blur, 0px)); }
  }
  .profile-shell__rich-banner { display: block; width: 100%; max-height: 13rem; object-fit: cover; border-radius: var(--radius-lg) var(--radius-lg) 0 0; opacity: .94; }
  .profile-shell-page--rich-pointer :global(a),
  .profile-shell-page--rich-pointer :global(button),
  .profile-shell-page--rich-pointer :global([role="button"]) { cursor: var(--profile-pointer-cursor), pointer; }
  :global(.profile-atmosphere.profile-shell__page-atmosphere-layer) { isolation: auto; }
  :global(.profile-atmosphere.profile-shell__page-atmosphere-layer) { position: fixed; inset: 0; z-index: 0; }
  :global(.cursor-trail-layer.profile-shell__page-cursor-layer) { position: fixed; inset: 0; z-index: 6; }
  :global(.profile-shell-page--preview .profile-atmosphere.profile-shell__page-atmosphere-layer) { position: absolute; inset: 0; }
  :global(.profile-shell-page--preview .cursor-trail-layer.profile-shell__page-cursor-layer) { position: absolute; inset: 0; }
  .profile-shell__identity { min-width: 0; }
  .profile-shell__rank-row {
    display: flex;
    align-items: center;
  }

  .profile-shell__action { display: inline-flex; align-items: center; justify-content: center; min-height: 2.35rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-4); color: var(--color-ink-strong); font: 600 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard); }
  .profile-shell__action:hover:not(:disabled) { transform: translateY(-2px); }
  .profile-shell__action:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-shell__action:disabled { cursor: wait; opacity: 0.6; }
  .profile-shell__action--primary { background: var(--color-ink-strong); color: var(--color-canvas-deep); }
  .profile-shell__action--secondary { border-color: color-mix(in srgb, var(--profile-control-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-control-accent) 14%, transparent); color: var(--color-accent-bright); }

  .profile-shell__rank-row { flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .profile-shell__rank-row > div:first-child { display: flex; align-items: baseline; gap: var(--space-3); }
  .profile-shell__rank-label { color: var(--profile-accent); }
  .profile-shell__rank-value { color: var(--color-ink-strong); font: 600 var(--type-small) / 1 var(--font-mono-stack); }
  .profile-shell__rank-track { flex: 1 1 12rem; min-width: 8rem; height: 0.45rem; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-inset); }
  .profile-shell__rank-track span { display: block; height: 100%; border-radius: inherit; transition: width var(--motion-slow) var(--motion-ease-emphasis); }
  .profile-shell__rank-next { color: var(--color-ink-muted); letter-spacing: 0.04em; }

  .profile-shell__supporting { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: clamp(2rem, 6vw, 7rem); margin-top: clamp(2rem, 5vw, 4.5rem); padding: 0 clamp(1.25rem, 5vw, 5rem) clamp(1rem, 3vw, 2rem); }
  .profile-shell__supporting-region { min-width: 0; }
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
    .profile-shell__supporting { gap: var(--space-8); }
  }

  @media (max-width: 48rem) {
    .profile-shell__opening { padding: var(--space-8) var(--space-5); }
    .profile-shell__supporting { grid-template-columns: 1fr; gap: var(--space-8); margin-top: var(--space-8); padding: 0 var(--space-5) var(--space-5); }
    .profile-shell__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-shell__details-grid :global(.foundation-module),
    .profile-shell__details-grid :global(.foundation-module--wide) { grid-column: 1 / -1; }
    .profile-shell__story-heading { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__story-heading > span { text-align: left; }
  }

  @media (max-width: 36rem) {
    .profile-shell-page { padding: var(--space-3); }
    .profile-shell__opening { padding: var(--space-6) var(--space-4); }
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
    border-radius: var(--profile-border-radius, 16px);
  }
  .profile-shell-page.profile-shell-page--default.profile-shell-page--preview {
    background: transparent;
  }
  .profile-shell-page--preview:not(.profile-shell-page--default) { background: transparent; }
  :global(.profile-shell-page--preview) .profile-shell__opening { width: 100%; margin: 0; border-radius: 16px; box-shadow: 0 1rem 2.5rem rgba(0,0,0,0.28); }
  :global(.profile-shell-page--preview) .profile-shell__rank-row { gap: var(--space-2) var(--space-3); margin-top: var(--space-4); padding-top: var(--space-3); }
  :global(.profile-shell-page--preview) .profile-shell__rank-label,
  :global(.profile-shell-page--preview) .profile-shell__rank-next { font-size: 0.54rem; }
  :global(.profile-shell-page--preview) .profile-shell__rank-value { font-size: 0.62rem; }

  @media (prefers-reduced-motion: reduce) {
    .profile-shell__action,
    .profile-shell__rank-track span,
    .profile-shell__link,
    .profile-shell__story-progress span { transition-duration: 0.001ms; }
    .profile-shell__action:hover:not(:disabled) { transform: none; }
    .profile-shell__link:hover { transform: none; }
    .profile-shell__media-video { display: none; }
  }
  /* Profile composition: one color field, one identity surface. */
  .profile-shell-page {
    min-height: calc(100dvh - 4.75rem);
    height: calc(100dvh - 4.75rem);
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0 clamp(0.9rem, 3vw, 2.5rem) 1.5rem;
    background: var(--profile-background-paint, var(--color-canvas-deep));
    isolation: isolate;
    overscroll-behavior-y: contain;
    scroll-snap-type: y proximity;
    scroll-padding-block: 0;
  }

  .profile-shell__approved-canvas {
    position: relative;
    z-index: 1;
    display: block;
    min-height: calc(100dvh - 4.75rem);
    padding: 0;
    scroll-snap-align: start;
    scroll-snap-stop: normal;
  }

  .profile-shell__approved-main {
    position: relative;
    display: flex;
    height: calc(100dvh - 4.75rem);
    min-height: calc(100dvh - 4.75rem);
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .profile-shell__more-cue {
    position: absolute;
    left: 50%;
    bottom: 1.25rem;
    display: grid;
    place-items: center;
    width: 2.9rem;
    height: 2.9rem;
    margin: 0;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--profile-control-accent) 38%, var(--color-line-subtle));
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-canvas-deep) 72%, transparent);
    color: color-mix(in srgb, var(--profile-control-accent) 68%, white);
    cursor: pointer;
    box-shadow: 0 0 1.5rem color-mix(in srgb, var(--profile-control-accent) 14%, transparent);
    transform: translateX(-50%);
    transition: transform 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  .profile-shell__more-cue:hover { color: var(--color-ink-strong); border-color: var(--profile-control-accent); transform: translate(-50%, 0.2rem); }
  .profile-shell__more-cue:focus-visible { outline: 2px solid var(--profile-control-accent); outline-offset: 4px; border-radius: var(--radius-sm); }
  .profile-shell__more-cue-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .profile-shell__more-cue-arrow { font-size: 1.35rem; line-height: 1; }
  .profile-shell__more {
    position: relative;
    display: flex;
    min-height: calc(100dvh - 4.75rem);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: clamp(4rem, 12vh, 8rem) 0 clamp(4rem, 10vh, 7rem);
    scroll-snap-align: start;
    scroll-snap-stop: normal;
  }

  .profile-shell__more-back {
    position: absolute;
    top: 1.25rem;
    left: 50%;
    display: grid;
    place-items: center;
    width: 2.9rem;
    height: 2.9rem;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--profile-control-accent) 38%, var(--color-line-subtle));
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-canvas-deep) 72%, transparent);
    color: color-mix(in srgb, var(--profile-control-accent) 68%, white);
    cursor: pointer;
    font-size: 1.35rem;
    line-height: 1;
    transform: translateX(-50%);
  }

  .profile-shell__more-back:hover { color: var(--color-ink-strong); border-color: var(--profile-control-accent); }
  .profile-shell__more-back:focus-visible { outline: 2px solid var(--profile-control-accent); outline-offset: 4px; }

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

  .profile-shell-page--preview .profile-shell__opening.profile-shell__approved-opening { background: transparent; }

  :global(.profile-shell__identity-boundary) {
    position: relative;
    width: 100%;
    border-radius: var(--profile-border-radius, var(--radius-lg));
    z-index: 1;
    isolation: isolate;
  }

  /* The card must sample the page canvas for backdrop-filter. Keep the
     border wrapper clipped, but do not create a second isolated backdrop root. */
  :global(.profile-border-effect.profile-shell__identity-boundary) { isolation: auto; }

  :global(.profile-border-effect--none.profile-shell__identity-boundary) { overflow: hidden; }

  :global(.profile-shell__identity-boundary) :global(.identity-card) { z-index: 1; }

  .profile-shell__approved-game,
  .profile-shell__approved-featured { min-width: 0; }

  .profile-shell__approved-game {
    width: min(100%, 46rem);
    margin-top: clamp(1.5rem, 4vw, 2.5rem);
    padding: 1.25rem 0.5rem 0;
    border-top: 1px solid color-mix(in srgb, var(--profile-control-accent) 24%, var(--color-line-subtle));
  }

  .profile-shell__more .profile-shell__approved-game {
    margin-top: 0;
  }

  .profile-shell__more .profile-shell__approved-game :global(.today-color) {
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 1.25rem 1.5rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-shell__more > .profile-shell__approved-game:first-child { margin-top: 0; }

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
    width: 100%;
    margin: 0;
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
    width: 100%;
    min-height: 0;
    padding: 0;
  }

  .profile-shell-page--preview {
    height: auto;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    scroll-snap-type: none;
    background: transparent;
  }

  .profile-shell-page--preview .profile-shell__approved-main {
    width: 100%;
    height: auto;
    min-height: 0;
  }

  .profile-shell-page--preview .profile-shell__approved-opening {
    width: 100%;
  }

  /* The embedded phone is narrower than the browser viewport, so the normal
     viewport media query cannot be the responsive signal. IdentityCard owns
     this explicit render context instead. */
  .profile-shell-page--preview-mobile .profile-shell__approved-main,
  .profile-shell-page--preview-mobile .profile-shell__approved-canvas,
  .profile-shell-page--preview-mobile .profile-shell__approved-opening { width: 100%; min-width: 0; }
  .profile-shell-page--preview-mobile .profile-shell__approved-canvas { min-height: 0; }

  /* The editor preview is an identity check, not a second profile page. Keep
     the opening card visible while leaving the daily roll and story surfaces
     in the public renderer untouched. */
  .profile-shell-page--identity-only .profile-shell__more,
  .profile-shell-page--identity-only > .profile-shell__story-section,
  .profile-shell-page--identity-only > .profile-shell__social-section,
  .profile-shell-page--identity-only .profile-shell__more-cue {
    display: none;
  }

  /* Layout frames own the relationship between identity, roll and expression.
     The data and roll logic remain shared; only their presentation changes. */
  .profile-shell__composition { display:contents; min-width:0; }
  .profile-shell__approved-canvas,
  .profile-shell__opening.profile-shell__approved-opening { z-index: auto; }

  .profile-shell__approved-canvas,
  .profile-shell__approved-main,
  .profile-shell__more,
  .profile-shell__approved-opening,
  .profile-shell__approved-game,
  .profile-shell__approved-featured,
  .profile-shell__approved-supporting { min-width:0; max-width:100%; }
  .profile-shell-page :global(.identity-card__person),
  .profile-shell-page :global(.identity-card__copy),
  .profile-shell-page :global(.identity-card__name-row),
  .profile-shell-page :global(.identity-card__links) { min-width:0; }
  .profile-shell-page :global(.identity-card__copy) { overflow-wrap:anywhere; }
  .profile-shell-page :global(.identity-card__links a) { min-width:0; max-width:100%; }

  @media (max-width: 36rem) {
    .profile-shell-page { height: calc(100dvh - 3.85rem); min-height: calc(100dvh - 3.85rem); padding-inline: 1.5rem; padding-bottom: 0; }
    .profile-shell__approved-canvas { display: block; min-height: calc(100dvh - 3.85rem); padding: 0; }
    .profile-shell__approved-main { width: 100%; flex: 0 0 auto; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: stretch; }
    .profile-shell__approved-main { height: calc(100dvh - 3.85rem); min-height: calc(100dvh - 3.85rem); }
    .profile-shell__more-cue { bottom: 1rem; }
    .profile-shell__more { min-height: calc(100dvh - 3.85rem); padding-block: 4rem; }
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

  /* Active profile layouts are intentionally small. The page remains the
     user's environment; the identity surface is an object placed into it. */
  .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening { width: min(300px, calc(100% - 1rem)); }
  .profile-shell-page--sleek .profile-shell__opening.profile-shell__approved-opening { width: min(335px, calc(100% - 1rem)); }
  .profile-shell-page--minimal .profile-shell__opening.profile-shell__approved-opening { width: min(300px, calc(100% - 1rem)); }
  .profile-shell-page--modern .profile-shell__opening.profile-shell__approved-opening { width: min(310px, calc(100% - 1rem)); }
  .profile-shell-page--portfolio .profile-shell__opening.profile-shell__approved-opening { width: min(320px, calc(100% - 1rem)); }

  .profile-shell-page--compact .profile-shell__approved-main,
  .profile-shell-page--sleek .profile-shell__approved-main,
  .profile-shell-page--minimal .profile-shell__approved-main,
  .profile-shell-page--modern .profile-shell__approved-main { justify-content: center; }
  .profile-shell-page--minimal .profile-shell__surface-backdrop,
  .profile-shell-page--minimal :global(.profile-shell__identity-boundary.profile-border-effect--none) { background: transparent; }
  .profile-shell-page--minimal :global(.profile-shell__identity-boundary.profile-border-effect--none) { overflow: visible; }

  .profile-shell-page--compact .profile-shell__more,
  .profile-shell-page--sleek .profile-shell__more,
  .profile-shell-page--minimal .profile-shell__more,
  .profile-shell-page--modern .profile-shell__more { min-height: 0; justify-content: flex-start; padding: 2.5rem 0 4rem; }
  .profile-shell-page--compact .profile-shell__more-cue,
  .profile-shell-page--sleek .profile-shell__more-cue,
  .profile-shell-page--minimal .profile-shell__more-cue,
  .profile-shell-page--modern .profile-shell__more-cue,
  .profile-shell-page--compact .profile-shell__more-back,
  .profile-shell-page--sleek .profile-shell__more-back,
  .profile-shell-page--minimal .profile-shell__more-back,
  .profile-shell-page--modern .profile-shell__more-back { display: none; }
  .profile-shell-page--portfolio .profile-shell__more { align-items: center; }

  .profile-shell-page--preview .profile-shell__opening.profile-shell__approved-opening { width: 100%; }
  .profile-shell-page--preview :global(.profile-daily-roll) { box-sizing: border-box; }

  .profile-shell__layout-identity { position: relative; min-width: 0; }
  .profile-shell-page--compact .profile-shell__layout-identity,
  .profile-shell-page--sleek .profile-shell__layout-identity,
  .profile-shell-page--modern .profile-shell__layout-identity { min-width: 0; }

  /* Minimal is deliberately placed into the environment rather than centered
     as another dashboard card. Keep the mobile fallback centered and full. */
  .profile-shell-page--minimal .profile-shell__approved-main { align-items: flex-start; }
  .profile-shell-page--minimal .profile-shell__opening.profile-shell__approved-opening {
    align-self: flex-start;
    margin-left: 8.5vw;
    margin-right: 0;
  }

  .profile-shell-page--portfolio .profile-shell__opening.profile-shell__approved-opening {
    align-self: center;
  }

  @media (max-width: 48rem) {
    .profile-shell-page--minimal .profile-shell__approved-main { align-items: center; }
    .profile-shell-page--minimal .profile-shell__opening.profile-shell__approved-opening {
      align-self: center;
      margin-left: auto;
      margin-right: auto;
    }
  }

  @media (max-width: 36rem) {
    .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--sleek .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--minimal .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--modern .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--portfolio .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 320px); }
    .profile-shell-page--minimal .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 300px); }
  }
</style>
