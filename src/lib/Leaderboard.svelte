<script>
  import DiscoveryHub from './DiscoveryHub.svelte';

  export let initialTab = 'today';
</script>

<DiscoveryHub {initialTab} on:navigate />
