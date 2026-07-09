<script>
  import { supabase } from './supabase';
  import { shopItems, addToast } from './stores';
  import { onMount } from 'svelte';

  let cotwColor = null;
  let loading = false;

  async function loadCOTW() {
    const { data } = await supabase.from('meta').select('value').eq('key', 'cotw_target').single();
    if (data?.value) {
      const [r, g, b] = data.value.split(',');
      cotwColor = `rgb(${r}, ${g}, ${b})`;
    }
  }

  async function randomizeCOTW() {
    loading = true;
    const { data, error } = await supabase.rpc('admin_randomize_cotw');
    if (error) addToast("Error randomizing COTW.", "error");
    else if (data.success) {
      addToast("COTW Randomized!", "success");
      await loadCOTW();
    }
    loading = false;
  }

  async function testCOTWHit() {
    loading = true;
    const { data, error } = await supabase.rpc('admin_trigger_cotw_test');
    if (error) addToast("Error arming test.", "error");
    else if (data.success) {
      addToast("Test armed! Go roll the die.", "success");
    }
    loading = false;
  }

  async function bumpShopVersion() {
    loading = true;
    const { data, error } = await supabase.rpc('admin_bump_shop_version');
    if (error) addToast("Error bumping version.", "error");
    else if (data.success) {
      addToast("Shop version bumped! Users will refresh cache.", "success");
      localStorage.removeItem('shop_cache');
    }
    loading = false;
  }

  onMount(loadCOTW);
</script>

<div class="container admin-container">
  <div class="section-title">
    <div class="section-bar bar-purple"></div>
    <h2>Admin Dashboard</h2>
  </div>

  <div class="card admin-section">
    <h3>Color of the Week</h3>
    <div class="cotw-display">
      <div class="cotw-swatch" style="background-color: {cotwColor};"></div>
      <span>Current Target: {cotwColor}</span>
    </div>
    <div class="admin-actions">
      <button class="admin-btn" on:click={randomizeCOTW} disabled={loading}>🎲 Randomize Now</button>
      <button class="admin-btn test-btn" on:click={testCOTWHit} disabled={loading}>🧪 Test Hit (Next Roll)</button>
    </div>
  </div>

  <div class="card admin-section">
    <h3>Shop Cache</h3>
    <p>Force all users to refetch the shop catalog on their next page load.</p>
    <div class="admin-actions">
      <button class="admin-btn" on:click={bumpShopVersion} disabled={loading}>🚀 Bump Shop Version</button>
    </div>
  </div>

  <div class="card admin-section">
    <h3>Shop Items ({Object.keys($shopItems).length})</h3>
    <div class="item-list">
      {#each Object.entries($shopItems) as [key, item] (key)}
        <div class="item-row">
          <span class="item-name">{item.name}</span>
          <span class="item-cost">{item.cost.toLocaleString()} EP</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .admin-container { max-width: 800px; }
  .admin-section { margin-bottom: 20px; text-align: left; }
  .admin-section h3 { margin: 0 0 15px 0; color: #fff; }
  .cotw-display { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
  .cotw-swatch { width: 48px; height: 48px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.2); }
  .admin-actions { display: flex; gap: 15px; flex-wrap: wrap; }
  .admin-btn { background: var(--accent-purple); color: #fff; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-family: 'Space Grotesk', sans-serif; }
  .admin-btn:hover { background: #7c3aed; }
  .admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .test-btn { background: var(--accent-green); color: #000; }
  .test-btn:hover { background: #0ca678; }
  .item-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
  .item-row { display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--card-border); }
  .item-name { color: #fff; }
  .item-cost { color: var(--accent-green); font-family: 'JetBrains Mono', monospace; }
</style>
