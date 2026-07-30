<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import {
    BIO_MAX_LENGTH,
    DISPLAY_NAME_MAX_LENGTH,
    countIdentityCharacters,
    normalizePublicIdentity
  } from './profileIdentity.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';
  import Module from './foundation/Module.svelte';

  export let profileId = null;
  export let displayName = '';
  export let bio = '';

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-identity-editor';
  let restoredProfileId = null;
  let draftDisplayName = '';
  let draftBio = '';
  let saving = false;
  let status = '';
  let error = '';

  $: validation = normalizePublicIdentity({
    displayName: draftDisplayName,
    bio: draftBio
  });
  $: isDirty = draftDisplayName !== (displayName || '') || draftBio !== (bio || '');

  function scope() {
    return profileId || 'unknown';
  }

  function persistDraft() {
    if (!profileId) return;
    writeViewState(VIEW_STATE_NAMESPACE, scope(), {
      displayName: draftDisplayName,
      bio: draftBio
    });
  }

  function restoreDraft() {
    if (!profileId || profileId === restoredProfileId) return;
    restoredProfileId = profileId;
    const cached = readViewState(VIEW_STATE_NAMESPACE, scope());
    draftDisplayName = typeof cached?.displayName === 'string' ? cached.displayName : (displayName || '');
    draftBio = typeof cached?.bio === 'string' ? cached.bio : (bio || '');
    status = cached ? 'Unsaved identity draft restored.' : '';
    error = '';
  }

  $: if (profileId && profileId !== restoredProfileId) restoreDraft();

  function updateField(field, value) {
    if (field === 'displayName') draftDisplayName = value;
    if (field === 'bio') draftBio = value;
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
      p_display_name: validation.displayName,
      p_bio: validation.bio
    });

    if (rpcError || !data || typeof data !== 'object') {
      error = rpcError?.message || 'The identity could not be saved.';
      saving = false;
      return;
    }

    const published = normalizePublicIdentity({
      displayName: data.display_name,
      bio: data.bio
    });
    if (!published.valid) {
      error = 'The server returned an invalid identity. Nothing was published.';
      saving = false;
      return;
    }

    draftDisplayName = published.displayName || '';
    draftBio = published.bio || '';
    clearViewState(VIEW_STATE_NAMESPACE, scope());
    status = 'Identity saved.';
    dispatch('identitysaved', {
      displayName: published.displayName,
      bio: published.bio,
      username: data.username || null
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
  eyebrow="Public identity"
  title="Name the profile"
  description="These optional fields are plain text and appear in the same compact identity card visitors see."
>
  <form class="identity-editor__form" on:submit|preventDefault={saveIdentity}>
    <div class="identity-editor__fields">
      <label class="identity-editor__field" for="profile-display-name">
        <span class="identity-editor__label-row">
          <span>Display name</span>
          <span class="identity-editor__counter" aria-live="polite">{countIdentityCharacters(draftDisplayName)} / {DISPLAY_NAME_MAX_LENGTH}</span>
        </span>
        <input
          id="profile-display-name"
          type="text"
          value={draftDisplayName}
          autocomplete="nickname"
          aria-invalid={validation.fieldErrors.displayName ? 'true' : 'false'}
          aria-describedby={validation.fieldErrors.displayName ? 'profile-display-name-error' : undefined}
          disabled={saving}
          on:input={event => updateField('displayName', event.currentTarget.value)}
        />
        {#if validation.fieldErrors.displayName}
          <small id="profile-display-name-error" class="identity-editor__error">{validation.fieldErrors.displayName}</small>
        {/if}
      </label>

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
    </div>

    <div class="identity-editor__footer">
      <div aria-live="polite">
        {#if error}<p class="identity-editor__message identity-editor__message--error" role="alert">{error}</p>
        {:else if status}<p class="identity-editor__message">{status}</p>
        {:else}<p class="identity-editor__hint">Leave either field empty to use the designed fallback.</p>{/if}
      </div>
      <button type="submit" class="identity-editor__save" disabled={saving || !validation.valid} aria-busy={saving ? 'true' : 'false'}>
        {saving ? 'Saving…' : 'Save identity'}
      </button>
    </div>
  </form>
</Module>
