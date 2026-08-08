<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Module from './foundation/Module.svelte';
  import { supabase } from './supabase';
  import {
    createEmptyProfileInsights,
    createProfileInsightsCsv,
    getProfileInsightsError,
    normalizeProfileInsights
  } from './profileInsights.js';

  export let configuration = null;
  export let socialSettings = null;

  let insights = createEmptyProfileInsights();
  let enabledDraft = false;
  let publicViewsVisibleDraft = true;
  let windowDays = 30;
  let loading = true;
  let saving = false;
  let error = '';
  let notice = '';
  const dispatch = createEventDispatcher();

  $: dailyRows = insights.daily.slice(-insights.windowDays);
  $: maxDailyViews = Math.max(1, ...dailyRows.map(entry => Math.max(entry.views, entry.clicks)));
  $: hasUnsavedPreference = enabledDraft !== insights.enabled || publicViewsVisibleDraft !== (socialSettings?.profileViewsVisible !== false);
  function configValue(value) { return /** @type {any} */ (value || {}); }
  $: links = configValue(configuration).published?.links || configValue(configuration).links || [];
  $: projects = configValue(configuration).published?.content?.projects || configValue(configuration).content?.projects || [];

  onMount(() => {
    publicViewsVisibleDraft = socialSettings?.profileViewsVisible !== false;
    void loadInsights();
  });

  async function loadInsights() {
    loading = true;
    error = '';
    const result = await supabase.rpc('get_my_profile_insights', { p_days: windowDays });
    if (result.error || result.data?.success === false) {
      error = getProfileInsightsError(result);
      loading = false;
      return;
    }
    insights = normalizeProfileInsights(result.data);
    enabledDraft = insights.enabled;
    loading = false;
  }

  async function chooseWindow(days) {
    windowDays = Number(days) || 30;
    await loadInsights();
  }

  async function savePreference() {
    if (saving || !hasUnsavedPreference) return;
    saving = true;
    error = '';
    notice = '';
    const insightResult = enabledDraft !== insights.enabled
      ? await supabase.rpc('update_my_profile_insights_settings', { p_enabled: enabledDraft })
      : { data: insights, error: null };
    if (insightResult.error || insightResult.data?.success === false) {
      error = getProfileInsightsError(insightResult, 'That profile-insights preference could not be saved.');
      saving = false;
      return;
    }
    if (publicViewsVisibleDraft !== (socialSettings?.profileViewsVisible !== false)) {
      const visibilityResult = await supabase.rpc('update_my_profile_view_visibility', { p_visible: publicViewsVisibleDraft });
      if (visibilityResult.error || visibilityResult.data?.success === false) {
        error = getProfileInsightsError(visibilityResult, 'The public view-count preference could not be saved.');
        saving = false;
        return;
      }
      socialSettings = visibilityResult.data?.settings || visibilityResult.data;
    }
    insights = normalizeProfileInsights(insightResult.data);
    enabledDraft = insights.enabled;
    dispatch('socialchange');
    notice = insights.enabled
      ? 'Aggregate insights are available when visitors opt in.'
      : 'Aggregate insights are off. New visits will not be recorded.';
    saving = false;
  }

  function formatNumber(value) { return Number(value || 0).toLocaleString(); }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatComparison(metric) {
    const row = insights.comparison?.[metric] || { current: 0, previous: 0 };
    if (!row.previous) return 'No previous period baseline';
    const change = Math.round(((row.current - row.previous) / row.previous) * 100);
    return `${change >= 0 ? '+' : ''}${change}% vs previous ${insights.windowDays} days`;
  }

  function entryLabel(entryKey) {
    if (entryKey === 'about') return 'About';
    if (entryKey.startsWith('widget-')) return entryKey.replace('widget-', '').toUpperCase();
    const link = links.find(item => item.key === entryKey);
    if (link) return link.label || entryKey;
    const project = projects.find(item => item.key === entryKey);
    return project?.title || entryKey;
  }

  function downloadCsv() {
    if (typeof document === 'undefined') return;
    const blob = new Blob([createProfileInsightsCsv(insights)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `chromadie-insights-${insights.windowDays}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
        <div class="profile-insights__checks">
          <label class="profile-insights__check">
            <input type="checkbox" bind:checked={enabledDraft} />
            <span><strong>Allow aggregate public insights</strong><small>Only daily totals are kept. Visitor identities, IP addresses, and exact visit times are never stored. Complete referrers are never stored either.</small></span>
          </label>
          <label class="profile-insights__check">
            <input type="checkbox" bind:checked={publicViewsVisibleDraft} />
            <span><strong>Show an aggregate public view count</strong><small>This display setting is independent from private insight collection.</small></span>
          </label>
        </div>
        <button type="button" class="profile-insights__button" disabled={saving || !hasUnsavedPreference} on:click={savePreference}>{saving ? 'Saving…' : 'Save preferences'}</button>
      </div>

      <div class="profile-insights__toolbar" aria-label="Insight time range">
        <div class="profile-insights__range" role="group" aria-label="Insight window">
          {#each [7, 30, 90] as days (days)}
            <button type="button" class:active={windowDays === days} aria-pressed={windowDays === days} on:click={() => chooseWindow(days)}>{days}d</button>
          {/each}
        </div>
        <button type="button" class="profile-insights__button profile-insights__button--quiet" on:click={downloadCsv}>Download CSV</button>
      </div>

      {#if !insights.enabled}
        <div class="profile-insights__empty"><strong>Private by default</strong><p>Turn insights on when you want a quiet signal that your profile is being discovered. Visitors must also opt in before a view can be counted.</p></div>
      {:else}
        <div class="profile-insights__summary" aria-label="Profile insight summary">
          <div><span>Public views</span><strong>{formatNumber(insights.totalViews)}</strong><small>{formatComparison('views')}</small></div>
          <div><span>Link & project clicks</span><strong>{formatNumber(insights.totalClicks)}</strong><small>{formatComparison('clicks')}</small></div>
          <div><span>Active days</span><strong>{formatNumber(insights.activeDays)}</strong><small>with at least one opted-in view</small></div>
        </div>

        {#if dailyRows.length}
          <div class="profile-insights__chart" role="list" aria-label="Daily public profile activity">
            {#each dailyRows as entry (entry.date)}
              <div class="profile-insights__day" role="listitem" title={`${formatDate(entry.date)}: ${formatNumber(entry.views)} views, ${formatNumber(entry.clicks)} clicks`}>
                <span class="profile-insights__bar-wrap"><span class="profile-insights__bar profile-insights__bar--views" style={`height:${Math.max(8, Math.round((entry.views / maxDailyViews) * 100))}%`}></span><span class="profile-insights__bar profile-insights__bar--clicks" style={`height:${Math.max(entry.clicks ? 6 : 0, Math.round((entry.clicks / maxDailyViews) * 100))}%`}></span></span>
                <strong>{formatNumber(entry.views)}</strong><small>{formatDate(entry.date)}</small>
              </div>
            {/each}
          </div>
        {/if}

        <div class="profile-insights__breakdown">
          <section><h3>Top links and projects</h3>{#if insights.topClicks.length}<ol>{#each insights.topClicks as entry (entry.entryKey)}<li><span>{entryLabel(entry.entryKey)}</span><strong>{formatNumber(entry.clicks)}</strong></li>{/each}</ol>{:else}<p>No stable link or project clicks yet.</p>{/if}</section>
          <section><h3>Devices</h3>{#if insights.devices.length}<ul>{#each insights.devices as entry (entry.device)}<li><span>{entry.device}</span><strong>{formatNumber(entry.count)}</strong></li>{/each}</ul>{:else}<p>No device summary yet.</p>{/if}</section>
          <section><h3>Countries</h3>{#if insights.countries.length}<ul>{#each insights.countries as entry (entry.country)}<li><span>{entry.country}</span><strong>{formatNumber(entry.count)}</strong></li>{/each}</ul>{:else}<p>No country summary yet.</p>{/if}</section>
          <section><h3>Referrers</h3>{#if insights.referrers.length}<ul>{#each insights.referrers as entry (entry.host)}<li><span>{entry.host}</span><strong>{formatNumber(entry.count)}</strong></li>{/each}</ul>{:else}<p>No referrer summary yet.</p>{/if}</section>
        </div>
      {/if}
    {/if}
  </div>
</Module>

<style>
  .profile-insights { display: grid; gap: var(--space-6); }
  .profile-insights__state, .profile-insights__empty { display: grid; gap: var(--space-2); padding: var(--space-5); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); color: var(--color-ink-muted); }
  .profile-insights__state strong, .profile-insights__empty strong { color: var(--color-ink-strong); }
  .profile-insights__state p, .profile-insights__empty p { margin: 0; line-height: var(--type-line-body); }
  .profile-insights__notice { margin: 0; color: var(--color-success, #8ee6bd); font-size: var(--type-small); }
  .profile-insights__preference { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-5); padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-line-subtle); }
  .profile-insights__checks { display: grid; gap: var(--space-3); }
  .profile-insights__check { display: flex; align-items: flex-start; gap: var(--space-3); color: var(--color-ink-strong); cursor: pointer; }
  .profile-insights__check input { flex: 0 0 auto; width: 1.1rem; height: 1.1rem; margin-top: .15rem; accent-color: var(--profile-accent); }
  .profile-insights__check span { display: grid; gap: var(--space-1); }
  .profile-insights__check strong { font-size: var(--type-small); }
  .profile-insights__check small { max-width: 42rem; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.4; }
  .profile-insights__button { min-height: 2.35rem; border: 1px solid var(--profile-accent); border-radius: var(--radius-sm); padding: .65rem .9rem; background: var(--profile-accent); color: var(--color-canvas-deep); font: 700 var(--type-label) / 1.2 var(--font-body-stack); cursor: pointer; }
  .profile-insights__button:hover:not(:disabled) { filter: brightness(1.08); }
  .profile-insights__button:disabled { cursor: not-allowed; opacity: .5; }
  .profile-insights__button--quiet { background: transparent; color: var(--color-ink-strong); }
  .profile-insights__button:focus-visible, .profile-insights__check input:focus-visible, .profile-insights__range button:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-insights__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
  .profile-insights__range { display: flex; gap: .35rem; }
  .profile-insights__range button { min-height: 2rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-pill); padding: .45rem .7rem; background: transparent; color: var(--color-ink-muted); cursor: pointer; }
  .profile-insights__range button.active { border-color: var(--profile-accent); background: color-mix(in srgb, var(--profile-accent) 15%, transparent); color: var(--color-ink-strong); }
  .profile-insights__summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
  .profile-insights__summary > div { display: grid; gap: var(--space-1); padding: var(--space-4); border-radius: var(--radius-md); background: var(--surface-panel-soft); }
  .profile-insights__summary span, .profile-insights__summary small { color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-insights__summary strong { color: var(--color-ink-strong); font: 600 var(--type-h2) / 1 var(--font-display-stack); }
  .profile-insights__chart { display: flex; align-items: end; gap: clamp(.35rem, 1.4vw, .8rem); min-height: 12rem; padding: var(--space-4) 0 0; overflow-x: auto; }
  .profile-insights__day { display: grid; flex: 1 0 2.4rem; align-items: end; justify-items: center; gap: var(--space-2); min-height: 10rem; color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-insights__day strong { color: var(--color-ink-strong); font: 700 var(--type-label) / 1 var(--font-mono-stack); }
  .profile-insights__day small { white-space: nowrap; }
  .profile-insights__bar-wrap { display: flex; align-items: end; justify-content: center; gap: .15rem; width: 100%; height: 7rem; padding: 0 .25rem; }
  .profile-insights__bar { display: block; width: min(.8rem, 45%); min-height: 0; border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
  .profile-insights__bar--views { background: var(--profile-accent); }
  .profile-insights__bar--clicks { background: var(--color-accent-cyan, #8ee6bd); }
  .profile-insights__breakdown { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
  .profile-insights__breakdown section { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: var(--surface-panel-soft); }
  .profile-insights__breakdown h3 { margin: 0 0 var(--space-3); color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-insights__breakdown ul, .profile-insights__breakdown ol { display: grid; gap: .4rem; margin: 0; padding-left: 1.1rem; color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-insights__breakdown li { display: flex; justify-content: space-between; gap: .8rem; }
  .profile-insights__breakdown li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-insights__breakdown li strong { color: var(--color-ink-strong); font-family: var(--font-mono-stack); }
  .profile-insights__breakdown p { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); }
  @media (max-width: 48rem) { .profile-insights__preference, .profile-insights__toolbar { align-items: stretch; flex-direction: column; } .profile-insights__button { justify-self: start; } .profile-insights__summary, .profile-insights__breakdown { grid-template-columns: minmax(0, 1fr); } .profile-insights__chart { margin-inline: calc(var(--space-2) * -1); padding-inline: var(--space-2); } }
  @media (prefers-reduced-motion: reduce) { .profile-insights__bar { transition: none; } }
</style>
