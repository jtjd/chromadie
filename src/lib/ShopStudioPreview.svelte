<script>
  import IdentityCard from './IdentityCard.svelte';
  import { getBadgeMeta } from './badgeData.js';
  import { createDefaultProfileConfig, getVisibleProfileLinks } from './profileConfig.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import { getNameRendererLoadout } from './name/nameLoadout.js';

  export let loadout = {};
  export let username = 'Your profile';
  export let selectedItem = /** @type {any} */ (null);
  export let displayColor = '#8B7CF6';
  /** @type {any} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let compact = false;

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
  $: nameRendererLoadout = getNameRendererLoadout(loadout);
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

  {/if}

  <div class="studio-stage context-profile">
    <div class="stage-grid" aria-hidden="true"></div>
    <ProfileBorderEffect borderKey={loadout?.profile_border} className="studio-profile-border" compact={compact}>
      <div class="studio-profile-card">
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
          nameRendererLoadout={nameRendererLoadout}
          nameRendererContext={compact ? 'card' : 'profile'}
          nameRendererMode={compact ? 'static-signature' : 'animated'}
          showToday={false}
        />
      </div>
    </ProfileBorderEffect>
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

  .studio-preview-head {
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
  .studio-profile-card :global(.identity-card) { z-index: 2; padding: 1rem; border: 0; border-radius: 17px; }
  .studio-profile-card :global(.identity-card__person) { gap: 0.75rem; }
  .studio-profile-card :global(.identity-card__avatar) { flex-basis: 3.25rem; width: 3.25rem; }
  .studio-profile-card :global(.identity-card__avatar-letter) { font-size: 1.5rem; }
  .studio-profile-card :global(.identity-card__name) { font-size: clamp(1.1rem, 4.5vw, 1.65rem); }
  .studio-profile-card :global(.identity-card__bio) { margin-top: 0.45rem; font-size: 0.72rem; }

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
  }
</style>
