<script>
  import { onMount } from 'svelte';

  export let trailKey = '';
  export let recentColors = [];
  export let todayColor = '#8B7CF6';
  export let active = true;
  export let className = '';
  export let inputMode = 'window';

  let CursorTrailLayer = null;

  onMount(() => {
    let mounted = true;
    import('./CursorTrailLayer.svelte')
      .then(module => {
        if (mounted) CursorTrailLayer = module.default;
      })
      .catch(() => {
        CursorTrailLayer = null;
      });

    return () => { mounted = false; };
  });
</script>

{#if CursorTrailLayer}
  <svelte:component this={CursorTrailLayer} {trailKey} {recentColors} {todayColor} {active} {className} {inputMode} />
{/if}
