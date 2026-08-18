<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import {
    BIO_MAX_LENGTH,
    countIdentityCharacters,
    normalizePublicIdentity
  } from './profileIdentity.js';
  import { normalizeProfileIdentityPresentation, PROFILE_IDENTITY_DESCRIPTION_MODES, PROFILE_IDENTITY_ENTRY_ANIMATIONS } from './profileIdentityPresentation.js';
  import Module from './foundation/Module.svelte';

  export let profileId = null;
  export let username = '';
  export let bio = '';
  export let config = null;
  export let studio = false;
  export let publishedBio = null;

  const dispatch = createEventDispatcher();
  let lastIncomingKey = '';
  // Studio unmounts this editor when the user changes Customize tabs. Start
  // from the parent-owned draft so a remount does not briefly look like a new
  // empty edit and block the incoming-state hydration guard below.
  let draftBio = bio || '';
  /** @type {any} */
  let identityConfig = {};
  const initialConfig = config && typeof config === 'object' ? config : {};
  function presentationFromConfig(value) {
    return normalizeProfileIdentityPresentation(value?.identityPresentation || value?.identity || value?.base?.identityPresentation || value?.base?.identity);
  }

  let draftPresentation = presentationFromConfig(initialConfig.draft || initialConfig);
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
  $: identityConfig = config && typeof config === 'object' ? config : {};
  $: incomingKey = JSON.stringify({ profileId, bio: bio || '', publishedBio: publishedBio ?? null, draft: identityConfig.draft || null, published: identityConfig.published || null });

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    draftBio = bio || '';
    draftPresentation = presentationFromConfig(identityConfig.draft || identityConfig);
    baselineBio = publishedBio ?? bio ?? '';
    baselinePresentation = presentationFromConfig(identityConfig.published || identityConfig);
    status = '';
    error = '';
  }

  // Server/canonical draft changes hydrate this editor. There is deliberately
  // no session restore or mount-time preview dispatch: ProfileSettings owns
  // the unsaved Studio identity draft.
  $: if (profileId && incomingKey !== lastIncomingKey && !saving && !isDirty) syncIncoming();

  function updateField(field, value) {
    if (field === 'bio') draftBio = value;
    else draftPresentation = normalizeProfileIdentityPresentation({ ...draftPresentation, [field]: value });
    status = '';
    error = '';
    dispatch('identitypreview', { bio: draftBio, identityPresentation: draftPresentation });
    dispatch('dirty', { dirty: draftIsDirty() });
  }

  function draftIsDirty() {
    return draftBio !== baselineBio || JSON.stringify(draftPresentation) !== JSON.stringify(baselinePresentation);
  }

  async function saveIdentity() {
    if (saving) return;
    if (!validation.valid) {
      error = validation.errors[0] || 'Check the identity fields and try again.';
      status = '';
      return;
    }

    // Profile Studio owns one draft and one publish action. The standalone
    // identity destination keeps its existing immediate-save contract, while
    // Studio only emits the staged identity to its parent publisher.
    if (studio) {
      dispatch('identitypreview', { bio: draftBio, identityPresentation: draftPresentation });
      dispatch('dirty', { dirty: draftIsDirty() });
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
    status = 'Identity saved.';
    dispatch('identitysaved', {
      bio: published.bio,
      username: data.username || null,
      identityPresentation: draftPresentation
    });
    saving = false;
  }

  export function getDraftIdentity() {
    return {
      bio: validation.valid ? validation.bio : draftBio,
      identityPresentation: normalizeProfileIdentityPresentation(draftPresentation),
      dirty: draftIsDirty(),
      valid: validation.valid
    };
  }

  export function validateDraft() {
    if (validation.valid) return true;
    error = validation.errors[0] || 'Check the identity fields and try again.';
    return false;
  }

  export function acceptSaved(nextConfig = {}) {
    const nextIdentity = presentationFromConfig(nextConfig);
    const nextBio = typeof nextConfig?.bio === 'string' ? nextConfig.bio : draftBio;
    draftBio = nextBio;
    baselineBio = nextBio;
    draftPresentation = normalizeProfileIdentityPresentation(nextIdentity);
    baselinePresentation = normalizeProfileIdentityPresentation(nextIdentity);
    status = '';
    error = '';
    dispatch('identitypreview', { bio: draftBio, identityPresentation: draftPresentation });
    dispatch('dirty', { dirty: false });
  }

  export function resetChanges() {
    draftBio = baselineBio;
    draftPresentation = normalizeProfileIdentityPresentation(baselinePresentation);
    status = '';
    error = '';
    dispatch('identitypreview', { bio: draftBio, identityPresentation: draftPresentation });
    dispatch('dirty', { dirty: false });
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
  className={studio ? 'identity-editor identity-editor--studio' : 'identity-editor'}
  title="Identity"
  description="Your bio and optional presentation details are visible on your public profile."
>
  <form class="identity-editor__form" on:submit|preventDefault={saveIdentity}>
    <div class="identity-editor__fields">
      <label class="identity-editor__field identity-editor__field--username" for="profile-username">
        <span>Username</span>
        <input id="profile-username" value={username} readonly aria-readonly="true" />
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
      <div class="identity-editor__grid identity-editor__grid--meta">
        <label class="identity-editor__field" for="profile-location"><span>Location <small>optional</small></span><input id="profile-location" maxlength="60" value={draftPresentation.location} disabled={saving} on:input={event => updateField('location', event.currentTarget.value)} /></label>
        <label class="identity-editor__field" for="profile-timezone"><span>Timezone <small>optional</small></span><input id="profile-timezone" maxlength="40" placeholder="America/New_York" value={draftPresentation.timezone} disabled={saving} on:input={event => updateField('timezone', event.currentTarget.value)} /></label>
      </div>
      <div class="identity-editor__options">
        <label><input type="checkbox" checked={draftPresentation.showJoinDate} disabled={saving} on:change={event => updateField('showJoinDate', event.currentTarget.checked)} /> Show join month</label>
        <label><input type="checkbox" checked={draftPresentation.showAvatar} disabled={saving} on:change={event => updateField('showAvatar', event.currentTarget.checked)} /> Show avatar</label>
      </div>
      <div class="identity-editor__grid identity-editor__grid--behavior">
        <label class="identity-editor__field"><span>Description rhythm</span><select value={draftPresentation.descriptionMode} disabled={saving} on:change={event => updateField('descriptionMode', event.currentTarget.value)}>{#each PROFILE_IDENTITY_DESCRIPTION_MODES as mode (mode)}<option value={mode}>{mode === 'typewriter' ? 'Finite typewriter' : 'Plain text'}</option>{/each}</select></label>
        <label class="identity-editor__field"><span>Entry animation</span><select value={draftPresentation.entryAnimation} disabled={saving} on:change={event => updateField('entryAnimation', event.currentTarget.value)}>{#each PROFILE_IDENTITY_ENTRY_ANIMATIONS as mode (mode)}<option value={mode}>{mode === 'none' ? 'None' : mode[0].toUpperCase() + mode.slice(1)}</option>{/each}</select></label>
      </div>
    </div>

    <div class="identity-editor__footer">
      <div aria-live="polite">
        {#if error}<p class="identity-editor__message identity-editor__message--error" role="alert">{error}</p>
        {:else if status}<p class="identity-editor__message">{status}</p>
        {:else if studio}<p class="identity-editor__hint">Identity changes join the Profile Studio draft and publish with your profile.</p>
        {:else}<p class="identity-editor__hint">Your username is fixed as your display name. Optional presentation controls stay finite and accessible.</p>{/if}
      </div>
      {#if !studio}
        <button type="submit" class="identity-editor__save" disabled={saving || !validation.valid} aria-busy={saving ? 'true' : 'false'}>
          {saving ? 'Saving…' : 'Save bio'}
        </button>
      {/if}
    </div>
  </form>
</Module>

<style>
  .identity-editor__form {
    --identity-surface: var(--customize-surface, var(--site-deep, #090a0d));
    --identity-surface-raised: var(--customize-section-input, var(--customize-surface-raised, var(--site-raised, #111319)));
    --identity-surface-inset: var(--customize-surface-inset, var(--site-deep, #090a0d));
    --identity-text: var(--customize-text-primary, var(--site-ink, #f2f0eb));
    --identity-text-secondary: var(--customize-text-secondary, var(--site-muted, #aaa8b0));
    --identity-text-muted: var(--customize-text-muted, var(--site-muted, #aaa8b0));
    --identity-text-faint: var(--customize-text-faint, var(--site-faint, #7d7e87));
    --identity-border: var(--customize-border, var(--site-line, rgba(255, 255, 255, .08)));
    --identity-border-strong: var(--customize-section-input-line, var(--customize-border-strong, var(--site-line-strong, rgba(255, 255, 255, .14))));
    --identity-focus: var(--customize-focus, var(--ctp-lavender, #b4befe));
    --identity-neutral: var(--customize-accent-primary, var(--ctp-teal, #94e2d5));
    --identity-save: var(--customize-accent-save, var(--ctp-green, #a6e3a1));
    --identity-danger: var(--customize-accent-danger, var(--ctp-red, #f38ba8));
    --identity-font-body: var(--customize-font-body, var(--site-body, sans-serif));
    --identity-font-mono: var(--customize-font-mono, var(--site-mono, ui-monospace, SFMono-Regular, Menlo, monospace));
    --identity-label-size: var(--customize-label-size, .76rem);
    --identity-control-size: var(--customize-control-size, .82rem);
    --identity-secondary-height: var(--customize-secondary-height, 2.1rem);
    --identity-primary-height: var(--customize-primary-height, 2.35rem);
    --identity-radius: var(--customize-radius, .35rem);
    display: grid;
    gap: .7rem;
    min-width: 0;
    color: var(--identity-text);
    font-family: var(--identity-font-body);
  }

  .identity-editor__fields { display: grid; gap: .7rem; min-width: 0; }
  .identity-editor__field { display: grid; gap: .35rem; min-width: 0; color: var(--identity-text-secondary); font-size: var(--identity-label-size); line-height: 1.35; }
  .identity-editor__label-row { display: flex; align-items: baseline; justify-content: space-between; gap: .65rem; }
  .identity-editor__field small { color: var(--identity-text-muted); font-size: .9em; }
  .identity-editor__field > span > small { margin-left: .18rem; }
  .identity-editor__counter { color: var(--identity-text-faint); font: .72rem/1 var(--identity-font-mono); white-space: nowrap; }
  .identity-editor__field :is(input, textarea, select) {
    width: 100%;
    min-width: 0;
    min-height: var(--identity-primary-height);
    box-sizing: border-box;
    padding: .55rem .65rem;
    border: 1px solid var(--identity-border-strong);
    border-radius: var(--identity-radius);
    outline: 0;
    background: var(--identity-surface-raised);
    color: var(--identity-text);
    font: 500 var(--identity-control-size) / 1.35 var(--identity-font-body);
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .identity-editor__field textarea { min-height: 6rem; resize: vertical; }
  .identity-editor__field :is(input, textarea, select)::placeholder { color: var(--identity-text-faint); }
  .identity-editor__field :is(input, textarea, select):focus-visible {
    border-color: var(--identity-focus);
    outline: 2px solid var(--identity-focus);
    outline-offset: 2px;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--identity-focus) 24%, transparent);
  }
  .identity-editor__field :is(input, textarea, select)[aria-invalid="true"] { border-color: var(--identity-danger); }
  .identity-editor__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; min-width: 0; }
  .identity-editor__options { display: flex; align-items: center; flex-wrap: wrap; gap: .65rem 1rem; color: var(--identity-text-secondary); font-size: var(--identity-label-size); }
  .identity-editor__options label { display: inline-flex; align-items: center; gap: .35rem; cursor: pointer; }
  .identity-editor__options input { accent-color: var(--identity-neutral); }
  .identity-editor__footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: .1rem; padding-top: .7rem; border-top: 1px solid var(--identity-border); }
  .identity-editor__message,
  .identity-editor__hint { margin: 0; color: var(--identity-text-muted); font-size: .78rem; line-height: 1.45; }
  .identity-editor__message--error,
  .identity-editor__error { color: var(--identity-danger); }
  .identity-editor__error { display: block; font-size: .74rem; line-height: 1.4; }
  .identity-editor__save {
    min-height: var(--identity-primary-height);
    padding: .55rem .8rem;
    border: 1px solid var(--identity-save);
    border-radius: var(--identity-radius);
    background: var(--identity-save);
    color: var(--identity-surface-inset);
    font: 700 var(--identity-label-size) / 1 var(--identity-font-body);
    cursor: pointer;
    white-space: nowrap;
  }
  .identity-editor__save:hover:not(:disabled) { background: color-mix(in srgb, var(--identity-save) 82%, var(--identity-text)); }
  .identity-editor__save:focus-visible { outline: 2px solid var(--identity-focus); outline-offset: 2px; }
  .identity-editor__save:disabled { cursor: not-allowed; opacity: .45; }

  /* Profile Studio owns the identity composition. The editor keeps the
   * legacy standalone form untouched while opting into the dashboard grid
   * only when the Customize workspace mounts it. */
  :global(.identity-editor--studio .foundation-module__body) { display: block; padding: 0; }
  :global(.identity-editor--studio .foundation-module__body > .identity-editor__form) { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(0, .9fr) minmax(0, .9fr); column-gap: 1.5rem; row-gap: .4rem; }
  :global(.identity-editor--studio .identity-editor__fields) { display: contents; }
  :global(.identity-editor--studio .identity-editor__field--username) { grid-column: 1 / span 2; grid-row: 1; }
  :global(.identity-editor--studio .identity-editor__field[for="profile-bio"]) { grid-column: 1 / span 2; grid-row: 2 / span 2; align-self: stretch; align-content: stretch; grid-template-rows: auto minmax(0, 1fr) auto; position: relative; top: .44rem; }
  :global(.identity-editor--studio .identity-editor__field[for="profile-bio"] textarea) { height: 5rem; min-height: 5rem; }
  :global(.identity-editor--studio .identity-editor__grid) { display: contents; }
  :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:first-child) { grid-column: 3 / span 2; grid-row: 1; }
  :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:last-child) { grid-column: 3 / span 2; grid-row: 2; position: relative; top: .44rem; }
  :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:first-child) { grid-column: 3; grid-row: 3; position: relative; top: .68rem; }
  :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:last-child) { grid-column: 4; grid-row: 3; position: relative; top: .68rem; }
  :global(.identity-editor--studio .identity-editor__options) { display: flex; grid-column: 1 / span 2; grid-row: 4; align-self: start; align-items: center; min-height: var(--identity-primary-height); flex-wrap: wrap; gap: .65rem 1rem; padding-bottom: .1rem; position: relative; top: -.88rem; margin-bottom: -1.18rem; }
  :global(.identity-editor--studio .identity-editor__footer) { grid-column: 3 / -1; grid-row: 3; align-items: center; justify-content: flex-end; align-self: end; margin-top: 0; padding-top: 0; border-top: 0; }
  :global(.identity-editor--studio .identity-editor__hint) { display: none; }

  @media (max-width: 34rem) {
    .identity-editor__grid { grid-template-columns: minmax(0, 1fr); }
    .identity-editor__footer { align-items: stretch; flex-direction: column; }
    .identity-editor__save { align-self: flex-start; }
  }
  @media (max-width: 72rem) {
    :global(.identity-editor--studio .foundation-module__body > .identity-editor__form) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"]) { grid-column: 1 / -1; grid-row: auto; align-self: start; align-content: start; grid-template-rows: none; position: static; }
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"] textarea) { height: auto; min-height: 4.5rem; }
    :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field),
    :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field) { grid-column: auto; grid-row: auto; position: static; }
    :global(.identity-editor--studio .identity-editor__options) { position: static; top: auto; margin-bottom: 0; grid-column: 1 / -1; grid-row: auto; }
    :global(.identity-editor--studio .identity-editor__footer) { grid-column: 1 / -1; grid-row: auto; }
  }
  @media (max-width: 38rem) {
    :global(.identity-editor--studio .foundation-module__body > .identity-editor__form) { grid-template-columns: minmax(0, 1fr); }
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"]) { grid-column: auto; }
    :global(.identity-editor--studio .identity-editor__options) { grid-column: auto; }
  }
  /* Phone layout is a separate composition from the desktop placement grid.
   * Keep every control in normal document flow so labels and fields cannot
   * overlap when the dashboard is opened on a narrow device. */
  @media (max-width: 52rem) {
    :global(.identity-editor--studio .foundation-module__body > .identity-editor__form) { display: grid; grid-template-columns: minmax(0, 1fr); gap: .8rem; }
    :global(.identity-editor--studio .identity-editor__fields) { display: grid; gap: .8rem; }
    :global(.identity-editor--studio .identity-editor__field),
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"]),
    :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field),
    :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field) { grid-column: auto; grid-row: auto; position: static; top: auto; align-self: auto; align-content: normal; grid-template-rows: none; }
    :global(.identity-editor--studio .identity-editor__field--username),
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"]),
    :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:first-child),
    :global(.identity-editor--studio .identity-editor__grid--meta .identity-editor__field:last-child),
    :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:first-child),
    :global(.identity-editor--studio .identity-editor__grid--behavior .identity-editor__field:last-child) { grid-column: 1 / -1; grid-row: auto; }
    :global(.identity-editor--studio .identity-editor__grid),
    :global(.identity-editor--studio .identity-editor__grid--meta),
    :global(.identity-editor--studio .identity-editor__grid--behavior) { display: grid; grid-template-columns: minmax(0, 1fr); gap: .8rem; }
    :global(.identity-editor--studio .identity-editor__field[for="profile-bio"] textarea) { height: auto; min-height: 7rem; }
    :global(.identity-editor--studio .identity-editor__options) { display: grid; grid-column: auto; grid-row: auto; min-height: 0; gap: .65rem; position: static; top: auto; margin: 0; padding: .1rem 0 0; }
    :global(.identity-editor--studio .identity-editor__footer) { display: block; grid-column: auto; grid-row: auto; margin-top: .05rem; padding-top: .8rem; }
    :global(.identity-editor--studio .identity-editor__hint) { display: none; }
  }
</style>
