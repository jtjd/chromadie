<script>
  import { shopItems, userInventory, equippedItems, walletBalance, addToast } from './stores';
  import { supabase } from './supabase';

  let loadingAction = false;

  async function handleAction(itemKey, action, slot = null) {
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
        if (!slot) addToast(`Equipped ${$shopItems[itemKey].name}!`, 'success');
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

  $: itemsArray = Object.entries($shopItems);
</script>

<div class="container">
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

        <div class="shop-item">
          <div class="shop-preview-text">
            {#if item.slot === 'title'}
              <span style="color: #888;">[{item.css_value}]</span>
            {:else if item.css_type === 'class'}
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

          <h3>{item.name}</h3>
          <p>{item.cost.toLocaleString()} EP</p>

          {#if equipped}
            <button class="shop-btn equipped" on:click={() => handleAction(key, 'unequip', item.slot)} disabled={loadingAction}>
              Unequip
            </button>
          {:else if owned}
            <button class="shop-btn owned" on:click={() => handleAction(key, 'equip')} disabled={loadingAction}>
              Equip
            </button>
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
