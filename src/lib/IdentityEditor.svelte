<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import {
    BIO_MAX_LENGTH,
    countIdentityCharacters,
    normalizePublicIdentity
  } from './profileIdentity.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';
  import Module from './foundation/Module.svelte';

  export let profileId = null;
  export let username = '';
  export let bio = '';

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-identity-editor';
  let restoredProfileId = null;
  let draftBio = '';
  let saving = false;
  let status = '';
  let error = '';

  $: validation = normalizePublicIdentity({
    displayName: username,
    bio: draftBio
  });
  $: isDirty = draftBio !== (bio || '');

  function scope() {
    return profileId || 'unknown';
  }

  function persistDraft() {
    if (!profileId) return;
    writeViewState(VIEW_STATE_NAMESPACE, scope(), {
      bio: draftBio
    });
  }

  function restoreDraft() {
    if (!profileId || profileId === restoredProfileId) return;
    restoredProfileId = profileId;
    const cached = readViewState(VIEW_STATE_NAMESPACE, scope());
    draftBio = typeof cached?.bio === 'string' ? cached.bio : (bio || '');
    status = cached ? 'Unsaved bio draft restored.' : '';
    error = '';
  }

  $: if (profileId && profileId !== restoredProfileId) restoreDraft();

  function updateField(field, value) {
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
    clearViewState(VIEW_STATE_NAMESPACE, scope());
    status = 'Identity saved.';
    dispatch('identitysaved', {
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
  title="Profile identity"
  description="Your username is your display name. Add a short bio for visitors."
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
    </div>

    <div class="identity-editor__footer">
      <div aria-live="polite">
        {#if error}<p class="identity-editor__message identity-editor__message--error" role="alert">{error}</p>
        {:else if status}<p class="identity-editor__message">{status}</p>
        {:else}<p class="identity-editor__hint">Your username is fixed as your display name.</p>{/if}
      </div>
      <button type="submit" class="identity-editor__save" disabled={saving || !validation.valid} aria-busy={saving ? 'true' : 'false'}>
        {saving ? 'Saving…' : 'Save bio'}
      </button>
    </div>
  </form>
</Module>
