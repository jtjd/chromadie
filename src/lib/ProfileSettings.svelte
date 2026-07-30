<script>
  import { authUser, isAuthenticated, profile, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import IdentityEditor from './IdentityEditor.svelte';
  import ProfileExpressionEditor from './ProfileExpressionEditor.svelte';
  import ProfileCosmeticsEditor from './ProfileCosmeticsEditor.svelte';
  import ProfileEditor from './ProfileEditor.svelte';
  import ProfileSocial from './ProfileSocial.svelte';

  let context = null;
  let loading = true;
  let error = '';
  let requestId = 0;

  $: accountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: accountKey = $isAuthenticated && $session?.user?.id ? $session.user.id : '';
  $: if (accountKey) {
    void loadSettings();
  }
  $: profilePath = context?.targetProfile?.username
    ? getCanonicalProfilePath(context.targetProfile.username)
    : '/profile';

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
    loading = true;
    error = '';
    const nextContext = await loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: $isAuthenticated,
      sessionUserId: $session?.user?.id,
      currentUsername: accountUsername
    });

    if (nextRequestId !== requestId) return;

    context = nextContext;
    loading = false;
    if (nextContext.loadError) {
      error = nextContext.loadError;
    } else if (!nextContext.viewingOwnProfile) {
      error = 'Profile settings are available only for your own profile.';
    }
  }

  function updateConfiguration(event) {
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
    <header class="profile-settings-page__header">
      <div>
        <p class="profile-settings-page__eyebrow">Profile settings</p>
        <h1>Shape the page without crowding it.</h1>
        <p class="profile-settings-page__intro">Edit the parts visitors can see, choose whether your color story returns, and keep the public profile focused on the identity.</p>
      </div>
      <Button variant="ghost" href={profilePath}>View profile ↗</Button>
    </header>

    {#if loading}
      <div class="profile-settings-page__state" role="status" aria-live="polite">
        <p class="profile-settings-page__eyebrow">Loading settings</p>
        <h2>Preparing your profile controls.</h2>
      </div>
    {:else if error}
      <div class="profile-settings-page__state" role="alert">
        <Surface variant="panel" padding="lg">
          <p class="profile-settings-page__eyebrow">Settings unavailable</p>
          <h2>{error}</h2>
          <p>Return to the profile or sign in again to manage your public presentation.</p>
          <Button variant="secondary" href={profilePath}>Back to profile</Button>
        </Surface>
      </div>
    {:else if context}
      <div class="profile-settings-page__stack">
        {#if context.dataWarning}
          <p class="profile-settings-page__warning" role="status">{context.dataWarning}</p>
        {/if}
        <IdentityEditor
          profileId={context.profileId}
          username={context.targetProfile?.username || accountUsername}
          bio={context.targetProfile?.bio || ''}
          on:identitysaved={updateIdentity}
        />
        <ProfileExpressionEditor
          profileId={context.profileId}
          config={context.profileConfig}
          fallbackInitial={(context.targetProfile?.username || '✦').slice(0, 1)}
          staff={Boolean(context.targetProfile?.is_staff)}
          on:expressionchange={updateExpression}
        />
        <ProfileCosmeticsEditor
          accountProfile={context.targetProfile}
          profileConfig={context.profileConfig}
        />
        <ProfileEditor
          profileId={context.profileId}
          draftConfig={context.profileConfig?.draft}
          publishedConfig={context.profileConfig?.published}
          on:configsaved={updateConfiguration}
          on:configpublished={updateConfiguration}
        />

        <ProfileSocial
          profileId={context.profileId}
          username={context.targetProfile?.username || accountUsername}
          isOwnProfile={true}
          isAuthenticated={$isAuthenticated}
          social={context.social}
          settings={context.socialSettings}
          on:socialchange={handleSocialChange}
        />

        <section class="profile-settings-page__compatibility" aria-labelledby="profile-settings-account-title">
          <div>
            <p class="profile-settings-page__eyebrow">Account</p>
            <h2 id="profile-settings-account-title">Keep the established controls close.</h2>
            <p>Mood, pinned badges, and account management remain available through the existing controls.</p>
          </div>
          <div class="profile-settings-page__actions">
            <Button variant="secondary" href="/profile?legacy=1">Open account controls</Button>
          </div>
        </section>
      </div>
    {/if}
  </div>
</main>
