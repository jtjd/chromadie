<script>
  import { getBadgeMeta } from './badgeData';

  export let systemBadges = [];
  export let earnedAchievements = [];
</script>

<div class="roll-detail-grid">
  {#if systemBadges.length > 0}
    <section class="roll-detail-section badges-container badges-container-tight" aria-labelledby="roll-rewards-title">
      <div class="roll-detail-section__heading">
        <div class="badges-title" id="roll-rewards-title">EP bonuses & milestones</div>
        <div class="badges-subtitle">Wallet rewards · separate from score</div>
      </div>
      {#each systemBadges as badgeId (badgeId)}
        {@const badge = getBadgeMeta(badgeId)}
        <div class="badge-result roll-detail-item rarity-Mythic">
          <span class="badge-symbol">{badge.symbol || '✨'}</span>
          <div class="badge-text">
            <span class="badge-title">{badge.name}</span>
            <span class="badge-desc">{badge.desc || ''}</span>
          </div>
          {#if badge.points > 0}
            <span class="badge-points ep-points">+{badge.points.toLocaleString()} EP</span>
          {:else}
            <span class="badge-points ep-points">Granted</span>
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  {#if earnedAchievements.length > 0}
    <section class="roll-detail-section badges-container badges-container-tight" aria-labelledby="roll-achievements-title">
      <div class="roll-detail-section__heading">
        <div class="badges-title" id="roll-achievements-title">Achievements unlocked</div>
        <div class="badges-subtitle">New rewards from this roll</div>
      </div>
      {#each earnedAchievements as badgeId (badgeId)}
        {@const badge = getBadgeMeta(badgeId)}
        <div class="badge-result roll-detail-item rarity-Mythic">
          <span class="badge-symbol">{badge.symbol || '🏆'}</span>
          <div class="badge-text">
            <span class="badge-title">{badge.name}</span>
            <span class="badge-desc">{badge.desc}</span>
          </div>
          <span class="badge-points ep-points">+{badge.points.toLocaleString()} EP</span>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .badges-container-tight { margin-bottom: 0 !important; margin-top: 20px; }
  .badges-subtitle { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 10px; text-align: left; opacity: 0.8; }
  .ep-points { color: #f1c40f !important; text-shadow: 0 0 10px rgba(241, 196, 15, 0.3) !important; }

  @media (max-width: 600px) {
    .badges-container { gap: 6px; }
    .badge-result {
      align-items: flex-start;
      gap: 10px;
      padding: 9px 12px;
    }
    .badge-text { min-width: 0; }
    .badge-points {
      padding-left: 0;
      margin-left: 0;
      width: 100%;
      text-align: right;
    }
  }
</style>
