<script>
  import { session, profile, equippedItems, selectedUserId, followedUsers } from './lib/stores';
  import { supabase } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import Admin from './lib/Admin.svelte';
  import { getNameEffect, getFrameEffect, getTitleText } from './lib/cosmetics';
  import { onMount } from 'svelte';

  let view = 'game';
  let showAuthModal = false;
  let challengeData = null;

  supabase.auth.getSession().then(({ data }) => session.set(data.session));

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const cScore = params.get('challenge');
    const cHex = params.get('hex');
    if (cScore && cHex) {
      challengeData = { score: parseInt(cScore), hex: `#${cHex}` };
    }
  });

  function handleLogout() {
    localStorage.removeItem('chromadie-roll');
    supabase.auth.signOut();
    handleNavClick('game');
  }

  function handleNavClick(newView) {
    selectedUserId.set(null);
    view = newView;
  }

  function handleNavigation(event) {
    view = event.detail;
  }

  $: userCosmetics = $equippedItems;
  $: nameEff = getNameEffect(userCosmetics);
  $: frameEff = getFrameEffect(userCosmetics);
  $: titleTxt = getTitleText(userCosmetics);
  $: username = $profile?.username || 'Guest';

  $: if ($session && showAuthModal) {
    showAuthModal = false;
  }
</script>

<Toast />

{#if showAuthModal}
  <div class="auth-modal-overlay" role="button" tabindex="0" on:click|self={() => showAuthModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showAuthModal = false)}>
    <div class="auth-modal-content">
      <Auth />
    </div>
  </div>
{/if}

{#if challengeData && view === 'game'}
  <div class="challenge-banner">
    <div class="challenge-info">
      <span class="challenge-text">Player challenges you to beat:</span>
      <div class="challenge-stat">
        <span class="challenge-color" style="background-color: {challengeData.hex};"></span>
        <span class="challenge-score">{challengeData.score.toLocaleString()} pts</span>
      </div>
    </div>
    <button class="challenge-close" on:click={() => challengeData = null}>✖</button>
  </div>
{/if}

<div id="header-mount">
  <header class="site-header">
    <a href="/" class="logo">🎲 ChromaDie</a>
    <nav class="nav-links">
      <button class="nav-link" class:active={view === 'game'} on:click={() => handleNavClick('game')}>Game</button>
      <button class="nav-link" class:active={view === 'shop'} on:click={() => handleNavClick('shop')}>Shop</button>
      <button class="nav-link" class:active={view === 'leaderboard'} on:click={() => handleNavClick('leaderboard')}>Leaderboard</button>
      <button class="nav-link" class:active={view === 'profile'} on:click={() => handleNavClick('profile')}>Profile</button>

      {#if $profile?.is_admin}
        <button class="nav-link admin-link" class:active={view === 'admin'} on:click={() => handleNavClick('admin')}>Admin</button>
      {/if}

      {#if $session}
        <div class="user-chip {frameEff.cls}" style="{frameEff.style}">
          {#if titleTxt}
            <span class="title-chip">[{titleTxt}]</span>
          {/if}
          <span class="user-name {nameEff.cls}" style="{nameEff.style}" data-text={username}>
            {username}
          </span>
          <button class="logout-btn" on:click={handleLogout}>Log Out</button>
        </div>
      {:else}
        <button class="login-btn-header" on:click={() => showAuthModal = true}>Log In / Sign Up</button>
      {/if}
    </nav>
  </header>
</div>

{#if $session}
  {#if view === 'game'}
    <Game on:promptlogin={() => showAuthModal = true} />
  {:else if view === 'shop'}
    <Shop />
  {:else if view === 'leaderboard'}
    <Leaderboard on:navigate={handleNavigation} />
  {:else if view === 'profile'}
    <Profile userId={$selectedUserId} />
  {:else if view === 'admin' && $profile?.is_admin}
    <Admin />
  {/if}
{:else}
  {#if view === 'game'}
    <Game on:promptlogin={() => showAuthModal = true} />
  {:else}
    <GuestLock view={view} on:login={() => showAuthModal = true} />
  {/if}
{/if}

<style>
  .auth-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .auth-modal-content {
    width: 100%; max-width: 450px; position: relative; z-index: 1;
  }

  .challenge-banner {
    max-width: 650px;
    margin: 20px auto 0;
    padding: 15px 20px;
    background: rgba(139, 124, 246, 0.1);
    border: 1px solid rgba(139, 124, 246, 0.4);
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    animation: slideDown 0.4s ease-out;
  }
  .challenge-info { display: flex; flex-direction: column; gap: 5px; }
  .challenge-text { font-size: 0.8rem; color: var(--text-muted); }
  .challenge-stat { display: flex; align-items: center; gap: 10px; }
  .challenge-color { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
  .challenge-score { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-purple); font-size: 1.1rem; }
  .challenge-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; }
  .challenge-close:hover { color: #fff; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .admin-link { color: var(--accent-green) !important; }
</style>
