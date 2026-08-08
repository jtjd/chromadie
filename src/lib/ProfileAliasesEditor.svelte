<script>
  import { onMount } from 'svelte';
  import Module from './foundation/Module.svelte';
  import { supabase } from './supabase';
  import { isProtectedUsername } from './usernamePolicy.js';
  import { getProfileAliasPath, normalizeProfileAliasSegment } from './routeContract.js';
  import {
    MAX_PROFILE_ALIASES,
    createProfileAlias,
    deleteProfileAlias,
    loadMyProfileAliases
  } from './profileAliases.js';

  let aliases = [];
  let draftAlias = '';
  let loading = true;
  let saving = false;
  let deletingAlias = '';
  let error = '';
  let status = '';

  onMount(() => {
    void loadAliases();
  });

  async function loadAliases() {
    loading = true;
    error = '';
    const result = await loadMyProfileAliases(supabase);
    aliases = result.aliases;
    error = result.error;
    loading = false;
  }

  function validateDraft() {
    const alias = normalizeProfileAliasSegment(draftAlias);
    if (!alias) return 'Use 1–20 letters, numbers, or underscores.';
    if (isProtectedUsername(alias)) return 'That word is reserved for a system or route.';
    if (aliases.some(entry => entry.alias === alias.toLowerCase())) return 'You already have that alias.';
    return '';
  }

  async function saveAlias() {
    if (saving || aliases.length >= MAX_PROFILE_ALIASES) return;
    const validationError = validateDraft();
    if (validationError) {
      error = validationError;
      status = '';
      return;
    }

    saving = true;
    error = '';
    status = '';
    const result = await createProfileAlias(supabase, draftAlias);
    if (!result.success) {
      error = result.error;
      saving = false;
      return;
    }

    draftAlias = '';
    status = `Alias ready at ${getProfileAliasPath(result.alias)}.`;
    await loadAliases();
    saving = false;
  }

  async function removeAlias(alias) {
    if (deletingAlias) return;
    deletingAlias = alias;
    error = '';
    status = '';
    const result = await deleteProfileAlias(supabase, alias);
    if (!result.success) {
      error = result.error;
      deletingAlias = '';
      return;
    }
    status = `/${alias} was removed.`;
    await loadAliases();
    deletingAlias = '';
  }
</script>

<Module
  size="wide"
  tone="quiet"
  className="aliases-editor"
  title="Aliases"
  description="Share alternate profile paths that always lead back to your canonical identity."
>
  <div class="aliases-editor__content">
    {#if loading}
      <p class="aliases-editor__state" role="status" aria-live="polite">Loading your aliases…</p>
    {:else}
      <div class="aliases-editor__list" aria-label="Profile aliases">
        {#if aliases.length}
          {#each aliases as entry (entry.alias)}
            <div class="aliases-editor__row">
              <a href={entry.path}>{entry.path}</a>
              <button type="button" class="aliases-editor__remove" disabled={Boolean(deletingAlias)} on:click={() => removeAlias(entry.alias)}>
                {deletingAlias === entry.alias ? 'Removing…' : 'Remove'}
              </button>
            </div>
          {/each}
        {:else}
          <div class="aliases-editor__empty">
            <strong>No aliases yet</strong>
            <p>Add a short alternate path when you want a memorable way to share your profile.</p>
          </div>
        {/if}
      </div>

      <form class="aliases-editor__form" on:submit|preventDefault={saveAlias}>
        <label for="profile-alias">New alias</label>
        <div class="aliases-editor__input-row">
          <span class="aliases-editor__prefix" aria-hidden="true">/a/</span>
          <input id="profile-alias" bind:value={draftAlias} maxlength="20" pattern={'[A-Za-z0-9_]{1,20}'} autocomplete="off" placeholder="your-short-name" disabled={saving || aliases.length >= MAX_PROFILE_ALIASES} />
          <button type="submit" class="aliases-editor__save" disabled={saving || aliases.length >= MAX_PROFILE_ALIASES}>
            {saving ? 'Saving…' : 'Add alias'}
          </button>
        </div>
        <small>{aliases.length} / {MAX_PROFILE_ALIASES} aliases used · aliases redirect to your canonical profile.</small>
      </form>
    {/if}

    {#if error}<p class="aliases-editor__message aliases-editor__message--error" role="alert">{error}</p>{/if}
    {#if status}<p class="aliases-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  </div>
</Module>

<style>
  .aliases-editor__content { display: grid; gap: var(--space-6); }
  .aliases-editor__list { display: grid; gap: var(--space-2); }
  .aliases-editor__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel); }
  .aliases-editor__row a { color: var(--color-ink-strong); font: 600 var(--type-small) / 1.3 var(--font-mono-stack); overflow-wrap: anywhere; }
  .aliases-editor__row a:hover { color: var(--profile-accent, var(--color-accent-bright)); }
  .aliases-editor__empty,
  .aliases-editor__state { display: grid; gap: var(--space-2); padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel); color: var(--color-ink-muted); }
  .aliases-editor__empty strong { color: var(--color-ink-strong); }
  .aliases-editor__empty p { margin: 0; line-height: var(--type-line-body); }
  .aliases-editor__form { display: grid; gap: var(--space-2); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .aliases-editor__form label { color: var(--color-ink-strong); font-size: var(--type-small); font-weight: 650; }
  .aliases-editor__input-row { display: flex; align-items: stretch; gap: var(--space-2); }
  .aliases-editor__prefix { display: inline-flex; align-items: center; padding: 0 var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-panel); color: var(--color-ink-muted); font: 600 var(--type-small) / 1 var(--font-mono-stack); }
  .aliases-editor__input-row input { flex: 1; min-width: 0; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); padding: 0.7rem 0.8rem; background: var(--surface-panel); color: var(--color-ink-strong); font: var(--type-small) / 1.2 var(--font-mono-stack); }
  .aliases-editor__input-row input:focus-visible,
  .aliases-editor__remove:focus-visible,
  .aliases-editor__save:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .aliases-editor__form small { color: var(--color-ink-muted); font-size: var(--type-label); }
  .aliases-editor__save,
  .aliases-editor__remove { border: 1px solid var(--profile-accent, var(--color-accent)); border-radius: var(--radius-sm); padding: 0.7rem 0.9rem; background: var(--profile-accent, var(--color-accent)); color: var(--color-canvas-deep); font: 700 var(--type-label) / 1.2 var(--font-body-stack); cursor: pointer; white-space: nowrap; }
  .aliases-editor__remove { border-color: var(--color-line-subtle); background: transparent; color: var(--color-ink-muted); }
  .aliases-editor__save:disabled,
  .aliases-editor__remove:disabled { cursor: not-allowed; opacity: 0.55; }
  .aliases-editor__message { margin: 0; color: var(--color-success, #8ee6bd); font-size: var(--type-small); }
  .aliases-editor__message--error { color: var(--color-danger, #ff9caa); }

  @media (max-width: 48rem) {
    .aliases-editor__input-row { display: grid; grid-template-columns: auto minmax(0, 1fr); }
    .aliases-editor__input-row input { min-height: 2.7rem; }
    .aliases-editor__save { grid-column: 1 / -1; justify-self: start; }
    .aliases-editor__row { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .aliases-editor__save,
    .aliases-editor__remove { transition: none; }
  }
</style>
