<script>
  import { onMount } from 'svelte';
  import { supabase } from './supabase';

  let resolvedView = false;
  let reports = [];
  let selectedId = '';
  let loading = true;
  let submitting = false;
  let authorized = false;
  let error = '';
  let notice = '';
  let decisionReason = '';
  let queueRequestId = 0;

  $: selectedReport = reports.find(report => report.id === selectedId) || null;

  onMount(() => {
    void loadReports();
  });

  async function loadReports() {
    const requestId = ++queueRequestId;
    loading = true;
    error = '';
    try {
      const result = await supabase.rpc('moderation_list_reports', {
        p_resolved: resolvedView,
        p_limit: 100
      });
      if (requestId !== queueRequestId) return;
      if (result.error) {
        authorized = false;
        error = result.error.code === '42501'
          ? 'This account does not have moderation access.'
          : 'The moderation queue could not be loaded. Try again.';
        reports = [];
        return;
      }
      if (result.data?.success !== true || !Array.isArray(result.data?.reports)) {
        authorized = false;
        error = 'This account does not have moderation access.';
        reports = [];
        return;
      }
      authorized = true;
      reports = result.data.reports;
      if (!reports.some(report => report.id === selectedId)) {
        selectedId = reports[0]?.id || '';
        decisionReason = '';
      }
    } catch {
      if (requestId !== queueRequestId) return;
      authorized = false;
      error = 'The moderation queue could not be loaded. Try again.';
      reports = [];
    } finally {
      if (requestId === queueRequestId) loading = false;
    }
  }

  async function changeQueue(showResolved) {
    resolvedView = showResolved;
    selectedId = '';
    decisionReason = '';
    notice = '';
    await loadReports();
  }

  function chooseReport(report) {
    selectedId = report.id;
    decisionReason = '';
    notice = '';
  }

  async function resolveReport(decision, contentAction = 'none') {
    if (!selectedReport || submitting || !decisionReason.trim()) return;
    submitting = true;
    error = '';
    notice = '';
    try {
      const result = await supabase.rpc('moderation_resolve_report', {
        p_report_id: selectedReport.id,
        p_decision: decision,
        p_reason: decisionReason.trim(),
        p_content_action: contentAction
      });
      if (result.error || result.data?.success !== true) {
        error = result.error?.code === '42501'
          ? 'This account does not have moderation access.'
          : result.error?.code === '55000'
            ? 'Another moderator has already resolved this report. Refresh the queue.'
            : 'The report decision could not be saved. Try again.';
        return;
      }
      notice = 'Decision recorded in the moderation history.';
      selectedId = '';
      decisionReason = '';
      await loadReports();
    } catch {
      error = 'The report decision could not be saved. Try again.';
    } finally {
      submitting = false;
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? 'Unknown date' : date.toLocaleString();
  }

  function targetLabel(report) {
    if (report.targetKind === 'guestbook_entry') return 'Guestbook note';
    if (report.targetKind === 'guestbook_reply') return 'Guestbook reply';
    return 'Profile';
  }
</script>

<main class="moderation" aria-labelledby="moderation-title">
  <header class="moderation__header">
    <div>
      <p class="moderation__eyebrow">Internal operations</p>
      <h1 id="moderation-title">Moderation reports</h1>
      <p>Review private report details and record a reasoned decision.</p>
    </div>
    {#if authorized}
      <button class="moderation__refresh" type="button" on:click={() => loadReports()} disabled={loading || submitting}>
        Refresh queue
      </button>
    {/if}
  </header>

  {#if notice}<p class="moderation__notice" role="status">{notice}</p>{/if}
  {#if error}<p class="moderation__error" role="alert">{error}</p>{/if}

  {#if authorized}
    <nav class="moderation__tabs" aria-label="Report queue">
      <button type="button" aria-pressed={!resolvedView} on:click={() => changeQueue(false)} disabled={submitting}>Pending</button>
      <button type="button" aria-pressed={resolvedView} on:click={() => changeQueue(true)} disabled={submitting}>Resolved</button>
    </nav>

    {#if loading}
      <p class="moderation__empty" role="status">Loading reports…</p>
    {:else if reports.length === 0}
      <p class="moderation__empty">{resolvedView ? 'No resolved reports in this queue.' : 'No pending reports.'}</p>
    {:else}
      <div class="moderation__layout">
        <section class="moderation__list" aria-label={resolvedView ? 'Resolved reports' : 'Pending reports'}>
          {#each reports as report (report.id)}
            <button
              class="moderation__report"
              class:moderation__report--selected={report.id === selectedId}
              type="button"
              aria-pressed={report.id === selectedId}
              disabled={submitting}
              on:click={() => chooseReport(report)}
            >
              <span class="moderation__report-heading">
                <strong>{report.reportedUsername || 'Deleted profile'}</strong>
                <span class="moderation__status">{report.status}</span>
              </span>
              <span>{targetLabel(report)} · {report.reason}</span>
              <small>Reported by {report.reporterUsername || 'Deleted account'} · {formatDate(report.createdAt)}</small>
            </button>
          {/each}
        </section>

        {#if selectedReport}
          <article class="moderation__detail" aria-labelledby="report-detail-title">
            <div class="moderation__detail-heading">
              <div>
                <p class="moderation__eyebrow">{targetLabel(selectedReport)} · {selectedReport.status}</p>
                <h2 id="report-detail-title">{selectedReport.reportedUsername || 'Deleted profile'}</h2>
              </div>
              <time datetime={selectedReport.createdAt}>{formatDate(selectedReport.createdAt)}</time>
            </div>

            <dl class="moderation__facts">
              <div><dt>Reason</dt><dd>{selectedReport.reason}</dd></div>
              <div><dt>Reporter</dt><dd>{selectedReport.reporterUsername || 'Deleted account'}</dd></div>
              <div><dt>Profile owner</dt><dd>{selectedReport.targetProfileUsername || 'Deleted profile'}</dd></div>
              {#if selectedReport.targetContentStatus}<div><dt>Content state</dt><dd>{selectedReport.targetContentStatus}</dd></div>{/if}
            </dl>

            {#if selectedReport.targetProfileUsername}
              <p class="moderation__profile-link">
                <a href={`/${encodeURIComponent(selectedReport.targetProfileUsername)}`} target="_blank" rel="noopener noreferrer">Open target profile</a>
                {#if selectedReport.reportedUsername && selectedReport.reportedUsername !== selectedReport.targetProfileUsername}
                  <a href={`/${encodeURIComponent(selectedReport.reportedUsername)}`} target="_blank" rel="noopener noreferrer">Open reported author profile</a>
                {/if}
              </p>
            {/if}

            {#if selectedReport.targetSnapshot}
              <section class="moderation__context" aria-label="Reported content snapshot">
                <h3>Reported content context</h3>
                <p>{selectedReport.targetSnapshot}</p>
              </section>
            {/if}
            {#if selectedReport.details}
              <section class="moderation__context" aria-label="Report details">
                <h3>Report details</h3>
                <p>{selectedReport.details}</p>
              </section>
            {/if}

            {#if !resolvedView}
              <section class="moderation__decision" aria-labelledby="decision-title">
                <h3 id="decision-title">Record a decision</h3>
                <label for="moderation-reason">Short decision reason</label>
                <textarea id="moderation-reason" bind:value={decisionReason} maxlength="500" rows="3" required></textarea>
                <div class="moderation__actions">
                  <button type="button" on:click={() => resolveReport('reviewed')} disabled={submitting || !decisionReason.trim()}>Review and close</button>
                  <button type="button" on:click={() => resolveReport('dismissed')} disabled={submitting || !decisionReason.trim()}>Dismiss</button>
                  {#if selectedReport.targetKind !== 'profile'}
                    <button class="moderation__action--contain" type="button" on:click={() => resolveReport('actioned', 'hide')} disabled={submitting || !decisionReason.trim()}>Hide content</button>
                    <button class="moderation__action--remove" type="button" on:click={() => resolveReport('actioned', 'remove')} disabled={submitting || !decisionReason.trim()}>Remove content</button>
                  {/if}
                </div>
                {#if selectedReport.targetKind === 'profile'}
                  <p class="moderation__limit">Profile or account restrictions are not supported in this workflow.</p>
                {:else}
                  <p class="moderation__limit">Removal retains the content row for protected review. Account suspension is not available here.</p>
                {/if}
              </section>
            {:else}
              <section class="moderation__history" aria-labelledby="history-title">
                <h3 id="history-title">Decision history</h3>
                {#if selectedReport.auditHistory?.length}
                  <ol>
                    {#each selectedReport.auditHistory as item, index (`${item.createdAt}-${index}`)}
                      <li>
                        <strong>{item.decision}{item.contentAction !== 'none' ? ` · ${item.contentAction} content` : ''}</strong>
                        <p>{item.reason}</p>
                        <small>{item.moderatorUsername || item.moderatorId} · {formatDate(item.createdAt)}</small>
                      </li>
                    {/each}
                  </ol>
                {:else}
                  <p>No decision history is available for this report.</p>
                {/if}
              </section>
            {/if}
          </article>
        {/if}
      </div>
    {/if}
  {:else if !loading}
    <section class="moderation__denied" aria-labelledby="moderation-denied-title">
      <h2 id="moderation-denied-title">Restricted operations page</h2>
      <p>Report details are available only to accounts explicitly granted moderator access.</p>
    </section>
  {:else}
    <p class="moderation__empty" role="status">Checking access…</p>
  {/if}
</main>

<style>
  .moderation { width: min(78rem, calc(100% - 2rem)); margin: clamp(2rem, 6vw, 5rem) auto; color: var(--color-ink-strong, #f7f7fb); }
  .moderation__header, .moderation__detail-heading, .moderation__report-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .moderation__header { margin-bottom: 1.5rem; }
  .moderation__header h1 { margin: .35rem 0; font: 600 clamp(1.7rem, 4vw, 2.6rem)/1.08 var(--font-display-stack, sans-serif); }
  .moderation__header p:last-child, .moderation__limit { color: var(--color-ink-muted, #a8a8b2); font-size: .82rem; }
  .moderation__eyebrow { margin: 0; color: #b7a4ff; font: 600 .64rem/1.2 var(--font-mono-stack, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .moderation__refresh, .moderation__tabs button, .moderation__actions button { min-height: 42px; border: 1px solid rgba(255,255,255,.14); border-radius: .65rem; padding: .65rem .9rem; background: rgba(255,255,255,.055); color: inherit; font: 600 .75rem/1.2 var(--font-body-stack, sans-serif); cursor: pointer; }
  .moderation button:disabled { opacity: .55; cursor: wait; }
  .moderation__notice, .moderation__error, .moderation__empty, .moderation__denied { border: 1px solid rgba(255,255,255,.12); border-radius: .8rem; padding: 1rem; background: rgba(255,255,255,.04); color: var(--color-ink-muted, #b8b8c2); }
  .moderation__notice { border-color: rgba(129,220,171,.35); color: #a8efc5; }
  .moderation__error { border-color: rgba(255,120,120,.4); color: #ffb7b7; }
  .moderation__tabs { display: flex; gap: .5rem; margin: 1.25rem 0; }
  .moderation__tabs button[aria-pressed="true"] { border-color: #b7a4ff; background: rgba(183,164,255,.15); }
  .moderation__layout { display: grid; grid-template-columns: minmax(16rem, .72fr) minmax(0, 1.5fr); gap: 1rem; align-items: start; }
  .moderation__list { display: grid; gap: .55rem; }
  .moderation__report { display: grid; gap: .45rem; width: 100%; border: 1px solid rgba(255,255,255,.1); border-radius: .8rem; padding: .9rem; background: rgba(255,255,255,.035); color: inherit; text-align: left; cursor: pointer; }
  .moderation__report--selected { border-color: rgba(183,164,255,.7); background: rgba(183,164,255,.09); }
  .moderation__report-heading { align-items: center; }
  .moderation__status { border-radius: 999px; padding: .22rem .5rem; background: rgba(255,255,255,.08); color: #d3ccff; font: 600 .6rem/1 var(--font-mono-stack, monospace); text-transform: uppercase; }
  .moderation__report > span:not(.moderation__report-heading) { color: #dbdbe3; font-size: .74rem; }
  .moderation__report small, .moderation__detail time, .moderation__history small { color: var(--color-ink-muted, #a8a8b2); font-size: .66rem; }
  .moderation__detail { min-width: 0; border: 1px solid rgba(255,255,255,.12); border-radius: 1rem; padding: clamp(1rem, 3vw, 1.5rem); background: rgba(17,17,22,.72); }
  .moderation__detail h2 { margin: .35rem 0 0; font-size: 1.35rem; }
  .moderation__detail-heading time { text-align: right; }
  .moderation__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: .75rem; margin: 1.25rem 0; }
  .moderation__facts div { min-width: 0; }
  .moderation__facts dt { color: var(--color-ink-muted, #a8a8b2); font: 600 .6rem/1.2 var(--font-mono-stack, monospace); text-transform: uppercase; }
  .moderation__facts dd { margin: .25rem 0 0; overflow-wrap: anywhere; font-size: .78rem; }
  .moderation__profile-link { display: flex; flex-wrap: wrap; gap: .9rem; margin: -.3rem 0 1rem; font-size: .72rem; }
  .moderation__profile-link a { color: #c9bcff; }
  .moderation__context, .moderation__decision, .moderation__history { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.1); }
  .moderation__context h3, .moderation__decision h3, .moderation__history h3 { margin: 0 0 .55rem; font-size: .88rem; }
  .moderation__context p, .moderation__history p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; color: #d7d7df; font-size: .82rem; line-height: 1.55; }
  .moderation__decision label { display: block; margin: .8rem 0 .35rem; color: var(--color-ink-muted, #a8a8b2); font-size: .7rem; }
  .moderation__decision textarea { display: block; width: 100%; resize: vertical; border: 1px solid rgba(255,255,255,.16); border-radius: .65rem; padding: .7rem; background: rgba(0,0,0,.2); color: inherit; font: .8rem/1.45 var(--font-body-stack, sans-serif); }
  .moderation__actions { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .65rem; }
  .moderation__actions .moderation__action--contain { border-color: rgba(244,201,98,.4); color: #ffe39d; }
  .moderation__actions .moderation__action--remove { border-color: rgba(255,120,120,.45); color: #ffb7b7; }
  .moderation__limit { margin: .65rem 0 0; font-size: .68rem; }
  .moderation__history ol { display: grid; gap: .7rem; margin: 0; padding-left: 1.3rem; }
  .moderation__history li { padding-left: .2rem; }
  .moderation__history li p { margin: .25rem 0; }
  .moderation__denied { max-width: 44rem; margin: 2rem auto; }
  .moderation__denied h2 { margin-top: 0; font-size: 1.1rem; }
  @media (max-width: 48rem) {
    .moderation { width: min(100% - 1.2rem, 40rem); margin-block: 1.2rem 3rem; }
    .moderation__header { flex-direction: column; }
    .moderation__layout { grid-template-columns: minmax(0, 1fr); }
    .moderation__detail-heading { flex-direction: column; }
    .moderation__detail-heading time { text-align: left; }
  }
</style>
