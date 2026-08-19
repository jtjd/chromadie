<script>
  import { createEventDispatcher } from 'svelte';
  import SiteModeHeader from '../SiteModeHeader.svelte';

  export let accountState;
  export let isAuthenticated = false;
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();

  function forward(event) {
    dispatch(event.type, event.detail);
  }
</script>

<!-- The homepage and application routes intentionally share one header
     implementation. This wrapper keeps the homepage's event boundary while
     preventing visual drift between route shells. -->
<SiteModeHeader
  activeView="home"
  {accountState}
  {isAuthenticated}
  {username}
  {logoutInProgress}
  isHomeMode={true}
  isHomepageStyle={true}
  claimHref="#claim"
  on:navigate={forward}
  on:login={forward}
  on:logout={forward}
  on:retry={forward}
/>
