<script>
  import { session, profile, equippedItems, shopItems, selectedUserId } from './lib/stores';
  import { supabase } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import { getNameEffect, getFrameEffect, getTitleText } from './lib/cosmetics';

  let view = 'game';
  let showAuthModal = false;

  supabase.auth.getSession().then(({ data }) => session.set(data.session));

  function handleLogout() {
    localStorage.removeItem('chromadie-roll');
    supabase.auth.signOut();
    handleNavClick('game');
  }

  // FIX: Clear selectedUserId whenever navigating via the header
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

<div id="header-mount">
  <header class="site-header">
    <a href="/" class="logo">🎲 ChromaDie</a>
    <nav class="nav-links">
      <button class="nav-link" class:active={view === 'game'} on:click={() => handleNavClick('game')}>Game</button>
      <button class="nav-link" class:active={view === 'shop'} on:click={() => handleNavClick('shop')}>Shop</button>
      <button class="nav-link" class:active={view === 'leaderboard'} on:click={() => handleNavClick('leaderboard')}>Leaderboard</button>
      <button class="nav-link" class:active={view === 'profile'} on:click={() => handleNavClick('profile')}>Profile</button>

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
</style>
