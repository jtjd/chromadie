<script>
  import { onMount } from 'svelte';
  let host;
  let renderer = null;
  let failed = false;
  let disposed = false;
  const avatar = 'https://media.chm.lol/profiles/c177316f-415a-48ad-8e4e-901fc6766693/15afd8fa-8efd-4f41-9a0a-12c937c4ce67/1e11b00999d15292077382af55c9b34567c786602874d9652b151608c62ae629.webp';
  // Curated public appearance captured September 5, 2026. The dated result
  // comes from the supplied screenshot. This is a product preview, not a
  // featured-player recommendation.
  const links = [
    { type: 'github', label: 'GitHub', url: 'https://github.com/jtjd' },
    { type: 'youtube', label: 'YouTube', url: 'https://youtube.com/@gripg' },
    { type: 'twitch', label: 'Twitch', url: 'https://twitch.tv/vallu' },
    { type: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/gripgod' },
    { type: 'instagram', label: 'Instagram', url: 'https://instagram.com/gripgod' }
  ];

  async function load() {
    failed = false;
    try {
      const module = await import('../profile-layout/ProfileFullBleedLayout.svelte');
      if (!disposed) renderer = module.default;
    } catch {
      if (!disposed) failed = true;
    }
  }

  onMount(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void load();
      }
    }, { rootMargin: '160px' });
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  });
</script>

<section class="homepage-section profile-example" id="profiles" bind:this={host} aria-labelledby="profile-example-title">
  <div class="profile-example__copy">
    <h2 id="profile-example-title" class="homepage-section-heading">Your colors.<br />Your own page.</h2>
    <p class="homepage-section-sub">Pick a layout. Add your links. Change the fonts, effects, and background. Put your daily roll on a page you want to share.</p>
  </div>

  <div class="profile-example__stage" aria-label="Profile customization preview">
    <div class="profile-example__canvas">
      {#if renderer}
        <svelte:component this={renderer} displayName="Tjz" avatarSrc={avatar}
          layoutVariant="sleek" headingTag="h2" avatarEffectKey="avatar_effect_butterfly_orbit"
          roll={{ hex_code: '#5EBAE3', identity: 'Balanced Vivid Azure', rarity: 'Uncommon', score: 38697 }} rollLabel="September 4, 2026"
          nameLoadout={{ fontKey: 'name_font_velocity', motionKey: 'name_motion_neon_particle', materialKey: '' }}
          profileBorderKey="border_void" accentColor="#99C1F1" location="Siberia" timezone="Russia"
          {links} linkStyle={{ size: 2, glow: 2 }}
          surfaceStyle="--profile-surface-fill: transparent; --profile-text: #16AEBB; --profile-border-radius: 22px; --profile-border-color: #E01B24; --profile-border-opacity: .11; --profile-username: #FFFFFF; --profile-secondary-text: #FFFFFF;"
        />
      {:else if failed}
        <p class="profile-example__state">Preview couldn’t load. <button type="button" on:click={load}>Retry</button></p>
      {:else}
        <p class="profile-example__state" role="status">Loading profile example…</p>
      {/if}
    </div>
  </div>
</section>

<style>
  .profile-example {
    --profile-demo-color: #5ebae3;
    --profile-demo-accent: #99c1f1;
    display: grid;
    grid-template-columns: minmax(350px, .8fr) minmax(0, 1.35fr);
    align-items: center;
    gap: clamp(48px, 5vw, 84px);
    padding-block: 76px 84px;
    border-top: 1px solid var(--homepage-border);
    scroll-margin-top: 24px;
  }

  .profile-example__copy {
    position: relative;
    z-index: 2;
    max-width: 440px;
  }

  .profile-example__copy :global(.homepage-section-heading) {
    white-space: nowrap;
  }

  .profile-example__stage {
    position: relative;
    display: grid;
    min-height: 430px;
    place-items: center;
    isolation: isolate;
  }

  .profile-example__stage::before {
    position: absolute;
    z-index: -1;
    inset: 12% -1% 5%;
    border-radius: 50%;
    background:
      radial-gradient(circle at 24% 34%, color-mix(in srgb, var(--profile-demo-accent) 22%, transparent), transparent 34%),
      radial-gradient(circle at 74% 64%, color-mix(in srgb, var(--profile-demo-color) 18%, transparent), transparent 38%);
    content: '';
    filter: blur(38px);
    opacity: .72;
    pointer-events: none;
  }

  .profile-example__canvas {
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 390px;
    place-items: center;
    overflow: visible;
    isolation: isolate;
  }

  .profile-example__canvas :global(.profile-full-bleed__boundary) {
    width: min(100%, 810px);
    max-width: 100%;
  }

  .profile-example__state {
    margin: 0;
    color: var(--homepage-secondary-muted);
    font-size: .95rem;
  }

  button { min-height: 42px; }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }

  @media (max-width: 1199px) {
    .profile-example {
      grid-template-columns: minmax(0, 1fr);
      gap: 28px;
      padding-block: 60px 64px;
    }
    .profile-example__copy { max-width: 650px; }
    .profile-example__copy :global(.homepage-section-heading) { white-space: normal; }
    .profile-example__stage { min-height: 410px; }
  }

  @media (max-width: 600px) {
    .profile-example { padding-block: 52px 56px; }
    .profile-example__stage { min-height: 350px; }
    .profile-example__canvas { min-height: 325px; }
  }
</style>
