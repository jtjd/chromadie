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
  .shop-preview-area { height: 156px; width: 100%; display: flex; align-items: center; justify-content: center; min-width: 0; align-self: stretch; padding: 14px; box-sizing: border-box; border: 1px solid var(--shop-line, rgba(255,255,255,0.075)); border-radius: var(--radius-sm, 6px); background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--shop-accent, #7b5cff) 18%, transparent), transparent 62%), var(--shop-deep, rgba(5,6,10,0.58)); overflow: hidden; }
  .shop-preview-area-tall { height: 156px; }
  .preview-profile-card { width: 100%; min-height: 112px; background: radial-gradient(circle at top right, color-mix(in srgb, var(--shop-accent, #7b5cff) 18%, transparent), transparent 42%), linear-gradient(180deg, rgba(15,15,21,0.98), rgba(9,9,14,0.96)); border-radius: 5px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .preview-profile-topline, .preview-profile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .preview-profile-badge, .preview-profile-meta span { color: var(--shop-faint, var(--text-muted)); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .preview-profile-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.3); box-shadow: 0 0 12px rgba(255,255,255,0.18); flex-shrink: 0; }
  .preview-profile-name { color: #fff; font-family: var(--font-display-stack, var(--font-display)); font-size: 1.1rem; font-weight: 700; overflow-wrap: anywhere; }
  .shop-preview-text { width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px; text-align: center; box-sizing: border-box; }
  .shop-preview-text--name :global(.name-effect-canvas) { width: 100%; max-width: 100%; text-align: center; }
  .shop-preview-text--name :global(.name-effect-canvas__semantic) { max-width: 100%; color: var(--shop-ink, #f2f0eb); font: 650 clamp(1.7rem, 4vw, 2.5rem)/.95 var(--font-display-stack, var(--font-display)); letter-spacing: -.045em; overflow-wrap: anywhere; white-space: nowrap; }
  .shop-preview-text--utility { flex-direction: column; gap: 0.65rem; color: var(--shop-muted, var(--color-ink-muted)); font: 600 0.95rem var(--shop-mono, var(--font-mono-stack)); }
  .preview-utility-mark { color: var(--shop-accent, var(--color-accent-bright)); font-size: 1.8rem; }

  @media (max-width: 600px) {
    .shop-preview-area { height: 142px; padding: 10px; }
    .shop-preview-area-tall { height: 142px; }
    .shop-preview-text--name :global(.name-effect-canvas__semantic) { font-size: clamp(1.35rem, 8vw, 2rem); }
  }
</style>
