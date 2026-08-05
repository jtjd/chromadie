<script>
  import { createEventDispatcher } from 'svelte';
  import { deleteAccount } from './accountDeletion';
  import { supabase } from './supabase';

  const dispatch = createEventDispatcher();
  let confirmation = '';
  let loading = false;
  let error = '';
  let notice = '';

  async function removeAccount() {
    if (loading) return;
    if (confirmation.trim().toUpperCase() !== 'DELETE') {
      error = 'Type DELETE to confirm account deletion.';
      return;
    }
    loading = true;
    error = '';
    notice = '';
    const result = await deleteAccount(supabase, 'DELETE');
    loading = false;
    if (!result.success) {
      error = result.error?.message || 'Could not delete the account.';
      return;
    }
    notice = result.alreadyDeleted
      ? 'This account was already deleted.'
      : result.cleanup?.missing_profile
        ? 'Account deleted. Some profile data was already missing.'
        : 'Account deleted.';
    dispatch('accountdeleted', { ...result, message: notice });
  }
</script>

<section class="account-settings" aria-labelledby="account-settings-title">
  <header class="account-settings__heading"><h2 id="account-settings-title">Account</h2><span>Danger zone</span></header>
  <div class="account-settings__card">
    <h3>Delete account</h3>
    <p>This permanently deletes your profile, rolls, inventory, achievements, and other app-owned account data.</p>
    <label for="dashboard-delete-confirm">Type DELETE to confirm</label>
    <input id="dashboard-delete-confirm" bind:value={confirmation} autocomplete="off" spellcheck="false" />
    {#if error}<p class="account-settings__error" role="alert">{error}</p>{/if}
    {#if notice}<p class="account-settings__notice" role="status">{notice}</p>{/if}
    <button type="button" disabled={loading || confirmation.trim().toUpperCase() !== 'DELETE'} on:click={removeAccount}>{loading ? 'Deleting…' : 'Delete account permanently'}</button>
  </div>
</section>

<style>
  .account-settings { display: grid; gap: 1rem; max-width: 52rem; }
  .account-settings__heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .account-settings__heading h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1rem; }
  .account-settings__heading span { color: #ff9da9; font: .62rem/1 var(--site-mono, monospace); }
  .account-settings__card { padding: 1.2rem; border: 1px solid rgba(255, 112, 132, .28); border-radius: .55rem; background: color-mix(in srgb, #ff7084 4%, var(--site-raised, #111319)); }
  .account-settings__card h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .9rem; }
  .account-settings__card p { max-width: 42rem; color: var(--site-muted, #aaa8b0); font-size: .74rem; line-height: 1.5; }
  .account-settings__card label { display: block; margin-top: 1rem; color: var(--site-muted, #aaa8b0); font-size: .68rem; }
  .account-settings__card input { width: min(100%, 20rem); margin-top: .45rem; padding: .65rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); font: .72rem/1 var(--site-mono, monospace); }
  .account-settings__card input:focus { border-color: #ff7084; outline: 2px solid color-mix(in srgb, #ff7084 30%, transparent); outline-offset: 2px; }
  .account-settings__card button { margin-top: 1rem; padding: .6rem .75rem; border: 1px solid #ff7084; border-radius: .35rem; background: transparent; color: #ff9da9; font-size: .7rem; cursor: pointer; }
  .account-settings__card button:hover:not(:disabled) { background: rgba(255,112,132,.1); }
  .account-settings__card button:disabled { cursor: not-allowed; opacity: .4; }
  .account-settings__error { color: #ff9da9 !important; }
  .account-settings__notice { color: #a9e4bb !important; }
</style>
