<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { authUser, followedUsers, isAuthenticated, profile, session, toggleFollow } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData';
  import { isOwnProfileTarget } from './profileContract';
  import { formatCount, normalizeHexColor } from './utils';
  import Module from './foundation/Module.svelte';
  import Surface from './foundation/Surface.svelte';
  import ProfileTimeline from './ProfileTimeline.svelte';
  import ProfileCollection from './ProfileCollection.svelte';
  import { getProfileStoryUnlocks } from './profileStory.js';
  import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
  import ProfileMotionEffect from './profile-motion/ProfileMotionEffect.svelte';
  import ProfileFullBleedLayout from './profile-layout/ProfileFullBleedLayout.svelte';
  import ProfileMusic from './ProfileMusic.svelte';
  import ProfileWidgets from './ProfileWidgets.svelte';
  import ProfileContent from './ProfileContent.svelte';
  import FeaturedCollection from './FeaturedCollection.svelte';
  import { trackProductEvent } from './productAnalytics.js';
  import { recordPublicProfileView } from './profileViewAnalytics.js';
  import { recordProfileInsightEvent } from './profileInsightAnalytics.js';
  import ProfileEnvironmentLayer from './ProfileEnvironmentLayer.svelte';
  import { getProfileLinkDefinition } from './profileLinkTypes.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { isProfileFeatureEnabled, resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { buildProfileRenderSnapshot } from './profileRenderModel.js';
  import { getProfileLayoutMotionTarget } from './profile-layout/profileLayouts.js';
  import { requestNameFontLoad } from './name/nameFonts.js';

  export let profileUsername = null;
  export let userId = null;
  export let previewMode = false;
  export let previewProfile = null;
  export let previewProfileConfig = null;
  export let renderSnapshot = null;
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
  export let motionSurfaceElement = null;
  export let renderEnvironment = true;
  $: renderContext;

  const profileShellStyle = '--profile-accent: var(--color-accent-roll); --profile-surface-accent: var(--color-accent-cyan); --profile-control-accent: var(--color-accent);';
  let targetProfile = null;
  let targetScores = [];
  let timelineEvents = [];
  let collectionItems = [];
  let profileConfig = null;
  let social = createEmptyProfileSocial();
  let socialSettings = createDefaultProfileSocialSettings();
  let allAchievements = [];
  let loading = true;
  let loadError = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let trackedProfileViewKey = null;
  let followLoading = false;
  let profileRollState = 'idle';
  let profileRollEffectTimer = null;
  let refreshing = false;
  let profileMoreActive = false;
  let profilePageElement;
  let prefersReducedMotion = false;
  let profileReferenceCardComponent = null;
  let profileReferenceCardRequest = null;
  let profileWideFontRequestKey = '';
  let todayColorComponent = null;
  let todayColorRequest = null;
  let profileRollComponent = null;
  let profileRollRequest = null;
  let profileSocialComponent = null;
  let profileSocialRequest = null;
  function ensureProfileReferenceCard() {
    if (profileReferenceCardComponent || profileReferenceCardRequest) return profileReferenceCardRequest;
    profileReferenceCardRequest = import('./ProfileReferenceCard.svelte')
      .then(module => { profileReferenceCardComponent = module.default; })
      .catch(() => { profileReferenceCardComponent = null; })
      .finally(() => { profileReferenceCardRequest = null; });
    return profileReferenceCardRequest;
  }

  function requestProfileWideFont(fontKey, text) {
    const key = `${fontKey}:${text}`;
    if (!fontKey || profileWideFontRequestKey === key) return;
    profileWideFontRequestKey = key;
    void requestNameFontLoad(fontKey, 28, text).then(loaded => {
      if (!loaded && profileWideFontRequestKey === key) profileWideFontRequestKey = '';
    });
  }

  function ensureTodayColor() {
    if (todayColorComponent || todayColorRequest) return todayColorRequest;
    todayColorRequest = import('./TodayColor.svelte')
      .then(module => { todayColorComponent = module.default; })
      .catch(() => { todayColorComponent = null; })
      .finally(() => { todayColorRequest = null; });
    return todayColorRequest;
  }

  function ensureProfileRoll() {
    if (profileRollComponent || profileRollRequest) return profileRollRequest;
    profileRollRequest = import('./ProfileRoll.svelte')
      .then(module => { profileRollComponent = module.default; })
      .catch(() => { profileRollComponent = null; })
      .finally(() => { profileRollRequest = null; });
    return profileRollRequest;
  }

  function ensureProfileSocial() {
    if (profileSocialComponent || profileSocialRequest) return profileSocialRequest;
    profileSocialRequest = import('./ProfileSocial.svelte')
      .then(module => { profileSocialComponent = module.default; })
      .catch(() => { profileSocialComponent = null; })
      .finally(() => { profileSocialRequest = null; });
    return profileSocialRequest;
  }

  function resetShellState(nextLoading = false) {
    targetProfile = null;
    targetScores = [];
    timelineEvents = [];
    collectionItems = [];
    profileConfig = null;
    social = createEmptyProfileSocial();
    socialSettings = createDefaultProfileSocialSettings();
    allAchievements = [];
    profileRollState = 'idle';
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
      const resolvedPreviewProfile = previewProfile || profileRenderSnapshot?.profile || null;
      if (!resolvedPreviewProfile) {
        if (nextPreviewKey !== activeProfileKey) {
          activeProfileKey = nextPreviewKey;
          loadRequestId += 1;
          resetShellState(true);
        }
        return;
      }
      if (nextPreviewKey !== activeProfileKey) {
        activeProfileKey = nextPreviewKey;
        loadRequestId += 1;
        resetShellState(false);
        targetProfile = {
          ...resolvedPreviewProfile,
          id: resolvedPreviewProfile.id || 'profile-studio-preview',
          username: resolvedPreviewProfile.username || 'Chromanaut',
          display_name: resolvedPreviewProfile.display_name ?? null,
          bio: resolvedPreviewProfile.bio ?? null,
          current_streak: Number(resolvedPreviewProfile.current_streak) || 0,
          longest_streak: Number(resolvedPreviewProfile.longest_streak) || 0,
          lifetime_ep: Number(resolvedPreviewProfile.lifetime_ep) || 0,
          total_rolls: Number(resolvedPreviewProfile.total_rolls) || 0,
          is_staff: Boolean(resolvedPreviewProfile.is_staff),
          equipped_cosmetics: resolvedPreviewProfile.equipped_cosmetics || {},
          equipped_badges: Array.isArray(resolvedPreviewProfile.equipped_badges) ? resolvedPreviewProfile.equipped_badges : [],
          mood_color: resolvedPreviewProfile.mood_color || '#CDD2FF',
          best_roll_score: resolvedPreviewProfile.best_roll_score ?? null,
          best_roll_hex: resolvedPreviewProfile.best_roll_hex ?? null,
          best_roll_rarity: resolvedPreviewProfile.best_roll_rarity ?? null
        };
        const config = normalizeProfileConfig(
          previewProfileConfig || profileRenderSnapshot?.configuration || createDefaultProfileConfig(),
          resolvedPreviewProfile.mood_color || '#CDD2FF'
        );
        profileConfig = { draft: null, published: config };
        social = createEmptyProfileSocial();
        socialSettings = createDefaultProfileSocialSettings();
        targetScores = Array.isArray(previewScores) ? previewScores : [];
        timelineEvents = Array.isArray(previewTimelineEvents) ? previewTimelineEvents : [];
        collectionItems = Array.isArray(previewCollectionItems) ? previewCollectionItems : [];
        allAchievements = Array.isArray(previewAllAchievements) ? previewAllAchievements : [];
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

  onMount(() => {
    void ensureProfileReferenceCard();
    void ensureTodayColor();
    void ensureProfileRoll();
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

  function colorFor(value, fallback = '#8B7CF6') {
    return normalizeHexColor(value, fallback);
  }

  function formatLinkDestination(value) {
    try {
      const url = new URL(String(value || ''));
      const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
      return url.hostname.replace(/^www\./, '') + path;
    } catch {
      return String(value || '');
    }
  }

  function formatStat(value) {
    return formatCount(Number(value) || 0);
  }

  function formatFullValue(value) {
    return (Number(value) || 0).toLocaleString();
  }

  $: profileOwnerContext = previewMode
    ? false
    : ['owner', 'pre-roll'].includes(visualFixture)
      ? true
      : isOwnProfileTarget({
        isAuthenticated: $isAuthenticated,
        sessionUserId: $session?.user?.id,
        profileId: targetProfile?.id
      });
  $: profileRenderSnapshot = renderSnapshot || buildProfileRenderSnapshot({
    profile: previewMode ? (previewProfile || targetProfile) : targetProfile,
    profileConfig,
    studioDraft: previewMode ? previewProfileConfig : null,
    scores: targetScores,
    timelineEvents,
    collectionItems,
    allAchievements,
    fallbackColor: '#CDD2FF',
    featureFlags: resolveProfileFeatureFlags({
      userId: targetProfile?.id,
      isStaff: Boolean(targetProfile?.is_staff)
    }),
    previewMode,
    previewDevice,
    mode: previewMode ? 'studio' : 'public',
    isOwner: profileOwnerContext,
    rollState: profileRollState,
    visualFixture,
    dev: import.meta.env.DEV
  });
  $: renderProfile = profileRenderSnapshot?.profile || targetProfile;
  $: username = profileRenderSnapshot?.identity?.username || 'Unknown Player';
  $: profileFeatureFlags = profileRenderSnapshot?.featureFlags || {};
  $: expandedAnalyticsEnabled = profileFeatureFlags.expandedAnalytics === true;
  $: socialDepthEnabled = profileFeatureFlags.socialDepth === true;
  $: profileDisplayName = profileRenderSnapshot?.identity?.displayName || username;
  $: isOwnProfile = profileRenderSnapshot?.permissions?.isOwner ?? profileOwnerContext;
  $: if (!previewMode && targetProfile && !isOwnProfile) void ensureProfileSocial();
  $: cosmetics = profileRenderSnapshot?.cosmetics?.loadout || {};
  $: nameRendererLoadout = profileRenderSnapshot?.cosmetics?.name || null;
  $: rank = profileRenderSnapshot?.story?.rank || null;
  $: rankState = profileRenderSnapshot?.story?.rankState || null;
  $: bestRoll = profileRenderSnapshot?.roll?.best || null;
  $: displayBestRoll = bestRoll;
  $: effectiveProfileConfig = profileRenderSnapshot?.configuration || normalizeProfileConfig(null, '#CDD2FF');
  $: appearance = profileRenderSnapshot?.appearance || effectiveProfileConfig.appearance;
  $: storyUnlocks = profileRenderSnapshot?.story?.unlocks || getProfileStoryUnlocks(targetProfile);
  $: latestRoll = profileRenderSnapshot?.roll?.latest || null;
  $: profileBio = profileRenderSnapshot?.identity?.bio || '';
  $: identityPresentation = profileRenderSnapshot?.identity?.presentation || {};
  $: joinedLabel = profileRenderSnapshot?.identity?.joinedLabel || '';
  $: profileMeta = [
    identityPresentation.location,
    identityPresentation.timezone,
    identityPresentation.showJoinDate && joinedLabel ? `Joined ${joinedLabel}` : ''
  ].filter(Boolean).join(' · ');
  $: signatureColor = colorFor(profileRenderSnapshot?.colors?.signature || appearance.colors.accent);
  $: nameRendererBaseColor = colorFor(profileRenderSnapshot?.colors?.nameBase || appearance.colors.username, '#FFFFFF');
  $: nameRendererTodayColor = colorFor(profileRenderSnapshot?.colors?.nameToday || '#8B7CF6');
  $: colorEffectsEnabled = profileRenderSnapshot?.colors?.colorEffectsEnabled === true;
  $: profileControlAccent = signatureColor;
  $: profileWideNameFontEnabled = profileRenderSnapshot?.typography?.profileWideNameFont === true;
  $: if (profileWideNameFontEnabled && profileRenderSnapshot?.typography?.nameFontKey) {
    requestProfileWideFont(profileRenderSnapshot.typography.nameFontKey, profileDisplayName || username);
  }
  $: avatarSrc = profileRenderSnapshot?.media?.avatarUrl || '';
  $: audioSrc = profileRenderSnapshot?.media?.audioUrl || '';
  $: pointerCursorSrc = profileRenderSnapshot?.environment?.pointerCursorUrl || '';
  $: richAudioPlaylist = profileRenderSnapshot?.media?.playlist || { tracks: [] };
  $: profileContent = profileRenderSnapshot?.modules?.content || effectiveProfileConfig.content;
  $: hasProfileContent = profileRenderSnapshot?.modules?.hasContent === true;
  $: profileWidgets = profileRenderSnapshot?.modules?.widgets || [];
  $: hasSpotifyWidget = profileRenderSnapshot?.modules?.hasSpotifyWidget === true;
  $: hasProfileMusic = profileRenderSnapshot?.modules?.hasMusic === true;
  $: composition = profileRenderSnapshot?.modules?.composition || { secondaryModules: [] };
  $: secondaryModules = composition.secondaryModules || [];
  $: storyModules = profileRenderSnapshot?.modules?.storyModules || secondaryModules.filter(module => module.id !== 'links');
  const rollModule = Object.freeze({ size: 'wide' });
  $: layoutVariant = profileRenderSnapshot?.layout?.variant || 'compact';
  $: openingLinks = profileRenderSnapshot?.links?.opening || [];
  $: continuationLinks = profileRenderSnapshot?.links?.continuation || [];
  $: continuationSocialLinks = profileRenderSnapshot?.links?.continuationSocial || [];
  $: continuationNavigationLinks = profileRenderSnapshot?.links?.continuationNavigation || [];
  $: showRoll = profileRenderSnapshot?.roll?.show === true;
  $: showLowerExpression = profileRenderSnapshot?.modules?.showLowerExpression === true;
  $: hasProfileStory = profileRenderSnapshot?.modules?.hasProfileStory === true;
  $: hasProfileMore = profileRenderSnapshot?.visibility?.hasProfileMore === true;
  $: renderProfileMore = profileRenderSnapshot?.visibility?.renderProfileMore === true;
  $: isFollowed = Boolean(targetProfile?.id && $followedUsers.includes(targetProfile.id));
  $: pinnedAchievements = profileRenderSnapshot?.identity?.badges || [];
  $: recentScores = profileRenderSnapshot?.story?.recentScores || [];
  $: nameRendererRecentColors = profileRenderSnapshot?.colors?.nameRecent || [];
  // Layout is structure only. Keep the default class off the renderer so a
  // new Compact profile never receives a baked-in starfield or color theme.
  $: profilePresentationLayoutVariant = layoutVariant;
  $: profileMotionKey = profileRenderSnapshot?.cosmetics?.profileMotionKey || '';
  $: profileMotionTarget = getProfileLayoutMotionTarget(profilePresentationLayoutVariant);
  $: profileCardStyle = profileRenderSnapshot?.surface?.style || '';
  $: profilePageStyle = `${profileShellStyle};${profileRenderSnapshot?.styles?.page || ''}`;

  onDestroy(() => {
    if (profileRollEffectTimer) clearTimeout(profileRollEffectTimer);
  });
</script>

<main bind:this={profilePageElement} class={'profile-shell-page profile-shell-page--' + profilePresentationLayoutVariant + (profileWideNameFontEnabled ? ' profile-shell-page--profile-wide-name-font' : '') + (previewMode ? ' profile-shell-page--preview' : '') + (previewMode && previewDevice === 'mobile' ? ' profile-shell-page--preview-mobile' : '') + (profileRollState !== 'idle' ? ' profile-shell-page--roll-' + profileRollState : '') + (pointerCursorSrc ? ' profile-shell-page--rich-pointer' : '') + ' foundation-page'} style={profilePageStyle} data-profile-render-model="v1" data-profile-layout={profilePresentationLayoutVariant} data-profile-render-mode={profileRenderSnapshot?.mode || (previewMode ? 'studio' : 'public')} aria-busy={loading}>
  {#if renderEnvironment}
    <ProfileEnvironmentLayer snapshot={profileRenderSnapshot} mode={previewMode ? 'preview' : 'public'} reducedMotion={prefersReducedMotion} />
  {/if}
  {#if !loading && targetProfile}
    <div class="profile-shell__composition">
    <div class="profile-shell__approved-canvas">
      <div class="profile-shell__approved-main">
        <div class="profile-shell__opening profile-shell__approved-opening" data-profile-region="identity">
          <ProfileMotionEffect
            motionKey={profileMotionTarget === 'none' ? '' : profileMotionKey}
            inputSurface={previewMode ? 'container' : 'viewport'}
            surfaceElement={previewMode ? motionSurfaceElement : null}
            disabled={previewMode && previewDevice === 'mobile'}
            className={'profile-shell__motion-target profile-shell__motion-target--' + profileMotionTarget}
          >
            <div class="profile-shell__card-scale" data-profile-motion-target={profileMotionTarget}>
              {#key profilePresentationLayoutVariant}
              {#if profilePresentationLayoutVariant === 'full-bleed'}
                <ProfileFullBleedLayout
                  displayName={profileDisplayName}
                  bio={profileBio}
                  avatarSrc={avatarSrc}
                  avatarEffectKey={cosmetics?.avatar_effect}
                  nameLoadout={nameRendererLoadout}
                  nameTodayColor={nameRendererTodayColor}
                  nameBaseColor={nameRendererBaseColor}
                  nameRecentColors={nameRendererRecentColors}
                  profileBorderKey={cosmetics?.profile_border}
                  location={identityPresentation.location}
                  timezone={identityPresentation.timezone}
                  joinedLabel={joinedLabel}
                  showJoinDate={identityPresentation.showJoinDate}
                  showAvatar={identityPresentation.showAvatar}
                  descriptionMode={identityPresentation.descriptionMode}
                  entryAnimation={prefersReducedMotion ? 'none' : identityPresentation.entryAnimation}
                  links={openingLinks}
                  accentColor={signatureColor}
                  onEntryClick={recordProfileClick}
                />
              {:else}
                {#if profileReferenceCardComponent}
                  <svelte:component
                    this={profileReferenceCardComponent}
                    displayName={profileDisplayName}
                    bio={profileBio}
                    meta={profileMeta}
                    avatarSrc={avatarSrc}
                    avatarEffectKey={cosmetics?.avatar_effect}
                    nameLoadout={nameRendererLoadout}
                    nameTodayColor={nameRendererTodayColor}
                    nameBaseColor={nameRendererBaseColor}
                    nameRecentColors={nameRendererRecentColors}
                    profileBorderKey={cosmetics?.profile_border}
                    surfaceStyle={profileCardStyle}
                    showAvatar={identityPresentation.showAvatar}
                    descriptionMode={identityPresentation.descriptionMode}
                    entryAnimation={prefersReducedMotion ? 'none' : identityPresentation.entryAnimation}
                    links={openingLinks}
                    linkStyle={effectiveProfileConfig.linkStyle}
                    roll={showRoll && !refreshing ? latestRoll : null}
                    accentColor={signatureColor}
                    audioAvailable={hasProfileMusic}
                    audioStatus="▶"
                    rollLabel="Today's color"
                    presentation="profile"
                    liveRoll={showRoll && !refreshing}
                    isOwner={isOwnProfile}
                    {visualFixture}
                    ariaLabel={`${profileDisplayName} profile`}
                    on:rollstart={handleRollStart}
                    on:rollcancel={handleRollCancel}
                    on:rollcomplete={handleRollComplete}
                  />
                {:else}
                  <div class="profile-shell__identity-loading" aria-busy="true" aria-label="Profile card pending"></div>
                {/if}
              {/if}
              {/key}
            </div>
          </ProfileMotionEffect>
        </div>

      {#if !previewMode && hasProfileMore && !profileMoreActive}
        <button type="button" class={'profile-shell__more-cue' + (profilePresentationLayoutVariant === 'full-bleed' ? '' : ' profile-shell__more-cue--continuation')} aria-controls="profile-more" on:click={scrollToProfileMore}>
          <span class="profile-shell__more-cue-label">{profilePresentationLayoutVariant === 'full-bleed' ? 'Explore profile' : (continuationLinks.length ? 'Links' : 'More')}</span>
          <span class="profile-shell__more-cue-arrow" aria-hidden="true">↓</span>
        </button>
      {/if}
      </div>

    </div>

    {#if renderProfileMore}
    <div id="profile-more" class="profile-shell__more">
        {#if !previewMode && hasProfileMore && profileMoreActive}
          <button type="button" class="profile-shell__more-back" aria-label="Return to profile top" on:click={scrollToProfileHero}>
            <span aria-hidden="true">↑</span>
          </button>
        {/if}
        <div class="profile-shell__continuation-column">
        {#if showRoll && !refreshing && profilePresentationLayoutVariant === 'full-bleed'}
          <div class="profile-shell__approved-game" data-profile-region="roll" aria-label={isOwnProfile ? 'Today’s color roll' : 'Latest color'}>
            {#if isOwnProfile}
              {#if profileRollComponent}
                <svelte:component
                  this={profileRollComponent}
                  moduleSize={rollModule.size}
                  compact={true}
                  integrated={true}
                  quiet={true}
                  presentation={profilePresentationLayoutVariant}
                  visualFixture={visualFixture}
                  fixtureResult={latestRoll}
                  on:rollstart={handleRollStart}
                  on:rollcancel={handleRollCancel}
                  on:rollcomplete={handleRollComplete}
                />
              {/if}
            {:else if todayColorComponent}
              <svelte:component
                this={todayColorComponent}
                result={latestRoll}
                quiet={true}
                accentColor={signatureColor}
                presentation={profilePresentationLayoutVariant}
              />
            {/if}
          </div>
        {/if}

        {#if hasProfileStory}
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
        {#if showLowerExpression && hasProfileContent}
          <div class="profile-shell__supporting profile-shell__approved-supporting" data-profile-composition data-profile-continuation="content" aria-label={username + ' expression'}>
            <div class="profile-shell__supporting-region profile-shell__supporting-region--expression" data-profile-region="content">
              <ProfileContent content={profileContent} onEntryClick={recordProfileClick} />
            </div>
          </div>
        {/if}
        {#if continuationLinks.length}
          <section class="profile-shell__continuation-links" data-profile-region="links" data-profile-continuation="links" aria-label={username + ' additional links'}>
            <h2 class="profile-shell__continuation-heading">Links</h2>
            {#if continuationSocialLinks.length}
              <nav class="profile-shell__links profile-shell__links--social" aria-label={username + ' additional social links'}>
                {#each continuationSocialLinks as link (link.order)}
                  <a class="profile-shell__link profile-shell__link--social" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label} on:click={() => recordProfileClick(link.key || `link-${link.order}`)}>
                    <span class="profile-shell__link-glyph" aria-hidden="true"><img src={'/link-icons/' + getProfileLinkDefinition(link.type).icon + '.svg'} alt="" loading="lazy" /></span>
                    <strong class="profile-shell__link-label">{link.label}</strong>
                  </a>
                {/each}
              </nav>
            {/if}
            {#if continuationNavigationLinks.length}
              <nav class="profile-shell__links profile-shell__links--navigation" aria-label={username + ' additional navigation links'}>
                {#each continuationNavigationLinks as link (link.order)}
                  <a class="profile-shell__link" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label + ': ' + formatLinkDestination(link.url)} on:click={() => recordProfileClick(link.key || `link-${link.order}`)}>
                    <span class="profile-shell__link-copy">
                      <strong>{link.label}</strong>
                      <small>{formatLinkDestination(link.url)}</small>
                    </span>
                  </a>
                {/each}
              </nav>
            {/if}
          </section>
        {/if}

        {#if showLowerExpression && (hasProfileMusic || profileWidgets.length)}
          <div class="profile-shell__supporting profile-shell__approved-supporting" data-profile-composition data-profile-continuation="media" aria-label={username + ' media and integrations'}>
            <div class="profile-shell__supporting-region profile-shell__supporting-region--expression" data-profile-region="media-integrations">
              {#if hasProfileMusic}
                <ProfileMusic bestRoll={latestRoll || displayBestRoll} accentColor={profileControlAccent} colorEffectsEnabled={colorEffectsEnabled} audioSrc={audioSrc} audioPlaylist={richAudioPlaylist} spotifyType={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_type} spotifyId={hasSpotifyWidget ? '' : effectiveProfileConfig.spotify_id} visualFixture={visualFixture} deferMedia={previewMode} reducedMotion={prefersReducedMotion} />
              {/if}
              {#if profileWidgets.length}
                <ProfileWidgets widgets={profileWidgets} deferMedia={previewMode} onEntryClick={recordProfileClick} />
              {/if}
            </div>
          </div>
        {/if}

      {#if hasProfileStory}
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

            {#each storyModules as module (module.id)}
              {#if module.id === 'stats'}
                <Module size={module.size} tone="quiet" eyebrow="Progress" title="A record of color" description="The milestones behind this identity.">
                  <div class="profile-shell__stats" aria-label="Profile statistics">
                    <div><strong>{formatStat(renderProfile?.current_streak)}</strong><span>Current streak</span></div>
                    <div><strong>{formatStat(renderProfile?.longest_streak)}</strong><span>Longest streak</span></div>
                    <div><strong>{formatStat(renderProfile?.lifetime_ep)}</strong><span>Lifetime EP</span></div>
                    <div><strong>{formatStat(renderProfile?.total_rolls)}</strong><span>Total rolls</span></div>
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
        </div>
    </div>
    {/if}
    </div>

      {#if !previewMode && !isOwnProfile}
        <section class="profile-shell__social-section" aria-label={username + ' community and safety details'}>
          {#if profileSocialComponent}
            <svelte:component
              this={profileSocialComponent}
              profileId={targetProfile.id}
              username={username}
              isOwnProfile={false}
              isAuthenticated={$isAuthenticated}
              social={social}
              settings={socialSettings}
              socialDepthEnabled={socialDepthEnabled}
              on:socialchange={handleSocialChange}
            />
          {/if}
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
  .profile-shell__identity-loading { min-height: 20rem; border-radius: var(--radius-md, 1rem); background: color-mix(in srgb, var(--profile-surface, #11141b) 70%, transparent); }

  .profile-shell-page--roll-rolling .profile-shell__opening.profile-shell__approved-opening {
    border-color: var(--color-line-strong);
    box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.08), 0 1.5rem 4rem rgba(0, 0, 0, 0.2);
  }

  .profile-shell-page--roll-settled .profile-shell__opening.profile-shell__approved-opening {
    animation: none;
  }

  .profile-shell-page--roll-settled .profile-shell__card-scale {
    animation: profile-shell-roll-settle 1.05s var(--motion-ease-emphasis);
  }

  @keyframes profile-shell-roll-settle {
    0% { transform: scale(0.997); box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.08), 0 1.5rem 4rem rgba(0, 0, 0, 0.2); }
    42% { transform: scale(1.002); box-shadow: 0 0 0 1px rgba(241, 243, 237, 0.14), 0 0 3rem rgba(0, 0, 0, 0.26); }
    100% { transform: scale(1); box-shadow: none; }
  }

  .profile-shell__rich-banner { display: block; width: 100%; max-height: 13rem; object-fit: cover; border-radius: var(--radius-lg) var(--radius-lg) 0 0; opacity: .94; }
  .profile-shell-page--rich-pointer :global(a),
  .profile-shell-page--rich-pointer :global(button),
  .profile-shell-page--rich-pointer :global([role="button"]) { cursor: var(--profile-pointer-cursor), pointer; }
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

  .profile-shell__supporting-region { min-width: 0; }
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
  .profile-shell__links--navigation .profile-shell__link { grid-template-columns: minmax(0, 1fr); }
  .profile-shell__link { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-3); min-width: 0; padding: var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); color: var(--color-ink); text-decoration: none; transition: transform var(--motion-fast) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard); }
  .profile-shell__links--social { display: flex; flex-wrap: wrap; justify-content: center; gap: .35rem; }
  .profile-shell__link--social { display: grid; width: 2.5rem; height: 2.5rem; min-height: 2.5rem; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; }
  .profile-shell__link--social:hover { transform: none; background: color-mix(in srgb, var(--profile-accent) 12%, transparent); }
  .profile-shell__link--social .profile-shell__link-glyph { display: grid; width: 1.22rem; height: 1.22rem; place-items: center; }
  .profile-shell__link--social .profile-shell__link-glyph img { display: block; width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); opacity: .78; }
  .profile-shell__link--social .profile-shell__link-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .profile-shell__link:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--profile-accent) 55%, var(--color-line-subtle)); background: color-mix(in srgb, var(--profile-accent) 8%, var(--surface-inset)); }
  .profile-shell__link:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-shell__link-copy { display: grid; min-width: 0; gap: .2rem; }
  .profile-shell__link-copy strong { min-width: 0; overflow-wrap: anywhere; font-size: .92rem; }
  .profile-shell__link-copy small { min-width: 0; overflow: hidden; color: var(--color-ink-muted); font-size: .78rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }

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
  @media (max-width: 48rem) {
    .profile-shell__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-shell__details-grid :global(.foundation-module),
    .profile-shell__details-grid :global(.foundation-module--wide) { grid-column: 1 / -1; }
    .profile-shell__story-heading { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__story-heading > span { text-align: left; }
  }

  @media (max-width: 36rem) {
    .profile-shell__rank-row { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
    .profile-shell__rank-track { width: 100%; }
    .profile-shell__rank-next { font-size: 0.625rem; }
    .profile-shell__best-roll { grid-template-columns: 5.5rem 1fr; gap: var(--space-3); }
    .profile-shell__best-color { min-height: 5.5rem; }
    .profile-shell__story-heading h3 { font-size: var(--type-h3); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-shell__action,
    .profile-shell__rank-track span,
    .profile-shell__link,
    .profile-shell__story-progress span { transition-duration: 0.001ms; }
    .profile-shell__action:hover:not(:disabled) { transform: none; }
    .profile-shell__link:hover { transform: none; }
  }
  /* Profile composition: one color field, one identity surface. */
  .profile-shell-page {
    --profile-viewport-offset: 0px;
    min-height: 100dvh;
    height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0 clamp(0.9rem, 3vw, 2.5rem) 1.5rem;
    background: var(--profile-background-paint, var(--color-canvas-deep));
    isolation: isolate;
    overscroll-behavior-y: contain;
    scroll-snap-type: y proximity;
    scroll-padding-block: 0;
  }

  .profile-shell__story-section,
  .profile-shell__social-section {
    position: relative;
    z-index: 2;
    width: min(100%, 52rem);
    margin-inline: auto;
  }

  .profile-shell__story-section {
    margin-top: 1rem;
    border-top: 1px solid var(--color-line-subtle);
  }

  .profile-shell__social-section { margin-top: var(--space-6); }

  .profile-shell__approved-canvas {
    position: relative;
    z-index: 1;
    display: block;
    min-height: calc(100dvh - var(--profile-viewport-offset, 0px));
    padding: 0;
    scroll-snap-align: start;
    scroll-snap-stop: normal;
  }

  .profile-shell__approved-main {
    position: relative;
    display: flex;
    height: calc(100dvh - var(--profile-viewport-offset, 0px));
    min-height: calc(100dvh - var(--profile-viewport-offset, 0px));
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
  .profile-shell__more-cue--continuation {
    width: auto;
    height: auto;
    min-height: 1.75rem;
    gap: .3rem;
    padding: .25rem .45rem;
    border: 0;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--color-canvas-deep) 42%, transparent);
    box-shadow: none;
    color: color-mix(in srgb, var(--profile-control-accent) 72%, var(--color-ink-muted));
    font: 600 .62rem / 1 var(--font-mono-stack);
    letter-spacing: .08em;
    text-transform: lowercase;
  }
  .profile-shell__more-cue--continuation .profile-shell__more-cue-label {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
    clip-path: none;
    white-space: normal;
  }
  .profile-shell__more-cue--continuation .profile-shell__more-cue-arrow { font-size: .9rem; }
  .profile-shell__more-cue--continuation:hover { background: color-mix(in srgb, var(--profile-control-accent) 9%, transparent); transform: translate(-50%, .15rem); }
  .profile-shell__more {
    position: relative;
    display: flex;
    min-height: calc(100dvh - var(--profile-viewport-offset, 0px));
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: clamp(4rem, 12vh, 8rem) 0 clamp(4rem, 10vh, 7rem);
    scroll-snap-align: start;
    scroll-snap-stop: normal;
  }

  .profile-shell__continuation-column {
    display: grid;
    width: min(100%, 52rem);
    min-width: 0;
    margin-inline: auto;
    gap: clamp(1.15rem, 2.8vw, 1.8rem);
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

  .profile-shell__motion-target,
  .profile-shell__card-scale { width: 100%; min-width: 0; }
  .profile-shell__card-scale { transform-origin: center; }

  .profile-shell__approved-game,
  .profile-shell__approved-featured { min-width: 0; }

  .profile-shell__approved-game {
    width: 100%;
    margin-top: clamp(1.5rem, 4vw, 2.5rem);
    padding: 1.25rem 0.5rem 0;
    border-top: 1px solid color-mix(in srgb, var(--profile-control-accent) 24%, var(--color-line-subtle));
  }

  .profile-shell__more .profile-shell__approved-game {
    margin-top: 0;
  }

  .profile-shell__more .profile-shell__approved-game :global(.today-color) {
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem 1.5rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-shell__approved-game :global(.profile-roll--integrated) {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .profile-shell__approved-game :global(.profile-roll--integrated .foundation-module__body) { padding: 0; }

  .profile-shell__approved-featured {
    width: 100%;
    margin-top: 0;
    padding: 0;
  }

  .profile-shell__approved-supporting {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .profile-shell__approved-supporting .profile-shell__supporting-region--expression {
    width: 100%;
    padding: 0;
    border: 0;
  }

  .profile-shell__continuation-links {
    position: relative;
    z-index: 2;
    display: grid;
    gap: .8rem;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .profile-shell__continuation-heading {
    margin: 0 0 .65rem;
    color: var(--color-ink-strong);
    font: 600 clamp(1.2rem, 2.5vw, 1.45rem) / 1.15 var(--font-display-stack);
    letter-spacing: -.025em;
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

  @media (max-width: 36rem) {
    .profile-shell-page { height: 100dvh; min-height: 100dvh; padding-inline: 1.5rem; padding-bottom: 0; }
    .profile-shell__approved-canvas { display: block; min-height: 100dvh; padding: 0; }
    .profile-shell__approved-main { width: 100%; flex: 0 0 auto; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: stretch; }
    .profile-shell__approved-main { height: 100dvh; min-height: 100dvh; }
    .profile-shell__more-cue { bottom: 1rem; }
    .profile-shell__more { min-height: 100dvh; padding-block: 4rem; }
    .profile-shell__approved-game { margin-top: 1.75rem; padding-inline: 0.25rem; }
    .profile-shell__approved-featured { margin-top: 1.25rem; padding-inline: 0.25rem; }
    .profile-shell__approved-supporting { margin-top: clamp(3rem, 8vh, 4.5rem); }
    .profile-shell-page .profile-shell__story-section { margin-top: 0.75rem; }
  }

  @media (min-width: 36.01rem) and (max-height: 47.5rem) {
    .profile-shell__approved-canvas { display: flex; flex-direction: column; min-height: 0; padding: 1.25rem 0 1.25rem; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: center; }
    .profile-shell-page :global(.profile-shell__approved-featured) { margin-top: 1.25rem; }
    .profile-shell__approved-supporting { margin-top: 1.5rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-shell-page--roll-settled .profile-shell__opening.profile-shell__approved-opening {
      animation: none;
    }
    .profile-shell-page--roll-settled .profile-shell__card-scale { animation: none; }
  }

  /* Compact is the default reference-card surface. Immersive is the only
     alternate composition; both remain objects placed into the environment. */
  .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening { width: min(350px, calc(100% - 1rem)); }
  .profile-shell-page--full-bleed .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 74rem); }

  .profile-shell-page--compact .profile-shell__approved-main,
  .profile-shell-page--full-bleed .profile-shell__approved-main { justify-content: center; }

  .profile-shell-page--compact .profile-shell__more { min-height: 0; justify-content: flex-start; padding: 2.5rem 0 4rem; }
  .profile-shell-page--compact .profile-shell__more-back { display: none; }
  .profile-shell-page--full-bleed .profile-shell__more { align-items: center; }

  .profile-shell-page--preview .profile-shell__opening.profile-shell__approved-opening { width: 100%; }
  .profile-shell-page--preview :global(.profile-daily-roll) { box-sizing: border-box; }

  @media (max-width: 36rem) {
    .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--full-bleed .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 100%); }
  }

  /* Device context wins over browser-width rules. This is intentionally last
     so a real narrow browser cannot undo the mobile composition requested by
     the Studio preview. */
  .profile-shell-page--preview {
    height: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;
    scroll-snap-type: none;
    background: transparent;
  }

  .profile-shell-page--preview .profile-shell__approved-canvas,
  .profile-shell-page--preview .profile-shell__approved-main {
    width: 100%;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
  }

  .profile-shell-page--preview .profile-shell__approved-canvas { padding: 0; }

  .profile-shell-page--preview .profile-shell__approved-main {
    align-items: center;
    justify-content: flex-start;
  }

  .profile-shell-page--preview .profile-shell__opening.profile-shell__approved-opening {
    margin-block: auto;
  }

  /* Device context wins over browser-width rules. Keep the mobile stage
     scrollable for rich profiles without restoring desktop stacking rules. */
  .profile-shell-page--preview-mobile,
  .profile-shell-page--preview-mobile .profile-shell__approved-main,
  .profile-shell-page--preview-mobile .profile-shell__approved-canvas,
  .profile-shell-page--preview-mobile .profile-shell__approved-opening {
    width: 100%;
    min-width: 0;
  }
  .profile-shell-page--preview-mobile { overflow-y: auto; }
  .profile-shell-page--preview-mobile .profile-shell__approved-canvas,
  .profile-shell-page--preview-mobile .profile-shell__approved-main {
    height: 100%;
    min-height: 100%;
  }
  .profile-shell-page--preview-mobile .profile-shell__approved-main {
    align-items: stretch;
    justify-content: flex-start;
  }
  .profile-shell-page--preview-mobile .profile-shell__opening.profile-shell__approved-opening {
    margin-block: auto;
  }

  /* Profile-wide typography is an explicit owner choice. Keep the override
     scoped to the public/profile render tree so site chrome and Studio
     controls retain their own typography contracts. */
  .profile-shell-page--profile-wide-name-font,
  .profile-shell-page--profile-wide-name-font :global(*) {
    font-family: var(--profile-font-family) !important;
  }
</style>
