<script>
  import { authUser, isAuthenticated, profile, session } from './stores';
  import { supabase } from './supabase';
  import { loadProfileContext } from './profileData.js';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import Button from './foundation/Button.svelte';
  import Surface from './foundation/Surface.svelte';
  import IdentityEditor from './IdentityEditor.svelte';
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
    context = {
      ...context,
      profileConfig: {
        ...(context.profileConfig || {}),
        draft: normalizeProfileConfig(event.detail?.draft, fallbackColor),
        published: normalizeProfileConfig(event.detail?.published, fallbackColor)
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
        display_name: nextIdentity.displayName ?? null,
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
          displayName={context.targetProfile?.display_name || ''}
          bio={context.targetProfile?.bio || ''}
          on:identitysaved={updateIdentity}
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
            <p class="profile-settings-page__eyebrow">Account and studio</p>
            <h2 id="profile-settings-account-title">Keep the established controls close.</h2>
            <p>Mood, pinned badges, account management, and earned presentation remain available through the existing controls.</p>
          </div>
          <div class="profile-settings-page__actions">
            <Button variant="secondary" href="/profile?legacy=1">Open account controls</Button>
            <Button variant="ghost" href="/shop">Open decoration studio</Button>
          </div>
        </section>
      </div>
    {/if}
  </div>
</main>
