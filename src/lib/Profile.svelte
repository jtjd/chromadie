<script>
  import { profile, walletBalance, equippedItems } from './stores';
  import { escapeHtml } from './utils';
  import { getNameEffect, getFrameEffect, getTitleText } from './cosmetics';

  $: userCosmetics = $equippedItems;
  $: nameEff = getNameEffect(userCosmetics);
  $: frameEff = getFrameEffect(userCosmetics);
  $: titleTxt = getTitleText(userCosmetics);
  $: username = $profile?.username || 'Player';
</script>

<div class="container">
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>Player Profile</h2>
  </div>

  {#if $profile}
    <div class="card">
      <div style="margin-bottom: 20px;">
        {#if titleTxt}
          <span class="title-chip">[{titleTxt}]</span>
        {/if}
        <span class="profile-name-frame {frameEff.cls}" style="{frameEff.style}">
          <span class="profile-username-large {nameEff.cls}" style="{nameEff.style}" data-text={username}>{username}</span>
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-value">🔥 {$profile.current_streak || 0}</span>
          <span class="stat-label">Current Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">🏆 {$profile.longest_streak || 0}</span>
          <span class="stat-label">Longest Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">💎 {$profile.lifetime_ep?.toLocaleString() || 0}</span>
          <span class="stat-label">Lifetime EP</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">💸 {$profile.ep_spent?.toLocaleString() || 0}</span>
          <span class="stat-label">EP Spent</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="card"><p>Loading profile...</p></div>
  {/if}
</div>
