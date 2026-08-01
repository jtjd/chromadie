<script>
  import RollPreview from './RollPreview.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import ProfileAtmosphere from './ProfileAtmosphere.svelte';
  import { getBadgeMeta } from './badgeData.js';
  import { createDefaultProfileConfig, getVisibleProfileLinks } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { getCosmeticEffect, getProfileAtmosphereEffect, getProfileBg } from './cosmetics';
  import { SHOP_CONTEXT_LABELS } from './shopCatalog';

  export let loadout = {};
  export let activeContext = 'profile';
  export let username = 'Chromanaut';
  export let selectedItem = /** @type {any} */ (null);
  export let displayColor = '#7B5CFF';
  /** @type {any} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;

  $: nameEffect = getCosmeticEffect(loadout, 'name_effect');
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
  $: previewLinks = getVisibleProfileLinks(previewProfileConfig);
</script>

<section class="studio-preview" aria-label="Your cosmetic preview">
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
          nameClass={nameEffect.cls}
          nameStyle={nameEffect.style}
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
          rarity="Mythic"
          size="game"
        />
        <strong>{displayColor}</strong>
        <span class="roll-rarity">Mythic result</span>
      </div>
    {:else}
      <div class="studio-leaderboard-scene">
        <div class="leaderboard-caption">
          <span>Today’s leaderboard</span>
          <span>Top players</span>
        </div>
        <div class="studio-leaderboard-row {leaderboardTheme.cls}" style={leaderboardTheme.style}>
          <span class="studio-rank">#1</span>
          <div class="studio-player">
            <span class="studio-player-name {nameEffect.cls}" style={nameEffect.style} data-text={username}>{username}</span>
            <span>{displayColor} · Mythic</span>
          </div>
          <strong>9.8M</strong>
        </div>
        <div class="leaderboard-ghost-row"><span>#2</span><i></i><i></i></div>
        <div class="leaderboard-ghost-row short"><span>#3</span><i></i><i></i></div>
      </div>
    {/if}
  </div>

  <div class="studio-selection" aria-live="polite">
    <span>{selectedItem ? 'Previewing' : 'Studio ready'}</span>
    <strong>{selectedItem?.name || 'Choose an item to try it on'}</strong>
  </div>
</section>

<style>
  .studio-preview {
    width: 100%;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 28px;
    padding: 18px;
    background:
      radial-gradient(circle at 80% 0%, rgba(127, 105, 255, 0.13), transparent 35%),
      linear-gradient(155deg, rgba(21,22,29,0.98), rgba(10,11,15,0.98));
    box-shadow: 0 26px 70px rgba(0,0,0,0.36);
  }

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
    font: 700 1.35rem/1.1 var(--font-display);
    letter-spacing: -0.02em;
  }

  .studio-eyebrow {
    color: #aaa5bd;
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
    color: #77798a;
    cursor: pointer;
    font: 650 0.76rem var(--font-display);
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .context-switcher button:hover { color: #fff; }
  .context-switcher button.active {
    color: #fff;
    background: rgba(255,255,255,0.08);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.065);
  }

  .studio-stage {
    position: relative;
    min-height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.075);
    border-radius: 22px;
    background:
      radial-gradient(circle at 50% 40%, rgba(122,96,255,0.13), transparent 42%),
      #07080c;
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
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px;
    background: #11131a;
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
    color: #858899;
    font: 650 0.62rem var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .roll-scene-label { margin-bottom: 3px; }
  .studio-roll-scene :global(.roll-effect-wrapper) { transform: scale(0.76); margin: -2px 0; }
  .studio-roll-scene > strong { color: #fff; font: 700 1rem var(--font-mono-stack); letter-spacing: 0.08em; }
  .roll-rarity { margin-top: 7px; color: #d4c9ff; }

  .studio-leaderboard-scene {
    position: relative;
    z-index: 1;
    width: calc(100% - 34px);
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.075);
    border-radius: 18px;
    background: rgba(12,13,19,0.82);
  }

  .leaderboard-caption {
    margin-bottom: 18px;
    color: #858899;
    font: 650 0.62rem var(--font-mono-stack);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .studio-leaderboard-row {
    min-height: 76px;
    padding: 13px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 15px;
    background: rgba(255,255,255,0.045);
  }

  .studio-rank { color: #d4c9ff; font: 700 0.76rem var(--font-mono-stack); }
  .studio-player { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .studio-player-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
    font: 700 0.9rem var(--font-display);
    white-space: nowrap;
  }
  .studio-player > span:last-child { color: #9295a5; font-size: 0.62rem; }
  .studio-leaderboard-row > strong { color: #fff; font: 700 0.78rem var(--font-mono-stack); }

  .leaderboard-ghost-row {
    min-height: 44px;
    margin-top: 8px;
    padding: 0 12px;
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 12px;
    color: #505260;
    font-size: 0.65rem;
  }
  .leaderboard-ghost-row i { height: 7px; border-radius: 999px; background: rgba(255,255,255,0.055); }
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
    color: #77798a;
    font: 650 0.58rem var(--font-mono-stack);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .studio-selection strong {
    overflow: hidden;
    color: #e9e8f2;
    font: 650 0.82rem var(--font-display);
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
