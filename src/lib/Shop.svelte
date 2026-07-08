<script>
  import { shopItems, userInventory, equippedItems, walletBalance, addToast } from './stores';
  import { supabase } from './supabase';

  let loadingAction = false;

  async function handleAction(itemKey, action, slot = null, silent = false) {
    loadingAction = true;
    let error = null;

    if (action === 'buy') {
      const { data, error: rpcError } = await supabase.rpc('purchase_item', { p_item_key: itemKey });
      if (rpcError) error = rpcError.message;
      else if (!data.success) error = data.error;
      else {
        userInventory.update(inv => [...inv, itemKey]);
        const itemCost = $shopItems[itemKey].cost;
        walletBalance.update(bal => bal - itemCost);
        addToast(`Successfully purchased ${$shopItems[itemKey].name}!`, 'success');
        await handleAction(itemKey, 'equip', null, true);
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

  // Sort by cost ascending (cheapest at top)
  $: itemsArray = Object.entries($shopItems).sort((a, b) => a[1].cost - b[1].cost);
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

  {#if itemsArray.length === 0}
    <div class="card"><p>Loading shop...</p></div>
  {:else}
    <div class="shop-grid">
      {#each itemsArray as [key, item]}
        {@const owned = $userInventory.includes(key)}
        {@const equipped = $equippedItems[item.slot] === key}
        {@const affordable = $walletBalance >= item.cost}

        <div class="shop-item shop-rarity-{item.rarity || 'Common'}">
          <div class="shop-preview-area">
            {#if item.slot === 'profile_bg'}
              <div class="preview-bg" style="{item.css_type === 'style' ? item.css_value : ''}"></div>
            {:else if item.slot === 'roll_effect'}
              <div class="preview-roll-orb {item.css_type === 'class' ? item.css_value : ''}"></div>
            {:else if item.slot === 'lb_theme'}
              <!-- Removed inline styles so theme classes can control text color -->
              <div class="preview-lb-row {item.css_type === 'class' ? item.css_value : ''}">
                <span class="preview-lb-text">#1 YourName</span>
              </div>
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
                {:else if item.slot === 'consumable'}
                  <span style="color: var(--accent-purple); font-size: 1.2rem;">❄️</span>
                {/if}
              </div>
            {/if}
          </div>

          <h3>{item.name}</h3>
          <p class="item-cost">{item.cost.toLocaleString()} EP</p>
          {#if item.description}
            <p class="item-desc">{item.description}</p>
          {/if}

          {#if equipped}
            <button class="shop-btn equipped" on:click={() => handleAction(key, 'unequip', item.slot)} disabled={loadingAction}>
              Unequip
            </button>
          {:else if owned}
            {#if item.slot === 'consumable'}
              <button class="shop-btn owned" disabled>
                Owned
              </button>
            {:else}
              <button class="shop-btn owned" on:click={() => handleAction(key, 'equip')} disabled={loadingAction}>
                Equip
              </button>
            {/if}
          {:else if affordable}
            <button class="shop-btn" on:click={() => handleAction(key, 'buy')} disabled={loadingAction}>
              Buy
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
  .shop-preview-area {
    height: 40px;
    margin-bottom: 20px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-bg {
    width: 100%;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background-color: #111;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .preview-roll-orb {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #333;
    border: 1px solid var(--card-border);
    position: relative;
  }

  .preview-lb-row {
    width: 100%;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .preview-lb-text {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .item-cost {
    color: var(--accent-green);
    font-family: 'JetBrains Mono';
    font-size: 0.85rem;
    margin-bottom: 4px;
  }

  .item-desc {
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-bottom: 20px;
    line-height: 1.3;
    min-height: 30px; /* Keeps cards uniform height */
  }

  /* EXPLICIT PREVIEW OVERRIDES FOR LB THEMES */
  /* This ensures they render vibrantly in the small box */
  .preview-lb-row.lb-glow-theme {
    background: rgba(59, 130, 246, 0.25) !important;
    border: 2px solid #3b82f6 !important;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6), inset 0 0 8px rgba(59, 130, 246, 0.3) !important;
  }

  .preview-lb-row.lb-gold-theme {
    background: linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fbf5b7) !important;
    border: 2px solid #ffd700 !important;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.5) !important;
  }
  .preview-lb-row.lb-gold-theme .preview-lb-text {
    color: #1a1a1a !important;
    text-shadow: 0 1px 1px rgba(255,255,255,0.4);
  }

  .preview-lb-row.lb-spectrum-theme {
    border: 2px solid transparent !important;
    background-image:
        linear-gradient(rgba(10, 10, 13, 0.85), rgba(10, 10, 13, 0.85)),
        var(--spectrum) !important;
    background-origin: border-box !important;
    background-clip: padding-box, border-box !important;
    background-size: 100% 100%, 300% 100% !important;
    animation: spectrumFlow 3s linear infinite !important;
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.5) !important;
  }
</style>
