<script>
  import ShopStudioPreview from './ShopStudioPreview.svelte';

  export let loadout = {};
  export let activeContext = 'profile';
  export let username = 'Chromanaut';
  export let displayColor = '#7B5CFF';
  export let accountProfile = null;
  export let selectedItem = null;
</script>

<section class="decoration-studio" aria-label="Decoration studio">
  <div class="decoration-studio__heading">
    <div>
      <span>Decoration studio</span>
      <h2>Make the profile yours.</h2>
    </div>
    <span class="decoration-studio__mode">Try-on only</span>
  </div>

  <ShopStudioPreview
    bind:activeContext
    {loadout}
    {username}
    {displayColor}
    {accountProfile}
    {selectedItem}
  />

  <div class="decoration-studio__baseline">
    <span class="decoration-studio__baseline-mark" aria-hidden="true">✦</span>
    <div>
      <strong>Free foundations stay beautiful.</strong>
      <p>Signature color, layout, module order, and secure links are profile tools—not premium gates.</p>
    </div>
  </div>
</section>

<style>
  .decoration-studio {
    display: grid;
    gap: 12px;
  }

  .decoration-studio__heading,
  .decoration-studio__baseline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .decoration-studio__heading > div {
    min-width: 0;
  }

  .decoration-studio__heading > div > span,
  .decoration-studio__mode {
    color: #9e9aaa;
    font: 700 0.58rem/1 var(--font-mono-stack);
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .decoration-studio__heading h2 {
    margin: 5px 0 0;
    color: #f1eff8;
    font: 700 1.05rem/1.1 var(--font-display);
  }

  .decoration-studio__mode {
    flex: 0 0 auto;
    padding: 6px 8px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 999px;
    color: #b9b5c8;
  }

  .decoration-studio__baseline {
    align-items: flex-start;
    justify-content: flex-start;
    padding: 12px 13px;
    border: 1px solid rgba(75,222,165,0.14);
    border-radius: 14px;
    background: rgba(75,222,165,0.05);
  }

  .decoration-studio__baseline-mark {
    flex: 0 0 auto;
    color: #8fe1bd;
    font-size: 0.9rem;
  }

  .decoration-studio__baseline strong,
  .decoration-studio__baseline p {
    display: block;
  }

  .decoration-studio__baseline strong {
    color: #d4f4e4;
    font: 700 0.7rem/1.2 var(--font-display);
  }

  .decoration-studio__baseline p {
    margin: 4px 0 0;
    color: #8fa79d;
    font-size: 0.63rem;
    line-height: 1.45;
  }

  @media (max-width: 650px) {
    .decoration-studio__heading { align-items: flex-start; flex-direction: column; }
  }
</style>
