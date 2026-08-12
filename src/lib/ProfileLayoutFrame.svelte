<script>
  import { isProfileLayoutKey } from './profile-layout/profileLayouts.js';

  export let variant = 'compact';
  export let username = '';
  export let isOwner = false;
  export let hasMusic = false;
  export let showRoll = true;

  $: safeVariant = isProfileLayoutKey(variant) ? variant : 'compact';
  $: presenceLabel = isOwner ? 'your profile' : 'on Chromadie';
</script>

<div
  class={'profile-layout-frame profile-layout-frame--' + safeVariant}
  data-profile-layout={safeVariant}
  data-profile-layout-username={username || undefined}
>
  <div class="profile-layout-frame__identity" data-profile-layout-region="identity">
    <slot name="identity"></slot>
  </div>

  {#if safeVariant === 'sleek'}
    <div class="profile-layout-frame__strips" data-profile-layout-region="strips">
      <div class="profile-layout-frame__strip profile-layout-frame__presence" data-profile-layout-strip="presence">
        <span class="profile-layout-frame__presence-dot" aria-hidden="true"></span>
        <span class="profile-layout-frame__strip-copy">
          <strong>{presenceLabel}</strong>
          <span>daily color profile</span>
        </span>
        <span class="profile-layout-frame__strip-value">{username || 'Chromanaut'}</span>
      </div>

      {#if hasMusic}
        <div class="profile-layout-frame__strip profile-layout-frame__music" data-profile-layout-strip="music">
          <slot name="music"></slot>
        </div>
      {/if}

      {#if showRoll}
        <div class="profile-layout-frame__strip profile-layout-frame__today" data-profile-layout-strip="today">
          <slot name="roll"></slot>
        </div>
      {/if}
    </div>
  {:else if safeVariant === 'modern'}
    <section class="profile-layout-frame__modern" data-profile-layout-region="modern" aria-label="Profile and widgets">
      <div class="profile-layout-frame__tabline" data-profile-layout-tabs role="tablist" aria-label="Profile sections">
        <span class="profile-layout-frame__tab profile-layout-frame__tab--active" role="tab" aria-selected="true">PROFILE</span>
        <span class="profile-layout-frame__tab" role="tab" aria-selected="false">WIDGETS</span>
      </div>
      {#if showRoll}
        <div class="profile-layout-frame__widget" data-profile-layout-widget>
          <slot name="roll"></slot>
        </div>
      {/if}
    </section>
  {:else if safeVariant !== 'portfolio' && showRoll}
    <div class="profile-layout-frame__roll" data-profile-layout-region="roll">
      <slot name="roll"></slot>
    </div>
  {/if}
</div>

<style>
  .profile-layout-frame {
    display: grid;
    width: 100%;
    min-width: 0;
    gap: 0;
  }

  .profile-layout-frame__identity,
  .profile-layout-frame__roll,
  .profile-layout-frame__strips,
  .profile-layout-frame__modern,
  .profile-layout-frame__strip,
  .profile-layout-frame__widget {
    min-width: 0;
  }

  .profile-layout-frame__identity {
    position: relative;
    z-index: 1;
  }

  .profile-layout-frame--compact {
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .11) * 100%), transparent);
    border-radius: var(--profile-border-radius, var(--radius-lg));
    background: var(--profile-surface-fill, color-mix(in srgb, var(--profile-surface, #090b0f) calc(var(--profile-surface-opacity, .64) * 100%), transparent));
    box-shadow: 0 2rem 5rem rgba(0, 0, 0, .34), inset 0 1px 0 rgba(255, 255, 255, .045);
    backdrop-filter: blur(var(--profile-surface-blur, 20px));
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
  }

  .profile-layout-frame--sleek,
  .profile-layout-frame--modern {
    gap: .55rem;
  }

  .profile-layout-frame--sleek .profile-layout-frame__identity,
  .profile-layout-frame--modern .profile-layout-frame__identity {
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .11) * 100%), transparent);
    border-radius: var(--profile-border-radius, var(--radius-lg));
    background: var(--profile-surface-fill, color-mix(in srgb, var(--profile-surface, #090b0f) calc(var(--profile-surface-opacity, .64) * 100%), transparent));
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 255, 255, .04);
    backdrop-filter: blur(var(--profile-surface-blur, 20px));
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
  }

  .profile-layout-frame--sleek .profile-layout-frame__identity {
    border-radius: .95rem;
  }

  .profile-layout-frame--minimal,
  .profile-layout-frame--portfolio {
    background: transparent;
  }

  .profile-layout-frame--minimal .profile-layout-frame__identity,
  .profile-layout-frame--portfolio .profile-layout-frame__identity {
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .profile-layout-frame__strips {
    display: grid;
    gap: .55rem;
  }

  .profile-layout-frame__strip {
    display: flex;
    align-items: center;
    min-height: 3rem;
    padding: .58rem .7rem;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) 12%, transparent);
    border-radius: .8rem;
    background: color-mix(in srgb, var(--profile-surface, #090b0f) 58%, transparent);
    color: var(--profile-text, rgba(244, 246, 251, .9));
    box-shadow: 0 .8rem 2rem rgba(0, 0, 0, .16);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .profile-layout-frame__presence {
    gap: .6rem;
  }

  .profile-layout-frame__presence-dot {
    flex: 0 0 .45rem;
    width: .45rem;
    height: .45rem;
    border-radius: 50%;
    background: var(--profile-accent, var(--color-accent-roll));
    box-shadow: 0 0 .8rem color-mix(in srgb, var(--profile-accent, var(--color-accent-roll)) 72%, transparent);
  }

  .profile-layout-frame__strip-copy {
    display: grid;
    min-width: 0;
    gap: .12rem;
  }

  .profile-layout-frame__strip-copy strong,
  .profile-layout-frame__strip-copy span,
  .profile-layout-frame__strip-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-layout-frame__strip-copy strong {
    color: var(--profile-text, rgba(244, 246, 251, .9));
    font: 700 .68rem / 1.1 var(--font-mono-stack);
    letter-spacing: .05em;
    text-transform: uppercase;
  }

  .profile-layout-frame__strip-copy span,
  .profile-layout-frame__strip-value {
    color: var(--profile-secondary-text, rgba(220, 230, 248, .58));
    font: .62rem / 1.25 var(--font-mono-stack);
  }

  .profile-layout-frame__strip-value {
    margin-left: auto;
    max-width: 38%;
  }

  .profile-layout-frame__music,
  .profile-layout-frame__today {
    display: block;
    padding: 0;
  }

  .profile-layout-frame__modern {
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) 12%, transparent);
    border-radius: .85rem;
    background: color-mix(in srgb, var(--profile-surface, #090b0f) 48%, transparent);
    box-shadow: 0 .9rem 2.4rem rgba(0, 0, 0, .18);
  }

  .profile-layout-frame__tabline {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    min-height: 2.4rem;
    padding: 0 .85rem;
    border-bottom: 1px solid color-mix(in srgb, var(--profile-border-color, #ffffff) 11%, transparent);
  }

  .profile-layout-frame__tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    align-self: stretch;
    color: var(--profile-secondary-text, rgba(220, 230, 248, .52));
    font: 700 .58rem / 1 var(--font-mono-stack);
    letter-spacing: .12em;
  }

  .profile-layout-frame__tab--active {
    color: var(--profile-text, rgba(244, 246, 251, .92));
  }

  .profile-layout-frame__tab--active::after {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--profile-accent, var(--color-accent-roll));
    content: '';
  }

  .profile-layout-frame__widget {
    padding: .25rem .65rem .35rem;
  }

  .profile-layout-frame__roll {
    min-width: 0;
  }

  /* The frame owns the presentation surface; the shared IdentityCard remains
     responsible for identity content and can also be used on its own. */
  .profile-layout-frame :global(.identity-card) {
    width: 100%;
    border: 0;
    border-radius: inherit;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .profile-layout-frame :global(.profile-music) {
    width: 100%;
    min-height: 3rem;
    border: 0;
    border-radius: inherit;
    box-shadow: none;
  }

  .profile-layout-frame :global(.profile-music--audio) {
    position: static;
    pointer-events: auto;
  }

  .profile-layout-frame--sleek :global(.profile-daily-roll),
  .profile-layout-frame--modern :global(.profile-daily-roll) {
    width: 100%;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  @media (max-width: 36rem) {
    .profile-layout-frame--compact .profile-layout-frame__identity :global(.identity-card__person),
    .profile-layout-frame--modern .profile-layout-frame__identity :global(.identity-card__person) {
      gap: .75rem;
    }

    .profile-layout-frame__strip-value {
      max-width: 32%;
    }

    .profile-layout-frame--minimal .profile-layout-frame__identity,
    .profile-layout-frame--portfolio .profile-layout-frame__identity {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-layout-frame__strip,
    .profile-layout-frame__modern {
      scroll-behavior: auto;
    }
  }
</style>
