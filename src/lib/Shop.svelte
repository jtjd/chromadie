<script>
  import { shopItems, userInventory, equippedItems, walletBalance, addToast, rerollShards } from './stores';
  import { supabase } from './supabase';

  let loadingAction = false;
  let activeTab = 'all';

  async function handleAction(itemKey, action, slot = null, silent = false) {
    loadingAction = true;
    let error = null;

    if (action === 'buy') {
      const { data, error: rpcError } = await supabase.rpc('purchase_item', { p_item_key: itemKey });
      if (rpcError) error = rpcError.message;
      else if (!data.success) error = data.error;
      else {
        const itemCost = $shopItems[itemKey].cost;
        walletBalance.update(bal => bal - itemCost);

        if ($shopItems[itemKey].slot === 'consumable') {
            if (itemKey === 'reroll_shard') {
                rerollShards.update(s => s + 1);
            } else if (itemKey === 'streak_freeze') {
                userInventory.update(inv => [...inv, itemKey]);
            }
            addToast(`Successfully purchased ${$shopItems[itemKey].name}!`, 'success');
        } else {
            userInventory.update(inv => [...inv, itemKey]);
            addToast(`Successfully purchased ${$shopItems[itemKey].name}!`, 'success');
            await handleAction(itemKey, 'equip', null, true);
        }
      }
    } else if (action === 'equip') {
      const { data, error: rpcError } = await supabase.rpc('equip_item', { p_item_key: itemKey });
      if (rpcError) error = rpcError.message;
      else if (!data.success) error = data.error;
      else {
        equippedItems.set(data.cosmetics);
        if (!silent) addToast(`Equipped ${$shopItems[itemKey].name}!`, 'success');
      }
    } else if (action === 'unequip') {
      const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: slot });
      if (rpcError) error = rpcError.message;
      else if (!data.success) error = data.error;
      else {
        equippedItems.set(data.cosmetics);
        addToast(`Unequipped item.`, 'success');
      }
    }

    if (error) addToast(`Error: ${error}`);
    loadingAction = false;
  }

  $: itemsArray = Object.entries($shopItems)
    .filter(([key, item]) => item.slot !== 'consumable')
    .sort((a, b) => a[1].cost - b[1].cost)
    .filter(([key, item]) => activeTab === 'all' || item.slot === activeTab);
</script>

<div class="container shop-container">
  <div class="section-title">
    <div class="section-bar bar-green"></div>
    <h2>Cosmetic Shop</h2>
  </div>

  <div class="wallet-display">
    <h3>Wallet Balance</h3>
    <span>{$walletBalance.toLocaleString()} EP</span>
  </div>

  <div class="shop-tabs">
    <button class="shop-tab" class:active={activeTab === 'all'} on:click={() => activeTab = 'all'}>All</button>
    <button class="shop-tab" class:active={activeTab === 'name_effect'} on:click={() => activeTab = 'name_effect'}>Names</button>
    <button class="shop-tab" class:active={activeTab === 'frame'} on:click={() => activeTab = 'frame'}>Frames</button>
    <button class="shop-tab" class:active={activeTab === 'profile_border'} on:click={() => activeTab = 'profile_border'}>Borders</button>
    <button class="shop-tab" class:active={activeTab === 'profile_bg'} on:click={() => activeTab = 'profile_bg'}>Backgrounds</button>
    <button class="shop-tab" class:active={activeTab === 'orb_shape'} on:click={() => activeTab = 'orb_shape'}>Orb Shapes</button>
    <button class="shop-tab" class:active={activeTab === 'roll_effect'} on:click={() => activeTab = 'roll_effect'}>Roll Effects</button>
    <button class="shop-tab" class:active={activeTab === 'lb_theme'} on:click={() => activeTab = 'lb_theme'}>LB Themes</button>
  </div>

  {#if itemsArray.length === 0}
    <div class="card"><p>No items in this category yet.</p></div>
  {:else}
    <div class="shop-grid">
      {#each itemsArray as [key, item] (key)}
        {@const owned = $userInventory.includes(key)}
        {@const equipped = $equippedItems[item.slot] === key}
        {@const affordable = $walletBalance >= item.cost}
        {@const isConsumable = item.slot === 'consumable'}

        <div class="shop-item shop-rarity-{item.rarity || 'Common'}">
          <div class="shop-preview-area">
            {#if item.slot === 'profile_bg'}
              <div class="preview-bg" style="{item.css_type === 'style' ? item.css_value : ''}"></div>
            {:else if item.slot === 'roll_effect'}
              <div class="preview-roll-orb {item.css_type === 'class' ? item.css_value : ''}"></div>
            {:else if item.slot === 'lb_theme'}
              <div class="preview-lb-row {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                <span class="preview-lb-text">#1 YourName</span>
              </div>
            {:else if item.slot === 'orb_shape'}
              <div class="preview-orb-shape {item.css_type === 'class' ? item.css_value : ''}"></div>
            {:else if item.slot === 'profile_border'}
              <div class="preview-border {item.css_type === 'class' ? item.css_value : ''}"></div>
            {:else}
              <div class="shop-preview-text">
                {#if item.css_type === 'class'}
                  {#if item.slot === 'frame'}
                    <span class="profile-name-frame {item.css_value}">Username</span>
                  {:else}
                    <span class="{item.css_value}" data-text="Username">Username</span>
                  {/if}
                {:else if item.css_type === 'style'}
                  {#if item.slot === 'frame'}
                    <span class="profile-name-frame" style="{item.css_value}">Username</span>
                  {:else}
                    <span style="{item.css_value}" data-text="Username">Username</span>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>

          <h3>{item.name}</h3>
          {#if item.collection}
            <p class="item-collection">{item.collection}</p>
          {/if}
          <p class="item-cost">{item.cost.toLocaleString()} EP</p>
          {#if item.description}
            <p class="item-desc">{item.description}</p>
          {/if}

          {#if equipped}
            <button class="shop-btn equipped" on:click={() => handleAction(key, 'unequip', item.slot)} disabled={loadingAction}>
              Unequip
            </button>
          {:else if owned && !isConsumable}
            <button class="shop-btn owned" on:click={() => handleAction(key, 'equip')} disabled={loadingAction}>
              Equip
            </button>
          {:else if item.cost > 0 && affordable}
            <button class="shop-btn" on:click={() => handleAction(key, 'buy')} disabled={loadingAction}>
              Buy
            </button>
          {:else if item.cost <= 0}
            <button class="shop-btn disabled" disabled>
              🔒 Milestone Reward
            </button>
          {:else}
            <button class="shop-btn disabled" disabled>
              Not Enough EP
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .shop-tabs { display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap; border-bottom: 1px solid var(--card-border); padding-bottom: 15px; }
  .shop-tab { background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); color: var(--text-muted); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; transition: all 0.2s; }
  .shop-tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .shop-tab.active { background: var(--accent-purple); color: #fff; border-color: var(--accent-purple); }

  .shop-preview-area { height: 40px; margin-bottom: 20px; width: 100%; display: flex; align-items: center; justify-content: center; }
  .preview-bg { width: 100%; height: 40px; border-radius: 8px; border: 1px solid var(--card-border); background-color: #111; flex-shrink: 0; box-sizing: border-box; }
  .preview-roll-orb { width: 30px; height: 30px; border-radius: 50%; background: #333; border: 1px solid var(--card-border); position: relative; }
  .preview-lb-row { width: 100%; height: 30px; border-radius: 8px; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); }
  .preview-lb-text { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
  .preview-orb-shape { width: 30px; height: 30px; background: #333; border: 1px solid var(--card-border); }

  .preview-border { width: 60px; height: 40px; background: #111; border-radius: 8px; border: 2px solid transparent; }

  .item-collection { font-size: 0.7rem; color: var(--accent-purple); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-weight: 600; }
  .item-cost { color: var(--accent-green); font-family: 'JetBrains Mono'; font-size: 0.85rem; margin-bottom: 4px; }
  .item-desc { color: var(--text-muted); font-size: 0.75rem; margin-bottom: 20px; line-height: 1.3; min-height: 30px; }

  .preview-lb-row.lb-glow-theme { background: rgba(59, 130, 246, 0.25) !important; border: 2px solid #3b82f6 !important; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6), inset 0 0 8px rgba(59, 130, 246, 0.3) !important; }
  .preview-lb-row.lb-gold-theme { background: linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fbf5b7) !important; border: 2px solid #ffd700 !important; box-shadow: 0 0 15px rgba(255, 215, 0, 0.5) !important; }
  .preview-lb-row.lb-gold-theme .preview-lb-text { color: #1a1a1a !important; text-shadow: 0 1px 1px rgba(255,255,255,0.4); }
  .preview-lb-row.lb-chroma-theme { border: 2px solid transparent !important; background-image: linear-gradient(rgba(10, 10, 13, 0.85), rgba(10, 10, 13, 0.85)), var(--spectrum) !important; background-origin: border-box !important; background-clip: padding-box, border-box !important; background-size: 100% 100%, 300% 100% !important; animation: spectrumFlow 3s linear infinite !important; box-shadow: 0 0 15px rgba(168, 85, 247, 0.5) !important; }
</style>
