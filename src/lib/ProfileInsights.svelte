<script>
  import { onMount } from 'svelte';
  import Module from './foundation/Module.svelte';
  import { supabase } from './supabase';
  import { createEmptyProfileInsights, getProfileInsightsError, normalizeProfileInsights } from './profileInsights.js';

  let insights = createEmptyProfileInsights();
  let enabledDraft = false;
  let loading = true;
  let saving = false;
  let error = '';
  let notice = '';

  $: dailyRows = insights.daily.slice(-insights.windowDays);
  $: maxDailyViews = Math.max(1, ...dailyRows.map(entry => entry.views));
  $: hasUnsavedPreference = enabledDraft !== insights.enabled;

  onMount(() => {
    void loadInsights();
  });

  async function loadInsights() {
    loading = true;
    error = '';
    const result = await supabase.rpc('get_my_profile_insights', { p_days: 30 });
    if (result.error || result.data?.success === false) {
      error = getProfileInsightsError(result);
      loading = false;
      return;
    }
    insights = normalizeProfileInsights(result.data);
    enabledDraft = insights.enabled;
    loading = false;
  }

  async function savePreference() {
    if (saving || !hasUnsavedPreference) return;
    saving = true;
    error = '';
    notice = '';
    const result = await supabase.rpc('update_my_profile_insights_settings', { p_enabled: enabledDraft });
    if (result.error || result.data?.success === false) {
      error = getProfileInsightsError(result, 'That profile-insights preference could not be saved.');
      saving = false;
      return;
    }
    insights = normalizeProfileInsights(result.data);
    enabledDraft = insights.enabled;
    notice = insights.enabled
      ? 'Aggregate profile views are now available when visitors opt in.'
      : 'Aggregate profile views are off. New views will not be recorded.';
    saving = false;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<Module size="wide" tone="accent" moduleId="profile-insights" title="Profile insights" description="A private, aggregate view of how your public identity is being explored.">
  <div class="profile-insights">
    {#if loading}
      <p class="profile-insights__state" role="status" aria-live="polite">Loading your profile insights…</p>
    {:else if error}
      <div class="profile-insights__state" role="alert">
        <strong>Insights are temporarily unavailable.</strong>
        <p>{error}</p>
        <button type="button" class="profile-insights__button profile-insights__button--quiet" on:click={loadInsights}>Try again</button>
      </div>
    {:else}
      {#if notice}<p class="profile-insights__notice" role="status" aria-live="polite">{notice}</p>{/if}
      <div class="profile-insights__preference">
        <label class="profile-insights__check">
          <input type="checkbox" bind:checked={enabledDraft} />
          <span>
            <strong>Allow aggregate public view counts</strong>
            <small>Only daily totals are kept. Visitor identities, IP addresses, and exact visit times are never stored.</small>
          </span>
        </label>
        <button type="button" class="profile-insights__button" disabled={saving || !hasUnsavedPreference} on:click={savePreference}>
          {saving ? 'Saving…' : 'Save preference'}
        </button>
      </div>

      {#if !insights.enabled}
        <div class="profile-insights__empty">
          <strong>Private by default</strong>
          <p>Turn this on when you want a quiet signal that your profile is being discovered. Visitors must also opt in before a view can be counted.</p>
        </div>
      {:else}
        <div class="profile-insights__summary" aria-label="Profile insight summary">
          <div><span>Public views</span><strong>{formatNumber(insights.totalViews)}</strong><small>last {insights.windowDays} days</small></div>
          <div><span>Active days</span><strong>{formatNumber(insights.activeDays)}</strong><small>with at least one view</small></div>
        </div>

        {#if dailyRows.length}
          <div class="profile-insights__chart" role="list" aria-label="Daily public profile views">
            {#each dailyRows as entry (entry.date)}
              <div class="profile-insights__day" role="listitem" title={`${formatDate(entry.date)}: ${formatNumber(entry.views)} views`}>
                <span class="profile-insights__bar-wrap"><span class="profile-insights__bar" style={`height:${Math.max(8, Math.round((entry.views / maxDailyViews) * 100))}%`}></span></span>
                <strong>{formatNumber(entry.views)}</strong>
                <small>{formatDate(entry.date)}</small>
              </div>
            {/each}
          </div>
        {:else}
          <div class="profile-insights__empty">
            <strong>Your profile is ready to be discovered.</strong>
            <p>Opted-in public views will appear here as a daily rhythm, without identifying who visited.</p>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</Module>

<style>
  .profile-insights { display: grid; gap: var(--space-6); }
  .profile-insights__state,
  .profile-insights__empty { display: grid; gap: var(--space-2); padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); color: var(--color-ink-muted); }
  .profile-insights__state strong,
  .profile-insights__empty strong { color: var(--color-ink-strong); }
  .profile-insights__state p,
  .profile-insights__empty p { margin: 0; line-height: var(--type-line-body); }
  .profile-insights__notice { margin: 0; color: var(--color-success, #8ee6bd); font-size: var(--type-small); }
  .profile-insights__preference { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-5); padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-line-subtle); }
  .profile-insights__check { display: flex; align-items: flex-start; gap: var(--space-3); color: var(--color-ink-strong); cursor: pointer; }
  .profile-insights__check input { flex: 0 0 auto; width: 1.1rem; height: 1.1rem; margin-top: 0.15rem; accent-color: var(--profile-accent); }
  .profile-insights__check span { display: grid; gap: var(--space-1); }
  .profile-insights__check strong { font-size: var(--type-small); }
  .profile-insights__check small { max-width: 38rem; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.4; }
  .profile-insights__button { border: 1px solid var(--profile-accent); border-radius: var(--radius-sm); padding: 0.7rem 1rem; background: var(--profile-accent); color: var(--color-canvas-deep); font: 700 var(--type-label) / 1.2 var(--font-body-stack); cursor: pointer; }
  .profile-insights__button:hover:not(:disabled) { filter: brightness(1.08); }
  .profile-insights__button:disabled { cursor: not-allowed; opacity: 0.5; }
  .profile-insights__button--quiet { justify-self: start; background: transparent; color: var(--color-ink-strong); }
  .profile-insights__button:focus-visible,
  .profile-insights__check input:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-insights__summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
  .profile-insights__summary > div { display: grid; gap: var(--space-1); padding: var(--space-4); border-radius: var(--radius-md); background: var(--surface-panel-soft); }
  .profile-insights__summary span,
  .profile-insights__summary small { color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-insights__summary strong { color: var(--color-ink-strong); font: 600 var(--type-h2) / 1 var(--font-display-stack); }
  .profile-insights__chart { display: flex; align-items: end; gap: clamp(0.35rem, 1.4vw, 0.8rem); min-height: 12rem; padding: var(--space-4) 0 0; overflow-x: auto; }
  .profile-insights__day { display: grid; flex: 1 0 2.4rem; align-items: end; justify-items: center; gap: var(--space-2); min-height: 10rem; color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-insights__day strong { color: var(--color-ink-strong); font: 700 var(--type-label) / 1 var(--font-mono-stack); }
  .profile-insights__day small { white-space: nowrap; }
  .profile-insights__bar-wrap { display: flex; align-items: end; justify-content: center; width: 100%; height: 7rem; padding: 0 0.25rem; }
  .profile-insights__bar { display: block; width: min(1.8rem, 100%); min-height: 0.35rem; border-radius: var(--radius-sm) var(--radius-sm) 0 0; background: linear-gradient(180deg, var(--profile-accent), color-mix(in srgb, var(--profile-accent) 45%, transparent)); transition: height var(--motion-base) var(--motion-ease-standard); }

  @media (max-width: 48rem) {
    .profile-insights__preference { align-items: stretch; flex-direction: column; }
    .profile-insights__button { justify-self: start; }
    .profile-insights__chart { margin-inline: calc(var(--space-2) * -1); padding-inline: var(--space-2); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-insights__bar { transition: none; }
  }
</style>
