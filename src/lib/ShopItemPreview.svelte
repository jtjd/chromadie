<script>
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import AvatarEffect from './avatar-effect/AvatarEffect.svelte';
  import CursorTrailLayer from './cursor-trail/CursorTrailLayer.svelte';
  import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
  import AtmosphereLayer from './profile-atmosphere/AtmosphereLayer.svelte';
  import ProfileMotionEffect from './profile-motion/ProfileMotionEffect.svelte';
  import { PROFILE_RENDER_CONTEXTS, resolveProfileRenderContext } from './profile-studio/previewContexts.js';

  export let item;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  export let avatarSrc = '';
  export let mode = 'animated';
  export let active = false;
  /** @type {any} */
  export let renderContext = PROFILE_RENDER_CONTEXTS.CATALOG;
  /** @type {Record<string, string> | null} */
  export let nameLoadout = null;

  const COLLECTION_TONES = Object.freeze({
    Signal: '#B7FD4D',
    Prism: '#C7B4FF',
    Archive: '#8DDCFF',
    Ember: '#FFD27A',
    Nocturne: '#B5A9FF',
    'Static Bloom': '#8DDCFF'
  });
  const PREVIEW_SURFACE = '#020306';

  $: itemNameLayerLoadout = item?.slot === 'name_font'
    ? { fontKey: item.css_value }
    : item?.slot === 'name_material'
      ? { materialKey: item.css_value }
        : item?.slot === 'name_motion'
          ? { motionKey: item.css_value }
          : null;
  $: isNamePreview = Boolean(nameLoadout && typeof nameLoadout === 'object');
  $: nameLayerLoadout = isNamePreview ? nameLoadout : itemNameLayerLoadout;
  $: isAvatar = item?.slot === 'avatar_effect';
  $: isCursor = item?.slot === 'cursor_trail';
  $: isAtmosphere = item?.slot === 'profile_atmosphere';
  $: isProfileMotion = item?.slot === 'profile_motion';
  $: cursorPreviewKey = getCursorTrailKey(item?.css_value);
  $: previewAccent = isNamePreview ? displayColor : COLLECTION_TONES[item?.collection] || '#C7B4FF';
  $: previewType = isNamePreview
    ? 'name'
    : item?.slot === 'name_font'
    ? 'font'
    : item?.slot === 'name_material'
      ? 'material'
      : item?.slot === 'name_motion'
        ? 'motion'
        : item?.slot === 'profile_border'
          ? 'border'
          : item?.slot === 'avatar_effect'
            ? 'avatar'
            : item?.slot === 'cursor_trail'
              ? 'cursor'
              : item?.slot === 'profile_atmosphere'
                ? 'atmosphere'
                : item?.slot === 'profile_motion'
                  ? 'motion'
                : 'utility';
  $: previewClasses = `shop-preview-area shop-preview-area--${previewType}`;
  $: resolvedRenderContext = resolveProfileRenderContext(renderContext, PROFILE_RENDER_CONTEXTS.CATALOG);
  $: previewSurface = resolvedRenderContext === PROFILE_RENDER_CONTEXTS.CATALOG ? PREVIEW_SURFACE : 'transparent';
  $: previewStyle = `--preview-accent:${previewAccent}; --preview-surface:${previewSurface};`;
  $: nameRendererContext = resolvedRenderContext === PROFILE_RENDER_CONTEXTS.EFFECT_CARD || resolvedRenderContext === PROFILE_RENDER_CONTEXTS.NAME_CONTROL
    ? 'card'
    : 'profile';
  // Font and material controls stay still for easy comparison. The Motion
  // control owns the only animated name-control canvas, so selecting a motion
  // visibly demonstrates the actual movement instead of showing a static
  // material-colored signature.
  $: nameRendererMode = resolvedRenderContext === PROFILE_RENDER_CONTEXTS.NAME_CONTROL
    ? (item?.slot === 'name_motion' ? 'animated' : 'static-signature')
    : mode;

  let hovered = false;
  let motionPreviewSurface;
</script>

<div bind:this={motionPreviewSurface} class={previewClasses} style={previewStyle} data-preview-source={displayColor} data-render-context={resolvedRenderContext} role="presentation" on:pointerenter={() => hovered = true} on:pointerleave={() => hovered = false}>
  {#if item?.slot === 'profile_border'}
    <ProfileBorderEffect borderKey={item.css_value} compact={true} animated={mode === 'animated'} className="preview-border-shell">
      <span class="preview-border-space" aria-hidden="true"></span>
    </ProfileBorderEffect>
  {:else if nameLayerLoadout}
    <div class="shop-preview-text shop-preview-text--name">
      <NameEffectCanvas
        text={username}
        loadout={nameLayerLoadout}
        todayColor={previewAccent}
        context={nameRendererContext}
        compact={false}
        mode={nameRendererMode}
        semanticClass="shop-item-name"
      />
    </div>
  {:else if isAvatar}
    <div class="shop-avatar-preview">
      <AvatarEffect effectKey={item.css_value} accentColor={previewAccent} mode="compact" active={active} animated={active} {avatarSrc} fallbackText="">
        {#if avatarSrc}
          <img class="shop-avatar-preview__media" src={avatarSrc} alt="" loading="lazy" decoding="async" />
        {:else}
          <span class="shop-avatar-preview__fallback" aria-hidden="true">{String(username || 'Y').slice(0, 1).toUpperCase()}</span>
        {/if}
      </AvatarEffect>
    </div>
  {:else if isCursor}
    {#key cursorPreviewKey}
      <CursorTrailLayer
        trailKey={cursorPreviewKey}
        recentColors={['#8DDCFF', '#B7FD4D', '#F7B7E2']}
        todayColor={previewAccent}
        active={active || hovered}
        inputMode="demo"
        className="shop-cursor-preview"
      />
    {/key}
  {:else if isAtmosphere}
    <div class="shop-atmosphere-preview">
      <AtmosphereLayer atmosphereKey={item.css_value} todayColor={previewAccent} recentColors={['#8DDCFF', '#B7FD4D', '#F7B7E2']} mode="preview" active={active || hovered} animated={active || hovered} />
    </div>
  {:else if isProfileMotion}
    <ProfileMotionEffect motionKey={item.item_key} inputSurface="container" surfaceElement={motionPreviewSurface} disabled={!active}>
      <div class="shop-motion-preview" aria-hidden="true"><span>3D</span></div>
    </ProfileMotionEffect>
  {:else}
    <div class="shop-preview-text shop-preview-text--utility">
      <span class="preview-utility-mark" aria-hidden="true">✦</span>
      <span>{item?.name || 'Catalog cosmetic'}</span>
    </div>
  {/if}
</div>

<style>
  .shop-preview-area { position:relative; aspect-ratio:16 / 9; width: 100%; display: flex; align-items: center; justify-content: center; min-width: 0; align-self: stretch; padding: 12px; box-sizing: border-box; border: 0; border-radius: 12px; background: var(--preview-surface, #020306); overflow: hidden; }
  .shop-preview-area[data-render-context="effect-card"] { aspect-ratio: auto; height: 4.25rem; min-height: 4.25rem; padding: .35rem; border-radius: 0; }
  .shop-preview-area[data-render-context="name-control"] { aspect-ratio: auto; height: 100%; min-height: 0; padding: 0; border-radius: 0; background: transparent; overflow: visible; }
  .shop-preview-area[data-render-context="live-profile"] { aspect-ratio: auto; min-height: 0; padding: 0; border-radius: 0; background: transparent; overflow: visible; }
  .shop-preview-area[data-render-context="name-control"] .shop-preview-text { height: 100%; margin: 0; }
  .shop-preview-area[data-render-context="name-control"] .shop-preview-text--name :global(.name-effect-canvas) { display: flex; height: 100%; min-height: 0; align-items: center; justify-content: flex-end; overflow: visible; }
  .shop-preview-area[data-render-context="name-control"] .shop-preview-text--name :global(.name-effect-canvas__semantic) { font-size: 1.05rem; line-height: 1; letter-spacing: 0; }
  .shop-preview-area[data-render-context="name-control"] .shop-preview-text--name :global(.name-effect-canvas__visual) { inset: -.45rem -.65rem; width: calc(100% + 1.3rem); height: calc(100% + .9rem); }
  .shop-preview-area[data-render-context="effect-card"] .shop-preview-text--name :global(.name-effect-canvas__semantic) { width:var(--progression-preview-name-width,auto); overflow:var(--progression-preview-name-overflow,visible); font-size:var(--progression-preview-name-size,clamp(1rem, 4vw, 1.7rem)); line-height:1.05; text-overflow:ellipsis; white-space:nowrap; }
  .shop-preview-area :global(.preview-border-shell) { width: min(82%, 22rem); height: 78%; }
  .preview-border-space { display: block; width: 100%; height: 100%; min-height: 0; }
  .shop-preview-text { width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px; text-align: center; box-sizing: border-box; }
  .shop-preview-text--name :global(.name-effect-canvas) { width: 100%; max-width: 100%; text-align: center; }
  .shop-preview-text--name :global(.name-effect-canvas__semantic) { max-width: 100%; color: var(--preview-accent, var(--shop-ink, #f2f0eb)); font: 700 clamp(2.7rem, 6vw, 4.4rem)/1.08 var(--font-display-stack, var(--font-display)); letter-spacing: -.045em; overflow-wrap: anywhere; white-space: nowrap; }
  .shop-preview-text--utility { flex-direction: column; gap: 0.65rem; color: var(--shop-muted, var(--color-ink-muted)); font: 600 0.95rem var(--shop-mono, var(--font-mono-stack)); }
  .preview-utility-mark { color: #d8ccff; font-size: 1.8rem; }
  .shop-avatar-preview { display:grid; place-items:center; width:8rem; height:8rem; }
  .shop-avatar-preview :global(.avatar-effect) { display:grid; place-items:center; width:6.7rem; height:6.7rem; }
  .shop-avatar-preview__media { position:relative; z-index:2; display:block; width:100%; height:100%; border-radius:50%; object-fit:cover; }
  .shop-avatar-preview__fallback { position:relative; z-index:2; display:grid; place-items:center; width:100%; height:100%; color:#f3f3ef; font:650 3rem/1 var(--shop-display, var(--font-display)); letter-spacing:-.08em; }
  .shop-atmosphere-preview { position:relative; width:100%; height:100%; min-height:7.5rem; overflow:hidden; border-radius:5px; background:transparent; }
  .shop-preview-area[data-render-context="effect-card"] .shop-atmosphere-preview { min-height: 100%; }
  .shop-atmosphere-preview :global(.profile-atmosphere) { inset:0; width:100%; height:100%; opacity:.9; }
  .shop-atmosphere-preview :global(.profile-atmosphere__video) { inset:0; width:100%; height:100%; display:block; object-fit:cover; transform:scale(1.08); transform-origin:center; filter:none !important; }
  .shop-atmosphere-preview :global(.profile-atmosphere__video--poster) { opacity:.42; }
  .shop-motion-preview { display:grid; place-items:center; width:78%; height:72%; border:1px solid rgba(205,210,255,.42); border-radius:8px; background:rgba(205,210,255,.05); color:rgba(205,210,255,.82); font:650 1.35rem/1 var(--shop-display, var(--font-display)); letter-spacing:-.06em; }

  @media (max-width: 600px) {
    .shop-preview-area { padding: 10px; }
    .shop-preview-text--name :global(.name-effect-canvas__semantic) { font-size: clamp(1.75rem, 9vw, 2.5rem); }
  }
</style>
