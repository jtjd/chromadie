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
  let paused = false;
  let hovered = false;
  let focused = false;
  let announcement = '';
  let loading;
  let environmentRenderer = null;
  let tjzSimplisticColors = ['#99C1F1', '#1A9CEB', '#000000'];
  let tjzLiveColors = ['#99C1F1', '#5B2DE2', '#000000'];
  let currentTjzSnapshot = null;

  // The first scene keeps its existing Tjz profile. The custom scene uses a
  // separate live-profile snapshot, while Simplistic keeps its own existing
  // current-profile source. Both snapshots are filled in when the preview
  // renderers load, keeping the profile sources out of the initial route.
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
      nameLoadout: { ...currentProps.nameLoadout, motionKey: 'name_motion_heart_pop' },
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
      label: 'Modern',
      description: 'A framed profile with animated text and snowfall.',
      colors: ['#99C1F1', '#FFFFFF', '#000000'],
      motionKey: '',
      props: {}
    },
    {
      id: 'custom',
      label: 'Sleek',
      description: 'Expressive avatar cosmetics and a transparent profile card.',
      colors: tjzLiveColors,
      motionKey: '',
      props: {}
    },
    {
      id: 'full-bleed',
      label: 'Simplistic',
      description: 'A centered profile over a full-background scene.',
      colors: tjzSimplisticColors,
      // Keep the browser stage stable. The source profile’s cosmetics still
      // drive the template, but its card should sit inside this demo canvas.
      motionKey: '',
      props: tjzSimplisticProps
    }
  ];

  $: scene = scenes[activeScene];
  $: renderer = scene.id === 'tjz'
    ? renderers?.tjz
    : scene.id === 'custom'
      ? renderers?.currentTjz
      : renderers?.fullBleed;

  function setScene(index, manual = true) {
    activeScene = Math.max(0, Math.min(scenes.length - 1, index));
    if (manual) announcement = `${scenes[activeScene].label} preview selected.`;
    restartSceneTimer();
  }

  function nextScene() {
    setScene((activeScene + 1) % scenes.length, false);
  }

  function stopSceneTimer() {
    if (sceneTimer) {
      clearInterval(sceneTimer);
      sceneTimer = null;
    }
  }

  function startSceneTimer() {
    if (disposed || !sceneVisible || paused || hovered || focused || document.hidden || !renderers || sceneTimer) return;
    sceneTimer = setInterval(nextScene, 10000);
  }

  function restartSceneTimer() {
    stopSceneTimer();
    startSceneTimer();
  }

  function load() {
    if (renderers || loading) return loading;
    loading = loadRenderers().finally(() => { loading = null; restartSceneTimer(); });
    return loading;
  }

  async function loadRenderers() {
    failed = false;
    try {
      const [fullBleed, tjz, currentTjz, snapshotModule, liveSnapshotModule, environment] = await Promise.all([
        import('../profile-layout/ProfileFullBleedLayout.svelte'),
        import('./HomepageTjzProfile.svelte'),
        import('./HomepageCurrentTjzProfile.svelte'),
        import('./tjzCurrentProfileSnapshot.json'),
        import('./tjzLiveProfileSnapshot.json'),
        import('../ProfileEnvironmentLayer.svelte')
      ]);
      if (!disposed) {
        const snapshot = snapshotModule.default;
        const liveSnapshot = liveSnapshotModule.default;
        currentTjzSnapshot = snapshot;
        tjzSimplisticProps = createTjzSimplisticProps(snapshot);
        tjzSimplisticColors = [snapshot.colors.signature, snapshot.colors.nameToday, snapshot.environment.backgroundColor];
        tjzLiveColors = [liveSnapshot.colors.signature, liveSnapshot.colors.nameToday, liveSnapshot.environment.backgroundColor];
        environmentRenderer = environment.default;
        renderers = { fullBleed: fullBleed.default, tjz: tjz.default, currentTjz: currentTjz.default };
      }
    } catch {
      if (!disposed) failed = true;
    }
  }

  onMount(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = () => {
      reduceMotion = motionPreference.matches;
      if (reduceMotion) paused = true;
      restartSceneTimer();
    };
    handleMotion();
    motionPreference.addEventListener('change', handleMotion);
    const preloadObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        void load();
        preloadObserver.disconnect();
      }
    }, { rootMargin: '160px' });
    preloadObserver.observe(host);
    const observer = new IntersectionObserver(entries => {
      sceneVisible = entries.some(entry => entry.isIntersecting);
      if (sceneVisible) {
        void load();
        startSceneTimer();
      } else stopSceneTimer();
    }, { threshold: .25 });

    observer.observe(host);
    const handleVisibility = () => {
      if (document.hidden) stopSceneTimer();
      else startSceneTimer();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      observer.disconnect();
      preloadObserver.disconnect();
      motionPreference.removeEventListener('change', handleMotion);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopSceneTimer();
    };
  });
</script>

<section class="homepage-section profile-example" id="profiles" bind:this={host} aria-labelledby="profile-example-title"
  on:mouseenter={() => { hovered = true; stopSceneTimer(); }}
  on:mouseleave={() => { hovered = false; restartSceneTimer(); }}
  on:focusin={() => { focused = true; stopSceneTimer(); }}
  on:focusout={(event) => { if (!host.contains(event.relatedTarget)) { focused = false; restartSceneTimer(); } }}>
  <div class="profile-example__copy">
    <h2 id="profile-example-title" class="homepage-section-heading">Examples of what<br />you can build.</h2>
    <p class="homepage-section-sub">Choose a layout. Add your colors, links, fonts, effects, and background.</p>

    <div class="profile-example__controls" role="group" aria-label="Profile preview layouts">
      {#each scenes as item, index (item.id)}
        <button type="button" class:active={index === activeScene} aria-label={`Show ${item.label}`} aria-pressed={index === activeScene} on:click={() => setScene(index)}>
          <span style={`--scene-color:${item.colors[0]}`}></span>
          <em>{item.label}</em>
        </button>
      {/each}
    </div>
    <p class="profile-example__description">{scene.description}</p>
    <button class="profile-example__playback" type="button"
      on:click={() => { paused = !paused; restartSceneTimer(); }}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">
        {#if paused}<path d="M4 2.5 13 8l-9 5.5Z" />{:else}<path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" />{/if}
      </svg>
      {paused ? 'Play previews' : 'Pause previews'}
    </button>
    <span class="profile-example__announcement" role="status">{announcement}</span>
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
                  {#if scene.id === 'full-bleed' && environmentRenderer && currentTjzSnapshot}
                    <div class="profile-example__current-shell" style={currentTjzSnapshot.styles.page}>
                      <svelte:component this={environmentRenderer} snapshot={currentTjzSnapshot} mode="preview" reducedMotion={reduceMotion} />
                      <div class="profile-example__current-content">
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
          <p class="profile-example__state" role="alert">Preview couldn’t load. <button type="button" on:click={() => window.location.reload()}>Reload previews</button></p>
        {:else}
          <p class="profile-example__state" role="status">Loading profile example…</p>
        {/if}
        </div>
      </div>
    </div>
  </figure>
</section>

<style>
  .profile-example {
    display: grid;
    grid-template-columns: minmax(380px, .78fr) minmax(0, 1.42fr);
    align-items: start;
    gap: clamp(42px, 4.5vw, 72px);
    padding-block: 82px 78px;
    scroll-margin-top: 24px;
  }

  .profile-example__copy {
    position: relative;
    z-index: 2;
    max-width: 480px;
  }

  .profile-example__description {
    margin: 18px 0 0;
    min-height: 3.1em;
    color: var(--homepage-secondary-muted);
    font-size: .91rem;
    line-height: 1.55;
  }

  .profile-example__controls {
    display: grid;
    gap: 8px;
    margin-top: 28px;
  }

  .profile-example__controls button {
    display: flex;
    width: fit-content;
    min-height: 44px;
    align-items: center;
    gap: 9px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--homepage-muted);
    cursor: pointer;
    font: 500 1rem / 1.2 'Inter', sans-serif;
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
    width: 100%;
    min-width: 0;
    animation: profile-example-frame-in .25s ease both;
  }

  .profile-example__current-shell {
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

  .profile-example__current-content {
    position: relative;
    z-index: 1;
    width: min(100%, 52rem);
    min-width: 0;
    transform: scale(.82);
    transform-origin: center;
  }

  .profile-example__playback {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    margin-top: 12px;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 8px;
    background: rgba(22,22,26,.72);
    color: var(--homepage-secondary-muted);
    font: 500 .9rem / 1.3 var(--homepage-body, 'Inter', sans-serif);
    cursor: pointer;
  }
  .profile-example__playback:hover,
  .profile-example__playback:focus-visible { border-color: rgba(255,255,255,.32); background: rgba(32,32,38,.86); color: var(--homepage-text); }
  .profile-example__announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  @keyframes profile-example-frame-in {
    from { opacity: 0; }
    to { opacity: 1; }
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

  @media (max-width: 1099px) {
    .profile-example {
      grid-template-columns: minmax(0, 1fr);
      gap: 30px;
      padding-block: 58px;
    }

    .profile-example__copy {
      max-width: 650px;
    }

    .profile-example__controls { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .profile-example__stage {
      min-height: 400px;
    }

    .profile-example__browser { width: min(100%, 860px); }
  }

  @media (max-width: 600px) {
    .profile-example__controls { display: flex; flex-wrap: wrap; gap: 4px 12px; }
    .profile-example__controls button { font-size: .9rem; gap: 8px; }
    .profile-example__controls button.active > span { width: 18px; }
    .profile-example {
      padding-block: 52px;
    }

    .profile-example__stage {
      min-height: 350px;
    }

    .profile-example__canvas {
      min-height: 340px;
    }

    .profile-example__current-shell { min-height: 340px; }
  }
</style>
