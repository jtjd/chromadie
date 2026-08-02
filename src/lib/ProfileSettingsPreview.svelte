<script>
  import IdentityCard from './IdentityCard.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';
  import { equippedItems } from './stores';
  import { getCosmeticEffect, getProfileAtmosphereEffect, getProfileBg } from './cosmetics';
  import { getProfileStoryVisible, getVisibleProfileLinks, getVisibleProfileModules } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';

  export let profile = {};
  export let profileConfig = null;

  const MODULE_LABELS = Object.freeze({
    roll: 'Daily roll',
    stats: 'Progress stats',
    signature: 'Signature roll',
    links: 'Social links',
    recent: 'Recent colors',
    achievements: 'Pinned achievements',
    boundary: 'Public boundary',
    explore: 'Explore footer'
  });
  const STYLE_LABELS = Object.freeze({ immersive: 'Immersive', editorial: 'Editorial', focus: 'Focused' });

  /** @type {any} */
  let configSource;
  /** @type {Record<string, string>} */
  let loadout;
  $: configSource = profileConfig || {};
  $: config = configSource.draft || configSource.published || configSource;
  $: loadout = /** @type {Record<string, string>} */ ($equippedItems || {});
  $: nameRendererKey = String(loadout?.name_effect || '');
  $: nameRendererLoadout = getNameRendererLoadout(loadout);
  $: frameEffect = getCosmeticEffect(loadout, 'frame');
  $: borderEffect = getCosmeticEffect(loadout, 'profile_border');
  $: backgroundEffect = getProfileBg(loadout);
  $: atmosphereEffect = getProfileAtmosphereEffect(loadout);
  $: links = getVisibleProfileLinks(config);
  $: modules = getVisibleProfileModules(config, true).filter(module => module.id !== 'explore');
  $: showStory = getProfileStoryVisible(config);
  $: avatarSrc = getProfileMediaUrl(config.avatar_path);
  $: previewSurfaceAccent = config.colorEffectsEnabled === true
    ? (config.signatureColor || profile.mood_color || '#8B7CF6')
    : '#5D6A73';
</script>

<aside class="settings-preview" aria-label="Live profile preview">
  <div class="settings-preview__topline"><span>Live profile</span><span>Draft preview</span></div>
  <div class={'settings-preview__canvas ' + borderEffect.cls + ' settings-preview__canvas--' + (config.layoutVariant || 'immersive')} style={borderEffect.style + '--preview-accent:' + (config.signatureColor || profile.mood_color || '#8B7CF6') + ';'}>
    {#if backgroundEffect.cls || backgroundEffect.style}<div class="settings-preview__background {backgroundEffect.cls}" style={backgroundEffect.style} aria-hidden="true"></div>{/if}
    {#if atmosphereEffect}
      <ProfileAtmosphere
        canvasOnly={true}
        accent={previewSurfaceAccent}
        secondaryAccent={config.colorEffectsEnabled === true ? '#71D6FF' : '#87959D'}
        backgroundTint={config.colorEffectsEnabled === true}
        ambientEffects={config.colorEffectsEnabled === true}
        effect={atmosphereEffect}
      />
    {/if}
    <IdentityCard
      username={profile.username || 'Your username'}
      displayName={profile.username || 'Your username'}
      bio={profile.bio || ''}
      bioFallback="Add a short bio in Identity."
      {links}
      badges={[]}
      avatarSrc={avatarSrc}
      accentColor={config.signatureColor || profile.mood_color || '#8B7CF6'}
      nameRendererKey={nameRendererKey}
      nameRendererLoadout={nameRendererLoadout}
      nameRendererContext="profile"
      nameRendererMode="animated"
      frameClass={frameEffect.cls}
      frameStyle={frameEffect.style}
      showToday={false}
    />
    <div class="settings-preview__composition">
      <div class="settings-preview__composition-heading">
        <span>Page sections</span>
        <strong>{STYLE_LABELS[config.layoutVariant] || 'Immersive'}</strong>
      </div>
      <div class="settings-preview__sections">
        {#each modules as module (module.id)}
          <div class={'settings-preview__section settings-preview__section--' + module.size}>
            <span>{MODULE_LABELS[module.id] || module.id}</span>
            <small>{module.order + 1}</small>
          </div>
        {/each}
        {#if showStory}
          <div class="settings-preview__section settings-preview__section--wide"><span>Color story</span><small>+</small></div>
        {/if}
      </div>
    </div>
  </div>
  <p>Updates use your current draft. Publish when the layout is ready.</p>
</aside>

<style>
  .settings-preview { position:sticky; top:1rem; display:grid; gap:.8rem; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .settings-preview__topline { display:flex; justify-content:space-between; color:var(--color-accent-bright); font:700 var(--type-label)/1 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .settings-preview__topline span:last-child { color:var(--color-ink-faint); }
  .settings-preview__canvas { position:relative; overflow:hidden; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-inset); }
  .settings-preview__background { position:absolute; inset:0; opacity:.4; pointer-events:none; }
  .settings-preview__canvas :global(.identity-card) { position:relative; z-index:2; min-height:15rem; padding:1rem; border:0; border-radius:var(--radius-md); }
  .settings-preview__canvas :global(.identity-card__name) { font-size:clamp(1.35rem, 2vw, 2rem); }
  .settings-preview__canvas :global(.identity-card__bio) { font-size:.75rem; }
  .settings-preview__composition { position:relative; z-index:1; margin:0 .75rem .75rem; padding:.7rem; border:1px solid color-mix(in srgb, var(--preview-accent) 28%, var(--color-line-subtle)); border-radius:var(--radius-sm); background:rgba(5,7,11,.72); }
  .settings-preview__composition-heading { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.55rem; color:var(--color-ink-faint); font:700 .58rem/1 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .settings-preview__composition-heading strong { color:color-mix(in srgb, var(--preview-accent) 78%, white); font-weight:600; letter-spacing:0; text-transform:none; }
  .settings-preview__sections { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; }
  .settings-preview__section { display:flex; align-items:center; justify-content:space-between; gap:.45rem; min-width:0; min-height:1.9rem; padding:.35rem .45rem; border:1px solid color-mix(in srgb, var(--preview-accent) 22%, var(--color-line-subtle)); border-radius:.35rem; background:color-mix(in srgb, var(--preview-accent) 9%, transparent); color:var(--color-ink-muted); font-size:.63rem; }
  .settings-preview__section span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .settings-preview__section small { flex:0 0 auto; color:var(--color-ink-faint); font:600 .58rem/1 var(--font-mono-stack); }
  .settings-preview__section--wide { grid-column:span 2; }
  .settings-preview__canvas--editorial .settings-preview__section { border-radius:0; }
  .settings-preview__canvas--focus .settings-preview__section { background:color-mix(in srgb, var(--preview-accent) 14%, transparent); }
  .settings-preview p { margin:0; color:var(--color-ink-muted); font-size:var(--type-label); line-height:1.45; }
  @media (max-width: 900px) { .settings-preview { position:static; } }
</style>
