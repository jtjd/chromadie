<script>
  import { onMount } from 'svelte';
  import { getAvatarEffectDefinition } from './avatarEffects.js';
  export let animated = true;
  let host;
  let visible = false;
  let tabVisible = true;
  let failed = false;
  const sprite = getAvatarEffectDefinition('sakura-petals');
  const source = sprite && 'sprite' in sprite ? sprite.sprite : '';
  // Independent phases and lanes avoid a shared entrance or bunching at reset.
  const petals = [
    [12,9.7,-6.3,14,-8,22], [29,12.1,-3.2,11,9,-35],
    [48,10.4,-8.6,15,-12,62], [67,13.3,-5.5,12,8,110],
    [84,11.2,-9.2,16,-7,-75], [8,14.6,-2.1,10,11,155],
    [37,15.1,-11.8,13,6,-120], [74,12.8,-1.4,11,-11,48],
    [55,16.3,-7.2,10,12,190]
  ];
  onMount(() => {
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); });
    observer.observe(host);
    const change = () => { tabVisible = document.visibilityState === 'visible'; };
    change(); document.addEventListener('visibilitychange',change);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange',change); };
  });
</script>
<span bind:this={host} class="sakura-petals" class:playing={animated && visible && tabVisible} aria-hidden="true">
  {#if !failed}
    {#each petals as petal, index (index)}
      <span class="drift" style={`--x:${petal[0]}%;--duration:${petal[1]}s;--delay:${petal[2]}s;--size:${petal[3]}%;--drift:${petal[4]}%;--angle:${petal[5]}deg`}>
        <img src={source} alt="" draggable="false" on:error={() => { failed = true; }} />
      </span>
    {/each}
  {/if}
</span>
<style>
  .sakura-petals { position:absolute; inset:-30%; z-index:3; pointer-events:none; overflow:hidden; }
  .drift { position:absolute; inset:0; animation:petal-drift var(--duration) linear var(--delay) infinite; }
  img { position:absolute; left:var(--x); top:0; width:var(--size); height:auto; animation:petal-tumble 5.2s ease-in-out var(--delay) infinite; }
  .drift, img { animation-play-state:paused; }
  .playing .drift, .playing img { animation-play-state:running; }
  @keyframes petal-drift {
    0% { transform:translate(0,-15%); opacity:0; }
    12% { opacity:.9; }
    30% { transform:translate(var(--drift),23%); }
    65% { transform:translate(calc(var(--drift) * -.5),64%); opacity:.85; }
    90% { opacity:.7; }
    100% { transform:translate(var(--drift),112%); opacity:0; }
  }
  @keyframes petal-tumble {
    0%,100% { transform:rotate(var(--angle)) scaleX(.9); }
    35% { transform:rotate(calc(var(--angle) + 60deg)) scaleX(.38); }
    70% { transform:rotate(calc(var(--angle) - 30deg)) scaleX(.8); }
  }
  @media(prefers-reduced-motion:reduce) {
    .playing .drift, .playing img { animation-play-state:paused; }
  }
</style>
