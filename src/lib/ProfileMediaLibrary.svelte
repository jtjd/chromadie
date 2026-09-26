<script>
  import { getProfileMediaUrl } from './profileMedia.js';
  import { hasProfileMediaRevalidationHash } from './profileMediaValidation.js';
  import Media from './foundation/Media.svelte';
  import ProfileMediaIcon from './ProfileMediaIcon.svelte';

  export let assets = [];
  export let selectedIds = [];
  export let busy = false;
  export let title = 'Saved media';
  export let description = 'Choose a saved file to use on your profile.';
  export let onSelect = asset => asset;
  export let onCheck = asset => asset;
  export let onDelete = asset => asset;
  let open = false;
  let kind = '';
  let page = 0;
  const pageSize = 6;
  const label = value => value.replaceAll('_', ' ');
  const needsCheck = asset => asset.storage_provider === 'r2' && Number(asset.content_validation_version) !== 1;
  $: kinds = [...new Set(assets.map(asset => asset.kind))];
  $: if (kind && !kinds.includes(kind)) kind = '';
  $: filtered = assets.filter(asset => !kind || asset.kind === kind);
  $: pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  $: page = Math.min(page, pages - 1);
  $: visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  $: checkCount = assets.filter(needsCheck).length;
</script>

{#if assets.length}
  <details class="media-library" bind:open>
    <summary><span>{title}</span><span class="media-library__count">{assets.length} files{checkCount ? ` · ${checkCount} to review` : ''}</span></summary>
    {#if open}
      <p>{description}</p>
      <div class="media-library__toolbar">
        <label>Media type <select bind:value={kind} on:change={() => page = 0}><option value="">All media</option>{#each kinds as option (option)}<option value={option}>{label(option)}</option>{/each}</select></label>
        <span role="status">{filtered.length} {filtered.length === 1 ? 'file' : 'files'}</span>
      </div>
      <div class="media-library__grid">
        {#each visible as asset (asset.id)}
          {@const selected = selectedIds.includes(asset.id)}
          {@const unchecked = needsCheck(asset)}
          {@const unavailable = asset.storage_provider !== 'r2'}
          <article class:selected>
            <div class="media-library__preview">
              {#if !unchecked && !unavailable && asset.r2_public_key && ['avatar', 'background', 'share_image'].includes(asset.kind)}
                <Media src={getProfileMediaUrl(asset)} alt={asset.label || label(asset.kind)} loading="lazy" aspect="square" className="media-library__image" fallbackLabel="Preview unavailable" />
              {:else}<ProfileMediaIcon kind={asset.kind === 'audio' ? 'audio' : 'image'} />{/if}
            </div>
            <div class="media-library__copy"><strong title={asset.label}>{asset.label || label(asset.kind)}</strong><span>{label(asset.kind)} · {selected ? 'On profile' : unchecked ? 'Needs check' : unavailable ? 'Upload again' : 'Saved'}</span></div>
            <div class="media-library__actions">
              {#if unchecked && hasProfileMediaRevalidationHash(asset)}
                <button type="button" disabled={busy} on:click={() => onCheck(asset)}>Check file</button>
              {:else if unchecked || unavailable}<span>Upload again to use</span>
              {:else}<button type="button" disabled={busy || selected} on:click={() => onSelect(asset)}>{selected ? 'In use' : 'Use'}</button>{/if}
              <button type="button" class="media-library__delete" disabled={busy} aria-label={`Delete ${asset.label || label(asset.kind)}`} on:click={() => onDelete(asset)}>Delete</button>
            </div>
          </article>
        {/each}
      </div>
      {#if pages > 1}
        <nav aria-label={`${title} pages`}><button type="button" disabled={page === 0} on:click={() => page -= 1}>Previous</button><span aria-live="polite">{page + 1} / {pages}</span><button type="button" disabled={page >= pages - 1} on:click={() => page += 1}>Next</button></nav>
      {/if}
    {/if}
  </details>
{/if}

<style>
  .media-library { grid-column: 1 / -1; order: 7; min-width: 0; border-top: 1px solid var(--color-line-subtle); padding-top: 1rem; margin-top: .5rem; color: var(--color-ink-strong); }
  summary { cursor: pointer; padding: .75rem 0; font-size: .85rem; font-weight: 600; }
  .media-library__count { float: right; color: var(--color-ink-muted); font-size: .72rem; font-weight: 400; }
  p { color: var(--color-ink-muted); font-size: .78rem; line-height: 1.5; margin: .5rem 0 1rem; }
  .media-library__toolbar, nav { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin: .75rem 0; font-size: .75rem; }
  label { display: flex; align-items: center; gap: .6rem; }
  select, button { min-height: 2.75rem; padding: .5rem .75rem; border: 1px solid var(--color-line-subtle); border-radius: .4rem; background: var(--surface-inset); color: var(--color-ink-strong); font: inherit; }
  button { cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .media-library__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  article { display: grid; grid-template-columns: 3rem minmax(0, 1fr); gap: .65rem; align-items: center; min-width: 0; border: 1px solid var(--color-line-subtle); border-radius: .5rem; padding: .65rem; }
  article.selected { border-color: var(--color-accent-bright); }
  .media-library__preview { display: grid; place-items: center; width: 3rem; height: 3rem; overflow: hidden; border-radius: .3rem; background: var(--surface-inset); }
  :global(.media-library__image) { width: 100%; height: 100%; }
  .media-library__copy { display: grid; min-width: 0; gap: .3rem; }
  strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .78rem; }
  .media-library__copy span, .media-library__actions span { color: var(--color-ink-muted); font-size: .7rem; }
  .media-library__actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: .5rem; font-size: .75rem; }
  .media-library__delete { color: var(--color-ink-muted); background: transparent; }
  @media (max-width: 38rem) { .media-library__grid { grid-template-columns: minmax(0, 1fr); } .media-library__count { float: none; display: block; margin: .4rem 0 0 1rem; } }
</style>
