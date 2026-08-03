<script>
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';

  export let item;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  export let mode = 'animated';

  $: nameLayerLoadout = item?.slot === 'name_font'
    ? { fontKey: item.css_value }
    : item?.slot === 'name_material'
      ? { materialKey: item.css_value }
      : item?.slot === 'name_motion'
        ? { motionKey: item.css_value }
        : null;
</script>

<div class="shop-preview-area {item?.slot === 'profile_border' ? 'shop-preview-area-tall' : ''}">
  {#if item?.slot === 'profile_border'}
    <ProfileBorderEffect borderKey={item.css_value} compact={true} animated={mode === 'animated'} className="preview-border-shell">
      <div class="preview-profile-card">
        <div class="preview-profile-topline">
          <span class="preview-profile-badge">Profile border</span>
          <span class="preview-profile-dot"></span>
        </div>
        <span class="preview-profile-name">{username}</span>
        <div class="preview-profile-meta"><span>{item.collection}</span><span>{item.rarity}</span></div>
      </div>
    </ProfileBorderEffect>
  {:else if nameLayerLoadout}
    <div class="shop-preview-text shop-preview-text--name">
      <NameEffectCanvas
        text={username}
        loadout={nameLayerLoadout}
        todayColor={displayColor}
        context="card"
        compact={true}
        {mode}
        semanticClass="shop-item-name"
      />
    </div>
  {:else}
    <div class="shop-preview-text shop-preview-text--utility">
      <span class="preview-utility-mark" aria-hidden="true">✦</span>
      <span>{item?.name || 'Catalog item'}</span>
    </div>
  {/if}
</div>

<style>
  .shop-preview-area { height: 174px; width: 100%; display: flex; align-items: center; justify-content: center; min-width: 0; align-self: stretch; padding: 14px; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.075); border-radius: 6px; background: radial-gradient(circle at 50% 42%, rgba(123,92,255,0.1), transparent 58%), rgba(5,6,10,0.58); overflow: hidden; }
  .shop-preview-area-tall { height: 174px; }
  .preview-profile-card { width: 100%; min-height: 100px; background: radial-gradient(circle at top right, rgba(123,92,255,0.18), transparent 42%), linear-gradient(180deg, rgba(15,15,21,0.98), rgba(9,9,14,0.96)); border-radius: 5px; padding: 14px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .preview-profile-topline, .preview-profile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .preview-profile-badge, .preview-profile-meta span { color: var(--text-muted); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .preview-profile-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.3); box-shadow: 0 0 12px rgba(255,255,255,0.18); flex-shrink: 0; }
  .preview-profile-name { color: #fff; font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; overflow-wrap: anywhere; }
  .shop-preview-text { width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px; text-align: center; box-sizing: border-box; }
  .shop-preview-text--utility { flex-direction: column; gap: 0.55rem; color: var(--color-ink-muted); font: 600 0.8rem var(--font-mono-stack); }
  .preview-utility-mark { color: var(--color-accent-bright); font-size: 1.5rem; }

  @media (max-width: 600px) {
    .shop-preview-area { height: 150px; padding: 10px; }
    .shop-preview-area-tall { height: 150px; }
  }
</style>
