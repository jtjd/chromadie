<script>
  import RollPreview from './RollPreview.svelte';
  import { sanitizeCosmeticClass, sanitizeCosmeticStyle } from './cosmeticSafety';

  export let item;

  $: effectClass = item?.css_type === 'class' ? sanitizeCosmeticClass(item.css_value) : '';
  $: effectStyle = item?.css_type === 'style' ? sanitizeCosmeticStyle(item.css_value) : '';
</script>

<div class="shop-preview-area {item.slot === 'profile_border' || item.slot === 'lb_theme' ? 'shop-preview-area-tall' : ''} {item.slot === 'roll_effect' ? 'shop-preview-area-roll-effect' : ''}">
  {#if item.slot === 'profile_bg'}
    <div class="preview-bg" style={effectStyle}></div>
  {:else if item.slot === 'roll_effect'}
    <RollPreview effectCls={effectClass} effectStyle={effectStyle} size="shop" />
  {:else if item.slot === 'lb_theme'}
    <div class="leaderboard-row preview-lb-row {effectClass}" style={effectStyle}>
      <span class="lb-rank preview-lb-rank">#1</span>
      <div class="lb-info preview-lb-info">
        <span class="lb-username preview-lb-name">YourName</span>
        <span class="preview-lb-sub">#7B5CFF • Mythic</span>
      </div>
      <span class="lb-score preview-lb-score">9.8M</span>
    </div>
  {:else if item.slot === 'orb_shape'}
    <div class="preview-orb-shape {effectClass}"></div>
  {:else if item.slot === 'profile_border'}
    <div class="preview-profile-card {effectClass}" style={effectStyle}>
      <div class="preview-profile-topline">
        <span class="preview-profile-badge">Featured</span>
        <span class="preview-profile-dot"></span>
      </div>
      <span class="preview-profile-name">YourName</span>
      <div class="preview-profile-meta"><span>Rank</span><span>30d</span></div>
    </div>
  {:else}
    <div class="shop-preview-text">
      {#if item.css_type === 'class'}
        {#if item.slot === 'frame'}
          <span class="profile-name-frame {effectClass}">Username</span>
        {:else}
          <span class={effectClass} data-text="Username">Username</span>
        {/if}
      {:else if item.css_type === 'style'}
        {#if item.slot === 'frame'}
          <span class="profile-name-frame" style={effectStyle}>Username</span>
        {:else}
          <span style={effectStyle} data-text="Username">Username</span>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .shop-preview-area { height: 112px; margin-bottom: 14px; width: 100%; display: flex; align-items: center; justify-content: center; min-width: 0; align-self: stretch; padding: 12px; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.075); border-radius: 16px; background: radial-gradient(circle at 50% 42%, rgba(123,92,255,0.1), transparent 58%), rgba(5,6,10,0.58); overflow: hidden; }
  .shop-preview-area-tall { height: 112px; }
  .shop-preview-area-roll-effect { height: 140px; border-color: rgba(139,124,246,0.16); background: radial-gradient(circle at center, rgba(123,92,255,0.12), rgba(6,7,12,0.7) 62%, rgba(3,4,8,0.9)); }
  .preview-bg { width: 100%; height: 100%; border-radius: 12px; border: 1px solid var(--card-border); background-color: #111; flex-shrink: 0; box-sizing: border-box; will-change: transform, opacity, filter; }
  .preview-bg[style*="godRaysTurn"] { animation-duration: 5.5s !important; }
  .preview-bg[style*="deepSpaceTwinkle"] { animation-duration: 6.2s !important; }
  .preview-lb-row { width: 100%; min-height: 58px; border-radius: 14px; padding: 10px 12px; box-sizing: border-box; overflow: hidden; margin: 0; gap: 10px; }
  .preview-lb-rank { width: auto; min-width: 22px; font-size: 0.72rem; }
  .preview-lb-info { display: flex; flex-direction: column; gap: 3px; margin-left: 0; }
  .preview-lb-name { font-size: 0.76rem; line-height: 1.1; }
  .preview-lb-sub { color: var(--text-muted); font-size: 0.62rem; line-height: 1.1; white-space: nowrap; }
  .preview-lb-score { font-size: 0.74rem; }
  :global(.preview-lb-row.lb-gold-theme) .preview-lb-rank,
  :global(.preview-lb-row.lb-gold-theme) .preview-lb-sub { color: rgba(26,26,26,0.72); }
  .preview-orb-shape { width: 72px; height: 72px; flex: 0 0 auto; background-color: #7b5cff; box-shadow: 0 0 0 12px rgba(123,92,255,0.06); }
  .preview-profile-card { width: 100%; min-height: 72px; background: radial-gradient(circle at top right, rgba(123,92,255,0.18), transparent 42%), linear-gradient(180deg, rgba(15,15,21,0.98), rgba(9,9,14,0.96)); border-radius: 16px; border: 2px solid transparent; padding: 10px 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .preview-profile-topline, .preview-profile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .preview-profile-badge, .preview-profile-meta span { color: var(--text-muted); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .preview-profile-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.3); box-shadow: 0 0 12px rgba(255,255,255,0.18); flex-shrink: 0; }
  .preview-profile-name { color: #fff; font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; }
  .shop-preview-text { width: 100%; min-height: 0; margin-bottom: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px; text-align: center; box-sizing: border-box; }

  @media (max-width: 600px) {
    .shop-preview-area { height: 104px; padding: 10px; margin-bottom: 16px; }
    .shop-preview-area-tall { height: 104px; }
    .shop-preview-area-roll-effect { height: 128px; }
  }
</style>
