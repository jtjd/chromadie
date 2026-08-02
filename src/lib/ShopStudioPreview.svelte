<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import RollPreview from './RollPreview.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import NameEffectCanvas from './name/NameEffectCanvas.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';
  import { getBadgeMeta } from './badgeData.js';
  import { createDefaultProfileConfig, getVisibleProfileLinks } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { getCosmeticEffect, getProfileAtmosphereEffect, getProfileBg } from './cosmetics';
  import { SHOP_CONTEXT_LABELS } from './shopCatalog';

  export let loadout = {};
  export let activeContext = 'profile';
  export let username = 'Your profile';
  export let selectedItem = /** @type {any} */ (null);
  export let displayColor = '#8B7CF6';
  /** @type {any} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let rollRarity = '';
  export let rollScore = null;
  export let compact = false;

  $: frameEffect = getCosmeticEffect(loadout, 'frame');
  $: profileBackground = getProfileBg(loadout);
  $: profileAtmosphere = getProfileAtmosphereEffect(loadout);
  $: profileBorder = getCosmeticEffect(loadout, 'profile_border');
  $: orbShape = getCosmeticEffect(loadout, 'orb_shape');
  $: rollEffect = getCosmeticEffect(loadout, 'roll_effect');
  $: leaderboardTheme = getCosmeticEffect(loadout, 'lb_theme');
  $: account = /** @type {any} */ (accountProfile || {});
  $: previewProfileConfig = profileConfig?.published || profileConfig?.draft || profileConfig || createDefaultProfileConfig(displayColor);
  $: previewBadges = (Array.isArray(account.equipped_badges) ? account.equipped_badges : [])
    .filter(id => typeof id === 'string' && id !== 'launch_edition')
    .slice(0, 3)
    .map(id => {
      const meta = getBadgeMeta(id);
      return { id, name: meta.name, icon: meta.symbol };
    });
  $: previewAvatarSrc = getProfileMediaUrl(previewProfileConfig.avatar_path);
  let failedPreviewAvatarSource = '';
  $: if (previewAvatarSrc && previewAvatarSrc !== failedPreviewAvatarSource) failedPreviewAvatarSource = '';
  $: previewLinks = getVisibleProfileLinks(previewProfileConfig);
</script>

<section class="studio-preview" class:studio-preview--compact={compact} aria-label="Your cosmetic preview">
  {#if !compact}
  <div class="studio-preview-head">
    <div>
      <span class="studio-eyebrow">Live fitting room</span>
      <h2>Your Look</h2>
    </div>
    <span class="live-indicator"><span aria-hidden="true"></span> Live</span>
  </div>

  <div class="context-switcher" role="group" aria-label="Preview surface">
    {#each Object.entries(SHOP_CONTEXT_LABELS) as [context, label] (context)}
      <button
        type="button"
        class:active={activeContext === context}
        aria-pressed={activeContext === context}
        on:click={() => activeContext = context}
      >
        {label}
      </button>
    {/each}
  </div>
  {/if}

  <div class="studio-stage context-{activeContext}">
    <div class="stage-grid" aria-hidden="true"></div>

    {#if activeContext === 'profile'}
      {#if profileAtmosphere}
        <ProfileAtmosphere
          canvasOnly={true}
          accent={displayColor}
          secondaryAccent="#71D6FF"
          effect={profileAtmosphere}
        />
      {/if}
      <div class={'studio-profile-card ' + profileBorder.cls} style={profileBorder.style}>
        {#if profileBackground.cls || profileBackground.style}
          <div class={'studio-profile-cosmetic-bg ' + profileBackground.cls} style={profileBackground.style} aria-hidden="true"></div>
        {/if}
        <IdentityCard
          {username}
          displayName={username}
          bio={account.bio || ''}
          bioFallback="No bio added yet."
          links={previewLinks}
          badges={previewBadges}
          founder={Boolean(account.equipped_badges?.includes('launch_edition'))}
          avatarSrc={previewAvatarSrc}
          accentColor={displayColor}
          nameRendererKey={String(loadout?.name_effect || '')}
          nameRendererContext={compact ? 'card' : 'profile'}
          nameRendererMode={compact ? 'static-signature' : 'animated'}
          frameClass={frameEffect.cls}
          frameStyle={frameEffect.style}
          showToday={false}
        />
      </div>
    {:else if activeContext === 'roll'}
      <div class="studio-roll-scene">
        <span class="roll-scene-label">Today’s chroma</span>
        <RollPreview
          effectCls={rollEffect.cls}
          effectStyle={rollEffect.style}
          orbCls={orbShape.cls}
          {displayColor}
          rarity={rollRarity || 'Common'}
          size="game"
        />
        <strong>{displayColor}</strong>
        <span class="roll-rarity">{rollRarity || 'Current roll'}</span>
      </div>
    {:else}
      <div class="studio-leaderboard-scene">
        <div class="leaderboard-caption">
          <span>Today’s leaderboard</span>
          <span>Top players</span>
        </div>
        <div class="studio-leaderboard-row {leaderboardTheme.cls}" style={leaderboardTheme.style}>
          <span class="studio-rank">#1</span>
          <div class="studio-player-avatar" aria-hidden="true">
            {#if previewAvatarSrc && previewAvatarSrc !== failedPreviewAvatarSource}
              <img src={previewAvatarSrc} alt="" loading="eager" decoding="async" on:error={() => failedPreviewAvatarSource = previewAvatarSrc} />
            {:else}
              <span>{username.slice(0, 1).toUpperCase() || '✦'}</span>
            {/if}
          </div>
          <div class="studio-player">
            {#if loadout?.name_effect}
              <NameEffectCanvas
                text={username}
                rendererKey={String(loadout.name_effect)}
                todayColor={displayColor}
                context="card"
                compact={true}
                mode="static-signature"
                semanticClass="studio-player-name"
              />
            {:else}
              <span class="studio-player-name">{username}</span>
            {/if}
            <span>{displayColor} · {rollRarity || 'Current roll'}</span>
          </div>
          <CompactRollPreview
            displayColor={displayColor}
            rarity={rollRarity || 'Common'}
            effectCls={rollEffect.cls}
            effectStyle={rollEffect.style}
            orbCls={orbShape.cls}
            size="3rem"
            scale={0.29}
          />
          <strong>{rollScore === null || rollScore === undefined ? '—' : Number(rollScore).toLocaleString()}</strong>
        </div>
        <div class="leaderboard-ghost-row"><span>#2</span><i></i><i></i></div>
        <div class="leaderboard-ghost-row short"><span>#3</span><i></i><i></i></div>
      </div>
    {/if}
  </div>

  {#if !compact}
  <div class="studio-selection" aria-live="polite">
    <span>{selectedItem ? 'Previewing' : 'Studio ready'}</span>
    <strong>{selectedItem?.name || 'Choose an item to try it on'}</strong>
  </div>
  {/if}
</section>

<style>
  .studio-preview {
    width: 100%;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-lg);
    padding: 1rem;
    background:
      radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 35%),
      var(--surface-panel);
    box-shadow: 0 1.5rem 4rem rgba(0,0,0,0.28);
  }
  .studio-preview--compact { border:0; padding:0; background:transparent; box-shadow:none; }
  .studio-preview--compact .studio-stage { min-height:18rem; border:0; border-radius:0; background:transparent; }

  .studio-preview-head,
  .profile-kicker-row,
  .profile-rank-row,
  .leaderboard-caption,
  .studio-leaderboard-row,
  .leaderboard-ghost-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .studio-preview-head h2 {
    margin: 3px 0 0;
    color: var(--color-ink-strong);
    font: 700 1.35rem/1.1 var(--font-display-stack);
    letter-spacing: -0.02em;
  }

  .studio-eyebrow {
    color: var(--color-ink-muted);
    font: 700 0.64rem/1 var(--font-mono-stack);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(75,222,165,0.18);
    border-radius: 999px;
    background: rgba(75,222,165,0.07);
    color: #9ae6c8;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .live-indicator span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4bdea5;
    box-shadow: 0 0 12px rgba(75,222,165,0.8);
  }

  .context-switcher {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    margin: 17px 0 12px;
    padding: 4px;
    border: 1px solid rgba(255,255,255,0.065);
    border-radius: 14px;
    background: rgba(0,0,0,0.2);
  }

  .context-switcher button {
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--color-ink-muted);
    cursor: pointer;
    font: 650 0.76rem var(--font-display-stack);
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .context-switcher button:hover { color: var(--color-ink-strong); }
  .context-switcher button.active {
    color: var(--color-ink-strong);
    background: var(--surface-panel-soft);
    box-shadow: inset 0 0 0 1px var(--color-line-subtle);
  }

  .studio-stage {
    position: relative;
    min-height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-md);
    background:
      radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 42%),
      var(--color-canvas-deep);
  }
  .studio-stage :global(.profile-atmosphere--canvas-only) { z-index: 1; }
  .studio-stage.context-profile { min-height: 300px; }

  .stage-grid {
    position: absolute;
    inset: 0;
    opacity: 0.24;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 30px 30px;
    mask-image: linear-gradient(to bottom, #000, transparent 90%);
  }

  .studio-profile-card {
    position: relative;
    z-index: 2;
    width: min(100% - 32px, 72rem);
    overflow: hidden;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-panel-strong);
    box-shadow: 0 24px 48px rgba(0,0,0,0.38);
  }
  .studio-profile-cosmetic-bg { position: absolute; z-index: 0; inset: 0; opacity: 0.28; pointer-events: none; }
  .studio-profile-card :global(.identity-card) { z-index: 2; padding: 1rem; border: 0; border-radius: 17px; }
  .studio-profile-card :global(.identity-card__person) { gap: 0.75rem; }
  .studio-profile-card :global(.identity-card__avatar) { flex-basis: 3.25rem; width: 3.25rem; }
  .studio-profile-card :global(.identity-card__avatar-letter) { font-size: 1.5rem; }
  .studio-profile-card :global(.identity-card__name) { font-size: clamp(1.1rem, 4.5vw, 1.65rem); }
  .studio-profile-card :global(.identity-card__bio) { margin-top: 0.45rem; font-size: 0.72rem; }

  .studio-roll-scene {
    position: relative;
    z-index: 1;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .roll-scene-label,
  .roll-rarity {
    color: var(--color-ink-muted);
    font: 650 0.62rem var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .roll-scene-label { margin-bottom: 3px; }
  .studio-roll-scene :global(.roll-effect-wrapper) { transform: scale(0.76); margin: -2px 0; }
  .studio-roll-scene > strong { color: var(--color-ink-strong); font: 700 1rem var(--font-mono-stack); letter-spacing: 0.08em; }
  .roll-rarity { margin-top: 7px; color: var(--color-accent-bright); }

  .studio-leaderboard-scene {
    position: relative;
    z-index: 1;
    width: calc(100% - 34px);
    padding: 18px;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-inset);
  }

  .leaderboard-caption {
    margin-bottom: 18px;
    color: var(--color-ink-muted);
    font: 650 0.62rem var(--font-mono-stack);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .studio-leaderboard-row {
    min-height: 76px;
    padding: 13px 14px;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-sm);
    background: var(--surface-panel-soft);
  }

  .studio-rank { color: var(--color-accent-bright); font: 700 0.76rem var(--font-mono-stack); }
  .studio-player-avatar { display: grid; place-items: center; flex: 0 0 2.45rem; width: 2.45rem; height: 2.45rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--color-accent) 48%, var(--color-line-subtle)); border-radius: 0.7rem; background: var(--surface-panel-strong); color: var(--color-ink-strong); font: 700 0.95rem/1 var(--font-display-stack); }
  .studio-player-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .studio-player { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .studio-player-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-ink-strong);
    font: 700 0.9rem var(--font-display-stack);
    white-space: nowrap;
  }
  .studio-player > span:last-child { color: var(--color-ink-muted); font-size: 0.62rem; }
  .studio-leaderboard-row > strong { color: var(--color-ink-strong); font: 700 0.78rem var(--font-mono-stack); }

  .leaderboard-ghost-row {
    min-height: 44px;
    margin-top: 8px;
    padding: 0 12px;
    border: 1px solid var(--color-line-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-ink-muted);
    font-size: 0.65rem;
  }
  .leaderboard-ghost-row i { height: 7px; border-radius: 999px; background: var(--surface-panel-soft); }
  .leaderboard-ghost-row i:first-of-type { width: 42%; }
  .leaderboard-ghost-row i:last-child { width: 18%; }
  .leaderboard-ghost-row.short { opacity: 0.65; }

  .studio-selection {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 13px 3px 1px;
  }
  .studio-selection span {
    color: var(--color-ink-muted);
    font: 650 0.58rem var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .studio-selection strong {
    overflow: hidden;
    color: var(--color-ink-strong);
    font: 650 0.82rem var(--font-display-stack);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 650px) {
    .studio-preview { padding: 13px; border-radius: 22px; }
    .studio-stage { min-height: 286px; }
    .studio-stage.context-profile { min-height: 210px; }
    .studio-profile-card { width: calc(100% - 14px); }
    .studio-profile-card { min-height: 218px; }
    .studio-profile-content { min-height: 218px; padding: 15px; }
    .studio-name-wrap { padding: 18px 6px 12px; }
    .studio-stat-grid div { padding: 8px 5px; }
    .studio-roll-scene { min-height: 250px; }
    .studio-roll-scene :global(.roll-effect-wrapper) { transform: scale(0.66); margin: -12px 0; }
    .studio-leaderboard-scene { width: calc(100% - 20px); padding: 12px; }
  }
</style>
