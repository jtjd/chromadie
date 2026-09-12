<script>
  import AvatarEffect from '../../src/lib/avatar-effect/AvatarEffect.svelte';
  const anime = new URLSearchParams(location.search).has('anime');
  const keys = anime ? ['sakura-neko','cloud-bunny','crimson-ronin','midnight-oni','koi-current','sakura-petals'] : ['moonlit-clouds', 'enchanted-garden', 'prismatic-fracture'];
  let animated = true;
</script>
<main>
  <h1>{anime ? 'Anime avatar collection' : 'Moonlight · Bloom · Refraction'}</h1>
  <p>Original avatar decorations</p>
  <button on:click={() => { animated = !animated; }}>Toggle animation</button>
  {#each keys as effectKey (effectKey)}
    <section>
      <h2>{effectKey.replaceAll('-', ' ')}</h2>
      <div class="samples">
        {#each [86, 108, 180] as size (size)}
          <div class="sample">
            <div style={`width:${size}px;height:${size}px`}>
              <AvatarEffect {effectKey} {animated}>
                <div class="avatar" class:light={size === 108}><span>C</span></div>
              </AvatarEffect>
            </div>
            <small>{size}px</small>
          </div>
        {/each}
      </div>
    </section>
  {/each}
</main>
<style>
  :global(body) { margin:0; background:#15121f; color:#f0ecfa; font:14px sans-serif; }
  main { padding:32px; }
  h1 { font-size:26px; margin:0; } p { color:#a59bb7; }
  h2 { text-transform:capitalize; font-size:16px; margin:20px 0 8px; }
  .samples { display:flex; flex-wrap:wrap; align-items:center; gap:40px; }
  .sample { display:grid; justify-items:center; gap:38px; padding:32px; }
  .avatar { display:grid; place-items:center; width:100%; height:100%; border-radius:50%; background:radial-gradient(at 30% 25%,#504267,#20192e); font-size:36px; }
  .avatar.light { background:#eee7dc; color:#342a44; }
  small { color:#a59bb7; }
  button { color:inherit; border:1px solid #635271; background:#30273c; padding:8px; border-radius:6px; }
  @media(max-width:500px) { main { padding:20px; } .samples { gap:0; } .sample { padding:24px; } }
</style>
