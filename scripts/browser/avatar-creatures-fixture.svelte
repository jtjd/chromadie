<script>
  import AvatarEffect from '../../src/lib/avatar-effect/AvatarEffect.svelte';
</script>
<main>
  <h1>Avatar creatures</h1>
  <p>Shared production component · white butterflies / dark bats</p>
  {#each ['butterfly-orbit', 'bat-orbit'] as effectKey}
    <section>
      <h2>{effectKey}</h2>
      <div class="samples">
        {#each [86, 108, 180] as size}
          <div class="sample">
            <span>{size}px</span>
            <div style={`width:${size}px;height:${size}px`}>
              <AvatarEffect {effectKey}>
                <div class="avatar">C</div>
              </AvatarEffect>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/each}
</main>
<style>
  :global(body) { margin:0; background:#171420; color:#efeaf8; font:14px sans-serif; }
  main { padding:24px; }
  h1 { font-size:24px; } h2 { font-size:16px; }
  section { padding:16px 0 28px; }
  .samples { display:flex; gap:50px; flex-wrap:wrap; align-items:center; }
  .sample { display:grid; gap:36px; padding:20px; }
  .avatar { position:relative; z-index:2; display:grid; place-items:center; width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg,#b780e3,#614097); color:white; font:32px sans-serif; }
  .sample :global(.avatar-effect) { width:100%; height:100%; display:grid; }
  @media(max-width:500px) { .samples { gap:20px; } main { padding:16px; } }
</style>
