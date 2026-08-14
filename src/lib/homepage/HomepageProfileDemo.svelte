<script>
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
    <article
      class="homepage-profile-demo homepage-profile-demo--hero"
      class:homepage-profile-demo--has-secondary={secondaryLine}
      style={demoStyle}
      data-homepage-profile-specimen="hero"
      data-homepage-fixture={fixture.id}
      aria-label={profileLabel}
    >
      <div class="homepage-profile-demo__avatar-shell">
        <div class="homepage-profile-demo__avatar" role="img" aria-label={`${fixture.displayName} avatar`}></div>
      </div>

      <h2 class="homepage-profile-demo__name">{fixture.displayName}</h2>
      <p class="homepage-profile-demo__bio">{fixture.bio}</p>
      {#if secondaryLine}
        <p class="homepage-profile-demo__secondary">{secondaryLine}</p>
      {/if}

      <nav class="homepage-profile-demo__links" aria-label={`${fixture.displayName} profile links`}>
        {#each links as link (link.url)}
          <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
        {/each}
      </nav>

      {#if latestRoll}
        <div class="homepage-profile-demo__roll">
          <div>
            <small>Today's roll</small>
            <strong>{latestRoll.hex_code}</strong>
          </div>
          <div class="homepage-profile-demo__roll-swatch" aria-label={`${latestRoll.hex_code}, ${latestRoll.rarity}`}></div>
        </div>
      {/if}
    </article>
  {/if}
{/if}

<style>
  .homepage-profile-demo {
    --homepage-demo-accent: #00ffb3;
    position: relative;
    min-width: 0;
    color: var(--homepage-text);
  }

  .homepage-profile-demo--hero {
    width: 100%;
    padding: 51px 28px 29px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    background: rgba(10, 10, 13, 0.52);
    box-shadow: 0 34px 80px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(32px) saturate(160%);
    -webkit-backdrop-filter: blur(32px) saturate(160%);
    text-align: center;
  }

  /* Keep the authored secondary line within the established card footprint. */
  .homepage-profile-demo--hero.homepage-profile-demo--has-secondary { padding-top: 51px; padding-bottom: 26.5px; }

  .homepage-profile-demo__avatar-shell {
    position: relative;
    width: 100px;
    height: 100px;
    margin: 24px auto 15px;
    border-radius: 50%;
    overflow: hidden;
  }

  .homepage-profile-demo__avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-image: var(--homepage-demo-avatar);
    background-position: center;
    background-size: cover;
  }

  .homepage-profile-demo__name {
    position: relative;
    z-index: 1;
    margin: 0;
    color: var(--homepage-text);
    font: 600 1.95rem / 1 'Clash Display', sans-serif;
    letter-spacing: -0.035em;
  }

  .homepage-profile-demo__bio {
    position: relative;
    z-index: 1;
    margin: 8px 0 0;
    color: rgba(245, 245, 247, 0.54);
    font: 400 0.84rem / 1.3 'Inter', sans-serif;
  }

  .homepage-profile-demo__secondary {
    position: relative;
    z-index: 1;
    margin: 3px 0 0;
    color: rgba(245, 245, 247, 0.42);
    font: 400 0.72rem / 1.2 'Inter', sans-serif;
    font-style: italic;
  }

  .homepage-profile-demo__links {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 22px;
  }

  .homepage-profile-demo--has-secondary .homepage-profile-demo__links { margin-top: 10px; }

  .homepage-profile-demo__links a {
    display: flex;
    height: 41px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.043);
    color: rgba(245, 245, 247, 0.86);
    font: 500 0.78rem / 1 'Inter', sans-serif;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .homepage-profile-demo__links a:hover,
  .homepage-profile-demo__links a:focus-visible { border-color: var(--homepage-demo-accent); color: var(--homepage-text); }
  .homepage-profile-demo__links a:focus-visible { outline: 2px solid var(--homepage-demo-accent); outline-offset: 2px; }

  .homepage-profile-demo__roll {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 11px;
    padding: 13px 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    text-align: left;
  }

  .homepage-profile-demo__roll small {
    display: block;
    color: var(--homepage-muted-2);
    font: 400 0.62rem / 1.2 'Inter', sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .homepage-profile-demo__roll strong {
    display: block;
    margin-top: 3px;
    color: var(--homepage-text);
    font: 600 0.9rem / 1 'Clash Display', sans-serif;
  }

  .homepage-profile-demo__roll-swatch {
    width: 31px;
    height: 31px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--homepage-demo-accent);
  }

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
    .homepage-profile-demo--hero { padding: 38px 18px 21px; border-radius: 18px; }
    .homepage-profile-demo--hero.homepage-profile-demo--has-secondary { padding-top: 38px; padding-bottom: 18.5px; }
    .homepage-profile-demo__avatar-shell { width: 90px; height: 90px; }
    .homepage-profile-demo__name { font-size: 1.75rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-profile-demo__links a,
    .homepage-profile-demo__mini-links a { transition: none; }
  }
</style>
