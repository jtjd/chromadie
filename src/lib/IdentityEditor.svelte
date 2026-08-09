<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import {
    BIO_MAX_LENGTH,
    countIdentityCharacters,
    normalizePublicIdentity
  } from './profileIdentity.js';
  import { normalizeProfileIdentityPresentation, PROFILE_IDENTITY_DESCRIPTION_MODES, PROFILE_IDENTITY_ENTRY_ANIMATIONS } from './profileIdentityPresentation.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';
  import Module from './foundation/Module.svelte';

  export let profileId = null;
  export let username = '';
  export let bio = '';
  export let config = null;

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-identity-editor';
  let restoredProfileId = null;
  let draftBio = '';
  const profileConfigInput = /** @type {any} */ (config || {});
  function presentationFromConfig(value) {
    return normalizeProfileIdentityPresentation(value?.identityPresentation || value?.identity || value?.base?.identityPresentation || value?.base?.identity);
  }

  let draftPresentation = presentationFromConfig(profileConfigInput.draft || profileConfigInput);
  let baselinePresentation = draftPresentation;
  let baselineBio = bio || '';
  let saving = false;
  let status = '';
  let error = '';

  $: validation = normalizePublicIdentity({
    displayName: username,
    bio: draftBio
  });
  $: isDirty = draftBio !== baselineBio || JSON.stringify(draftPresentation) !== JSON.stringify(baselinePresentation);

  function scope() {
    return profileId || 'unknown';
  }

  function persistDraft() {
    if (!profileId) return;
    writeViewState(VIEW_STATE_NAMESPACE, scope(), {
      bio: draftBio,
      presentation: draftPresentation
    });
  }

  function restoreDraft() {
    if (!profileId || profileId === restoredProfileId) return;
    restoredProfileId = profileId;
    const cached = readViewState(VIEW_STATE_NAMESPACE, scope());
    draftBio = typeof cached?.bio === 'string' ? cached.bio : (bio || '');
    draftPresentation = cached?.presentation ? normalizeProfileIdentityPresentation(cached.presentation) : presentationFromConfig(config?.draft || config);
    baselineBio = bio || '';
    baselinePresentation = presentationFromConfig(config?.published || config);
    status = cached ? 'Unsaved identity draft restored.' : '';
    error = '';
  }

  $: if (profileId && profileId !== restoredProfileId) restoreDraft();

  function updateField(field, value) {
    if (field === 'bio') draftBio = value;
    else draftPresentation = normalizeProfileIdentityPresentation({ ...draftPresentation, [field]: value });
    persistDraft();
    status = '';
    error = '';
  }

  async function saveIdentity() {
    if (saving) return;
    if (!validation.valid) {
      error = validation.errors[0] || 'Check the identity fields and try again.';
      status = '';
      return;
    }

    saving = true;
    status = '';
    error = '';
    const { data, error: rpcError } = await supabase.rpc('update_my_profile_identity', {
      p_display_name: username || null,
      p_bio: validation.bio
    });

    if (rpcError || !data || typeof data !== 'object') {
      error = rpcError?.message || 'The identity could not be saved.';
      saving = false;
      return;
    }

    const published = normalizePublicIdentity({ displayName: username, bio: data.bio });
    if (!published.valid) {
      error = 'The server returned an invalid identity. Nothing was published.';
      saving = false;
      return;
    }

    draftBio = published.bio || '';
    baselineBio = published.bio || '';
    if (JSON.stringify(draftPresentation) !== JSON.stringify(baselinePresentation)) {
      const { data: configurationData, error: configurationError } = await supabase.rpc('save_profile_identity_presentation', {
        p_patch: { identityPresentation: draftPresentation }
      });
      if (configurationError || configurationData?.success === false) {
        error = configurationError?.message || configurationData?.error || 'The identity presentation could not be saved.';
        saving = false;
        return;
      }
      baselinePresentation = normalizeProfileIdentityPresentation(configurationData?.draft?.identityPresentation || draftPresentation);
      dispatch('configsaved', configurationData);
    }
    clearViewState(VIEW_STATE_NAMESPACE, scope());
    status = 'Identity saved.';
    dispatch('identitysaved', {
      bio: published.bio,
      username: data.username || null,
      identityPresentation: draftPresentation
    });
    saving = false;
  }

  function handleBeforeUnload(event) {
    if (!isDirty || saving) return;
    event.preventDefault();
    event.returnValue = '';
  }

  onMount(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });
</script>

<Module
  size="wide"
  tone="quiet"
  className="identity-editor"
  title="Identity"
  description="Your bio and optional presentation details are visible on your public profile."
>
  <form class="identity-editor__form" on:submit|preventDefault={saveIdentity}>
    <div class="identity-editor__fields">
      <label class="identity-editor__field" for="profile-bio">
        <span class="identity-editor__label-row">
          <span>Bio</span>
          <span class="identity-editor__counter" aria-live="polite">{countIdentityCharacters(draftBio)} / {BIO_MAX_LENGTH}</span>
        </span>
        <textarea
          id="profile-bio"
          rows="4"
          value={draftBio}
          aria-invalid={validation.fieldErrors.bio ? 'true' : 'false'}
          aria-describedby={validation.fieldErrors.bio ? 'profile-bio-error' : undefined}
          disabled={saving}
          on:input={event => updateField('bio', event.currentTarget.value)}
        ></textarea>
        {#if validation.fieldErrors.bio}
          <small id="profile-bio-error" class="identity-editor__error">{validation.fieldErrors.bio}</small>
        {/if}
      </label>
      <div class="identity-editor__grid">
        <label class="identity-editor__field" for="profile-location"><span>Location <small>optional</small></span><input id="profile-location" maxlength="60" value={draftPresentation.location} disabled={saving} on:input={event => updateField('location', event.currentTarget.value)} /></label>
        <label class="identity-editor__field" for="profile-timezone"><span>Timezone <small>optional</small></span><input id="profile-timezone" maxlength="40" placeholder="America/New_York" value={draftPresentation.timezone} disabled={saving} on:input={event => updateField('timezone', event.currentTarget.value)} /></label>
      </div>
      <div class="identity-editor__options">
        <label><input type="checkbox" checked={draftPresentation.showJoinDate} disabled={saving} on:change={event => updateField('showJoinDate', event.currentTarget.checked)} /> Show join month</label>
        <label><input type="checkbox" checked={draftPresentation.showAvatar} disabled={saving} on:change={event => updateField('showAvatar', event.currentTarget.checked)} /> Show avatar</label>
      </div>
      <div class="identity-editor__grid">
        <label class="identity-editor__field"><span>Description rhythm</span><select value={draftPresentation.descriptionMode} disabled={saving} on:change={event => updateField('descriptionMode', event.currentTarget.value)}>{#each PROFILE_IDENTITY_DESCRIPTION_MODES as mode (mode)}<option value={mode}>{mode === 'typewriter' ? 'Finite typewriter' : 'Plain text'}</option>{/each}</select></label>
        <label class="identity-editor__field"><span>Entry animation</span><select value={draftPresentation.entryAnimation} disabled={saving} on:change={event => updateField('entryAnimation', event.currentTarget.value)}>{#each PROFILE_IDENTITY_ENTRY_ANIMATIONS as mode (mode)}<option value={mode}>{mode === 'none' ? 'None' : mode[0].toUpperCase() + mode.slice(1)}</option>{/each}</select></label>
      </div>
    </div>

    <div class="identity-editor__footer">
      <div aria-live="polite">
        {#if error}<p class="identity-editor__message identity-editor__message--error" role="alert">{error}</p>
        {:else if status}<p class="identity-editor__message">{status}</p>
        {:else}<p class="identity-editor__hint">Your username is fixed as your display name. Optional presentation controls stay finite and accessible.</p>{/if}
      </div>
      <button type="submit" class="identity-editor__save" disabled={saving || !validation.valid} aria-busy={saving ? 'true' : 'false'}>
        {saving ? 'Saving…' : 'Save bio'}
      </button>
    </div>
  </form>
</Module>
