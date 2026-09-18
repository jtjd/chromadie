<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import './homepage/homepage-reference.css';
  import './homepage/homepage-refinement.css';
  import './homepage/homepage-footer.css';
  import './homepage/homepage-atmosphere.css';
  import './homepage/homepage-motion.css';
  import { ACCOUNT_STATES } from './authState.js';
  import SiteFooter from './SiteFooter.svelte';
  import RollPage from './RollPage.svelte';
  import HomepageCommunity from './homepage/HomepageCommunity.svelte';
  import HomepageHeader from './homepage/HomepageHeader.svelte';
  import HomepageCollection from './homepage/HomepageCollection.svelte';
  import HomepagePricingLoader from './homepage/HomepagePricingLoader.svelte';
  import HomepageStart from './homepage/HomepageStart.svelte';
  import HomepageQuestions from './homepage/HomepageQuestions.svelte';
  import HomepageProfileExample from './homepage/HomepageProfileExample.svelte';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();
  let homepageRoot;
  let homepageDiscovery = { rows: [], loading: true, error: '' };
  let discoveryRefresh = 0;

  function handleLeaderboard(event) {
    const detail = event?.detail || {};
    homepageDiscovery = {
      rows: Array.isArray(detail.rows) ? detail.rows : [],
      loading: detail.loading !== false,
      error: typeof detail.error === 'string' ? detail.error : ''
    };
  }

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  onMount(() => {
    const revealTargets = [...homepageRoot.querySelectorAll('[data-homepage-reveal]')];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canObserve = typeof IntersectionObserver !== 'undefined';

    if (reduceMotion) {
      for (const target of revealTargets) target.dataset.homepageRevealed = 'true';
      homepageRoot.classList.add('homepage-motion-ready', 'homepage-motion-active');
      return;
    }

    if (!canObserve) return;

    homepageRoot.classList.add('homepage-motion-ready');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-homepage-revealed', 'true');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    const observeRevealTarget = target => {
      if (target instanceof Element && target.matches('[data-homepage-reveal]')) observer.observe(target);
    };
    for (const target of revealTargets) observeRevealTarget(target);
    const mutationObserver = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          observeRevealTarget(node);
          for (const target of node.querySelectorAll('[data-homepage-reveal]')) observeRevealTarget(target);
        }
      }
    });
    mutationObserver.observe(homepageRoot, { childList: true, subtree: true });
    const activationFrame = requestAnimationFrame(() => homepageRoot.classList.add('homepage-motion-active'));

    return () => {
      cancelAnimationFrame(activationFrame);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  });
</script>

<div id="chromadie-homepage" class="homepage-reference homepage-reference--roll-first" bind:this={homepageRoot}>
  <HomepageHeader
    {accountState}
    {isAuthenticated}
    {username}
    {logoutInProgress}
    on:navigate={forwardAction}
    on:login={forwardAction}
    on:logout={forwardAction}
    on:retry={forwardAction}
  />

  <main>
    <RollPage
      surface="homepage"
      signupNext="/"
      showAcquisitionActions={true}
      homepage={true}
      bestRollRows={homepageDiscovery.rows}
      bestRollLoading={homepageDiscovery.loading}
      bestRollError={homepageDiscovery.error}
      on:navigate={forwardAction}
      on:promptlogin={forwardAction}
      on:resultready={() => discoveryRefresh += 1}
      on:discoveryretry={() => discoveryRefresh += 1}
    />

    <div class="homepage-content">
      <HomepageProfileExample />
      <HomepageCollection />
      <HomepagePricingLoader {isAuthenticated} />
      <HomepageCommunity {isAuthenticated} {username} refreshKey={discoveryRefresh} on:leaderboard={handleLeaderboard} />
      {#if !isAuthenticated}
        <HomepageStart {isAuthenticated} {accountState} on:retry={forwardAction} />
      {/if}
      <HomepageQuestions />
      <div class="homepage-footer-reveal" data-homepage-reveal>
        <SiteFooter {isAuthenticated} variant="home" />
      </div>
    </div>
  </main>
</div>
