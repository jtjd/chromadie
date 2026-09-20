<script>
  import ProfileBorderEffect from '../../src/lib/profile-border/ProfileBorderEffect.svelte';
  import ProfileReferenceCard from '../../src/lib/ProfileReferenceCard.svelte';
  import ShopItemPreview from '../../src/lib/ShopItemPreview.svelte';
  import { AUTHORED_PROFILE_BORDER_KEYS, PROFILE_BORDER_DEFINITIONS } from '../../src/lib/profile-border/profileBorders.js';
  let animated = true;
  let selected = 'chroma';
  let clicks = 0;
</script>

<main>
  <header>
    <p class="eyebrow">CHROMADIE / EXPRESSION STUDY</p>
    <h1>Made to frame you.</h1>
    <p>Ten new borders. Ten different personalities.</p>
    <button id="toggle" on:click={() => animated = !animated}>{animated ? 'Pause' : 'Play'} motion</button>
  </header>
  <div class="gallery">
    {#each AUTHORED_PROFILE_BORDER_KEYS as key, index (key)}
      <section data-sample={key}>
        <div class="sample-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2>{PROFILE_BORDER_DEFINITIONS[key].label}</h2><small>{PROFILE_BORDER_DEFINITIONS[key].taste}</small></div>
        <ProfileBorderEffect borderKey={key} {animated} className="profile-border-effect--content" surfaceStyle="--profile-border-radius:22px">
          <div class="identity">
            <div class="avatar">a</div>
            <h3>alex<span>✦</span></h3>
            <p>A little color, every day.</p>
            <button class="profile-link" on:click={() => { selected = key; clicks += 1; }}>Explore my world <span>↗</span></button>
          </div>
        </ProfileBorderEffect>
        <div class="mini-row">
          <ShopItemPreview item={{slot:'profile_border',css_value:key}} mode={animated ? 'animated' : 'static'} renderContext="effect-card" />
        </div>
      </section>
    {/each}
  </div>
  <section class="actual">
    <h2>Production profile · {PROFILE_BORDER_DEFINITIONS[selected].label}</h2>
    <select aria-label="Production profile border" bind:value={selected}>
      {#each Object.values(PROFILE_BORDER_DEFINITIONS) as definition (definition.key)}<option value={definition.key}>{definition.label}</option>{/each}
    </select>
    <ProfileReferenceCard profileBorderKey={selected} displayName="alex" avatarSrc="/homepage/fixtures/compact-avatar.png" bio="Collecting colors. Making things. Finding my people." secondaryLine="Brooklyn, NY" presentation="profile" surfaceStyle="--profile-border-radius:24px;--profile-surface-fill:#0b0d16;--profile-surface:#0b0d16;--profile-surface-opacity:1;--profile-avatar-border-radius:50%" links={[{ type:'website', url:'https://example.com', label:'My website' }]} />
  </section>
  <output>{clicks}</output>
</main>

<style>
  :global(body) { margin:0; background:#080a10; color:#fafaff; font:14px Inter,system-ui,sans-serif; --radius-lg:22px; }
  :global(*) { box-sizing:border-box; }
  main { max-width:1440px; margin:auto; padding:48px; }
  header { margin-bottom:48px; }
  .eyebrow { letter-spacing:3px; color:#ad9cff; font-size:10px; }
  h1 { font-size:44px; letter-spacing:-2px; margin:12px 0; }
  header > p:last-of-type { color:#9399ac; }
  button,select { color:inherit; background:#171b29; border:1px solid #363a4b; border-radius:8px; padding:9px 14px; }
  .gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:46px 38px; }
  .sample-heading { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
  .sample-heading > span { color:#606878; font-size:11px; }
  h2 { font-size:15px; font-weight:500; }
  .sample-heading small { margin-left:auto; font-size:9px; color:#9e98ac; }
  .identity { padding:30px 24px 24px; text-align:center; background:radial-gradient(ellipse at 50% 0%,#20233b,#0b0e17 75%); border-radius:18px; }
  .avatar { display:grid; place-items:center; background:linear-gradient(140deg,#d4bbff,#7850d1); width:52px; height:52px; margin:auto; border-radius:50%; font-size:30px; font-weight:600; color:#231444; }
  h3 { font-size:25px; letter-spacing:-.8px; margin:12px 0 5px; } h3 span { color:#ae95ff; margin-left:6px; font-size:14px; }
  .identity p { color:#969cb0; font-size:12px; margin:0 0 22px; }
  .profile-link { width:100%; text-align:left; background:#ffffff06; border-color:#ffffff14; font-size:11px; padding:11px 12px; }
  .profile-link span { float:right; }
  .mini-row { margin:22px auto 0; width:150px; }
  .actual { margin:80px auto 30px; max-width:650px; }
  .actual select { margin-bottom:40px; }
  @media(max-width:900px) { .gallery { grid-template-columns:repeat(2,minmax(0,1fr)); } main { padding:32px; } }
  @media(max-width:550px) { .gallery { grid-template-columns:1fr; } main { padding:26px; } h1 { font-size:34px; } }
</style>
