<script>
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
  import { authUser, followedUsers, isAuthenticated, profile, session, toggleFollow } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData';
  import { isOwnProfileTarget } from './profileContract';
  import { normalizeHexColor } from './utils';
  import Surface from './foundation/Surface.svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
  import ProfileMotionEffect from './profile-motion/ProfileMotionEffect.svelte';
  import ProfileFullBleedLayout from './profile-layout/ProfileFullBleedLayout.svelte';
  import ProfilePortfolioLayout from './profile-layout/ProfilePortfolioLayout.svelte';
  import ProfileGameProgressPage from './profile-layout/ProfileGameProgressPage.svelte';
  import { getProfilePages } from './profile-layout/profilePages.js';
  import ProfileMusic from './ProfileMusic.svelte';
  import { trackProductEvent } from './productAnalytics.js';
  import { recordPublicProfileView } from './profileViewAnalytics.js';
  import { recordProfileInsightEvent } from './profileInsightAnalytics.js';
  import ProfileEnvironmentLayer from './ProfileEnvironmentLayer.svelte';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { isProfileFeatureEnabled, resolveProfileFeatureFlags } from './profileFeatureFlags.js';
  import { buildProfileRenderSnapshot } from './profileRenderModel.js';
  import { createProfileShellPreviewState, resolveProfileShellPreviewContext } from './profileShellPreview.js';
import { getProfileLayoutMotionTarget } from './profile-layout/profileLayouts.js';
import { requestNameFontLoad } from './name/nameFonts.js';
import { normalizeProfileProgressionProof } from './profileStory.js';

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

  const dispatch = createEventDispatcher();

  const profileShellStyle = '--profile-accent: var(--color-accent-roll); --profile-surface-accent: var(--color-accent-cyan); --profile-control-accent: var(--color-accent);';
  let targetProfile = null;
  let targetScores = [];
  let timelineEvents = [];
  let collectionItems = [];
  let progressionProof = { completedCount: 0, recentUnlocks: [] };
  let profileConfig = null;
  let social = createEmptyProfileSocial();
  let socialSettings = createDefaultProfileSocialSettings();
  let allAchievements = [];
  let loading = true;
  let loadError = '';
  let loadRequestId = 0;
  let activeProfileKey = null;
  let activeProfilePage = 0;
  let trackedProfileViewKey = null;
  let followLoading = false;
  let refreshing = false;
  let profilePageElement;
  let prefersReducedMotion = false;
  let profileReferenceCardComponent = null;
  let profileReferenceCardRequest = null;
  let profileWideFontRequestKey = '';
  let profileSocialComponent = null;
  let profileSocialRequest = null;
  let indexingMetadataKey = '';
  let profilePageScrollControllerCleanup = null;
  let profilePageScrollControllerPromise = null;
  let profileShellDestroyed = false;
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

  function ensureProfileSocial() {
    if (profileSocialComponent || profileSocialRequest) return profileSocialRequest;
    profileSocialRequest = import('./ProfileSocial.svelte')
      .then(module => { profileSocialComponent = module.default; })
      .catch(() => { profileSocialComponent = null; })
      .finally(() => { profileSocialRequest = null; });
    return profileSocialRequest;
  }

  function ensureProfilePageScrollController() {
    if (profilePageScrollControllerCleanup || profilePageScrollControllerPromise) return profilePageScrollControllerPromise;
    profilePageScrollControllerPromise = import('./profile-layout/profilePageScrollController.js')
      .then(module => {
        if (profileShellDestroyed || !profilePageElement) return;
        profilePageScrollControllerCleanup = module.attachProfilePageScrollController({
          container: profilePageElement,
          isPageScrollEnabled: () => hasProfileProgressPage && !previewMode,
          getReducedMotion: () => prefersReducedMotion,
          getActiveProfilePage: () => activeProfilePage,
          onActiveProfilePageChange: index => { activeProfilePage = index; },
          scrollToProfilePage
        });
      })
      .catch(() => {})
      .finally(() => { profilePageScrollControllerPromise = null; });
    return profilePageScrollControllerPromise;
  }

  function resetShellState(nextLoading = false) {
    targetProfile = null;
    targetScores = [];
    timelineEvents = [];
    collectionItems = [];
    progressionProof = { completedCount: 0, recentUnlocks: [] };
    profileConfig = null;
    social = createEmptyProfileSocial();
    socialSettings = createDefaultProfileSocialSettings();
    allAchievements = [];
    activeProfilePage = 0;
    profilePageElement?.scrollTo({ top: 0, behavior: 'auto' });
    loading = nextLoading;
    loadError = '';
    indexingMetadataKey = '';
  }

  function syncProfileData() {
    if (previewMode) {
      // Configuration changes are ordinary editor updates. Keep the live
      // preview shell mounted so sliders, media and cosmetics do not reset
      // roll/social state or timers on every keystroke. Only a change to the
      // preview's identity/data context warrants a full reconstruction.
      const previewContext = resolveProfileShellPreviewContext({
        previewProfile,
        previewProfileConfig,
        profileRenderSnapshot,
        previewScores,
        previewTimelineEvents,
        previewCollectionItems,
        previewAllAchievements
      });
      if (!previewContext.sourceProfile) {
        if (previewContext.key !== activeProfileKey) {
          activeProfileKey = previewContext.key;
          loadRequestId += 1;
          resetShellState(true);
        }
        return;
      }
      if (previewContext.key !== activeProfileKey) {
        activeProfileKey = previewContext.key;
        loadRequestId += 1;
        resetShellState(false);
        const previewState = createProfileShellPreviewState({
          sourceProfile: previewContext.sourceProfile,
          configuration: previewContext.configuration,
          previewScores,
          previewTimelineEvents,
          previewCollectionItems,
          previewAllAchievements
        });
        targetProfile = previewState.targetProfile;
        targetScores = previewState.targetScores;
        timelineEvents = previewState.timelineEvents;
        collectionItems = previewState.collectionItems;
        progressionProof = previewState.progressionProof;
        profileConfig = previewState.profileConfig;
        social = previewState.social;
        socialSettings = previewState.socialSettings;
        allAchievements = previewState.allAchievements;
        loading = previewState.loading;
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
    return () => {
      profileShellDestroyed = true;
      loadRequestId += 1;
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('pageshow', refreshOnReturn);
      profilePageScrollControllerCleanup?.();
      motionQuery?.removeEventListener?.('change', syncMotionPreference);
    };
  });

  async function loadProfileData() {
    if (previewMode) return;
    const requestId = ++loadRequestId;
    const currentUsername = $profile?.username || $authUser?.user_metadata?.username || '';
    const context = await loadProfileContext({
      supabaseClient: supabase,
      // Reuse account hydration on mount; return-to-tab refresh still reads fresh identity.
      profileRecord: targetProfile ? null : $profile,
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
    progressionProof = normalizeProfileProgressionProof(context.progressionProof);
    profileConfig = context.profileConfig;
    social = context.social;
    socialSettings = context.socialSettings;
    allAchievements = context.allAchievements;
    loadError = context.loadError;
    loading = false;

    const indexingKey = `${activeProfileKey}:${targetProfile?.id || ''}:${targetProfile?.discoverable === true}`;
    if (indexingMetadataKey !== indexingKey) {
      indexingMetadataKey = indexingKey;
      dispatch('metadata', { robots: targetProfile?.discoverable === true ? 'index,follow' : 'noindex,follow' });
    }

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

  function recordProfileClick(entryKey) {
    if (previewMode || isOwnProfile || !targetProfile?.username || !entryKey || !expandedAnalyticsEnabled) return;
    void recordProfileInsightEvent({
      profileUsername: targetProfile.username,
      metric: 'click',
      entryKey
    });
  }

  function scrollToProfilePage(index) {
    if (!profilePageElement || !hasProfileProgressPage) return;
    const page = profilePageElement.querySelectorAll('[data-profile-page]')[index];
    if (!page) return;
    activeProfilePage = index;
    const top = page.getBoundingClientRect().top
      - profilePageElement.getBoundingClientRect().top
      + profilePageElement.scrollTop;
    profilePageElement.scrollTo({
      top,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  function scrollToProfileMore() {
    scrollToProfilePage(1);
  }

  function scrollToProfileHero() {
    scrollToProfilePage(0);
  }

  function handleProfilePageKeydown(event) {
    if (!hasProfileProgressPage || previewMode || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target?.closest?.('button, a, input, select, textarea, [contenteditable="true"]')) return;
    let nextIndex = activeProfilePage;
    if (['ArrowDown', 'PageDown', ' '].includes(event.key) && activeProfilePage < profilePages.length - 1) nextIndex += 1;
    else if (['ArrowUp', 'PageUp'].includes(event.key) && activeProfilePage > 0) nextIndex -= 1;
    else return;
    event.preventDefault();
    scrollToProfilePage(nextIndex);
  }

  async function handleFollow() {
    if (previewMode || !targetProfile?.id || followLoading) return;
    followLoading = true;
    try {
      await toggleFollow(targetProfile.id);
    } finally {
      followLoading = false;
    }
  }

  async function handleSocialChange() {
    await loadProfileData();
  }

  function colorFor(value, fallback = '#8B7CF6') {
    return normalizeHexColor(value, fallback);
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
    progressionProof,
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
  $: staticAvatarSrc = profileRenderSnapshot?.media?.avatarUrl || '';
  $: animatedAvatarSrc = profileRenderSnapshot?.media?.animatedAvatarUrl || '';
  $: avatarSrc = !prefersReducedMotion && animatedAvatarSrc ? animatedAvatarSrc : staticAvatarSrc;
  $: audioSrc = profileRenderSnapshot?.media?.audioUrl || '';
  $: pointerCursorSrc = profileRenderSnapshot?.environment?.pointerCursorUrl || '';
  $: richAudioPlaylist = profileRenderSnapshot?.media?.playlist || { tracks: [] };
  $: hasHostedAudio = Boolean(audioSrc || richAudioPlaylist.tracks?.length);
  $: layoutVariant = profileRenderSnapshot?.layout?.variant || 'compact';
  $: openingLinks = profileRenderSnapshot?.links?.opening || [];
  $: showRoll = profileRenderSnapshot?.roll?.show === true;
  $: hasProfileProgressPage = profileRenderSnapshot?.visibility?.hasProgressPage === true;
  $: renderProfileProgressPage = profileRenderSnapshot?.visibility?.renderProgressPage === true;
  $: profilePages = getProfilePages({ hasProgressPage: hasProfileProgressPage });
  $: isFollowed = Boolean(targetProfile?.id && $followedUsers.includes(targetProfile.id));
  $: recentScores = profileRenderSnapshot?.story?.recentScores || [];
  $: nameRendererRecentColors = profileRenderSnapshot?.colors?.nameRecent || [];
  // Layout is structure only. Keep the default class off the renderer so a
  // new Compact profile never receives a baked-in starfield or color theme.
  $: profilePresentationLayoutVariant = layoutVariant;
  $: if (hasProfileProgressPage && profilePageElement) void ensureProfilePageScrollController();
  // The roll is a profile widget in every layout. The full interactive game
  // stays on the authenticated game surface; public profiles only expose the
  // compact, shareable result summary.
  const profileCardKeepsRollInline = true;
  $: profileMotionKey = profileRenderSnapshot?.cosmetics?.profileMotionKey || '';
  $: profileMotionTarget = getProfileLayoutMotionTarget(profilePresentationLayoutVariant);
  $: profileCardStyle = profileRenderSnapshot?.surface?.style || '';
  $: profilePageStyle = `${profileShellStyle};${profileRenderSnapshot?.styles?.page || ''};--profile-text:${appearance.colors.text}`;

</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- Focusable only when the optional paginated profile is enabled so keyboard users can use PageUp/PageDown and arrow keys. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main bind:this={profilePageElement} class={'profile-shell-page profile-shell-page--' + profilePresentationLayoutVariant + (hasProfileProgressPage && !previewMode ? ' profile-shell-page--progress-enabled' : '') + (profileWideNameFontEnabled ? ' profile-shell-page--profile-wide-name-font' : '') + (previewMode ? ' profile-shell-page--preview' : '') + (previewMode && previewDevice === 'mobile' ? ' profile-shell-page--preview-mobile' : '') + (pointerCursorSrc ? ' profile-shell-page--rich-pointer' : '') + ' foundation-page'} style={profilePageStyle} data-profile-render-model="v1" data-profile-layout={profilePresentationLayoutVariant} data-profile-page-count={profilePages.length} data-profile-render-mode={profileRenderSnapshot?.mode || (previewMode ? 'studio' : 'public')} aria-busy={loading} tabindex={hasProfileProgressPage && !previewMode ? 0 : undefined} on:keydown={handleProfilePageKeydown}>
  {#if renderEnvironment}
    <ProfileEnvironmentLayer snapshot={profileRenderSnapshot} mode={previewMode ? 'preview' : 'public'} reducedMotion={prefersReducedMotion} />
  {/if}
  {#if hasProfileProgressPage && !previewMode}
    <nav class="profile-shell__page-pagination" aria-label="Profile pages">
      {#each profilePages as page, index (page.key)}
        <button
          type="button"
          class:active={activeProfilePage === index}
          aria-label={`Go to ${page.label} page`}
          aria-current={activeProfilePage === index ? 'page' : undefined}
          on:click={() => scrollToProfilePage(index)}
        >
          <span aria-hidden="true"></span>
        </button>
      {/each}
    </nav>
  {/if}
  {#if !loading && targetProfile}
    {#if hasHostedAudio}
      <ProfileMusic
        bestRoll={latestRoll || displayBestRoll}
        accentColor={profileControlAccent}
        colorEffectsEnabled={colorEffectsEnabled}
        audioSrc={audioSrc}
        audioPlaylist={richAudioPlaylist}
        deferMedia={previewMode}
        reducedMotion={prefersReducedMotion}
      />
    {/if}
    <div class="profile-shell__composition">
    <div class="profile-shell__approved-canvas">
      <div class="profile-shell__approved-main" data-profile-page="hero">
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
              {#if profilePresentationLayoutVariant === 'portfolio'}
                <ProfilePortfolioLayout
                  displayName={profileDisplayName}
                  bio={profileBio}
                  avatarSrc={avatarSrc}
                  avatarFallbackSrc={staticAvatarSrc}
                  bannerSrc={profileRenderSnapshot?.media?.bannerUrl || ''}
                  avatarEffectKey={cosmetics?.avatar_effect}
                  nameLoadout={nameRendererLoadout}
                  nameTodayColor={nameRendererTodayColor}
                  nameBaseColor={nameRendererBaseColor}
                  nameRecentColors={nameRendererRecentColors}
                  profileBorderKey={cosmetics?.profile_border}
                  surfaceStyle={profileCardStyle}
                  location={identityPresentation.location}
                  timezone={identityPresentation.timezone}
                  joinedLabel={joinedLabel}
                  showJoinDate={identityPresentation.showJoinDate}
                  showAvatar={identityPresentation.showAvatar}
                  descriptionMode={identityPresentation.descriptionMode}
                  entryAnimation={prefersReducedMotion ? 'none' : identityPresentation.entryAnimation}
                  links={openingLinks}
                  linkStyle={effectiveProfileConfig.linkStyle}
                  roll={showRoll && !refreshing ? latestRoll : null}
                  accentColor={signatureColor}
                  onEntryClick={recordProfileClick}
                />
              {:else if ['full-bleed', 'sleek'].includes(profilePresentationLayoutVariant)}
                <ProfileFullBleedLayout
                  displayName={profileDisplayName}
                  bio={profileBio}
                  avatarSrc={avatarSrc}
                  avatarFallbackSrc={staticAvatarSrc}
                  bannerSrc={profileRenderSnapshot?.media?.bannerUrl || ''}
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
                  linkStyle={effectiveProfileConfig.linkStyle}
                  accentColor={signatureColor}
                  roll={showRoll && !refreshing ? latestRoll : null}
                  surfaceStyle={profileCardStyle}
                  layoutVariant={profilePresentationLayoutVariant}
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
                    avatarFallbackSrc={staticAvatarSrc}
                    bannerSrc={profileRenderSnapshot?.media?.bannerUrl || ''}
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
                    roll={showRoll && !refreshing && profileCardKeepsRollInline ? latestRoll : null}
                    accentColor={signatureColor}
                    audioAvailable={hasHostedAudio}
                    audioStatus="▶"
                    rollLabel="Daily roll"
                    presentation="profile"
                    layoutVariant={profilePresentationLayoutVariant}
                    ariaLabel={`${profileDisplayName} profile`}
                    onEntryClick={recordProfileClick}
                  />
                {:else}
                  <div class="profile-shell__identity-loading" aria-busy="true" aria-label="Profile card pending"></div>
                {/if}
              {/if}
              {/key}
            </div>
          </ProfileMotionEffect>
        </div>

      {#if !previewMode && hasProfileProgressPage && activeProfilePage === 0}
        <button type="button" class="profile-shell__more-cue profile-shell__more-cue--continuation" aria-label="Scroll to game progress page" aria-controls="profile-more" on:click={scrollToProfileMore}>
          <svg class="profile-page-arrow" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path d="M13 2h6v13.17l5.59-5.58 4.24 4.24L16 26.66 3.17 13.83l4.24-4.24 5.59 5.58V2z" />
          </svg>
        </button>
      {/if}
      </div>

    </div>

    {#if renderProfileProgressPage}
      <div id="profile-more" class="profile-shell__more profile-shell__more--progress">
        <div class="profile-shell__continuation-column">
          <ProfileGameProgressPage
            username={username}
            displayName={profileDisplayName}
            profile={renderProfile}
            accentColor={signatureColor}
            surfaceStyle={profileCardStyle}
            profileBorderKey={cosmetics?.profile_border}
            bestRoll={displayBestRoll}
            recentScores={recentScores}
            rank={rank}
            rankState={rankState}
            prefersReducedMotion={prefersReducedMotion}
            {previewMode}
            onReturn={scrollToProfileHero}
          />
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

  .profile-shell__rich-banner { display: block; width: 100%; max-height: 13rem; object-fit: cover; border-radius: var(--radius-lg) var(--radius-lg) 0 0; opacity: .94; }
  .profile-shell-page--rich-pointer :global(a),
  .profile-shell-page--rich-pointer :global(button),
  .profile-shell-page--rich-pointer :global([role="button"]) { cursor: var(--profile-pointer-cursor), pointer; }
  .profile-shell__action { display: inline-flex; align-items: center; justify-content: center; min-height: 2.35rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-4); color: var(--color-ink-strong); font: 600 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard); }
  .profile-shell__action:hover:not(:disabled) { transform: translateY(-2px); }
  .profile-shell__action:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-shell__action:disabled { cursor: wait; opacity: 0.6; }
  .profile-shell__action--primary { background: var(--color-ink-strong); color: var(--color-canvas-deep); }
  .profile-shell__action--secondary { border-color: color-mix(in srgb, var(--profile-control-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-control-accent) 14%, transparent); color: var(--color-accent-bright); }

  .profile-shell-state { width: min(100%, 42rem); margin: clamp(var(--space-8), 12vh, var(--space-20)) auto; }
  .profile-shell-state h1 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h1) / var(--type-line-tight) var(--font-display-stack); }
  .profile-shell-state p:not(.profile-shell-state__eyebrow) { color: var(--color-ink-muted); line-height: 1.6; }
  .profile-shell-state__eyebrow { margin: 0 0 var(--space-3); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  @media (prefers-reduced-motion: reduce) {
    .profile-shell__action { transition-duration: 0.001ms; }
    .profile-shell__action:hover:not(:disabled) { transform: none; }
    .profile-shell__more-cue { transition: none; }
    .profile-shell__more-cue:hover { transform: translateX(-50%); }
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

  .profile-shell-page:focus-visible { outline: 2px solid color-mix(in srgb, var(--profile-control-accent) 60%, transparent); outline-offset: -4px; }

  .profile-shell__social-section {
    position: relative;
    z-index: 2;
    width: min(100%, 52rem);
    margin-inline: auto;
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

  .profile-shell__page-pagination {
    position: fixed;
    z-index: 5;
    top: 50%;
    right: clamp(.7rem, 2.2vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: .62rem;
    margin: 0;
    padding: .35rem;
    transform: translateY(-50%);
  }

  .profile-shell__page-pagination button {
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
  }

  .profile-shell__page-pagination button span {
    display: block;
    width: .42rem;
    height: .42rem;
    border: 1px solid color-mix(in srgb, var(--profile-control-accent) 56%, var(--color-ink-muted));
    border-radius: 50%;
    background: color-mix(in srgb, var(--profile-control-accent) 24%, transparent);
    opacity: .72;
    transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease;
  }

  .profile-shell__page-pagination button:hover span,
  .profile-shell__page-pagination button:focus-visible span,
  .profile-shell__page-pagination button.active span {
    border-color: var(--profile-control-accent);
    background: var(--profile-control-accent);
    opacity: 1;
  }

  .profile-shell__page-pagination button.active span { transform: scale(1.45); }
  .profile-shell__page-pagination button:focus-visible { outline: 2px solid var(--profile-control-accent); outline-offset: 2px; }

  .profile-shell__more-cue {
    position: absolute;
    left: 50%;
    bottom: 1.25rem;
    display: grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-ink-strong, #fff);
    cursor: pointer;
    transform: translateX(-50%);
    transition: transform 160ms ease;
  }

  .profile-shell__more-cue:hover { transform: translate(-50%, -.16rem); }
  .profile-shell__more-cue:focus-visible { outline: 2px solid #fff; outline-offset: 2px; border-radius: .35rem; box-shadow: 0 0 0 1px #090a0d; }
  /* The light fill, dark edge, and opposite-color halo stay visible over
     owner-selected solid colors, gradients, and background media. */
  :global(.profile-page-arrow) {
    display: block;
    width: 2.55rem;
    height: 2.55rem;
    fill: #fff;
    stroke: #090a0d;
    stroke-width: 1.35;
    stroke-linejoin: round;
    paint-order: stroke fill;
    filter: drop-shadow(0 0 2px #090a0d) drop-shadow(0 0 4px rgba(255, 255, 255, .72));
  }
  :global(.profile-page-arrow--up) { transform: rotate(180deg); }
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

  /* Layout frames own the relationship between identity and expression. */
  .profile-shell__composition { display:contents; min-width:0; }
  .profile-shell__approved-canvas,
  .profile-shell__opening.profile-shell__approved-opening { z-index: auto; }

  .profile-shell__approved-canvas,
  .profile-shell__approved-main,
  .profile-shell__more,
  .profile-shell__approved-opening { min-width:0; max-width:100%; }

  @media (max-width: 36rem) {
    .profile-shell-page { height: 100dvh; min-height: 100dvh; padding-inline: 1.5rem; padding-bottom: 0; }
    .profile-shell__approved-canvas { display: block; min-height: 100dvh; padding: 0; }
    .profile-shell__approved-main { width: 100%; flex: 0 0 auto; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: stretch; }
    .profile-shell__approved-main { height: 100dvh; min-height: 100dvh; }
    .profile-shell__more-cue { bottom: 1rem; }
    .profile-shell__more { min-height: 100dvh; padding-block: 4rem; }
  }

  @media (min-width: 36.01rem) and (max-height: 47.5rem) {
    .profile-shell__approved-canvas { display: flex; flex-direction: column; min-height: 0; padding: 1.25rem 0 1.25rem; }
    .profile-shell__opening.profile-shell__approved-opening { align-self: center; }
  }


  /* Default is the banner-led reference card. Simplistic, Sleek, Modern, and
     Portfolio are distinct compositions that still share the same environment
     and safe profile data contract. */
  .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening { width: min(52rem, calc(100% - 2rem)); }
  .profile-shell-page--full-bleed .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 74rem); }
  .profile-shell-page--sleek .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 40rem); }
  .profile-shell-page--framed .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 44rem); }
  .profile-shell-page--portfolio .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 74rem); }

  .profile-shell-page--compact .profile-shell__approved-main,
  .profile-shell-page--full-bleed .profile-shell__approved-main,
  .profile-shell-page--sleek .profile-shell__approved-main,
  .profile-shell-page--framed .profile-shell__approved-main { justify-content: center; }

  .profile-shell-page--portfolio .profile-shell__approved-canvas { display: contents; min-height: 0; }
  .profile-shell-page--portfolio .profile-shell__more { display: block; min-height: 0; padding: 0; scroll-snap-align: none; scroll-snap-stop: normal; }
  .profile-shell-page--portfolio .profile-shell__continuation-column { display: contents; width: 100%; }

  .profile-shell-page--progress-enabled { scroll-snap-type: y mandatory; }
  .profile-shell-page--progress-enabled .profile-shell__approved-canvas { display: contents; min-height: 0; }
  .profile-shell-page--progress-enabled .profile-shell__approved-main { height: 100dvh; min-height: 100dvh; scroll-snap-align: start; scroll-snap-stop: always; }
  .profile-shell-page--progress-enabled .profile-shell__more { display: block; min-height: 0; padding: 0; scroll-snap-align: none; scroll-snap-stop: normal; }
  .profile-shell-page--progress-enabled .profile-shell__continuation-column { display: contents; width: 100%; }
  .profile-shell__social-section { scroll-snap-align: start; scroll-snap-stop: normal; }

  .profile-shell-page--compact .profile-shell__more { min-height: 0; justify-content: flex-start; padding: 2.5rem 0 4rem; }
  .profile-shell-page--full-bleed .profile-shell__more,
  .profile-shell-page--framed .profile-shell__more { align-items: center; }

  .profile-shell-page--progress-enabled .profile-shell__more { align-items: stretch; }

  .profile-shell-page--preview .profile-shell__opening.profile-shell__approved-opening { width: 100%; }
  .profile-shell-page--preview :global(.profile-daily-roll) { box-sizing: border-box; }
  .profile-shell-page--preview .profile-shell__more { min-height: 0; padding: 0; }

  @media (max-width: 36rem) {
    .profile-shell-page--compact { padding-inline: .9rem; }
    .profile-shell-page--compact .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--full-bleed .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--sleek .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--framed .profile-shell__opening.profile-shell__approved-opening,
    .profile-shell-page--portfolio .profile-shell__opening.profile-shell__approved-opening { width: min(100%, 100%); }
    .profile-shell__page-pagination { right: .35rem; }
  }

  /* A compact card is allowed to grow with its links and roll state on a
     phone. Keeping the public opening auto-sized prevents tall cards from
     being vertically centered into the viewport and clipping their first
     rows, while the Studio preview keeps its own device-stage sizing below. */
  @media (max-width: 36rem) {
    .profile-shell-page--compact:not(.profile-shell-page--preview) {
      height: auto;
      min-height: 100dvh;
    }

    .profile-shell-page--progress-enabled:not(.profile-shell-page--preview) {
      height: 100dvh;
      min-height: 100dvh;
      overflow-y: auto;
    }

    .profile-shell-page--compact:not(.profile-shell-page--preview) .profile-shell__approved-canvas {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    .profile-shell-page--progress-enabled:not(.profile-shell-page--preview) .profile-shell__approved-canvas {
      display: contents;
    }

    .profile-shell-page--compact:not(.profile-shell-page--preview) .profile-shell__approved-main {
      box-sizing: border-box;
      height: auto;
      min-height: 100dvh;
      justify-content: flex-start;
      padding: clamp(5rem, 18vh, 8rem) 0 4rem;
    }

    .profile-shell-page--compact:not(.profile-shell-page--preview) .profile-shell__opening.profile-shell__approved-opening {
      margin-inline: auto;
    }
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
