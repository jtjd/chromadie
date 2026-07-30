<script>
  import { createEventDispatcher } from 'svelte';
  import { addToast } from './stores';
  import { trackProductEvent } from './productAnalytics.js';

  export let username = '';
  export let shareUrl = '';
  export let isOwner = false;

  const dispatch = createEventDispatcher();
  let shareInProgress = false;

  async function shareProfile() {
    if (shareInProgress) return;
    shareInProgress = true;
    const url = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');

    try {
      let method = '';
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: username ? `${username} | chm.lol` : 'A ChromaDie profile',
          text: username ? `See ${username}'s color identity.` : 'See this color identity.',
          url
        });
        method = 'native';
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        method = 'clipboard';
      } else {
        throw new Error('Share is unavailable.');
      }

      trackProductEvent('profile_shared', { surface: 'profile', method });
      addToast(method === 'clipboard' ? 'Profile link copied.' : 'Profile shared.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') addToast('Could not share this profile.', 'error');
    } finally {
      shareInProgress = false;
    }
  }
</script>

<header class="profile-mode-header">
  <a class="profile-mode-header__brand" href="/" aria-label="ChromaDie home">
    <img src="/logo-mark.svg" alt="" width="18" height="18" />
    <span>chm<span>.lol</span></span>
  </a>

  <nav class="profile-mode-header__nav" aria-label="Profile navigation">
    <a href="/leaderboard" on:click|preventDefault={() => dispatch('discover')}>Discover</a>
    <span aria-hidden="true">/</span>
    <button type="button" on:click={shareProfile} disabled={shareInProgress}>
      {shareInProgress ? 'Sharing…' : 'Share'}
    </button>
    {#if isOwner}
      <span aria-hidden="true">/</span>
      <button type="button" on:click={() => dispatch('edit')}>Edit</button>
    {/if}
  </nav>
</header>

<style>
  .profile-mode-header {
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    min-height: 4.75rem;
    padding: 1rem clamp(1.25rem, 4vw, 3rem);
    color: rgba(239, 244, 255, 0.72);
    background: transparent;
  }

  .profile-mode-header__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(246, 248, 255, 0.94);
    font: 600 0.92rem / 1 var(--font-body-stack);
    letter-spacing: -0.035em;
    text-decoration: none;
  }

  .profile-mode-header__brand img { width: 1.15rem; height: 1.15rem; object-fit: contain; opacity: 0.78; }
  .profile-mode-header__brand span { color: rgba(246, 248, 255, 0.38); }

  .profile-mode-header__nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
    padding: 0.25rem 0.35rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: var(--radius-pill);
    background: rgba(7, 8, 11, 0.52);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 0.75rem 2rem rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: rgba(232, 238, 250, 0.62);
    font: 500 0.78rem / 1 var(--font-body-stack);
    letter-spacing: 0.01em;
    text-transform: lowercase;
  }

  .profile-mode-header__nav a,
  .profile-mode-header__nav button {
    min-height: 2.05rem;
    padding: 0.55rem 0.75rem;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: color var(--motion-base) var(--motion-ease-standard);
  }

  .profile-mode-header__nav a:hover,
  .profile-mode-header__nav button:hover:not(:disabled) { color: rgba(246, 248, 255, 0.94); }
  .profile-mode-header__nav button:disabled { cursor: wait; opacity: 0.55; }
  .profile-mode-header__nav a:focus-visible,
  .profile-mode-header__nav button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: 0.25rem; }

  @media (max-width: 36rem) {
    .profile-mode-header { min-height: 3.85rem; padding-inline: 1rem; }
    .profile-mode-header__nav { gap: 0.45rem; font-size: 0.65rem; letter-spacing: 0.1em; }
    .profile-mode-header__nav span { opacity: 0.65; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-mode-header__nav a,
    .profile-mode-header__nav button { transition-duration: 0.001ms; }
  }
</style>
