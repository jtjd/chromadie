<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { SHOP_SLOT_LABELS } from './shopCatalog';
  import { createEventDispatcher } from 'svelte';

  export let items = [];
  export let collection = 'Voidwalker';

  const dispatch = createEventDispatcher();
</script>

<section class="featured-strip" aria-labelledby="featured-strip-title">
  <div class="featured-strip__copy">
    <span>Featured collection</span>
    <h2 id="featured-strip-title">{collection}</h2>
    <p>Profile, roll, and leaderboard cosmetics with one visual language.</p>
    <button type="button" on:click={() => dispatch('explore')}>Browse {items.length} pieces <span aria-hidden="true">↗</span></button>
  </div>
  <div class="featured-strip__items" aria-label={`${collection} previews`}>
    {#each items.slice(0, 3) as item (item.item_key)}
      <button type="button" class="featured-strip__item" on:click={() => dispatch('select', item)}>
        <ShopItemPreview {item} />
        <span>{SHOP_SLOT_LABELS[item.slot] || item.slot}</span>
        <strong>{item.name}</strong>
      </button>
    {/each}
  </div>
</section>

<style>
  .featured-strip { display:grid; grid-template-columns:minmax(230px,.75fr) minmax(0,1.5fr); gap:18px; align-items:stretch; margin-bottom:24px; padding:16px; border:1px solid rgba(174,153,255,.16); border-radius:22px; background:linear-gradient(110deg, rgba(91,66,151,.16), rgba(255,255,255,.025) 52%, rgba(31,115,136,.08)); }
  .featured-strip__copy { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; padding:8px 6px 8px 8px; }
  .featured-strip__copy > span { color:#b9a9ff; font:700 .58rem/1 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .featured-strip h2 { margin:8px 0 4px; color:#f5f2ff; font:700 clamp(1.35rem,2.4vw,2.15rem)/1 var(--font-display); letter-spacing:-.045em; }
  .featured-strip p { max-width:290px; margin:0; color:#9e9aaa; font-size:.72rem; line-height:1.45; }
  .featured-strip__copy button { min-height:36px; margin-top:14px; padding:0 12px; border:1px solid rgba(191,171,255,.26); border-radius:10px; background:rgba(132,108,255,.1); color:#ded7ff; cursor:pointer; font:700 .64rem var(--font-display); }
  .featured-strip__copy button:hover { background:rgba(132,108,255,.18); }
  .featured-strip__items { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; min-width:0; }
  .featured-strip__item { min-width:0; padding:8px; border:1px solid rgba(255,255,255,.07); border-radius:15px; background:rgba(4,5,8,.34); color:inherit; cursor:pointer; text-align:left; }
  .featured-strip__item:hover, .featured-strip__item:focus-visible { border-color:rgba(202,187,255,.36); background:rgba(4,5,8,.55); }
  .featured-strip__item :global(.shop-preview-area) { height:100px; margin-bottom:8px; padding:8px; border-radius:11px; }
  .featured-strip__item > span, .featured-strip__item > strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .featured-strip__item > span { color:#8d899f; font:700 .52rem var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .featured-strip__item > strong { margin-top:4px; color:#e4e1ed; font:650 .68rem var(--font-display); }
  @media (max-width:720px) { .featured-strip { grid-template-columns:1fr; } .featured-strip__items { grid-template-columns:repeat(3,minmax(105px,1fr)); overflow:auto; } }
</style>
