<script>
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';
  import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
  import { getProfileLayoutLabel } from './profile-layout/profileLayouts.js';

  export let item;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  export let mode = 'animated';
  export let active = false;

  // Catalog previews are product swatches, not another daily-roll surface. Keep
  // their renderer input stable so a new roll never recolors the whole catalog.
  const CATALOG_PREVIEW_COLOR = '#C7B4FF';

  $: nameLayerLoadout = item?.slot === 'name_font'
    ? { fontKey: item.css_value }
    : item?.slot === 'name_material'
      ? { materialKey: item.css_value }
        : item?.slot === 'name_motion'
          ? { motionKey: item.css_value }
          : null;
  $: isAvatar = item?.slot === 'avatar_effect';
  $: isCursor = item?.slot === 'cursor_trail';
  $: isLayout = item?.slot === 'profile_layout';
  $: cursorPreviewKey = getCursorTrailKey(item?.css_value);

  let cursorPoint = { x: 50, y: 50 };

  function handleCursorPreviewMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    cursorPoint = {
      x: Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(14, Math.min(86, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }
</script>

<div class="shop-preview-area {item?.slot === 'profile_border' ? 'shop-preview-area-tall' : ''}" data-preview-source={displayColor}>
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
        todayColor={CATALOG_PREVIEW_COLOR}
        context="profile"
        compact={false}
        {mode}
        semanticClass="shop-item-name"
      />
    </div>
  {:else if isAvatar}
    <div class="shop-avatar-preview">
      <AvatarEffect effectKey={item.css_value} accentColor={displayColor} mode="compact" active={active} animated={active} avatarSrc="/avatars/mara-dog-v1.jpg" fallbackText={String(username || 'Y').slice(0, 1).toUpperCase()}>
        <img class="shop-avatar-preview__media" src="/avatars/mara-dog-v1.jpg" alt="" loading="lazy" decoding="async" />
      </AvatarEffect>
    </div>
  {:else if isCursor}
    <div
      class={'shop-cursor-preview shop-cursor-preview--' + cursorPreviewKey}
      style={`--cursor-x:${cursorPoint.x}%; --cursor-y:${cursorPoint.y}%;`}
      on:pointermove={handleCursorPreviewMove}
      aria-hidden="true"
    >
      <span class="shop-cursor-preview__line"></span>
      <span class="shop-cursor-preview__head"></span>
      <span class="shop-cursor-preview__particle shop-cursor-preview__particle--one"></span>
      <span class="shop-cursor-preview__particle shop-cursor-preview__particle--two"></span>
      <span class="shop-cursor-preview__particle shop-cursor-preview__particle--three"></span>
    </div>
  {:else if isLayout}
    <div class={'shop-layout-preview shop-layout-preview--' + item.css_value} aria-label={getProfileLayoutLabel(item.css_value)}>
      <span class="shop-layout-preview__rail"></span>
      <span class="shop-layout-preview__hero"></span>
      <span class="shop-layout-preview__module shop-layout-preview__module--one"></span>
      <span class="shop-layout-preview__module shop-layout-preview__module--two"></span>
      <span class="shop-layout-preview__module shop-layout-preview__module--three"></span>
    </div>
  {:else}
    <div class="shop-preview-text shop-preview-text--utility">
      <span class="preview-utility-mark" aria-hidden="true">✦</span>
      <span>{item?.name || 'Catalog item'}</span>
    </div>
  {/if}
</div>

<style>
  .shop-preview-area { position:relative; height: 156px; width: 100%; display: flex; align-items: center; justify-content: center; min-width: 0; align-self: stretch; padding: 14px; box-sizing: border-box; border: 1px solid rgba(255,255,255,.12); border-radius: var(--radius-sm, 6px); background: linear-gradient(145deg, #191c23 0%, #0f1116 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.035), inset 0 -1.25rem 2.5rem rgba(0,0,0,.14); overflow: hidden; }
  .shop-preview-area::after { position:absolute; inset:0; background: linear-gradient(115deg, rgba(255,255,255,.035), transparent 32%, transparent 72%, rgba(255,255,255,.018)); pointer-events:none; content:''; }
  .shop-preview-area-tall { height: 156px; }
  .preview-profile-card { width: 100%; min-height: 112px; background: linear-gradient(180deg, #171a21, #0d0f14); border:1px solid rgba(255,255,255,.11); border-radius: 5px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .preview-profile-topline, .preview-profile-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .preview-profile-badge, .preview-profile-meta span { color: var(--shop-faint, var(--text-muted)); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .preview-profile-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.3); box-shadow: 0 0 12px rgba(255,255,255,0.18); flex-shrink: 0; }
  .preview-profile-name { color: #fff; font-family: var(--font-display-stack, var(--font-display)); font-size: 1.1rem; font-weight: 700; overflow-wrap: anywhere; }
  .shop-preview-text { width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px; text-align: center; box-sizing: border-box; }
  .shop-preview-text--name :global(.name-effect-canvas) { width: 100%; max-width: 100%; text-align: center; }
  .shop-preview-text--name :global(.name-effect-canvas__semantic) { max-width: 100%; color: var(--shop-ink, #f2f0eb); font: 700 clamp(2rem, 5vw, 3rem)/1.08 var(--font-display-stack, var(--font-display)); letter-spacing: -.045em; overflow-wrap: anywhere; white-space: nowrap; }
  .shop-preview-text--utility { flex-direction: column; gap: 0.65rem; color: var(--shop-muted, var(--color-ink-muted)); font: 600 0.95rem var(--shop-mono, var(--font-mono-stack)); }
  .preview-utility-mark { color: #d8ccff; font-size: 1.8rem; }
  .shop-avatar-preview { display:grid; place-items:center; width:5.2rem; height:5.2rem; }
  .shop-avatar-preview :global(.avatar-effect) { display:grid; place-items:center; width:4.2rem; height:4.2rem; border:1px solid rgba(255,255,255,.28); border-radius:50%; background:radial-gradient(circle at 32% 24%, #dce4ff, #5c5f85 48%, #080a10 100%); }
  .shop-avatar-preview__media { position:relative; z-index:2; display:block; width:100%; height:100%; border-radius:50%; object-fit:cover; }
  .shop-cursor-preview { position:relative; width:78%; height:70%; }
  .shop-cursor-preview__line { position:absolute; left:5%; right:13%; top:48%; height:2px; border-radius:99px; background:linear-gradient(90deg, transparent, #8ddcff 22%, #b7fd4d 70%, transparent); transform:rotate(-16deg); transform-origin:right center; box-shadow:0 0 10px rgba(141,220,255,.45); }
  .shop-cursor-preview__head { position:absolute; left:calc(var(--cursor-x) - 4px); top:calc(var(--cursor-y) - 4px); width:9px; height:9px; border:1px solid #f2f0eb; border-radius:50%; box-shadow:0 0 0 4px rgba(141,220,255,.12), 0 0 12px #8ddcff; transition:left .12s ease, top .12s ease; }
  .shop-cursor-preview__particle { position:absolute; width:5px; height:5px; background:#cdd2ff; opacity:.75; }
  .shop-cursor-preview__particle--one { left:28%; top:34%; }
  .shop-cursor-preview__particle--two { left:49%; top:57%; width:3px; height:3px; background:#b7fd4d; }
  .shop-cursor-preview__particle--three { left:67%; top:29%; width:4px; height:4px; background:#ff8fca; }
  .shop-cursor-preview--pixel-wake .shop-cursor-preview__line { height:0; border-top:2px dotted #8ddcff; box-shadow:none; }
  .shop-cursor-preview--chroma-ribbon .shop-cursor-preview__line { height:4px; background:linear-gradient(90deg,transparent,#8ddcff 22%,#f7b7e2 50%,#b7fd4d 78%,transparent); }
  .shop-cursor-preview--glass-shards .shop-cursor-preview__particle { transform:rotate(45deg); border:1px solid #d8dcff; background:transparent; }
  .shop-cursor-preview--ember-ash .shop-cursor-preview__line { background:linear-gradient(90deg,transparent,#f5a45d,#ffd77a,transparent); }
  .shop-cursor-preview--comet-thread .shop-cursor-preview__line { background:linear-gradient(90deg,transparent,#eef4ff 28%,#fff 70%,transparent); height:1px; }
  .shop-cursor-preview--ink-drops .shop-cursor-preview__particle { border-radius:50% 45% 55% 40%; background:#bba7c6; }
  .shop-cursor-preview--orbit-dust .shop-cursor-preview__line { opacity:.45; }
  .shop-cursor-preview--static-echo .shop-cursor-preview__head { box-shadow:-8px 3px 0 rgba(105,233,255,.35), 8px -3px 0 rgba(255,143,202,.3); }
  .shop-cursor-preview--rain-trace .shop-cursor-preview__particle { width:2px; height:12px; background:#8ddcff; }
  .shop-cursor-preview--gold-fleck .shop-cursor-preview__line { background:linear-gradient(90deg,transparent,#e4bc68 35%,#fff1b8 68%,transparent); }
  .shop-cursor-preview--ghost-tail .shop-cursor-preview__line { height:5px; opacity:.25; filter:blur(1px); }
  .shop-cursor-preview--color-memory .shop-cursor-preview__line { background:linear-gradient(90deg,#8ddcff,#f7b7e2,#b7fd4d,#c7b4ff); }
  .shop-cursor-preview--marker-stroke .shop-cursor-preview__line { height:6px; border-radius:2px; background:#e7d4c4; opacity:.55; }
  .shop-cursor-preview--solar-sparks .shop-cursor-preview__line { background:linear-gradient(90deg,transparent,#ffd77a 35%,#fff 70%,transparent); box-shadow:0 0 14px rgba(255,215,122,.7); }
  .shop-cursor-preview--void-lensing .shop-cursor-preview__line { background:linear-gradient(90deg,transparent,#9c7bff,#66e8ff,transparent); }
  .shop-layout-preview { position:relative; width:76%; height:74%; border:1px solid rgba(205,210,255,.42); border-radius:5px; background:#0b0e14; }
  .shop-layout-preview span { position:absolute; display:block; border:1px solid rgba(205,210,255,.35); background:rgba(205,210,255,.1); }
  .shop-layout-preview__rail { left:7%; top:10%; bottom:10%; width:19%; }
  .shop-layout-preview__hero { left:33%; right:8%; top:10%; height:25%; }
  .shop-layout-preview__module--one { left:33%; width:28%; top:43%; height:20%; }
  .shop-layout-preview__module--two { right:8%; width:28%; top:43%; height:20%; }
  .shop-layout-preview__module--three { left:33%; right:8%; bottom:10%; height:14%; }
  .shop-layout-preview--archive-index .shop-layout-preview__rail { left:10%; width:2px; background:#cdd2ff; }
  .shop-layout-preview--archive-index .shop-layout-preview__module { border-radius:0; }
  .shop-layout-preview--prism-mosaic .shop-layout-preview__module--one { width:42%; background:rgba(255,143,202,.16); }
  .shop-layout-preview--prism-mosaic .shop-layout-preview__module--two { width:18%; background:rgba(97,226,255,.16); }
  .shop-layout-preview--night-terminal { border-radius:0; }
  .shop-layout-preview--night-terminal .shop-layout-preview__rail { left:7%; width:2px; background:#b7fd4d; border:0; }
  .shop-layout-preview--story-stack .shop-layout-preview__rail { display:none; }
  .shop-layout-preview--story-stack .shop-layout-preview__hero { left:9%; right:9%; height:31%; }
  .shop-layout-preview--story-stack .shop-layout-preview__module { left:9%; right:9%; width:auto; }

  @media (max-width: 600px) {
    .shop-preview-area { height: 142px; padding: 10px; }
    .shop-preview-area-tall { height: 142px; }
    .shop-preview-text--name :global(.name-effect-canvas__semantic) { font-size: clamp(1.75rem, 9vw, 2.5rem); }
  }
</style>
