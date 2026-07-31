<script>
  import IdentityCard from './IdentityCard.svelte';
  import { equippedItems } from './stores';
  import { getCosmeticEffect } from './cosmetics';
  import { getVisibleProfileLinks } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';

  export let profile = {};
  export let profileConfig = null;

  /** @type {any} */
  let configSource;
  $: configSource = profileConfig || {};
  $: config = configSource.draft || configSource.published || configSource;
  $: loadout = $equippedItems || {};
  $: nameEffect = getCosmeticEffect(loadout, 'name_effect');
  $: frameEffect = getCosmeticEffect(loadout, 'frame');
  $: borderEffect = getCosmeticEffect(loadout, 'profile_border');
  $: backgroundEffect = getCosmeticEffect(loadout, 'profile_bg');
  $: links = getVisibleProfileLinks(config);
  $: avatarSrc = getProfileMediaUrl(config.avatar_path);
</script>

<aside class="settings-preview" aria-label="Live profile preview">
  <div class="settings-preview__topline"><span>Live profile</span><span>Preview</span></div>
  <div class="settings-preview__canvas {borderEffect.cls}" style={borderEffect.style}>
    {#if backgroundEffect.cls || backgroundEffect.style}<div class="settings-preview__background {backgroundEffect.cls}" style={backgroundEffect.style} aria-hidden="true"></div>{/if}
    <IdentityCard
      username={profile.username || 'Your username'}
      displayName={profile.username || 'Your username'}
      bio={profile.bio || ''}
      bioFallback="Add a short bio in Identity."
      {links}
      badges={[]}
      avatarSrc={avatarSrc}
      accentColor={config.signatureColor || profile.mood_color || '#8B7CF6'}
      nameClass={nameEffect.cls}
      nameStyle={nameEffect.style}
      frameClass={frameEffect.cls}
      frameStyle={frameEffect.style}
      showToday={false}
    />
  </div>
  <p>Changes appear here as you edit. Publish layout changes when the page is ready.</p>
</aside>

<style>
  .settings-preview { position:sticky; top:1rem; display:grid; gap:.8rem; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .settings-preview__topline { display:flex; justify-content:space-between; color:var(--color-accent-bright); font:700 var(--type-label)/1 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .settings-preview__topline span:last-child { color:var(--color-ink-faint); }
  .settings-preview__canvas { position:relative; overflow:hidden; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-inset); }
  .settings-preview__background { position:absolute; inset:0; opacity:.4; pointer-events:none; }
  .settings-preview__canvas :global(.identity-card) { position:relative; z-index:1; min-height:15rem; padding:1rem; border:0; border-radius:var(--radius-md); }
  .settings-preview__canvas :global(.identity-card__name) { font-size:clamp(1.35rem, 2vw, 2rem); }
  .settings-preview__canvas :global(.identity-card__bio) { font-size:.75rem; }
  .settings-preview p { margin:0; color:var(--color-ink-muted); font-size:var(--type-label); line-height:1.45; }
  @media (max-width: 900px) { .settings-preview { position:static; } }
</style>
