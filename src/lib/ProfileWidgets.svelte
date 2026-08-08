<script>
  import {
    getProfileWidgetKind,
    getProfileWidgetLabel,
    profileWidgetUrl,
    getVisibleProfileWidgets,
    profileWidgetEmbedUrl
  } from './profileWidgetsLegacy.js';

  export let widgets = [];
  export let deferMedia = false;
  export let compact = false;

  let loaded = [];
  let failed = [];
  const failureCache = Object.create(null);

  $: visibleWidgets = getVisibleProfileWidgets(widgets);

  function loadWidget(order) {
    if (!loaded.includes(order)) loaded = [...loaded, order];
  }

  function isLoaded(widget) {
    return !deferMedia || loaded.includes(widget.order);
  }

  function isFailed(widget) {
    return failed.includes(widget.order) || Boolean(failureCache[widget.provider + ':' + widget.id]);
  }

  function markFailed(widget) {
    const key = widget.provider + ':' + widget.id;
    failureCache[key] = true;
    if (!failed.includes(widget.order)) failed = [...failed, widget.order];
  }
</script>

{#if visibleWidgets.length}
  <div class:profile-widgets--compact={compact} class="profile-widgets" aria-label="Profile widgets">
    {#each visibleWidgets as widget (widget.provider + ':' + widget.id)}
      {@const label = getProfileWidgetLabel(widget.provider)}
      {@const embedUrl = profileWidgetEmbedUrl(widget.provider, widget.type, widget.id)}
      {@const widgetKind = getProfileWidgetKind(widget.provider)}
      <section class="profile-widget" data-provider-widget={widget.provider} aria-labelledby={'profile-widget-' + widget.order}>
        <div class="profile-widget__heading">
          <span class="profile-widget__provider" id={'profile-widget-' + widget.order}>{label}</span>
          <span class="profile-widget__type">{widget.type}</span>
        </div>
        {#if widgetKind === 'card'}
          <a class="profile-widget__provider-card" href={profileWidgetUrl(widget.provider, widget.type, widget.id)} target="_blank" rel="noopener noreferrer">
            <span class="profile-widget__mark" aria-hidden="true">{widget.provider === 'discord' ? '◈' : '↗'}</span>
            <span class="profile-widget__copy"><strong>{label} {widget.type}</strong><span>Open this public {label} profile in a new tab.</span></span>
            <span aria-hidden="true">↗</span>
          </a>
        {:else if isFailed(widget)}
          <div class="profile-widget__deferred"><span class="profile-widget__mark" aria-hidden="true">!</span><div class="profile-widget__copy"><strong>{label} unavailable</strong><span>This provider did not respond. The rest of the profile is still available.</span></div></div>
        {:else if isLoaded(widget)}
          <iframe
            src={embedUrl}
            title={label + ' player'}
            loading="lazy"
            allow={widget.provider === 'youtube' ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' : 'clipboard-write; encrypted-media; fullscreen; picture-in-picture'}
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen={widget.provider === 'youtube'}
            on:error={() => markFailed(widget)}
          ></iframe>
        {:else}
          <div class="profile-widget__deferred">
            <span class="profile-widget__mark" aria-hidden="true">{widget.provider === 'youtube' ? '▶' : '♪'}</span>
            <div class="profile-widget__copy"><strong>{label} {widget.type}</strong><span>External player deferred until you choose to load it.</span></div>
            <button type="button" on:click={() => loadWidget(widget.order)}>Load player</button>
          </div>
        {/if}
      </section>
    {/each}
  </div>
{/if}

<style>
  .profile-widgets { display: grid; gap: .85rem; width: 100%; min-width: 0; }
  .profile-widget { min-width: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 22%, transparent); border-radius: .65rem; background: color-mix(in srgb, var(--profile-surface, #11141b) 82%, transparent); }
  .profile-widget__heading { display: flex; align-items: center; justify-content: space-between; gap: .7rem; padding: .65rem .8rem; border-bottom: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 14%, transparent); }
  .profile-widget__provider { color: var(--color-ink-strong, #f1f6ff); font: 700 .65rem / 1.1 var(--font-mono-stack, monospace); letter-spacing: .1em; text-transform: uppercase; }
  .profile-widget__type { color: var(--color-ink-muted, rgba(220,230,248,.6)); font: .62rem / 1 var(--font-mono-stack, monospace); text-transform: capitalize; }
  .profile-widget iframe { display: block; width: 100%; min-height: 152px; border: 0; background: #07080b; }
  .profile-widget[data-provider-widget="youtube"] iframe { aspect-ratio: 16 / 9; min-height: 0; }
  .profile-widget__deferred { display: flex; align-items: center; gap: .7rem; min-height: 5.5rem; padding: .85rem; }
  .profile-widget__mark { display: grid; flex: 0 0 2rem; place-items: center; width: 2rem; height: 2rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 42%, transparent); border-radius: 50%; color: var(--profile-accent, #cdd2ff); font-size: .8rem; }
  .profile-widget__copy { display: grid; flex: 1; min-width: 0; gap: .25rem; }
  .profile-widget__copy strong { color: var(--color-ink-strong, #f1f6ff); font-size: .74rem; }
  .profile-widget__copy span { color: var(--color-ink-muted, rgba(220,230,248,.65)); font-size: .64rem; line-height: 1.35; }
  .profile-widget__deferred button { flex: 0 0 auto; min-height: 2rem; padding: .45rem .65rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 58%, transparent); border-radius: .35rem; background: transparent; color: var(--color-ink-strong, #f1f6ff); font-size: .65rem; cursor: pointer; }
  .profile-widget__deferred button:hover, .profile-widget__deferred button:focus-visible { background: color-mix(in srgb, var(--profile-accent, #cdd2ff) 12%, transparent); }
  .profile-widget__provider-card { display: flex; align-items: center; gap: .7rem; min-height: 5.5rem; padding: .85rem; color: inherit; text-decoration: none; }
  .profile-widget__provider-card:hover, .profile-widget__provider-card:focus-visible { background: color-mix(in srgb, var(--profile-accent, #cdd2ff) 9%, transparent); }
  .profile-widget__provider-card > span:last-child { color: var(--profile-accent, #cdd2ff); }
  .profile-widgets--compact .profile-widget__heading { padding: .5rem .65rem; }
  .profile-widgets--compact .profile-widget iframe { min-height: 120px; }
  .profile-widgets--compact .profile-widget[data-provider-widget="youtube"] iframe { min-height: 0; }
  @media (max-width: 38rem) { .profile-widget__deferred { align-items: flex-start; flex-wrap: wrap; } .profile-widget__copy { flex-basis: calc(100% - 3rem); } .profile-widget__deferred button { margin-left: 2.7rem; } }
  @media (prefers-reduced-motion: reduce) { .profile-widget__deferred button { transition: none; } }
</style>
