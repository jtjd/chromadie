<script>
  import { createEventDispatcher } from 'svelte';
  import { addToast } from './stores';
  import { supabase } from './supabase';
  import Module from './foundation/Module.svelte';
  import {
    PROFILE_REACTION_LABELS,
    PROFILE_REACTION_TYPES,
    createDefaultProfileSocialSettings,
    createEmptyProfileSocial,
    getProfileSocialError,
    invokeProfileSocialRpc,
    normalizeProfileSocial,
    normalizeProfileSocialSettings
  } from './profileSocial.js';

  export let profileId = null;
  export let username = '';
  export let isOwnProfile = false;
  export let isAuthenticated = false;
  export let social = createEmptyProfileSocial();
  export let settings = createDefaultProfileSocialSettings();

  const dispatch = createEventDispatcher();
  const REPORT_REASONS = [
    ['spam', 'Spam or promotion'],
    ['harassment', 'Harassment'],
    ['hate', 'Hateful content'],
    ['sexual', 'Sexual content'],
    ['impersonation', 'Impersonation'],
    ['other', 'Something else']
  ];

  let actionLoading = '';
  let guestbookBody = '';
  let guestbookError = '';
  let notice = '';
  let reportOpen = false;
  let reportEntryKey = null;
  let reportReason = 'spam';
  let reportDetails = '';
  let reportLoading = false;
  let settingsLoading = false;
  let settingsDraft = createDefaultProfileSocialSettings();

  $: socialView = normalizeProfileSocial(social);
  $: settingsDraft = normalizeProfileSocialSettings(settings);
  $: canInteract = Boolean(isAuthenticated && !isOwnProfile && !socialView.blocked && socialView.interactionsEnabled);
  $: canWriteGuestbook = Boolean(canInteract && socialView.guestbookEnabled);

  function setNotice(message) {
    notice = message;
    setTimeout(() => {
      if (notice === message) notice = '';
    }, 4500);
  }

  async function runAction(actionKey, functionName, args, successMessage) {
    if (actionLoading) return false;
    actionLoading = actionKey;
    const result = await invokeProfileSocialRpc(supabase, functionName, args);
    actionLoading = '';
    if (result.error || result.data?.success === false) {
      addToast(getProfileSocialError(result), 'error');
      return false;
    }
    if (successMessage) setNotice(successMessage);
    dispatch('socialchange');
    return true;
  }

  async function toggleFavorite() {
    if (!canInteract || !profileId) return;
    await runAction(
      'favorite',
      'toggle_profile_favorite',
      { p_profile_id: profileId },
      socialView.viewerFavorited ? 'Profile removed from favorites.' : 'Profile saved to favorites.'
    );
  }

  async function toggleReaction(type) {
    if (!canInteract || !profileId || !PROFILE_REACTION_TYPES.includes(type)) return;
    await runAction(
      'reaction:' + type,
      'toggle_profile_reaction',
      { p_profile_id: profileId, p_reaction_type: type },
      socialView.viewerReactions.includes(type) ? 'Reaction removed.' : 'Positive reaction sent.'
    );
  }

  async function submitGuestbook() {
    if (!canWriteGuestbook || !profileId || actionLoading) return;
    const body = guestbookBody.trim();
    guestbookError = '';
    if (!body) {
      guestbookError = 'Write a short note first.';
      return;
    }
    if (body.length > 240) {
      guestbookError = 'Notes are limited to 240 characters.';
      return;
    }
    const succeeded = await runAction(
      'guestbook',
      'create_profile_guestbook_entry',
      { p_profile_id: profileId, p_body: body },
      'Your note is on the profile.'
    );
    if (succeeded) guestbookBody = '';
  }

  async function deleteEntry(entryKey) {
    if (!entryKey || actionLoading) return;
    await runAction(
      'delete:' + entryKey,
      'delete_profile_guestbook_entry',
      { p_entry_key: entryKey },
      'Guestbook note removed.'
    );
  }

  async function toggleBlock() {
    if (!profileId || !isAuthenticated || isOwnProfile) return;
    await runAction(
      'block',
      'toggle_profile_block',
      { p_profile_id: profileId },
      socialView.blocked ? 'Profile unblocked.' : 'Profile blocked. Social connections were removed.'
    );
  }

  function openReport(entryKey = null) {
    reportEntryKey = entryKey;
    reportReason = 'spam';
    reportDetails = '';
    reportOpen = true;
  }

  async function submitReport() {
    if (!profileId || !isAuthenticated || reportLoading) return;
    reportLoading = true;
    const result = await invokeProfileSocialRpc(supabase, 'report_profile_social_content', {
      p_target_profile_id: profileId,
      p_entry_key: reportEntryKey,
      p_reason: reportReason,
      p_details: reportDetails.trim()
    });
    reportLoading = false;
    if (result.error || result.data?.success === false) {
      addToast(getProfileSocialError(result, 'The report could not be submitted.'), 'error');
      return;
    }
    reportOpen = false;
    setNotice(result.data?.action === 'already_reported' ? 'That report is already recorded.' : 'Thanks. The report was recorded for review.');
  }

  function updateSetting(key, value) {
    settingsDraft = { ...settingsDraft, [key]: value };
  }

  async function saveSettings() {
    if (!isOwnProfile || settingsLoading) return;
    settingsLoading = true;
    const result = await invokeProfileSocialRpc(supabase, 'update_my_profile_social_settings', {
      p_interactions_enabled: settingsDraft.interactionsEnabled,
      p_guestbook_enabled: settingsDraft.guestbookEnabled,
      p_activity_visible: settingsDraft.activityVisible,
      p_discoverable: settingsDraft.discoverable
    });
    settingsLoading = false;
    if (result.error || result.data?.success === false) {
      addToast(getProfileSocialError(result, 'Privacy settings could not be saved.'), 'error');
      return;
    }
    settingsDraft = normalizeProfileSocialSettings(result.data);
    setNotice('Privacy settings saved.');
    dispatch('socialchange');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }
</script>

<Module size="wide" tone="accent" moduleId="profile-social" eyebrow="Social settings" title="Control profile interactions" description="Manage favorites, reactions, guestbook notes, and discovery visibility.">
  <div class="profile-social">
    {#if notice}<p class="profile-social__notice" role="status" aria-live="polite">{notice}</p>{/if}

    {#if socialView.blocked}
      <div class="profile-social__blocked" role="status">
        <strong>Social connection paused.</strong>
        <p>This profile is blocked for your account. Unblock it to restore social controls.</p>
        {#if isAuthenticated && !isOwnProfile}
          <button type="button" class="profile-social__button profile-social__button--quiet" disabled={actionLoading === 'block'} on:click={toggleBlock}>
            {actionLoading === 'block' ? 'Updating…' : 'Unblock profile'}
          </button>
          <button type="button" class="profile-social__text-button" on:click={() => openReport()}>Report profile</button>
        {/if}
      </div>
    {:else}
      <div class="profile-social__signals" aria-label={username + ' social signals'}>
        <div class="profile-social__save">
          <div>
            <strong>Favorite this identity</strong>
            <span>{socialView.favoriteCount} saved</span>
          </div>
          {#if isOwnProfile}
            <span class="profile-social__owner-note">Your profile</span>
          {:else if isAuthenticated}
            <button type="button" class="profile-social__button" class:active={socialView.viewerFavorited} disabled={!canInteract || actionLoading === 'favorite'} on:click={toggleFavorite}>
              {actionLoading === 'favorite' ? 'Saving…' : socialView.viewerFavorited ? 'Saved' : 'Save profile'}
            </button>
          {:else}
            <span class="profile-social__owner-note">Sign in to save</span>
          {/if}
        </div>

        <div class="profile-social__reactions">
          <div class="profile-social__subheading">
            <strong>Positive reactions</strong>
            <span>Small signals, no score impact</span>
          </div>
          <div class="profile-social__reaction-list">
            {#each PROFILE_REACTION_TYPES as type (type)}
              <button
                type="button"
                class="profile-social__reaction"
                class:active={socialView.viewerReactions.includes(type)}
                disabled={!canInteract || actionLoading === 'reaction:' + type}
                aria-pressed={socialView.viewerReactions.includes(type)}
                on:click={() => toggleReaction(type)}
              >
                <span aria-hidden="true">{type === 'spark' ? '✦' : type === 'glow' ? '◈' : '✺'}</span>
                {PROFILE_REACTION_LABELS[type]}
                <b>{socialView.reactionCounts[type]}</b>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="profile-social__guestbook">
        <div class="profile-social__subheading">
          <strong>Guestbook</strong>
          <span>{socialView.guestbook.length} visible note{socialView.guestbook.length === 1 ? '' : 's'}</span>
        </div>

        {#if socialView.guestbook.length}
          <div class="profile-social__entries">
            {#each socialView.guestbook as entry (entry.entryKey)}
              <article class="profile-social__entry">
                <div class="profile-social__entry-meta">
                  <strong>{entry.author}</strong>
                  {#if entry.createdAt}<time datetime={entry.createdAt}>{formatDate(entry.createdAt)}</time>{/if}
                </div>
                <p>{entry.body}</p>
                <div class="profile-social__entry-actions">
                  {#if entry.canDelete}
                    <button type="button" class="profile-social__text-button" disabled={actionLoading === 'delete:' + entry.entryKey} on:click={() => deleteEntry(entry.entryKey)}>Delete</button>
                  {/if}
                  {#if isAuthenticated && !isOwnProfile}
                    <button type="button" class="profile-social__text-button" on:click={() => openReport(entry.entryKey)}>Report</button>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <p class="profile-social__empty">No notes yet. A thoughtful sentence can become part of this color identity.</p>
        {/if}

        {#if isOwnProfile}
          <p class="profile-social__helper">You can delete any note on your profile. Visitors cannot see private account data here.</p>
        {:else if !socialView.guestbookEnabled}
          <p class="profile-social__helper">{username} is not accepting new guestbook notes right now.</p>
        {:else if isAuthenticated}
          <form class="profile-social__form" on:submit|preventDefault={submitGuestbook}>
            <label for="profile-guestbook-body">Leave a short note</label>
            <textarea id="profile-guestbook-body" bind:value={guestbookBody} maxlength="240" rows="3" placeholder="A kind word about this color identity…" disabled={!canWriteGuestbook || actionLoading === 'guestbook'}></textarea>
            <div class="profile-social__form-row">
              <span>{guestbookBody.length}/240 · plain text, no links</span>
              <button type="submit" class="profile-social__button" disabled={!canWriteGuestbook || actionLoading === 'guestbook'}>{actionLoading === 'guestbook' ? 'Posting…' : 'Sign guestbook'}</button>
            </div>
            {#if guestbookError}<p class="profile-social__error" role="alert">{guestbookError}</p>{/if}
          </form>
        {:else}
          <p class="profile-social__helper">Sign in to leave a moderated guestbook note.</p>
        {/if}
      </div>

      {#if isAuthenticated && !isOwnProfile}
        <div class="profile-social__safety">
          <div>
            <strong>Keep your space comfortable</strong>
            <span>Block a profile or report a note for review.</span>
          </div>
          <div class="profile-social__safety-actions">
            <button type="button" class="profile-social__button profile-social__button--quiet" disabled={actionLoading === 'block'} on:click={toggleBlock}>{actionLoading === 'block' ? 'Updating…' : 'Block profile'}</button>
            <button type="button" class="profile-social__text-button" on:click={() => openReport()}>Report profile</button>
          </div>
        </div>
      {/if}

    {/if}

    {#if reportOpen && isAuthenticated && !isOwnProfile}
      <form class="profile-social__report" on:submit|preventDefault={submitReport}>
        <div class="profile-social__subheading">
          <strong>{reportEntryKey ? 'Report this guestbook note' : 'Report this profile'}</strong>
          <span>Only moderation staff can see report details.</span>
        </div>
        <label for="profile-report-reason">Reason</label>
        <select id="profile-report-reason" bind:value={reportReason}>
          {#each REPORT_REASONS as [value, label] (value)}
            <option value={value}>{label}</option>
          {/each}
        </select>
        <label for="profile-report-details">Details <span>(optional)</span></label>
        <textarea id="profile-report-details" bind:value={reportDetails} maxlength="500" rows="3" placeholder="What should moderation review?"></textarea>
        <div class="profile-social__form-row">
          <button type="button" class="profile-social__text-button" on:click={() => reportOpen = false}>Cancel</button>
          <button type="submit" class="profile-social__button" disabled={reportLoading}>{reportLoading ? 'Submitting…' : 'Submit report'}</button>
        </div>
      </form>
    {/if}

    {#if isOwnProfile}
      <div class="profile-social__settings">
        <div class="profile-social__subheading">
          <strong>Privacy and interaction controls</strong>
          <span>You decide how much of this profile invites conversation.</span>
        </div>
        <label class="profile-social__check"><input type="checkbox" checked={settingsDraft.interactionsEnabled} on:change={(event) => updateSetting('interactionsEnabled', event.currentTarget.checked)} /><span><b>Allow favorites, reactions, and rivals</b><small>Turn off new social connections while keeping your public profile visible.</small></span></label>
        <label class="profile-social__check"><input type="checkbox" checked={settingsDraft.guestbookEnabled} on:change={(event) => updateSetting('guestbookEnabled', event.currentTarget.checked)} /><span><b>Accept guestbook notes</b><small>Existing notes remain visible until you remove them.</small></span></label>
        <label class="profile-social__check"><input type="checkbox" checked={settingsDraft.activityVisible} on:change={(event) => updateSetting('activityVisible', event.currentTarget.checked)} /><span><b>Show recent color activity</b><small>Hides the recent roll timeline and collection story from visitors.</small></span></label>
        <label class="profile-social__check"><input type="checkbox" checked={settingsDraft.discoverable} on:change={(event) => updateSetting('discoverable', event.currentTarget.checked)} /><span><b>Include me in discovery</b><small>Your direct public profile link continues to work when this is off.</small></span></label>
        <button type="button" class="profile-social__button" disabled={settingsLoading} on:click={saveSettings}>{settingsLoading ? 'Saving…' : 'Save privacy settings'}</button>
      </div>
    {/if}
  </div>
</Module>

<style>
  .profile-social { display: grid; gap: var(--space-6); }
  .profile-social__notice,
  .profile-social__error { margin: 0; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); font-size: var(--type-small); }
  .profile-social__notice { border: 1px solid color-mix(in srgb, var(--color-accent-cyan) 36%, transparent); background: color-mix(in srgb, var(--color-accent-cyan) 10%, transparent); color: var(--color-ink-strong); }
  .profile-social__error { color: var(--color-danger, #ff8e9b); }
  .profile-social__signals { display: grid; gap: var(--space-4); }
  .profile-social__save,
  .profile-social__safety { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); }
  .profile-social__save > div,
  .profile-social__safety > div,
  .profile-social__subheading { display: grid; gap: var(--space-1); }
  .profile-social__save strong,
  .profile-social__safety strong,
  .profile-social__subheading strong { color: var(--color-ink-strong); font-size: var(--type-body); }
  .profile-social__save span,
  .profile-social__safety span,
  .profile-social__subheading span,
  .profile-social__owner-note,
  .profile-social__helper,
  .profile-social__empty { color: var(--color-ink-muted); font-size: var(--type-small); line-height: var(--type-line-body); }
  .profile-social__owner-note { white-space: nowrap; }
  .profile-social__button { min-height: 2.4rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 60%, transparent); border-radius: var(--radius-pill); padding: 0 var(--space-4); background: color-mix(in srgb, var(--profile-accent) 18%, transparent); color: var(--color-ink-strong); font: 700 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; transition: background-color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard); }
  .profile-social__button:hover:not(:disabled) { transform: translateY(-1px); background: color-mix(in srgb, var(--profile-accent) 32%, transparent); }
  .profile-social__button:disabled { cursor: wait; opacity: 0.55; }
  .profile-social__button.active { border-color: var(--color-accent-cyan); background: color-mix(in srgb, var(--color-accent-cyan) 20%, transparent); }
  .profile-social__button--quiet { border-color: var(--color-line-strong); background: transparent; }
  .profile-social__reactions,
  .profile-social__guestbook,
  .profile-social__settings,
  .profile-social__report { display: grid; gap: var(--space-4); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .profile-social__reaction-list { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .profile-social__reaction { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 2.35rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-pill); padding: 0 var(--space-3); background: var(--surface-panel-soft); color: var(--color-ink-muted); font: 700 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; }
  .profile-social__reaction:hover:not(:disabled),
  .profile-social__reaction.active { border-color: color-mix(in srgb, var(--profile-accent) 60%, transparent); background: color-mix(in srgb, var(--profile-accent) 18%, transparent); color: var(--color-ink-strong); }
  .profile-social__reaction:disabled { cursor: default; opacity: 0.62; }
  .profile-social__reaction span { color: var(--profile-accent); font-size: 1rem; }
  .profile-social__reaction b { color: var(--color-ink-strong); }
  .profile-social__entries { display: grid; gap: var(--space-3); }
  .profile-social__entry { display: grid; gap: var(--space-2); padding: var(--space-4); border-left: 2px solid var(--profile-accent); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--surface-panel-soft); }
  .profile-social__entry-meta,
  .profile-social__entry-actions,
  .profile-social__form-row,
  .profile-social__safety-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .profile-social__entry-meta strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-social__entry-meta time { color: var(--color-ink-muted); font: 600 var(--type-label) / 1 var(--font-mono-stack); }
  .profile-social__entry p { margin: 0; color: var(--color-ink); line-height: var(--type-line-body); overflow-wrap: anywhere; white-space: pre-wrap; }
  .profile-social__text-button { border: 0; padding: 0; background: transparent; color: var(--color-ink-muted); font: 700 var(--type-label) / 1.2 var(--font-body-stack); cursor: pointer; }
  .profile-social__text-button:hover:not(:disabled) { color: var(--color-ink-strong); text-decoration: underline; text-underline-offset: 0.2em; }
  .profile-social__text-button:disabled { cursor: wait; opacity: 0.55; }
  .profile-social__form,
  .profile-social__report { display: grid; gap: var(--space-3); }
  .profile-social__form label,
  .profile-social__report label { color: var(--color-ink-strong); font: 700 var(--type-label) / 1.2 var(--font-body-stack); }
  .profile-social__report label span { color: var(--color-ink-muted); font-weight: 500; }
  .profile-social textarea,
  .profile-social select { width: 100%; border: 1px solid var(--color-line-strong); border-radius: var(--radius-sm); padding: var(--space-3); background: var(--color-canvas-deep); color: var(--color-ink-strong); font: 500 var(--type-small) / 1.4 var(--font-body-stack); }
  .profile-social textarea { resize: vertical; }
  .profile-social textarea:focus-visible,
  .profile-social select:focus-visible,
  .profile-social button:focus-visible,
  .profile-social input:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-social__form-row { color: var(--color-ink-muted); font: 600 var(--type-label) / 1.2 var(--font-mono-stack); }
  .profile-social__form-row .profile-social__button { font-family: var(--font-body-stack); }
  .profile-social__safety { align-items: flex-start; }
  .profile-social__safety-actions { flex-wrap: wrap; justify-content: flex-end; }
  .profile-social__blocked { display: grid; gap: var(--space-3); padding: var(--space-5); border: 1px solid color-mix(in srgb, var(--color-warning) 42%, transparent); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warning) 8%, transparent); }
  .profile-social__blocked strong { color: var(--color-ink-strong); }
  .profile-social__blocked p { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-social__check { display: flex; align-items: flex-start; gap: var(--space-3); color: var(--color-ink-strong); cursor: pointer; }
  .profile-social__check input { flex: 0 0 auto; width: 1.1rem; height: 1.1rem; margin-top: 0.15rem; accent-color: var(--profile-accent); }
  .profile-social__check span { display: grid; gap: var(--space-1); }
  .profile-social__check b { font-size: var(--type-small); }
  .profile-social__check small { color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.4; }
  @media (max-width: 46rem) {
    .profile-social__save,
    .profile-social__safety { align-items: flex-start; flex-direction: column; }
    .profile-social__safety-actions { justify-content: flex-start; }
    .profile-social__form-row { align-items: flex-start; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .profile-social__button { transition: none; }
    .profile-social__button:hover:not(:disabled) { transform: none; }
  }
</style>
