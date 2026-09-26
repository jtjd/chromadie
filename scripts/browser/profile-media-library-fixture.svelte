<script>
  import '../../src/styles/fonts.css';
  import '../../src/styles/tokens.css';
  import '../../src/styles/variables.css';
  import ProfileMediaLibrary from '../../src/lib/ProfileMediaLibrary.svelte';
  let assets = Array.from({length: 200}, (_, i) => ({id: `media-${i}`, kind: i % 2 ? 'background' : 'avatar', label: i === 0 ? 'A very long filename that should never stretch the media panel.webp' : `Favorite ${i + 1}.webp`, storage_provider: 'r2', content_validation_version: i % 3 ? 1 : 0, content_hash_sha256: 'a'.repeat(64)}));
  let selectedIds = ['media-1'];
  let status = '';
  let busy = false;
  function check(asset) { assets = assets.map(item => item.id === asset.id ? {...item, content_validation_version: 1} : item); status = 'File checked'; }
  function remove(asset) { assets = assets.filter(item => item.id !== asset.id); status = 'File deleted'; }
</script>
<main>
  <h1>Profile media</h1>
  <p>Choose one file per slot. Your previous uploads stay in Saved media.</p>
  <div class="slots"><div><span>Background</span><button>Replace</button></div><div><span>Avatar</span><button>Replace</button></div></div>
  <label class="busy"><input type="checkbox" bind:checked={busy} /> Upload in progress</label>
  <ProfileMediaLibrary {assets} {selectedIds} {busy} onCheck={check} onDelete={remove} onSelect={asset => {selectedIds = [asset.id]; status = 'File selected';}} />
  <p role="status" id="feedback">{status}</p>
</main>
<style>
  :global(body) { margin: 0; background: #0e0e12; color: #f8f8f8; font-family: 'Inter', sans-serif; }
  main { max-width: 720px; margin: 3rem auto; padding: 1.25rem; }
  h1 { font-size: 1.5rem; } p { font-size: .85rem; color: #a8a9b0; }
  .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
  .slots div { display: flex; flex-direction: column; align-items: start; gap: 1rem; border: 1px solid #33333b; padding: 1rem; border-radius: .5rem; }
  button { border: 1px solid #555; border-radius: .3rem; padding: .5rem; background: transparent; color: #f8f8f8; }
  .busy { font-size: .8rem; }
</style>
