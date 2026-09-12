<script>
  import { onMount } from 'svelte';
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';

  let host;
  let renderers = null;
  let failed = false;
  let disposed = false;
  let activeScene = 0;
  let sceneTimer;
  let sceneVisible = false;
  let reduceMotion = false;
  let environmentRenderer = null;
  let tjzSimplisticColors = ['#99C1F1', '#1A9CEB', '#000000'];
  let tjzSimplisticSnapshot = null;

  // The first scene keeps its existing Tjz profile. Simplistic uses a
  // separate current-profile snapshot as the source for its template.
  const links = [
    { type: 'github', label: 'GitHub' },
    { type: 'youtube', label: 'YouTube' },
    { type: 'twitch', label: 'Twitch' },
    { type: 'tiktok', label: 'TikTok' },
    { type: 'instagram', label: 'Instagram' }
  ];

  // The snapshot is filled in when the preview renderers load, keeping the
  // profile source out of the initial homepage route payload.
  let tjzSimplisticProps = Object.freeze({
    displayName: 'Mira',
    bio: 'collecting soft colors and quiet moments.',
    linksInteractive: false,
    layoutVariant: 'full-bleed',
    headingTag: 'h2',
    joinedLabel: '',
    showJoinDate: false
  });

  function createTjzSimplisticProps(snapshot) {
    const currentProps = { ...snapshot.props };
    delete currentProps.profileMotionKey;
    return Object.freeze({
      ...currentProps,
      displayName: 'Mira',
      bio: 'collecting soft colors and quiet moments.',
      linksInteractive: false,
      layoutVariant: 'full-bleed',
      headingTag: 'h2',
      joinedLabel: '',
      showJoinDate: false
    });
  }

  let scenes = [];
  $: scenes = [
    {
      id: 'tjz',
      label: 'Tjz profile',
      title: 'Add your profile details.',
      description: 'Set a name, bio, avatar, links, and daily color.',
      address: 'chm.lol/tjz',
      colors: ['#99C1F1', '#FFFFFF', '#000000'],
      motionKey: '',
      props: {}
    },
    {
      id: 'snow',
      label: 'Snowy theme',
      title: 'Choose the style.',
      description: 'Change the layout, background, font, and effects.',
      address: 'chm.lol/katt',
      colors: ['#8DDCFF', '#D7F5FF', '#0E1921'],
      motionKey: 'profile_motion_perspective_tilt',
      props: {
        displayName: 'katt',
        bio: 'collecting quiet colors and good weather.',
        location: 'Reykjavík, IS',
        avatarSrc: '/homepage/fixtures/p2/p2avatar.webp',
        bannerSrc: '/homepage/fixtures/p2/background-snowy-mountains.webp',
        layoutVariant: 'sleek',
        headingTag: 'h2',
        avatarEffectKey: 'avatar_effect_bat_orbit',
        roll: { hex_code: '#8DDCFF', identity: 'Bright Vivid Azure', rarity: 'Uncommon' },
        rollLabel: 'Daily color',
        nameLoadout: { fontKey: 'name_font_velocity', motionKey: 'name_motion_neon_particle', materialKey: '' },
        nameTodayColor: '#8DDCFF',
        profileBorderKey: 'border_signal',
        accentColor: '#8DDCFF',
        links,
        linksInteractive: false,
        linkStyle: { size: 1, glow: 1 },
        surfaceStyle: '--profile-surface-fill: rgba(8,18,24,.74); --profile-text: #FFFFFF; --profile-border-radius: 26px; --profile-border-color: #8DDCFF; --profile-border-opacity: .62; --profile-username: #FFFFFF; --profile-secondary-text: #D7F5FF; --profile-description: rgba(232,249,255,.88);'
      }
    },
    {
      id: 'full-bleed',
      label: 'Simplistic layout',
      title: 'Build the page.',
      description: 'Put your profile details, colors, and links together.',
      address: 'chm.lol/mira',
      colors: tjzSimplisticColors,
      // Keep the browser stage stable. The source profile’s cosmetics still
      // drive the template, but its card should sit inside this demo canvas.
      motionKey: '',
      props: tjzSimplisticProps
    }
  ];

  $: scene = scenes[activeScene];
  $: renderer = (scene.id === 'tjz' ? renderers?.tjz : renderers?.fullBleed) || null;

  function setScene(index) {
    activeScene = Math.max(0, Math.min(scenes.length - 1, index));
    restartSceneTimer();
  }

  function nextScene() {
    setScene((activeScene + 1) % scenes.length);
  }

  function stopSceneTimer() {
    if (sceneTimer) {
      clearInterval(sceneTimer);
      sceneTimer = null;
    }
  }

  function startSceneTimer() {
    if (!sceneVisible || reduceMotion || sceneTimer) return;
    sceneTimer = setInterval(nextScene, 6800);
  }

  function restartSceneTimer() {
    stopSceneTimer();
    startSceneTimer();
  }

  async function load() {
    failed = false;
    try {
      const [fullBleed, tjz, snapshotModule, environment] = await Promise.all([
        import('../profile-layout/ProfileFullBleedLayout.svelte'),
        import('./HomepageTjzProfile.svelte'),
        import('./tjzCurrentProfileSnapshot.json'),
        import('../ProfileEnvironmentLayer.svelte')
      ]);
      if (!disposed) {
        const snapshot = snapshotModule.default;
        tjzSimplisticSnapshot = snapshot;
        tjzSimplisticProps = createTjzSimplisticProps(snapshot);
        tjzSimplisticColors = [snapshot.colors.signature, snapshot.colors.nameToday, snapshot.environment.backgroundColor];
        environmentRenderer = environment.default;
        renderers = { fullBleed: fullBleed.default, tjz: tjz.default };
      }
    } catch {
      if (!disposed) failed = true;
    }
  }

  onMount(() => {
    reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const observer = new IntersectionObserver(entries => {
      sceneVisible = entries.some(entry => entry.isIntersecting);
      if (sceneVisible) {
        void load();
        startSceneTimer();
      } else stopSceneTimer();
    }, { rootMargin: '160px' });

    observer.observe(host);
    const handleVisibility = () => {
      if (document.hidden) stopSceneTimer();
      else startSceneTimer();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      stopSceneTimer();
    };
  });
</script>

<section class="homepage-section profile-example" id="profiles" bind:this={host} aria-labelledby="profile-example-title">
  <div class="profile-example__copy">
    <h2 id="profile-example-title" class="homepage-section-heading">Examples of what<br />you can build.</h2>
    <p class="homepage-section-sub">Choose a layout. Add your colors, links, fonts, effects, and background.</p>

    <div class="profile-example__scene-copy" aria-live="polite">
      <h3>{scene.title}</h3>
      <p>{scene.description}</p>
    </div>

    <div class="profile-example__controls" role="group" aria-label="Profile preview layouts">
      {#each scenes as item, index (item.id)}
        <button type="button" class:active={index === activeScene} aria-label={`Show ${item.label}`} aria-pressed={index === activeScene} on:click={() => setScene(index)}>
          <span style={`--scene-color:${item.colors[0]}`}></span>
          <em>{item.label}</em>
        </button>
      {/each}
    </div>
  </div>

  <figure aria-label="Profile customization preview">
    <div class="profile-example__stage" style={`--scene-color:${scene.colors[0]}`}>
      <div class="profile-example__browser">
        <div class="profile-example__canvas">
        {#if renderer}
          <div class="profile-example__motion-shell">
            <ProfileMotionEffect motionKey={scene.motionKey} inputSurface="viewport">
              {#key scene.id}
                <div class="profile-example__frame" style={`--scene-accent:${scene.colors[0]}`}>
                  {#if scene.id === 'full-bleed' && environmentRenderer && tjzSimplisticSnapshot}
                    <div class="profile-example__simplistic-shell" style={tjzSimplisticSnapshot.styles.page}>
                      <svelte:component this={environmentRenderer} snapshot={tjzSimplisticSnapshot} mode="preview" reducedMotion={reduceMotion} />
                      <div class="profile-example__simplistic-content">
                        <svelte:component this={renderer} {...scene.props} reducedMotion={reduceMotion} />
                      </div>
                    </div>
                  {:else}
                    <svelte:component this={renderer} {...scene.props} reducedMotion={reduceMotion} />
                  {/if}
                </div>
              {/key}
            </ProfileMotionEffect>
          </div>
        {:else if failed}
          <p class="profile-example__state">Preview couldn’t load. <button type="button" on:click={load}>Retry</button></p>
        {:else}
          <p class="profile-example__state" role="status">Loading profile example…</p>
        {/if}
        </div>
      </div>
      <div class="profile-example__swatches" aria-hidden="true">
        {#each scene.colors as color, index (color)}
          <span style={`--swatch:${color}`} class:profile-example__swatch--active={index === 0}></span>
        {/each}
      </div>
    </div>
  </figure>
</section>

<style>
  .profile-example {
    display: grid;
    grid-template-columns: minmax(380px, .78fr) minmax(0, 1.42fr);
    align-items: center;
    gap: clamp(42px, 4.5vw, 72px);
    padding-block: 82px 78px;
    scroll-margin-top: 24px;
  }

  .profile-example__copy {
    position: relative;
    z-index: 2;
    max-width: 480px;
  }

  .profile-example__scene-copy {
    display: grid;
    gap: 8px;
    margin-top: 42px;
    max-width: 380px;
  }

  .profile-example__scene-copy h3 {
    margin: 0;
    color: var(--homepage-text);
    font: 650 clamp(1.5rem, 2.4vw, 2.25rem) / 1.02 var(--homepage-display);
    letter-spacing: -.04em;
  }

  .profile-example__scene-copy p {
    margin: 0;
    color: var(--homepage-secondary-muted);
    font-size: .91rem;
    line-height: 1.55;
  }

  .profile-example__controls {
    display: grid;
    gap: 8px;
    margin-top: 26px;
  }

  .profile-example__controls button {
    display: flex;
    width: fit-content;
    min-height: 30px;
    align-items: center;
    gap: 9px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--homepage-muted);
    cursor: pointer;
    font: 500 .78rem / 1.2 'Inter', sans-serif;
    text-align: left;
  }

  .profile-example__controls button > span {
    width: 18px;
    height: 3px;
    border-radius: 99px;
    background: var(--scene-color);
    opacity: .4;
    transition: width .22s ease, opacity .22s ease, box-shadow .22s ease;
  }

  .profile-example__controls button.active { color: var(--homepage-text); }
  .profile-example__controls button.active > span { width: 34px; opacity: 1; box-shadow: none; }
  .profile-example__controls button:hover > span,
  .profile-example__controls button:focus-visible > span { opacity: 1; }
  .profile-example__controls em { font-style: normal; }

  figure {
    min-width: 0;
    margin: 0;
  }

  .profile-example__stage {
    position: relative;
    display: grid;
    min-height: 410px;
    place-items: center;
    isolation: isolate;
  }


  .profile-example__browser {
    position: relative;
    width: min(100%, 920px);
    overflow: visible;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 18px;
    background: rgba(15,15,19,.86);
    box-shadow: 0 20px 48px rgba(0,0,0,.32);
    padding: 8px;
  }

  .profile-example__canvas {
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 430px;
    place-items: center;
    padding: 0;
    overflow: visible;
    isolation: isolate;
  }

  .profile-example__motion-shell {
    width: 100%;
    min-width: 0;
  }

  .profile-example__frame {
    animation: profile-example-frame-in .7s cubic-bezier(.22, 1, .36, 1) both;
    transform-origin: 50% 70%;
  }

  .profile-example__simplistic-shell {
    position: relative;
    display: grid;
    width: 100%;
    min-height: 430px;
    place-items: center;
    overflow: hidden;
    isolation: isolate;
    border-radius: 12px;
    background: var(--profile-background-paint, var(--profile-background, #050506));
  }

  .profile-example__simplistic-content {
    position: relative;
    z-index: 1;
    width: min(100%, 52rem);
    min-width: 0;
    transform: scale(.82);
    transform-origin: center;
  }

  .profile-example__swatches {
    position: absolute;
    right: -17px;
    bottom: 42px;
    display: grid;
    gap: 7px;
    width: 10px;
  }

  .profile-example__swatches span {
    display: block;
    width: 10px;
    height: 30px;
    border-radius: 99px;
    background: var(--swatch);
    box-shadow: 0 0 14px color-mix(in srgb, var(--swatch) 58%, transparent);
    opacity: .46;
  }

  .profile-example__swatches .profile-example__swatch--active { height: 48px; opacity: 1; }

  @keyframes profile-example-frame-in {
    from { opacity: 0; transform: translateY(12px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }


  .profile-example__state {
    margin: 0;
    color: var(--homepage-secondary-muted);
    font-size: .95rem;
  }

  button {
    min-height: 42px;
  }

  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 5px;
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-example__frame { animation: none; }
    .profile-example__controls button > span { transition: none; }
  }

  @media (max-width: 1199px) {
    .profile-example {
      grid-template-columns: minmax(0, 1fr);
      gap: 30px;
      padding-block: 58px;
    }

    .profile-example__copy {
      max-width: 650px;
    }

    .profile-example__scene-copy { max-width: 500px; }

    .profile-example__stage {
      min-height: 400px;
    }

    .profile-example__browser { width: min(100%, 860px); }
  }

  @media (max-width: 600px) {
    .profile-example {
      padding-block: 52px;
    }

    .profile-example__stage {
      min-height: 350px;
    }

    .profile-example__canvas {
      min-height: 340px;
    }

    .profile-example__swatches { right: 9px; bottom: 23px; }
  }
</style>
