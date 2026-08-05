<script>
  import { onMount } from 'svelte';
  import { authUser, equippedItems, isAuthenticated, profile, refreshProfileState, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
  import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import IdentityEditor from './IdentityEditor.svelte';
  import ProfileExpressionEditor from './ProfileExpressionEditor.svelte';
  import ProfileCosmeticsEditor from './ProfileCosmeticsEditor.svelte';
  import ProfileStudioOverview from './ProfileStudioOverview.svelte';
  import ProfileProgression from './ProfileProgression.svelte';
  import ProfileEditor from './ProfileEditor.svelte';
  import ProfileSocial from './ProfileSocial.svelte';
  import ProfileSettingsPreview from './ProfileSettingsPreview.svelte';

  const SETTINGS_SECTIONS = Object.freeze([
    { id: 'overview', number: '01', label: 'Overview', description: 'Your living profile' },
    { id: 'identity', number: '02', label: 'Identity', description: 'Bio & presence' },
    { id: 'expression', number: '03', label: 'Expression', description: 'Avatar, backdrop & music' },
    { id: 'collection', number: '04', label: 'Collection', description: 'Owned expression' },
    { id: 'layout', number: '05', label: 'Layout & links', description: 'Your public canvas' },
    { id: 'social', number: '06', label: 'Privacy & social', description: 'Visitors & interactions' },
    { id: 'progression', number: '07', label: 'Progression', description: 'Rolls & milestones' }
  ]);

  function createInitialSettingsContext() {
    const currentProfile = { ...($profile || {}) };
    const fallbackColor = currentProfile.mood_color || '#8B7CF6';
    return {
      profileId: currentProfile.id || $session?.user?.id || null,
      viewingOwnProfile: true,
      targetProfile: currentProfile,
      targetScores: [],
      timelineEvents: [],
      collectionItems: [],
      profileConfig: {
        version: 1,
        draft: createDefaultProfileConfig(fallbackColor),
        published: createDefaultProfileConfig(fallbackColor)
      },
      social: createEmptyProfileSocial(),
      socialSettings: createDefaultProfileSocialSettings(),
      allAchievements: [],
      unlockedAchievements: {},
      totalRolls: Number(currentProfile.total_rolls) || 0,
      loadError: '',
      dataWarning: ''
    };
  }

  /** @type {any} */
  let context = createInitialSettingsContext();
  let loading = false;
  let error = '';
  let requestId = 0;
  let activeSection = 'overview';
  let configurationPreview = null;
  function getEquippedLayout(value) {
    return value && typeof value === 'object' && typeof value.profile_layout === 'string'
      ? value.profile_layout
      : '';
  }
  $: currentEquippedLayout = getEquippedLayout($equippedItems);

  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (accountKey) {
    void loadSettings();
  }
  $: profilePath = context?.targetProfile?.username
    ? getCanonicalProfilePath(context.targetProfile.username)
    : '/profile';
  $: activeSectionIndex = Math.max(0, SETTINGS_SECTIONS.findIndex(section => section.id === activeSection));
  $: previewProfileConfig = configurationPreview
    ? { ...(context?.profileConfig || {}), draft: configurationPreview }
    : context?.profileConfig;

  onMount(() => {
    const sectionAliases = { appearance: 'collection', account: 'progression' };
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      const sectionId = sectionAliases[hash] || hash;
      if (SETTINGS_SECTIONS.some(section => section.id === sectionId)) activeSection = sectionId;
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  });

  function setActiveSection(sectionId) {
    if (!SETTINGS_SECTIONS.some(section => section.id === sectionId)) return;
    activeSection = sectionId;
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${sectionId}`);
    }
  }

  function goToAdjacentSection(direction) {
    const nextIndex = activeSectionIndex + direction;
    const nextSection = SETTINGS_SECTIONS[nextIndex];
    if (nextSection) setActiveSection(nextSection.id);
  }

  function preserveExpressionFields(nextConfig, currentConfig) {
    const next = nextConfig || {};
    const current = currentConfig || {};
    return {
      ...next,
      avatar_path: current.avatar_path ?? next.avatar_path ?? null,
      background_path: current.background_path ?? next.background_path ?? null,
      audio_path: current.audio_path ?? next.audio_path ?? null,
      spotify_type: current.spotify_type ?? next.spotify_type ?? null,
      spotify_id: current.spotify_id ?? next.spotify_id ?? null
    };
  }

  async function loadSettings() {
    const nextRequestId = ++requestId;
    const previousContext = context;
    loading = !previousContext;
    error = '';
    const nextContext = await loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: $isAuthenticated,
      sessionUserId: $session?.user?.id,
      currentUsername: accountUsername
    });

    if (nextRequestId !== requestId) return;

    if (nextContext.loadError && previousContext) {
      context = {
        ...previousContext,
        dataWarning: nextContext.loadError
      };
      loading = false;
      return;
    }

    context = nextContext;
    loading = false;
    if (nextContext.loadError) {
      error = nextContext.loadError;
    } else if (!nextContext.viewingOwnProfile) {
      error = 'Profile settings are available only for your own profile.';
    }
  }

  function updateConfiguration(event) {
    configurationPreview = null;
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    const currentDraft = context?.profileConfig?.draft || {};
    const currentPublished = context?.profileConfig?.published || {};
    context = {
      ...context,
      profileConfig: {
        ...(context.profileConfig || {}),
        draft: normalizeProfileConfig(preserveExpressionFields(event.detail?.draft, currentDraft), fallbackColor),
        published: normalizeProfileConfig(preserveExpressionFields(event.detail?.published, currentPublished), fallbackColor)
      }
    };
    const savedLayout = normalizeProfileConfig(event.detail?.draft, fallbackColor).layoutVariant;
    if (event.detail?.layoutChanged && ['immersive', 'editorial', 'focus'].includes(savedLayout) && currentEquippedLayout) {
      void clearPaidLayoutOverride();
    }
  }

  async function clearPaidLayoutOverride() {
    const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: 'profile_layout' });
    if (rpcError || !data?.success) return;
    await refreshProfileState($session?.user?.id || null);
  }

  function updateExpression(event) {
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    const fields = event.detail || {};
    const currentDraft = context?.profileConfig?.draft || {};
    const currentPublished = context?.profileConfig?.published || {};
    context = {
      ...context,
      profileConfig: {
        ...(context.profileConfig || {}),
        draft: normalizeProfileConfig({ ...currentDraft, ...fields }, fallbackColor),
        published: normalizeProfileConfig({ ...currentPublished, ...fields }, fallbackColor)
      }
    };
  }

  function handleSocialChange() {
    void loadSettings();
  }

  function updateConfigurationPreview(event) {
    const nextPreview = event.detail?.config;
    if (!nextPreview) {
      configurationPreview = null;
      return;
    }
    const fallbackColor = context?.targetProfile?.mood_color || '#8B7CF6';
    const normalizedPreview = normalizeProfileConfig(nextPreview, fallbackColor);
    configurationPreview = nextPreview?.layoutOverride
      ? { ...normalizedPreview, layoutOverride: nextPreview.layoutOverride }
      : normalizedPreview;
  }

  function updateIdentity(event) {
    const nextIdentity = event.detail || {};
    context = {
      ...context,
      targetProfile: {
        ...context.targetProfile,
        bio: nextIdentity.bio ?? null
      }
    };
  }
</script>

<main class="profile-settings-page foundation-page" aria-busy={loading}>
  <div class="profile-settings-page__inner">
    {#if loading}
      <div class="profile-settings-page__state" role="status" aria-live="polite">
        <span class="profile-settings-page__state-mark" aria-hidden="true">✦</span>
        <p class="profile-settings-page__eyebrow">Loading settings</p>
        <h1>Preparing your profile studio.</h1>
      </div>
    {:else if error}
      <div class="profile-settings-page__state" role="alert">
        <Surface variant="panel" padding="lg">
          <p class="profile-settings-page__eyebrow">Settings unavailable</p>
          <h1>{error}</h1>
          <p>Return to the profile or sign in again to manage your public presentation.</p>
          <Button variant="secondary" href={profilePath}>Back to profile</Button>
        </Surface>
      </div>
    {:else if context}
      <section class="profile-settings-page__intro-row" aria-labelledby="profile-settings-title">
        <div>
          <p class="profile-settings-page__eyebrow">Profile studio</p>
          <h1 id="profile-settings-title">Build the profile you keep.</h1>
          <p class="profile-settings-page__intro">Shape your identity, expression, collection, progression, layout, and privacy from one living workspace.</p>
        </div>
      </section>

      {#if context.dataWarning}
        <p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>
      {/if}

      <div class="profile-settings-page__workspace">
        <aside class="profile-settings-page__rail" aria-label="Profile settings sections">
          <div class="profile-settings-page__rail-heading">
            <span>Customize</span>
            <strong>{String(activeSectionIndex + 1).padStart(2, '0')} <em>/</em> {String(SETTINGS_SECTIONS.length).padStart(2, '0')}</strong>
          </div>
          <nav>
            {#each SETTINGS_SECTIONS as section (section.id)}
              <button
                type="button"
                class:active={activeSection === section.id}
                aria-current={activeSection === section.id ? 'page' : undefined}
                on:click={() => setActiveSection(section.id)}
              >
                <span class="profile-settings-page__rail-number">{section.number}</span>
                <span class="profile-settings-page__rail-copy">
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>
                <span class="profile-settings-page__rail-arrow" aria-hidden="true">→</span>
              </button>
            {/each}
          </nav>
          <div class="profile-settings-page__rail-footer">
            <span class="profile-settings-page__live-dot" aria-hidden="true"></span>
            <div><strong>Profile is live</strong><small>Each section has its own save or apply action.</small></div>
          </div>
        </aside>

        <section class="profile-settings-page__editor" aria-label="Profile settings editor">
          <div class="profile-settings-page__editor-body">
            {#if activeSection === 'overview'}
              <section class="profile-settings-page__editor-section" aria-label="Profile studio overview">
                <ProfileStudioOverview
                  profile={context.targetProfile}
                  timelineEvents={context.timelineEvents}
                  collectionItems={context.collectionItems}
                  allAchievements={context.allAchievements}
                  unlockedAchievements={context.unlockedAchievements}
                />
              </section>
            {:else if activeSection === 'identity'}
              <section class="profile-settings-page__editor-section" aria-label="Identity editor">
                <IdentityEditor profileId={context.profileId} username={context.targetProfile?.username || accountUsername} bio={context.targetProfile?.bio || ''} on:identitysaved={updateIdentity} />
              </section>
            {:else if activeSection === 'expression'}
              <section class="profile-settings-page__editor-section" aria-label="Expression editor">
                <ProfileExpressionEditor profileId={context.profileId} config={context.profileConfig} fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)} staff={Boolean(context.targetProfile?.is_staff)} on:expressionchange={updateExpression} />
              </section>
            {:else if activeSection === 'collection'}
              <section class="profile-settings-page__editor-section" aria-label="Collection editor">
                <ProfileCosmeticsEditor accountProfile={context.targetProfile} profileConfig={context.profileConfig} />
              </section>
            {:else if activeSection === 'layout'}
              <section class="profile-settings-page__editor-section" aria-label="Layout and links editor">
                <ProfileEditor profileId={context.profileId} draftConfig={context.profileConfig?.draft} publishedConfig={context.profileConfig?.published} on:configsaved={updateConfiguration} on:configpublished={updateConfiguration} on:configpreview={updateConfigurationPreview} />
              </section>
            {:else if activeSection === 'social'}
              <section class="profile-settings-page__editor-section" aria-label="Privacy and social editor">
                <ProfileSocial
                  profileId={context.profileId}
                  username={context.targetProfile?.username || accountUsername}
                  isOwnProfile={true}
                  isAuthenticated={$isAuthenticated}
                  social={context.social}
                  settings={context.socialSettings}
                  on:socialchange={handleSocialChange}
                />
              </section>
            {:else if activeSection === 'progression'}
              <section class="profile-settings-page__editor-section" aria-label="Progression overview">
                <ProfileProgression
                  profile={context.targetProfile}
                  timelineEvents={context.timelineEvents}
                  collectionItems={context.collectionItems}
                  allAchievements={context.allAchievements}
                  unlockedAchievements={context.unlockedAchievements}
                />
              </section>
            {:else}
              <!-- Compatibility escape hatch for older bookmarks and support workflows. -->
              <section class="profile-settings-page__account" aria-labelledby="profile-settings-account-title">
                <div class="profile-settings-page__account-icon" aria-hidden="true">◌</div>
                <div>
                  <p class="profile-settings-page__eyebrow">Account controls</p>
                  <h3 id="profile-settings-account-title">Progress, badges & account tools</h3>
                  <p>Use the legacy account view for controls that have not moved into Studio yet.</p>
                  <Button variant="secondary" href="/profile?legacy=1">Open legacy account controls <span aria-hidden="true">↗</span></Button>
                </div>
              </section>
            {/if}
          </div>

          <footer class="profile-settings-page__editor-footer">
            <button type="button" class="profile-settings-page__step-button" disabled={activeSectionIndex === 0} on:click={() => goToAdjacentSection(-1)}>
              <span aria-hidden="true">←</span> Previous
            </button>
            <span>Section {activeSectionIndex + 1} of {SETTINGS_SECTIONS.length}</span>
            <button type="button" class="profile-settings-page__step-button" disabled={activeSectionIndex === SETTINGS_SECTIONS.length - 1} on:click={() => goToAdjacentSection(1)}>
              Next <span aria-hidden="true">→</span>
            </button>
          </footer>
        </section>

        <aside class="profile-settings-page__preview-column" aria-label="Profile preview and shortcuts">
          <ProfileSettingsPreview profile={context.targetProfile} profileConfig={previewProfileConfig} />
          <div class="profile-settings-page__preview-links">
            <a href="#collection"><span>Open your collection</span><span aria-hidden="true">→</span></a>
            <a href="#progression"><span>Review progression</span><span aria-hidden="true">→</span></a>
          </div>
        </aside>
      </div>
    {/if}
  </div>
</main>
