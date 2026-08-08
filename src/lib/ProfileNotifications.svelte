<script>
  import { onMount } from 'svelte';
  import Module from './foundation/Module.svelte';
  import { addToast } from './stores';
  import { supabase } from './supabase';
  import {
    createEmptyProfileNotifications,
    getProfileNotificationDetail,
    getProfileNotificationLabel,
    normalizeProfileNotifications
  } from './profileNotifications.js';

  let inbox = createEmptyProfileNotifications();
  let loading = true;
  let saving = false;
  let error = '';
  let notice = '';

  $: unread = inbox.notifications.filter(notification => !notification.readAt).length;

  onMount(() => { void loadNotifications(); });

  async function loadNotifications() {
    loading = true;
    error = '';
    const result = await supabase.rpc('get_my_profile_notifications', { p_limit: 50 });
    if (result.error || result.data?.success === false) {
      error = result.error?.message || result.data?.error || 'Notifications could not be loaded.';
      loading = false;
      return;
    }
    inbox = normalizeProfileNotifications(result.data);
    loading = false;
  }

  async function markAllRead() {
    if (saving || !inbox.notifications.some(notification => !notification.readAt)) return;
    saving = true;
    const ids = inbox.notifications.filter(notification => !notification.readAt).map(notification => notification.id);
    const result = await supabase.rpc('mark_my_profile_notifications_read', { p_notification_ids: ids });
    if (result.error || result.data?.success === false) {
      addToast(result.error?.message || result.data?.error || 'Notifications could not be marked read.', 'error');
      saving = false;
      return;
    }
    const readAt = new Date().toISOString();
    inbox = { ...inbox, unreadCount: 0, notifications: inbox.notifications.map(notification => ({ ...notification, readAt: notification.readAt || readAt })) };
    notice = 'Notifications marked as read.';
    saving = false;
  }
</script>

<Module size="wide" tone="accent" moduleId="profile-notifications" title="Notifications" description="A private record of community signals and earned profile milestones.">
  <div class="profile-notifications">
    {#if loading}
      <p class="profile-notifications__state" role="status" aria-live="polite">Loading your notifications…</p>
    {:else if error}
      <div class="profile-notifications__state" role="alert"><strong>Notifications are temporarily unavailable.</strong><p>{error}</p><button type="button" class="profile-notifications__button" on:click={loadNotifications}>Try again</button></div>
    {:else}
      {#if notice}<p class="profile-notifications__notice" role="status" aria-live="polite">{notice}</p>{/if}
      <div class="profile-notifications__toolbar">
        <div><strong>{inbox.unreadCount || unread}</strong><span>unread signal{(inbox.unreadCount || unread) === 1 ? '' : 's'}</span></div>
        <button type="button" class="profile-notifications__button profile-notifications__button--quiet" disabled={saving || unread === 0} on:click={markAllRead}>{saving ? 'Saving…' : 'Mark all read'}</button>
      </div>
      {#if inbox.notifications.length}
        <ol class="profile-notifications__list">
          {#each inbox.notifications as notification (notification.id)}
            <li class:unread={!notification.readAt} class="profile-notifications__item">
              <span class="profile-notifications__dot" aria-hidden="true"></span>
              <div class="profile-notifications__copy">
                <strong>{getProfileNotificationLabel(notification)}</strong>
                {#if getProfileNotificationDetail(notification)}<p>{getProfileNotificationDetail(notification)}</p>{/if}
                {#if notification.updatedAt || notification.createdAt}<time datetime={notification.updatedAt || notification.createdAt}>{new Date(notification.updatedAt || notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>{/if}
              </div>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="profile-notifications__empty"><strong>Your profile is quiet for now.</strong><p>Favorites, reactions, guestbook activity, and earned rewards will appear here without opening private messages.</p></div>
      {/if}
    {/if}
  </div>
</Module>

<style>
  .profile-notifications { display: grid; gap: var(--space-5); }
  .profile-notifications__state, .profile-notifications__empty { display: grid; gap: var(--space-2); padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); color: var(--color-ink-muted); }
  .profile-notifications__state strong, .profile-notifications__empty strong { color: var(--color-ink-strong); }
  .profile-notifications__state p, .profile-notifications__empty p { margin: 0; line-height: var(--type-line-body); }
  .profile-notifications__notice { margin: 0; color: var(--color-success, #8ee6bd); font-size: var(--type-small); }
  .profile-notifications__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-line-subtle); }
  .profile-notifications__toolbar > div { display: flex; align-items: baseline; gap: .45rem; }
  .profile-notifications__toolbar strong { color: var(--color-ink-strong); font: 600 var(--type-h2) / 1 var(--font-display-stack); }
  .profile-notifications__toolbar span { color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-notifications__button { min-height: 2.35rem; border: 1px solid var(--profile-accent); border-radius: var(--radius-sm); padding: .65rem .9rem; background: var(--profile-accent); color: var(--color-canvas-deep); font: 700 var(--type-label) / 1.2 var(--font-body-stack); cursor: pointer; }
  .profile-notifications__button--quiet { background: transparent; color: var(--color-ink-strong); }
  .profile-notifications__button:disabled { cursor: not-allowed; opacity: .5; }
  .profile-notifications__list { display: grid; gap: .65rem; margin: 0; padding: 0; list-style: none; }
  .profile-notifications__item { display: flex; align-items: flex-start; gap: .8rem; padding: .9rem 1rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); opacity: .72; }
  .profile-notifications__item.unread { border-color: color-mix(in srgb, var(--profile-accent) 48%, transparent); background: color-mix(in srgb, var(--profile-accent) 9%, var(--surface-panel-soft)); opacity: 1; }
  .profile-notifications__dot { flex: 0 0 .55rem; width: .55rem; height: .55rem; margin-top: .4rem; border-radius: 50%; background: var(--color-line-strong); }
  .profile-notifications__item.unread .profile-notifications__dot { background: var(--profile-accent); box-shadow: 0 0 .8rem color-mix(in srgb, var(--profile-accent) 60%, transparent); }
  .profile-notifications__copy { display: grid; min-width: 0; gap: .25rem; }
  .profile-notifications__copy strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-notifications__copy p { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.4; overflow-wrap: anywhere; }
  .profile-notifications__copy time { color: var(--color-ink-muted); font: 600 var(--type-label) / 1 var(--font-mono-stack); }
  .profile-notifications__button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  @media (max-width: 42rem) { .profile-notifications__toolbar { align-items: stretch; flex-direction: column; } }
</style>
