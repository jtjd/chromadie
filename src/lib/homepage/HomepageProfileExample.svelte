<script>
  import { onMount } from 'svelte';
  import { getCanonicalProfilePath } from '../routeContract.js';
  const profileHref = getCanonicalProfilePath('tjz');
  let host;
  let renderer = null;
  let failed = false;
  let disposed = false;
  const avatar = 'https://media.chm.lol/profiles/c177316f-415a-48ad-8e4e-901fc6766693/15afd8fa-8efd-4f41-9a0a-12c937c4ce67/1e11b00999d15292077382af55c9b34567c786602874d9652b151608c62ae629.webp';
  // Curated public appearance captured September 5, 2026. The dated result
  // comes from the supplied screenshot; the link opens the current profile.
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
    } catch { if (!disposed) failed = true; }
  }
  onMount(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '160px' });
    observer.observe(host);
    return () => { disposed = true; observer.disconnect(); };
  });
</script>

<section class="homepage-section profile-example" bind:this={host} aria-labelledby="profile-example-title">
  <div>
    <div class="homepage-section-kicker">Your color. Your space.</div>
    <h2 id="profile-example-title" class="homepage-section-heading">Every roll becomes part of your profile.</h2>
    <p class="homepage-section-sub">Make a home for your colors, your links, and the things you’ve earned. Shape a profile that feels like you.</p>
    <a class="profile-example__link" href={profileHref}>Explore Tjz’s profile</a>
  </div>
  <figure>
    <figcaption>Example profile · Tjz</figcaption>
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
        <p>Preview couldn’t load. <button type="button" on:click={load}>Retry</button></p>
      {:else}<p role="status">Loading profile example…</p>{/if}
    </div>
  </figure>
</section>

<style>
  .profile-example { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 680px); align-items: center; gap: 48px; padding-block: 72px; border-top: 1px solid var(--homepage-border); }
  .profile-example .homepage-section-heading { font-size: clamp(2.5rem, 4vw, 4rem); }
  .profile-example__link { display: inline-block; margin-top: 24px; text-underline-offset: 5px; }
  figure { min-width: 0; margin: 0; }
  figcaption { color: var(--homepage-muted); font-size: .8rem; margin-bottom: 16px; }
  .profile-example__canvas { display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; min-height: 420px; min-width: 0; padding: 24px; overflow: hidden; isolation: isolate; border: 1px solid var(--homepage-border); border-radius: 22px; background: #000; }
  .profile-example__canvas :global(.profile-full-bleed__boundary) { width: min(100%, 640px); max-width: 100%; }
  .profile-example a:focus-visible, button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 1199px) { .profile-example { grid-template-columns: minmax(0, 1fr); gap: 32px; padding-block: 48px; } }
  @media (max-width: 460px) { .profile-example__canvas { padding: 16px 8px; } }
</style>
