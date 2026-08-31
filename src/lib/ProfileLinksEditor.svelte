<script>
  import { createEventDispatcher } from 'svelte';
  import { areProfileConfigsEqual, normalizeProfileConfig, PROFILE_LINK_LIMITS } from './profileConfig.js';
  import { PROFILE_LINK_DEFINITIONS, isProfileLinkUrlValid } from './profileLinkTypes.js';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;
  export let updatedAt = null;
  export let studio = false;
  export let presentation = '';

  const dispatch = createEventDispatcher();
  const linkLimit = PROFILE_LINK_LIMITS.maxLinks;
  let draft = normalizeDraft(draftConfig || publishedConfig);
  let baseline = draft;
  let status = '';
  let error = '';
  let lastIncomingKey = '';

  // A blank row is an intentional editor state. The public normalizer drops
  // it from the preview, but it must still keep the editor dirty so an
  // incoming preview projection cannot erase the row before it is completed.
  $: isDirty = !areProfileConfigsEqual(draft, baseline)
    || hasIncompleteLinks(draft);
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !isDirty) syncIncoming();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasIncompleteLinks(value) {
    return Array.isArray(value?.links)
      && value.links.some(link => !String(link.label || '').trim() || !isProfileLinkUrlValid(link.type, link.url));
  }

  function draftLinkFallback(value, index) {
    const candidate = value && typeof value === 'object' ? value : {};
    const keyCandidate = String(candidate.key || '').trim().toLowerCase();
    const key = /^[a-z0-9][a-z0-9_-]{0,31}$/.test(keyCandidate) ? keyCandidate : `draft-link-${index}`;
    const type = PROFILE_LINK_DEFINITIONS.some(definition => definition.key === candidate.type) ? candidate.type : 'website';
    const clamp = (next, fallback, minimum, maximum) => {
      const number = Number(next);
      return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
    };
    return {
      key,
      type,
      label: String(candidate.label || '').trim().slice(0, 40),
      url: String(candidate.url || '').trim().slice(0, 2048),
      visible: candidate.visible !== false,
      order: index,
      alignment: ['left', 'center', 'right'].includes(candidate.alignment) ? candidate.alignment : 'left',
      monochrome: candidate.monochrome === true,
      size: clamp(candidate.size, 1, 0, 2),
      glow: clamp(candidate.glow, 0, 0, 2)
    };
  }

  function normalizeDraft(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalized = normalizeProfileConfig(source);
    const sourceLinks = Array.isArray(source.links)
      ? source.links
      : Array.isArray(source.base?.links)
        ? source.base.links
        : [];
    // The public normalizer correctly rejects incomplete links, but the editor
    // must keep a newly-added blank row long enough for the user to complete
    // it. The row remains bounded and structured; only valid rows reach the
    // live renderer and publish RPC.
    const links = sourceLinks.slice(0, linkLimit).map((link, index) => {
      const valid = normalizeProfileConfig({ ...source, links: [link] }).links[0];
      return valid ? { ...valid, order: index } : draftLinkFallback(link, index);
    });
    return { ...normalized, links };
  }

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    const nextBaseline = normalizeDraft(draftConfig || publishedConfig);
    draft = clone(nextBaseline);
    baseline = clone(nextBaseline);
    error = '';
    status = '';
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : !areProfileConfigsEqual(draft, baseline) || hasIncompleteLinks(draft) });
  }

  function updateDraft(next) {
    draft = normalizeDraft({ ...draft, ...next });
    status = '';
    error = '';
    emitDirty();
    dispatch('configpreview', { config: draft });
  }

  function addLink() {
    if (draft.links.length >= linkLimit) {
      error = `You can add up to ${linkLimit} links on this profile.`;
      return;
    }
    updateDraft({ links: [...draft.links, { key: `l${Date.now().toString(36)}${draft.links.length}`, type: 'website', label: '', url: '', visible: true, order: draft.links.length }] });
  }

  function updateLink(index, field, value) {
    updateDraft({ links: draft.links.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link) });
  }

  function removeLink(index) {
    updateDraft({ links: draft.links.filter((_, linkIndex) => linkIndex !== index).map((link, order) => ({ ...link, order })) });
  }

  function moveLink(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.links.length) return;
    const links = draft.links.slice();
    [links[index], links[nextIndex]] = [links[nextIndex], links[index]];
    updateDraft({ links: links.map((link, order) => ({ ...link, order })) });
  }

  function validateLinks() {
    const invalid = draft.links.find(link => !String(link.label || '').trim() || !isProfileLinkUrlValid(link.type, link.url));
    if (!invalid) return true;
    error = 'Complete each link with a label and a valid HTTPS URL for its selected service, or remove it.';
    status = '';
    return false;
  }

  export function validateDraft() {
    return validateLinks();
  }

  export function acceptSaved(nextConfig = draft) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    status = '';
    error = '';
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetChanges() {
    draft = clone(baseline);
    status = '';
    error = '';
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetTo(nextConfig = publishedConfig) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    error = '';
    status = '';
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }
</script>

<section class="profile-links-editor" class:profile-links-editor--studio={studio} class:profile-links-editor--customize={presentation === 'customize'} aria-labelledby="profile-links-title">
  <header class="profile-links-editor__header">
    <div>
      <h2 id="profile-links-title">Public links</h2>
      <p>Choose what people can open from your profile and shape the sharing details around it.</p>
    </div>
    <button type="button" class="profile-links-editor__text-button" on:click={addLink} disabled={draft.links.length >= linkLimit}>Add link</button>
  </header>

  {#if draft.links.length}
    <div class="profile-links-editor__links">
      {#each draft.links as link, index (link.key || index)}
        <div class="profile-links-editor__link-row">
          <label class="profile-links-editor__link-visible"><input type="checkbox" checked={link.visible !== false} aria-label={`Show ${link.label || 'link'}`} on:change={event => updateLink(index, 'visible', event.currentTarget.checked)} /> Show</label>
          <select value={link.type} aria-label="Link type" on:change={event => updateLink(index, 'type', event.currentTarget.value)}>{#each PROFILE_LINK_DEFINITIONS as definition (definition.key)}<option value={definition.key}>{definition.label}</option>{/each}</select>
          <input value={link.label} maxlength="40" aria-label="Link label" placeholder="Label" on:input={event => updateLink(index, 'label', event.currentTarget.value)} />
          <input value={link.url} maxlength="2048" inputmode="url" aria-label="Secure link URL" placeholder="https://" on:input={event => updateLink(index, 'url', event.currentTarget.value)} />
          <div class="profile-links-editor__link-actions"><button type="button" aria-label={`Move ${link.label || 'link'} up`} disabled={index === 0} on:click={() => moveLink(index, -1)}>↑</button><button type="button" aria-label={`Move ${link.label || 'link'} down`} disabled={index === draft.links.length - 1} on:click={() => moveLink(index, 1)}>↓</button><button type="button" class="profile-links-editor__remove" aria-label={`Remove ${link.label || 'link'}`} on:click={() => removeLink(index)}>Remove</button></div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="profile-links-editor__empty">No public links.</p>
  {/if}

  <div class="profile-links-editor__link-style">
    <label><span>Link size</span><input type="range" min="0" max="2" step="1" value={draft.linkStyle?.size || 0} on:input={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), size: Number(event.currentTarget.value) } })} /></label>
    <label><span>Glow</span><input type="range" min="0" max="2" step="1" value={draft.linkStyle?.glow || 0} on:input={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), glow: Number(event.currentTarget.value) } })} /></label>
    <label class="profile-links-editor__style-check"><input type="checkbox" checked={draft.linkStyle?.monochrome === true} on:change={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), monochrome: event.currentTarget.checked } })} /> Monochrome</label>
  </div>

  <div class="profile-links-editor__metadata">
    <div><h3>Structured preview metadata</h3><p>Optional presentation controls. Unsafe values fall back to the canonical profile metadata.</p></div>
    <label><span>Share title</span><input maxlength="80" value={draft.metadata?.title || ''} placeholder="Your profile title" on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), title: event.currentTarget.value } })} /></label>
    <label><span>Share description</span><textarea maxlength="200" rows="2" value={draft.metadata?.description || ''} placeholder="A short description for social previews." on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), description: event.currentTarget.value } })}></textarea></label>
    <label><span>Embed color</span><input type="text" maxlength="7" pattern="#[0-9A-Fa-f]{6}" value={draft.metadata?.embedColor || '#CDD2FF'} on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), embedColor: event.currentTarget.value } })} /></label>
  </div>

  <p class="profile-links-editor__helper">Up to {linkLimit} links appear together in the profile card. Links must use HTTPS and can be reordered above.</p>
  {#if error}<p class="profile-links-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-links-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <p class="profile-links-editor__hint">Changes are staged in this workspace. Publish the profile from the dashboard controls.</p>
</section>

<style>
  .profile-links-editor {
    --editor-input: var(--studio-control, rgba(255, 255, 255, .035));
    --editor-inset: var(--studio-control-deep, rgba(0, 0, 0, .22));
    --editor-text: var(--studio-text, #f8f8f8);
    --editor-secondary: var(--studio-secondary, #bfc0c5);
    --editor-muted: var(--studio-muted, #8f9099);
    --editor-faint: var(--studio-faint, #686971);
    --editor-border: var(--studio-border, rgba(255, 255, 255, .1));
    --editor-border-strong: var(--studio-border-strong, rgba(255, 255, 255, .2));
    --editor-focus: var(--studio-accent, var(--white, #ffffff));
    --editor-danger: var(--studio-danger, #ff5578);
    display: grid;
    gap: .85rem;
    min-width: 0;
    color: var(--editor-text);
    font-family: 'Inter', sans-serif;
  }
  .profile-links-editor__header, .profile-links-editor__link-row, .profile-links-editor__link-style label { display: flex; align-items: center; gap: .55rem; }
  .profile-links-editor__header { align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-links-editor h2, .profile-links-editor h3 { margin: 0; color: var(--editor-text); }
  .profile-links-editor h2 { font-size: 1rem; line-height: 1.25; }
  .profile-links-editor h3 { font-size: .9rem; line-height: 1.25; }
  .profile-links-editor p, .profile-links-editor label, .profile-links-editor span { font-size: .7rem; line-height: 1.45; }
  .profile-links-editor__header p, .profile-links-editor__helper, .profile-links-editor__empty, .profile-links-editor__hint, .profile-links-editor__metadata p { margin: .3rem 0 0; color: var(--editor-muted); }
  .profile-links-editor__text-button, .profile-links-editor__link-actions button { min-height: 2.1rem; border: 1px solid var(--editor-border-strong); border-radius: 8px; padding: .35rem .55rem; background: transparent; color: var(--editor-secondary); font: 600 .7rem/1 'Inter', sans-serif; cursor: pointer; }
  .profile-links-editor__text-button { border-color: var(--editor-focus); color: var(--editor-focus); }
  .profile-links-editor__text-button:disabled, .profile-links-editor__link-actions button:disabled { cursor: not-allowed; opacity: .45; }
  .profile-links-editor__links { display: grid; gap: .5rem; }
  .profile-links-editor__link-row { display: grid; grid-template-columns: auto minmax(5.5rem, .8fr) minmax(6rem, 1fr) minmax(7.5rem, 1.5fr) minmax(8rem, max-content); width: 100%; box-sizing: border-box; padding: .65rem; border: 1px solid var(--editor-border); border-radius: 8px; background: var(--editor-input); }
  .profile-links-editor__link-row > * { min-width: 0; }
  .profile-links-editor__link-row :is(input, select, textarea) { min-height: 2.4rem; box-sizing: border-box; min-width: 0; max-width: 100%; border: 1px solid var(--editor-border-strong); border-radius: 8px; padding: .55rem .6rem; background: var(--editor-inset); color: var(--editor-text); font: 500 .75rem/1.3 'Inter', sans-serif; }
  .profile-links-editor__link-visible { white-space: nowrap; color: var(--editor-secondary); }
  .profile-links-editor__link-visible input, .profile-links-editor__style-check input { accent-color: var(--editor-focus); }
  .profile-links-editor__link-actions { display: flex; align-items: center; justify-content: flex-end; gap: .25rem; flex-wrap: wrap; }
  .profile-links-editor__remove:hover:not(:disabled), .profile-links-editor__link-actions button:focus-visible, .profile-links-editor__text-button:focus-visible { border-color: var(--editor-focus); outline: 2px solid var(--editor-focus); outline-offset: 2px; }
  .profile-links-editor__remove:hover:not(:disabled) { color: var(--editor-danger); }
  .profile-links-editor__link-style { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: .65rem; padding-top: .35rem; }
  .profile-links-editor__link-style label { display: grid; align-items: end; color: var(--editor-secondary); }
  .profile-links-editor__metadata :is(input, textarea) { min-height: 2.4rem; box-sizing: border-box; border: 1px solid var(--editor-border-strong); border-radius: 8px; padding: .55rem .6rem; background: var(--editor-input); color: var(--editor-text); font: 500 .75rem/1.3 'Inter', sans-serif; }
  .profile-links-editor__link-style input[type='range'] { width: 100%; accent-color: var(--editor-focus); }
  .profile-links-editor__style-check { display: inline-flex !important; min-height: 2.4rem; white-space: nowrap; }
  .profile-links-editor__metadata { display: grid; gap: .65rem; padding-top: .85rem; border-top: 1px solid var(--editor-border); }
  .profile-links-editor__metadata label { display: grid; gap: .35rem; color: var(--editor-secondary); }
  .profile-links-editor__metadata textarea { min-height: 4.5rem !important; resize: vertical; }
  .profile-links-editor__message { margin: 0; color: var(--editor-muted); }
  .profile-links-editor__message[role='alert'] { color: var(--editor-danger); }
  @media (max-width: 48rem) {
    .profile-links-editor__header { flex-direction: column; }
    .profile-links-editor__link-row { grid-template-columns: minmax(0, 1fr); }
    .profile-links-editor__link-row > * { grid-column: 1 !important; }
    .profile-links-editor__link-row :is(input, select) { width: 100%; }
    .profile-links-editor__link-style { grid-template-columns: 1fr 1fr; }
    .profile-links-editor__style-check { grid-column: 1 / -1; }
  }
</style>
