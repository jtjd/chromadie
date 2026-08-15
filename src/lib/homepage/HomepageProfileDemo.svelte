<script>
  import ProfileReferenceCard from '../ProfileReferenceCard.svelte';

  /** @type {any} */
  export let fixture = null;
  export let variant = 'hero';
  /** @type {any} */
  export let previewRoll = null;

  $: latestRoll = previewRoll || fixture?.scores?.[0] || null;
  $: links = (fixture?.links || []).slice(0, variant === 'showcase' ? 2 : 4);
  $: profileLabel = fixture ? `${fixture.displayName}'s profile example` : 'Profile example';
  $: avatarSource = fixture?.media?.avatar || '';
  $: secondaryLine = fixture?.secondaryLine || '';
  $: demoStyle = fixture
    ? `--homepage-demo-accent: ${previewRoll?.hex_code || fixture.accent}; --homepage-demo-avatar: url("${avatarSource}");`
    : '';
</script>

{#if fixture}
  {#if variant === 'showcase'}
    <div
      class="homepage-profile-demo homepage-profile-demo--showcase"
      style={demoStyle}
      data-homepage-profile-specimen="showcase"
      data-homepage-fixture={fixture.id}
      aria-label={profileLabel}
    >
      <div class="homepage-profile-demo__mini-profile">
        <div class="homepage-profile-demo__mini-head">
          <div class="homepage-profile-demo__mini-avatar" aria-hidden="true"></div>
          <div>
            <div class="homepage-profile-demo__mini-name">{fixture.displayName}</div>
            <div class="homepage-profile-demo__mini-meta">{fixture.bio}</div>
          </div>
        </div>
        <div class="homepage-profile-demo__mini-links" aria-label={`${fixture.displayName} links`}>
          {#each links as link (link.url)}
            <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div
      class="homepage-profile-demo homepage-profile-demo--hero"
      style={demoStyle}
      data-homepage-profile-specimen="hero"
      data-homepage-fixture={fixture.id}
      aria-label={profileLabel}
    >
      <ProfileReferenceCard
        displayName={fixture.displayName}
        bio={fixture.bio}
        {secondaryLine}
        avatarSrc={avatarSource}
        {links}
        roll={latestRoll}
        accentColor={previewRoll?.hex_code || fixture.accent}
        rollLabel="Today's roll"
        presentation="homepage"
        ariaLabel={profileLabel}
      />
    </div>
  {/if}
{/if}

<style>
  .homepage-profile-demo {
    --homepage-demo-accent: #00ffb3;
    position: relative;
    min-width: 0;
    color: var(--homepage-text);
  }

  .homepage-profile-demo--hero { width: 100%; min-width: 0; }

  .homepage-profile-demo--showcase { position: absolute; inset: 0; z-index: 2; }

  .homepage-profile-demo__mini-profile {
    position: absolute;
    right: 22px;
    bottom: 22px;
    left: 22px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 15px;
    background: rgba(8, 8, 10, 0.6);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .homepage-profile-demo__mini-head { display: flex; align-items: center; gap: 12px; }

  .homepage-profile-demo__mini-avatar {
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    border: 2px solid var(--homepage-demo-accent);
    border-radius: 50%;
    background-image: var(--homepage-demo-avatar);
    background-position: center;
    background-size: cover;
    box-shadow: 0 0 16px color-mix(in srgb, var(--homepage-demo-accent) 40%, transparent);
  }

  .homepage-profile-demo__mini-name { color: var(--homepage-text); font: 600 1.15rem / 1.1 'Clash Display', sans-serif; }
  .homepage-profile-demo__mini-meta { margin-top: 2px; overflow: hidden; color: rgba(245, 245, 247, 0.5); font: 400 0.72rem / 1.2 'Inter', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
  .homepage-profile-demo__mini-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }

  .homepage-profile-demo__mini-links a {
    display: flex;
    height: 33px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
    color: rgba(245, 245, 247, 0.86);
    font: 400 0.72rem / 1 'Inter', sans-serif;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .homepage-profile-demo__mini-links a:hover,
  .homepage-profile-demo__mini-links a:focus-visible { border-color: var(--homepage-demo-accent); color: var(--homepage-text); }
  .homepage-profile-demo__mini-links a:focus-visible { outline: 2px solid var(--homepage-demo-accent); outline-offset: 2px; }

  @media (max-width: 460px) {
    .homepage-profile-demo--hero { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-profile-demo__mini-links a { transition: none; }
  }
</style>
