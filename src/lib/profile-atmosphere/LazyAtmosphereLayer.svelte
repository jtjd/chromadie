<script>
  import { onMount } from 'svelte';

  export let atmosphereKey = '';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let active = true;
  export let animated = true;
  export let className = '';

  let AtmosphereLayer = null;

  onMount(() => {
    let mounted = true;
    import('./AtmosphereLayer.svelte')
      .then(module => {
        if (mounted) AtmosphereLayer = module.default;
      })
      .catch(() => {
        AtmosphereLayer = null;
      });

    return () => { mounted = false; };
  });
</script>

{#if AtmosphereLayer}
  <svelte:component this={AtmosphereLayer} {atmosphereKey} {todayColor} {recentColors} {mode} {active} {animated} {className} />
{/if}
