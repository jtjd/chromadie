<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { normalizeProfileContent, PROFILE_CONTENT_LIMITS } from './profileContent.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;
  export let updatedAt = null;
  export let entitlements = [];
  export let staff = false;

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-content-editor';
  const EMPTY_PROJECT = Object.freeze({ title: '', description: '', url: '', visible: true });

  let draft = normalizeDraft(draftConfig || publishedConfig);
  let baseline = draft;
  let emptyProject = { ...EMPTY_PROJECT };
  let status = '';
  let error = '';
  let lastIncomingKey = '';

  $: maxProjects = staff || hasChromadiePlus(entitlements) ? PROFILE_CONTENT_LIMITS.premiumProjects : PROFILE_CONTENT_LIMITS.projects;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDraft(value) {
    const config = normalizeProfileConfig(value || draftConfig || publishedConfig);
    return { ...config, content: normalizeProfileContent(config.content) };
  }

  $: isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !isDirty) syncIncoming();

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    const cached = profileId ? readViewState(VIEW_STATE_NAMESPACE, profileId) : null;
    draft = normalizeDraft(cached?.draft || draftConfig || publishedConfig);
    baseline = normalizeDraft(draftConfig || publishedConfig);
    emptyProject = { ...EMPTY_PROJECT };
    error = '';
    status = cached?.draft ? 'Unsaved content restored.' : '';
    if (cached?.draft) dispatch('configpreview', { config: draft });
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : isDirty });
  }

  function updateContent(next) {
    draft = normalizeDraft({ ...draft, content: { ...draft.content, ...next } });
    if (!draft.content.projects.length) emptyProject = { ...EMPTY_PROJECT };
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileId, { draft });
    status = '';
    error = '';
    emitDirty(true);
    dispatch('configpreview', { config: draft });
  }

  function updateAbout(field, value) {
    if (field === 'body') {
      updateContent({ version: 2, about: { ...draft.content.about, markdown: value, body: undefined } });
      return;
    }
    updateContent({ about: { ...draft.content.about, [field]: value } });
  }

  function addProject() {
    if (!draft.content.projects.length) {
      document.getElementById('profile-project-placeholder-title')?.focus();
      return;
    }
    if (draft.content.projects.length >= maxProjects) {
      error = `You can add up to ${maxProjects} projects on this profile.`;
      return;
    }
    updateContent({ projects: [...draft.content.projects, { title: '', description: '', url: '', visible: true, order: draft.content.projects.length }] });
  }

  function updateEmptyProject(field, value) {
    const next = { ...emptyProject, [field]: value };
    emptyProject = next;
    if (next.title.trim() || next.description.trim() || next.url.trim()) {
      updateContent({ projects: [{ ...next, order: 0 }] });
    }
  }

  function updateProject(index, field, value) {
    updateContent({ projects: draft.content.projects.map((project, projectIndex) => projectIndex === index ? { ...project, [field]: value } : project) });
  }

  function removeProject(index) {
    updateContent({ projects: draft.content.projects.filter((_, projectIndex) => projectIndex !== index) });
  }

  export function validateDraft() {
    const invalid = draft.content.projects.find(project => {
      const hasInput = project.title || project.description || project.url;
      return hasInput && (!project.title || !/^https:\/\/[^\s<>"']+$/.test(String(project.url || '').trim()));
    });
    if (!invalid) return true;
    error = 'Complete each project with a title and HTTPS URL, or remove it.';
    status = '';
    return false;
  }

  export function getDraftConfig() {
    return clone(draft);
  }

  export function acceptSaved(nextConfig = draft) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    if (!draft.content.projects.length) emptyProject = { ...EMPTY_PROJECT };
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    status = '';
    error = '';
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetChanges() {
    draft = clone(baseline);
    if (!draft.content.projects.length) emptyProject = { ...EMPTY_PROJECT };
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetTo(nextConfig = publishedConfig) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    if (!draft.content.projects.length) emptyProject = { ...EMPTY_PROJECT };
    error = '';
    status = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }
</script>

<section class="profile-content-editor" aria-labelledby="profile-content-title">
  <header class="profile-content-editor__header">
    <div><h2 id="profile-content-title">About & projects</h2><p>Tell visitors what matters to you with plain text and a few focused links.</p></div>
    <span class="profile-content-editor__version">Up to {maxProjects} projects</span>
  </header>

  <section class="profile-content-editor__panel" aria-labelledby="profile-content-about-title">
    <div class="profile-content-editor__panel-heading"><h3 id="profile-content-about-title">About</h3><label class="profile-content-editor__switch"><input type="checkbox" checked={draft.content.about.visible} on:change={event => updateAbout('visible', event.currentTarget.checked)} /><span>Visible</span></label></div>
    <div class="profile-content-editor__fields">
      <label><span>Heading</span><input value={draft.content.about.heading} maxlength={PROFILE_CONTENT_LIMITS.aboutHeading} on:input={event => updateAbout('heading', event.currentTarget.value)} /></label>
        <label><span>Short introduction <output>{(draft.content.about.markdown || draft.content.about.body || '').length}/{PROFILE_CONTENT_LIMITS.aboutMarkdown}</output></span><textarea rows="5" maxlength={PROFILE_CONTENT_LIMITS.aboutMarkdown} placeholder="A short note about your work, interests, or current chapter." on:input={event => updateAbout('body', event.currentTarget.value)}>{draft.content.about.markdown || draft.content.about.body}</textarea></label>
    </div>
    <p class="profile-content-editor__helper">Safe Markdown subset: emphasis, lists, code, and HTTPS links. Plain text only is always safe; raw HTML and scripts are discarded.</p>
  </section>

  <section class="profile-content-editor__panel" aria-labelledby="profile-content-projects-title">
    <div class="profile-content-editor__panel-heading"><div><h3 id="profile-content-projects-title">Projects</h3><p>Show the places, work, or communities you want people to explore.</p></div><button type="button" class="profile-content-editor__text-button" on:click={addProject} disabled={draft.content.projects.length >= maxProjects}>Add project</button></div>
    {#if draft.content.projects.length}
      <div class="profile-content-editor__projects">
        {#each draft.content.projects as project, index (index)}
          <article class="profile-content-editor__project">
            <div class="profile-content-editor__project-heading"><strong>Project {index + 1}</strong><label class="profile-content-editor__switch"><input type="checkbox" checked={project.visible} on:change={event => updateProject(index, 'visible', event.currentTarget.checked)} /><span>Visible</span></label></div>
            <div class="profile-content-editor__fields">
              <label><span>Title</span><input value={project.title} maxlength={PROFILE_CONTENT_LIMITS.projectTitle} placeholder="Project name" on:input={event => updateProject(index, 'title', event.currentTarget.value)} /></label>
              <label><span>Description <output>{project.description.length}/{PROFILE_CONTENT_LIMITS.projectDescription}</output></span><textarea rows="3" maxlength={PROFILE_CONTENT_LIMITS.projectDescription} placeholder="What is it?" on:input={event => updateProject(index, 'description', event.currentTarget.value)}>{project.description}</textarea></label>
              <label><span>HTTPS URL</span><input value={project.url} maxlength={PROFILE_CONTENT_LIMITS.projectUrl} inputmode="url" placeholder="https://" on:input={event => updateProject(index, 'url', event.currentTarget.value)} /></label>
            </div>
            <button type="button" class="profile-content-editor__remove" on:click={() => removeProject(index)}>Remove project</button>
          </article>
        {/each}
      </div>
    {:else}
      <article class="profile-content-editor__project profile-content-editor__project--empty">
        <div class="profile-content-editor__project-heading"><strong>Project 1</strong><label class="profile-content-editor__switch"><input type="checkbox" checked={emptyProject.visible} on:change={event => updateEmptyProject('visible', event.currentTarget.checked)} /><span>Visible</span></label></div>
        <div class="profile-content-editor__fields">
          <label><span>Title</span><input id="profile-project-placeholder-title" value={emptyProject.title} maxlength={PROFILE_CONTENT_LIMITS.projectTitle} placeholder="Project name" on:input={event => updateEmptyProject('title', event.currentTarget.value)} /></label>
          <label><span>Description <output>{emptyProject.description.length}/{PROFILE_CONTENT_LIMITS.projectDescription}</output></span><textarea rows="3" maxlength={PROFILE_CONTENT_LIMITS.projectDescription} placeholder="What is it?" on:input={event => updateEmptyProject('description', event.currentTarget.value)}>{emptyProject.description}</textarea></label>
          <label><span>HTTPS URL</span><input value={emptyProject.url} maxlength={PROFILE_CONTENT_LIMITS.projectUrl} inputmode="url" placeholder="https://" on:input={event => updateEmptyProject('url', event.currentTarget.value)} /></label>
        </div>
        <p class="profile-content-editor__placeholder-hint">Add a title and HTTPS URL to show this project publicly.</p>
      </article>
    {/if}
    <p class="profile-content-editor__helper">Projects require a title and HTTPS URL to appear publicly. Empty rows can be removed before saving.</p>
  </section>

  {#if error}<p class="profile-content-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-content-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <p class="profile-content-editor__hint">Changes are staged in this workspace. Publish the profile from the dashboard controls.</p>
</section>

<style>
  .profile-content-editor {
    --content-surface: var(--customize-surface, var(--site-deep, #090a0d));
    --content-surface-raised: var(--customize-section-input, var(--customize-surface-raised, var(--site-raised, #111319)));
    --content-surface-inset: var(--customize-surface-inset, var(--site-deep, #090a0d));
    --content-text: var(--customize-text-primary, var(--site-ink, #f2f0eb));
    --content-text-secondary: var(--customize-text-secondary, var(--site-muted, #aaa8b0));
    --content-text-muted: var(--customize-text-muted, var(--site-muted, #aaa8b0));
    --content-text-faint: var(--customize-text-faint, var(--site-faint, #7d7e87));
    --content-border: var(--customize-border, var(--site-line, rgba(255, 255, 255, .08)));
    --content-border-strong: var(--customize-section-input-line, var(--customize-border-strong, var(--site-line-strong, rgba(255, 255, 255, .14))));
    --content-focus: var(--customize-focus, var(--ctp-lavender, #b4befe));
    --content-neutral: var(--customize-accent-primary, var(--ctp-teal, #94e2d5));
    --content-neutral-hover: var(--customize-accent-secondary, var(--ctp-sky, #89dceb));
    --content-add: var(--customize-accent-add, var(--ctp-peach, #fab387));
    --content-danger: var(--customize-accent-danger, var(--ctp-red, #f38ba8));
    --content-font-body: var(--customize-font-body, var(--site-body, sans-serif));
    --content-font-mono: var(--customize-font-mono, var(--site-mono, ui-monospace, SFMono-Regular, Menlo, monospace));
    --content-heading-size: var(--customize-subheading-size, .9rem);
    --content-label-size: var(--customize-label-size, .76rem);
    --content-control-size: var(--customize-control-size, .82rem);
    --content-secondary-height: var(--customize-secondary-height, 2.1rem);
    --content-primary-height: var(--customize-primary-height, 2.35rem);
    --content-radius: var(--customize-radius, .35rem);
    display: grid;
    gap: .75rem;
    min-width: 0;
    color: var(--content-text);
    font-family: var(--content-font-body);
  }
  .profile-content-editor__header, .profile-content-editor__panel-heading, .profile-content-editor__project-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-content-editor__header h2, .profile-content-editor__panel h3 { margin: 0; color: var(--content-text); letter-spacing: -.02em; }
  .profile-content-editor__header h2 { font-size: var(--customize-section-heading-size, 1rem); line-height: 1.2; }
  .profile-content-editor__header p, .profile-content-editor__panel-heading p, .profile-content-editor__helper { margin: .3rem 0 0; color: var(--content-text-muted); font-size: .78rem; line-height: 1.5; }
  .profile-content-editor__version { color: var(--content-text-faint); font: .72rem/1 var(--content-font-mono); }
  .profile-content-editor__panel { min-width: 0; padding: .75rem 0; border-top: 1px solid var(--content-border); border-radius: 0; background: transparent; }
  .profile-content-editor__panel:first-of-type { padding-top: 0; border-top: 0; }
  .profile-content-editor__panel-heading { align-items: flex-start; margin-bottom: .65rem; }
  .profile-content-editor__panel-heading h3 { font-size: var(--content-heading-size); line-height: 1.25; }
  .profile-content-editor__fields { display: grid; gap: .65rem; min-width: 0; }
  .profile-content-editor__fields label { display: grid; gap: .35rem; min-width: 0; color: var(--content-text-secondary); font-size: var(--content-label-size); line-height: 1.35; }
  .profile-content-editor__fields label > span { display: flex; justify-content: space-between; gap: .5rem; color: inherit; }
  .profile-content-editor__fields output { color: var(--content-text-faint); font: .72rem/1 var(--content-font-mono); white-space: nowrap; }
  .profile-content-editor__fields :is(input, textarea) { width: 100%; min-width: 0; min-height: var(--content-primary-height); box-sizing: border-box; padding: .5rem .65rem; border: 1px solid var(--content-border-strong); border-radius: var(--content-radius); outline: 0; background: var(--content-surface-raised); color: var(--content-text); font: 500 var(--content-control-size) / 1.35 var(--content-font-body); transition: border-color .15s ease, box-shadow .15s ease; }
  .profile-content-editor__fields textarea { min-height: 5rem; resize: vertical; }
  .profile-content-editor__fields :is(input, textarea)::placeholder { color: var(--content-text-faint); }
  .profile-content-editor__fields :is(input, textarea):focus-visible { border-color: var(--content-focus); outline: 2px solid var(--content-focus); outline-offset: 2px; box-shadow: 0 0 0 2px color-mix(in srgb, var(--content-focus) 24%, transparent); }
  .profile-content-editor__switch { display: inline-flex; align-items: center; gap: .4rem; color: var(--content-text-secondary); font-size: var(--content-label-size); cursor: pointer; }
  .profile-content-editor__switch input { accent-color: var(--content-neutral); }
  .profile-content-editor__text-button, .profile-content-editor__remove { min-height: var(--content-secondary-height); padding: .5rem .7rem; border: 1px solid var(--content-border-strong); border-radius: var(--content-radius); background: transparent; font: 600 var(--content-label-size) / 1 var(--content-font-body); cursor: pointer; }
  .profile-content-editor__text-button { border-color: var(--content-add); background: color-mix(in srgb, var(--content-add) 10%, transparent); color: var(--content-add); }
  .profile-content-editor__text-button:hover:not(:disabled) { border-color: var(--content-add); background: color-mix(in srgb, var(--content-add) 18%, transparent); }
  .profile-content-editor__remove { justify-self: start; color: var(--content-danger); }
  .profile-content-editor__remove:hover { border-color: var(--content-danger); background: color-mix(in srgb, var(--content-danger) 12%, transparent); }
  .profile-content-editor__text-button:focus-visible, .profile-content-editor__remove:focus-visible { outline: 2px solid var(--content-focus); outline-offset: 2px; }
  .profile-content-editor__text-button:disabled { cursor: not-allowed; opacity: .45; }
  .profile-content-editor__projects { display: grid; gap: .65rem; }
  .profile-content-editor__project { display: grid; gap: .65rem; min-width: 0; padding: .7rem; border: 1px solid color-mix(in srgb, var(--content-border) 72%, transparent); border-radius: var(--content-radius); background: color-mix(in srgb, var(--content-surface-inset) 56%, transparent); }
  .profile-content-editor__project--empty { border-style: dashed; border-color: color-mix(in srgb, var(--content-add) 42%, var(--content-border)); }
  .profile-content-editor__project-heading strong { color: var(--content-text); font-size: var(--content-heading-size); line-height: 1.25; }
  .profile-content-editor__placeholder-hint { margin: 0; color: var(--content-text-muted); font-size: .76rem; line-height: 1.45; }
  .profile-content-editor__message { margin: 0; color: var(--content-text-muted); font-size: .78rem; line-height: 1.45; }
  .profile-content-editor__message[role="status"] { color: var(--content-neutral); }
  .profile-content-editor__message[role="alert"] { color: var(--content-danger); }
  .profile-content-editor__hint { margin: 0; color: var(--content-text-muted); font-size: .76rem; line-height: 1.45; }
  @media (max-width: 34rem) { .profile-content-editor__header, .profile-content-editor__panel-heading, .profile-content-editor__project-heading { align-items: stretch; flex-direction: column; } }
</style>
