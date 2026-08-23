<script>
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import ProgressionRewardPreview from './ProgressionRewardPreview.svelte';
  import { isAuthenticated } from './stores.js';
  import { supabase } from './supabase.js';
  import { trackProgressionEvent } from './productAnalytics.js';

  export let unlocks = [];
  export let surface = 'roll';
  export let username = 'You';
  export let displayColor = '#FFFFFF';
  export let avatarSrc = '';
  export let compact = false;

  const dispatch = createEventDispatcher();
  const queueInstanceId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  let dismissedIds = new SvelteSet();
  let presentedIds = new SvelteSet();
  let acknowledgedIds = new SvelteSet();
  let acknowledgingIds = new SvelteSet();
  let presentationRequestIds = new SvelteSet();
  let transitionError = '';
  let queueElement;
  let queueVisible = false;
  let visibilityObserver;
  let visibilityHandler;
  const requestedPresentationSignatures = new SvelteSet();

  function normalizeUnlock(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const id = typeof entry.id === 'string' ? entry.id : '';
    if (!id) return null;
    const reward = entry.reward && typeof entry.reward === 'object' ? entry.reward : null;
    const rawTrack = typeof entry.track === 'string' ? entry.track.toLowerCase() : '';
    return {
      ...entry,
      id,
      name: typeof entry.name === 'string' ? entry.name : 'Milestone complete',
      track: rawTrack === 'ritual' || rawTrack === 'discovery' ? rawTrack : 'rank',
      reward
    };
  }

  $: normalizedUnlocks = (Array.isArray(unlocks) ? unlocks : [])
    .map(normalizeUnlock)
    .filter(Boolean)
    .slice(0, 8);
  $: visibleUnlocks = normalizedUnlocks.filter(unlock => !dismissedIds.has(unlock.id));
  $: featuredUnlock = visibleUnlocks[0] || null;
  $: remainingCount = Math.max(0, visibleUnlocks.length - 1);
  $: queueLabel = surface === 'profile-roll' ? 'Profile roll unlocks' : 'Roll unlocks';
  const queueTitleId = `progression-unlock-queue-title-${queueInstanceId}`;

  function analyticsSurfaceName(value) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return {
      studio: 'studio',
      progression: 'progression',
      roll: 'roll',
      'profile-roll': 'roll',
      'root-roll': 'root-roll',
      'dedicated-roll': 'dedicated-roll'
    }[raw] || 'roll';
  }

  $: if (queueVisible && $isAuthenticated && normalizedUnlocks.length) {
    const unlockSignature = normalizedUnlocks.map(unlock => unlock.id).join('|');
    if (unlockSignature && !requestedPresentationSignatures.has(unlockSignature)) {
      requestedPresentationSignatures.add(unlockSignature);
      void tick().then(presentVisibleUnlocks);
    }
  }

  function unlockForId(id) {
    return normalizedUnlocks.find(unlock => unlock.id === id) || null;
  }

  function transitionedIds(data, field, candidates) {
    const returned = Array.isArray(data?.milestone_ids)
      ? data.milestone_ids.filter(id => typeof id === 'string')
      : [];
    if (returned.length) return returned;
    const count = Math.max(0, Number(data?.[field]) || 0);
    return count ? candidates.slice(0, count).map(unlock => unlock.id) : [];
  }

  function recordTransition(eventName, ids) {
    for (const id of ids) {
      const unlock = unlockForId(id);
      trackProgressionEvent(eventName, {
        surface: analyticsSurfaceName(surface),
        accountMode: 'authenticated',
        track: unlock?.track || 'rank'
      }, { dedupeKey: `${eventName}:${id}` });
    }
  }

  async function presentUnlocks(entries) {
    if (!$isAuthenticated) return [];
    const candidates = (Array.isArray(entries) ? entries : [])
      .filter(unlock => unlock && !presentedIds.has(unlock.id) && !presentationRequestIds.has(unlock.id))
      .slice(0, 32);
    if (!candidates.length) return [];

    const ids = candidates.map(unlock => unlock.id);
    const requestIds = new SvelteSet(presentationRequestIds);
    ids.forEach(id => requestIds.add(id));
    presentationRequestIds = requestIds;

    try {
      const { data, error } = await supabase.rpc('present_progression_unlocks', { p_milestone_ids: ids });
      if (error || data?.success === false) return [];
      const transitioned = transitionedIds(data, 'presented', candidates);
      if (transitioned.length) {
        const nextPresented = new SvelteSet(presentedIds);
        transitioned.forEach(id => nextPresented.add(id));
        presentedIds = nextPresented;
        recordTransition('progression_unlock_presented', transitioned);
      }
      return transitioned;
    } catch {
      return [];
    } finally {
      const nextRequestIds = new SvelteSet(presentationRequestIds);
      ids.forEach(id => nextRequestIds.delete(id));
      presentationRequestIds = nextRequestIds;
    }
  }

  function presentVisibleUnlocks() {
    return presentUnlocks(visibleUnlocks);
  }

  async function acknowledgeUnlock(unlock) {
    if (!$isAuthenticated || !unlock || acknowledgedIds.has(unlock.id)) return false;
    // Ensure a very fast acknowledgement still records the presentation
    // transition before the server closes the live unlock.
    await presentUnlocks([unlock]);
    try {
      const { data, error } = await supabase.rpc('acknowledge_progression_unlocks', {
        p_milestone_ids: [unlock.id]
      });
      if (error || data?.success === false) return false;
      const transitioned = transitionedIds(data, 'acknowledged', [unlock]);
      // A zero count means the server has already closed the unlock. Treat it
      // as acknowledged so a stale result cannot trap the user in the queue.
      if (!transitioned.length) return true;
      const nextAcknowledged = new SvelteSet(acknowledgedIds);
      transitioned.forEach(id => nextAcknowledged.add(id));
      acknowledgedIds = nextAcknowledged;
      recordTransition('progression_unlock_acknowledged', transitioned);
      return true;
    } catch {
      // Presentation is best-effort and must never block the roll result.
      return false;
    }
  }

  async function finishUnlock(action) {
    if (!featuredUnlock || acknowledgingIds.has(featuredUnlock.id)) return;
    const unlock = featuredUnlock;
    transitionError = '';
    const nextAcknowledging = new SvelteSet(acknowledgingIds);
    nextAcknowledging.add(unlock.id);
    acknowledgingIds = nextAcknowledging;
    const acknowledged = await acknowledgeUnlock(unlock);
    const remainingAcknowledging = new SvelteSet(acknowledgingIds);
    remainingAcknowledging.delete(unlock.id);
    acknowledgingIds = remainingAcknowledging;
    if (!acknowledged) {
      transitionError = 'We could not save that unlock yet. Check your connection and try again.';
      return;
    }
    const next = new SvelteSet(dismissedIds);
    next.add(unlock.id);
    dismissedIds = next;
    dispatch('acknowledge', {
      action,
      unlock,
      remaining: visibleUnlocks.slice(1)
    });
  }

  onMount(() => {
    visibilityHandler = () => {
      queueVisible = document.visibilityState === 'visible';
      if (queueVisible) void presentVisibleUnlocks();
    };

    if (typeof IntersectionObserver === 'function' && queueElement) {
      visibilityObserver = new IntersectionObserver(entries => {
        queueVisible = entries.some(entry => entry.isIntersecting);
        if (queueVisible) void presentVisibleUnlocks();
      }, { threshold: 0.1 });
      visibilityObserver.observe(queueElement);
    } else {
      queueVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
    }
    document.addEventListener('visibilitychange', visibilityHandler);
    visibilityHandler();
  });

  onDestroy(() => {
    visibilityObserver?.disconnect();
    if (visibilityHandler && typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibilityHandler);
  });
</script>

{#if featuredUnlock}
  <section bind:this={queueElement} class="progression-unlock-queue" class:progression-unlock-queue--compact={compact} aria-labelledby={queueTitleId} aria-live="polite" aria-busy={featuredUnlock && acknowledgingIds.has(featuredUnlock.id)}>
    <div class="progression-unlock-queue__heading">
      <div>
        <p class="progression-unlock-queue__eyebrow">New in your profile</p>
        <h3 id={queueTitleId}>Cosmetic earned</h3>
      </div>
      <span class="progression-unlock-queue__count">{remainingCount ? `${remainingCount + 1} rewards` : '1 reward'}</span>
    </div>

    <div class="progression-unlock-queue__body">
      <div class="progression-unlock-queue__copy">
        <strong>{featuredUnlock.reward?.name || featuredUnlock.name}</strong>
        <p>{featuredUnlock.track === 'discovery' ? 'A discovery has become part of your profile history.' : featuredUnlock.track === 'ritual' ? 'Your continued practice earned a new cosmetic.' : 'Your rank earned a new cosmetic.'}</p>
        {#if remainingCount}
          <small>{remainingCount} more unlock{remainingCount === 1 ? '' : 's'} waiting here.</small>
        {/if}
      </div>

      {#if featuredUnlock.reward}
        <ProgressionRewardPreview
          reward={featuredUnlock.reward}
          {username}
          {displayColor}
          {avatarSrc}
          unlocked={true}
          milestoneId={featuredUnlock.id}
          track={featuredUnlock.track}
          analyticsSurface={analyticsSurfaceName(surface)}
          presentation={compact ? 'wide' : 'default'}
        />
      {/if}
    </div>

    {#if transitionError}
      <p class="progression-unlock-queue__error" role="alert">{transitionError}</p>
    {/if}

    <div class="progression-unlock-queue__actions" aria-label={queueLabel + ' actions'}>
      <a
        href="/profile/settings#customize-effects"
        on:click={() => trackProgressionEvent('progression_cta_used', {
          surface: analyticsSurfaceName(surface),
          accountMode: 'authenticated',
          track: featuredUnlock.track,
          action: 'studio'
        }, { dedupeKey: `${featuredUnlock.id}:studio` })}
      >{compact ? 'Open Studio' : 'Open Profile Studio'}</a>
      <button type="button" disabled={acknowledgingIds.has(featuredUnlock.id)} aria-busy={acknowledgingIds.has(featuredUnlock.id)} on:click={() => void finishUnlock('acknowledged')}>Acknowledge</button>
      {#if !compact}
        <button type="button" class="progression-unlock-queue__dismiss" disabled={acknowledgingIds.has(featuredUnlock.id)} aria-busy={acknowledgingIds.has(featuredUnlock.id)} on:click={() => void finishUnlock('dismissed')}>Dismiss</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .progression-unlock-queue { display:grid; gap:.8rem; margin:1rem 0; padding:1rem; border:1px solid var(--color-line-strong); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .progression-unlock-queue__heading,
  .progression-unlock-queue__actions { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; }
  .progression-unlock-queue__eyebrow { margin:0; color:var(--color-ink-muted); font:700 var(--type-label)/1.2 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .progression-unlock-queue h3 { margin:.3rem 0 0; color:var(--color-ink-strong); font:600 1.2rem/1.1 var(--font-display-stack); }
  .progression-unlock-queue__count { color:var(--color-ink-muted); font:600 .7rem/1 var(--font-mono-stack); }
  .progression-unlock-queue__body { display:grid; grid-template-columns:minmax(0,1fr) minmax(12rem,.8fr); gap:.8rem; align-items:start; }
  .progression-unlock-queue__copy { display:grid; align-content:start; gap:.35rem; min-width:0; }
  .progression-unlock-queue__copy strong { color:var(--color-ink-strong); font-size:1rem; }
  .progression-unlock-queue__copy p,
  .progression-unlock-queue__copy small { margin:0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .progression-unlock-queue__copy small { font-size:.7rem; }
  .progression-unlock-queue__error { margin:0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .progression-unlock-queue__actions { justify-content:flex-start; }
  .progression-unlock-queue__actions a,
  .progression-unlock-queue__actions button { display:inline-flex; align-items:center; justify-content:center; min-height:2.75rem; padding:.45rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:transparent; color:var(--color-ink-strong); font:650 var(--type-small)/1 var(--font-body-stack); text-decoration:none; cursor:pointer; }
  .progression-unlock-queue__actions a:hover,
  .progression-unlock-queue__actions a:focus-visible,
  .progression-unlock-queue__actions button:hover,
  .progression-unlock-queue__actions button:focus-visible { border-color:var(--color-line-strong); background:var(--surface-inset); }
  .progression-unlock-queue__actions button:focus-visible,
  .progression-unlock-queue__actions a:focus-visible { outline:2px solid var(--color-ink-strong); outline-offset:2px; }
  .progression-unlock-queue__dismiss { color:var(--color-ink-muted)!important; }
  .progression-unlock-queue--compact { gap:.875rem; margin:0; padding:1rem; border-color:var(--roll-border, var(--color-line-subtle)); border-radius:1rem; background:var(--surface-2, var(--surface-panel-soft)); }
  .progression-unlock-queue--compact .progression-unlock-queue__heading { align-items:flex-start; flex-wrap:nowrap; }
  .progression-unlock-queue--compact .progression-unlock-queue__eyebrow { color:var(--roll-rarity, var(--color-ink-muted)); font:700 .66rem/1.2 var(--site-font, var(--font-body-stack)); letter-spacing:.08em; }
  .progression-unlock-queue--compact h3 { margin:.25rem 0 0; color:var(--roll-text, var(--color-ink-strong)); font:700 1.08rem/1.15 var(--site-display, var(--font-display-stack)); letter-spacing:-.02em; }
  .progression-unlock-queue--compact .progression-unlock-queue__count { flex:0 0 auto; padding-top:.15rem; color:var(--roll-muted, var(--color-ink-muted)); font:600 .66rem/1 var(--site-font, var(--font-body-stack)); }
  .progression-unlock-queue--compact .progression-unlock-queue__body { grid-template-columns:1fr; gap:.75rem; }
  .progression-unlock-queue--compact .progression-unlock-queue__copy { gap:.25rem; }
  .progression-unlock-queue--compact .progression-unlock-queue__copy strong { color:var(--roll-text, var(--color-ink-strong)); font:700 .92rem/1.2 var(--site-display, var(--font-display-stack)); }
  .progression-unlock-queue--compact .progression-unlock-queue__copy p,
  .progression-unlock-queue--compact .progression-unlock-queue__copy small { color:var(--roll-muted, var(--color-ink-muted)); font:400 .75rem/1.4 var(--site-font, var(--font-body-stack)); }
  .progression-unlock-queue--compact .progression-unlock-queue__actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.5rem; }
  .progression-unlock-queue--compact .progression-unlock-queue__actions a,
  .progression-unlock-queue--compact .progression-unlock-queue__actions button { min-width:0; min-height:2.5rem; padding:.55rem .65rem; border-color:var(--roll-border, var(--color-line-subtle)); border-radius:.6rem; color:var(--roll-text, var(--color-ink-strong)); font:650 .75rem/1 var(--site-font, var(--font-body-stack)); white-space:nowrap; }
  @media (max-width:650px) { .progression-unlock-queue__body { grid-template-columns:1fr; } .progression-unlock-queue__actions > * { flex:1 1 9rem; } }
  @media (prefers-reduced-motion:reduce) { .progression-unlock-queue { transition:none; } }
</style>
