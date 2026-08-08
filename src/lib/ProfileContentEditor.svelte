<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { normalizeProfileContent, PROFILE_CONTENT_LIMITS } from './profileContent.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;
  export let updatedAt = null;

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-content-editor';

  let draft = normalizeDraft(draftConfig || publishedConfig);
  let baseline = draft;
  let serverUpdatedAt = updatedAt;
  let saving = false;
  let status = '';
  let error = '';
  let conflict = null;
  let lastIncomingKey = '';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDraft(value) {
    const config = normalizeProfileConfig(value || draftConfig || publishedConfig);
    return { ...config, content: normalizeProfileContent(config.content) };
  }

  function contentPatch(value = draft) {
    return {
      about: clone(value.content?.about || {}),
      projects: (value.content?.projects || [])
        .filter(project => project.title || project.description || project.url)
        .map((project, index) => ({ ...clone(project), order: index }))
    };
  }

  $: isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  $: hasUnpublishedChanges = JSON.stringify(contentPatch(draft)) !== JSON.stringify(contentPatch(normalizeDraft(publishedConfig)));
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !saving && !isDirty) syncIncoming();

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    const cached = profileId ? readViewState(VIEW_STATE_NAMESPACE, profileId) : null;
    draft = normalizeDraft(cached?.draft || draftConfig || publishedConfig);
    baseline = normalizeDraft(draftConfig || publishedConfig);
    serverUpdatedAt = updatedAt || null;
    conflict = null;
    error = '';
    status = cached?.draft ? 'Unsaved content restored.' : '';
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : isDirty });
  }

  function updateContent(next) {
    draft = normalizeDraft({ ...draft, content: { ...draft.content, ...next } });
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileId, { draft });
    status = '';
    error = '';
    conflict = null;
    emitDirty(true);
    dispatch('configpreview', { config: draft });
  }

  function updateAbout(field, value) {
    updateContent({ about: { ...draft.content.about, [field]: value } });
  }

  function addProject() {
    if (draft.content.projects.length >= PROFILE_CONTENT_LIMITS.projects) {
      error = `You can add up to ${PROFILE_CONTENT_LIMITS.projects} projects.`;
      return;
    }
    updateContent({ projects: [...draft.content.projects, { title: '', description: '', url: '', visible: true, order: draft.content.projects.length }] });
  }

  function updateProject(index, field, value) {
    updateContent({ projects: draft.content.projects.map((project, projectIndex) => projectIndex === index ? { ...project, [field]: value } : project) });
  }

  function removeProject(index) {
    updateContent({ projects: draft.content.projects.filter((_, projectIndex) => projectIndex !== index) });
  }

  function validateContent() {
    const invalid = draft.content.projects.find(project => {
      const hasInput = project.title || project.description || project.url;
      return hasInput && (!project.title || !/^https:\/\/[^\s<>"']+$/.test(String(project.url || '').trim()));
    });
    if (!invalid) return true;
    error = 'Complete each project with a title and HTTPS URL, or remove it.';
    status = '';
    return false;
  }

  async function persist(action) {
    if (saving || (action === 'save' && !isDirty) || (action === 'publish' && !isDirty && !hasUnpublishedChanges)) return;
    if (!validateContent()) return;
    saving = true;
    status = action === 'publish' ? 'Publishing…' : 'Saving…';
    error = '';
    const rpc = action === 'publish' ? 'publish_profile_configuration_section' : 'save_profile_configuration_section';
    const { data, error: rpcError } = await supabase.rpc(rpc, {
      p_section: 'content',
      p_patch: contentPatch(),
      p_expected_updated_at: serverUpdatedAt || null
    });
    saving = false;
    if (rpcError || data?.success === false || data?.code === 'conflict') {
      if (data?.code === 'conflict') {
        conflict = { draft: data.draft, published: data.published, updatedAt: data.updated_at };
        error = 'The server version changed. Reload it before saving.';
      } else {
        error = rpcError?.message || data?.error || 'The profile content could not be saved.';
      }
      status = '';
      emitDirty();
      return;
    }
    const nextDraft = normalizeDraft(data?.draft || draft);
    const nextPublished = normalizeDraft(data?.published || publishedConfig || baseline);
    draft = nextDraft;
    baseline = action === 'publish' ? nextDraft : normalizeDraft(data?.draft || draft);
    serverUpdatedAt = data?.updated_at || serverUpdatedAt;
    conflict = null;
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    status = action === 'publish' ? 'Published' : 'Draft saved';
    dispatch(action === 'publish' ? 'configpublished' : 'configsaved', {
      draft: nextDraft,
      published: nextPublished,
      updatedAt: serverUpdatedAt,
      publishedAt: data?.published_at || null
    });
    dispatch('configpreview', { config: nextDraft });
    emitDirty(false);
  }

  function resetChanges() {
    draft = clone(baseline);
    conflict = null;
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  function reloadServerVersion() {
    if (!conflict?.draft) return;
    const serverVersion = conflict;
    draft = normalizeDraft(serverVersion.draft);
    baseline = draft;
    serverUpdatedAt = serverVersion.updatedAt || serverUpdatedAt;
    conflict = null;
    error = '';
    status = 'Server version loaded';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configreloaded', { draft, published: serverVersion.published || publishedConfig, updatedAt: serverUpdatedAt });
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }
</script>

<section class="profile-content-editor" aria-labelledby="profile-content-title">
  <header class="profile-content-editor__header">
    <div><h2 id="profile-content-title">About & projects</h2><p>Tell visitors what matters to you with plain text and a few focused links.</p></div>
    <span class="profile-content-editor__version">Up to {PROFILE_CONTENT_LIMITS.projects} projects</span>
  </header>

  <section class="profile-content-editor__panel" aria-labelledby="profile-content-about-title">
    <div class="profile-content-editor__panel-heading"><h3 id="profile-content-about-title">About</h3><label class="profile-content-editor__switch"><input type="checkbox" checked={draft.content.about.visible} on:change={event => updateAbout('visible', event.currentTarget.checked)} /><span>Visible</span></label></div>
    <div class="profile-content-editor__fields">
      <label><span>Heading</span><input value={draft.content.about.heading} maxlength={PROFILE_CONTENT_LIMITS.aboutHeading} on:input={event => updateAbout('heading', event.currentTarget.value)} /></label>
      <label><span>Short introduction <output>{draft.content.about.body.length}/{PROFILE_CONTENT_LIMITS.aboutBody}</output></span><textarea rows="5" maxlength={PROFILE_CONTENT_LIMITS.aboutBody} placeholder="A short note about your work, interests, or current chapter." on:input={event => updateAbout('body', event.currentTarget.value)}>{draft.content.about.body}</textarea></label>
    </div>
    <p class="profile-content-editor__helper">Plain text only. Line breaks are preserved; markup and scripts are never accepted.</p>
  </section>

  <section class="profile-content-editor__panel" aria-labelledby="profile-content-projects-title">
    <div class="profile-content-editor__panel-heading"><div><h3 id="profile-content-projects-title">Projects</h3><p>Show the places, work, or communities you want people to explore.</p></div><button type="button" class="profile-content-editor__text-button" on:click={addProject} disabled={draft.content.projects.length >= PROFILE_CONTENT_LIMITS.projects}>Add project</button></div>
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
      <p class="profile-content-editor__empty">No projects added yet.</p>
    {/if}
    <p class="profile-content-editor__helper">Projects require a title and HTTPS URL to appear publicly. Empty rows can be removed before saving.</p>
  </section>

  {#if conflict}<div class="profile-content-editor__conflict" role="alert"><span>{error}</span><button type="button" on:click={reloadServerVersion}>Reload server version</button></div>{:else if error}<p class="profile-content-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-content-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <footer class="profile-content-editor__actions"><button type="button" on:click={resetChanges} disabled={!isDirty || saving}>Reset</button><button type="button" on:click={() => persist('save')} disabled={!isDirty || saving}>Save draft</button><button type="button" class="profile-content-editor__publish" on:click={() => persist('publish')} disabled={saving || (!isDirty && !hasUnpublishedChanges)}>{saving ? 'Publishing…' : 'Publish'}</button></footer>
</section>

<style>
  .profile-content-editor { display: grid; gap: 1rem; }
  .profile-content-editor__header, .profile-content-editor__panel-heading, .profile-content-editor__actions, .profile-content-editor__project-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-content-editor__header h2, .profile-content-editor__panel h3 { margin: 0; color: var(--site-ink, #f2f0eb); letter-spacing: -.02em; }
  .profile-content-editor__header h2 { font-size: 1.05rem; }
  .profile-content-editor__header p, .profile-content-editor__panel-heading p, .profile-content-editor__helper, .profile-content-editor__empty { margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .72rem; line-height: 1.5; }
  .profile-content-editor__version { color: var(--site-faint, #7d7e87); font: .62rem/1 var(--site-mono, monospace); }
  .profile-content-editor__panel { padding: clamp(1rem, 2vw, 1.4rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .profile-content-editor__panel-heading { align-items: flex-start; margin-bottom: 1rem; }
  .profile-content-editor__panel-heading h3 { font-size: .95rem; }
  .profile-content-editor__fields { display: grid; gap: .85rem; }
  .profile-content-editor__fields label { display: grid; gap: .42rem; min-width: 0; }
  .profile-content-editor__fields label > span { display: flex; justify-content: space-between; gap: .5rem; color: var(--site-muted, #aaa8b0); font-size: .68rem; }
  .profile-content-editor__fields output { color: var(--site-faint, #7d7e87); font: .62rem/1 var(--site-mono, monospace); }
  .profile-content-editor__fields :is(input, textarea) { width: 100%; min-width: 0; box-sizing: border-box; padding: .65rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; outline: 0; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); font: .75rem/1.45 var(--site-body, inherit); }
  .profile-content-editor__fields textarea { resize: vertical; }
  .profile-content-editor__fields :is(input, textarea):focus { border-color: var(--site-accent, #cdd2ff); box-shadow: 0 0 0 2px color-mix(in srgb, var(--site-accent, #cdd2ff) 18%, transparent); }
  .profile-content-editor__switch { display: inline-flex; align-items: center; gap: .45rem; color: var(--site-muted, #aaa8b0); font-size: .68rem; cursor: pointer; }
  .profile-content-editor__switch input { accent-color: var(--site-accent, #cdd2ff); }
  .profile-content-editor__text-button, .profile-content-editor__remove { min-height: 2rem; padding: .45rem .65rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-content-editor__text-button:hover:not(:disabled), .profile-content-editor__remove:hover { border-color: var(--site-accent, #cdd2ff); }
  .profile-content-editor__text-button:disabled, .profile-content-editor__actions button:disabled { cursor: not-allowed; opacity: .42; }
  .profile-content-editor__projects { display: grid; gap: .8rem; }
  .profile-content-editor__project { display: grid; gap: .8rem; padding: .9rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .45rem; background: color-mix(in srgb, var(--site-deep, #090a0d) 60%, transparent); }
  .profile-content-editor__project-heading strong { color: var(--site-ink, #f2f0eb); font-size: .78rem; }
  .profile-content-editor__remove { justify-self: start; color: var(--site-muted, #aaa8b0); }
  .profile-content-editor__message { margin: 0; color: var(--site-muted, #aaa8b0); font-size: .72rem; }
  .profile-content-editor__message[role="alert"] { color: #ffb4bd; }
  .profile-content-editor__conflict { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .7rem; border: 1px solid rgba(255,157,169,.4); border-radius: .35rem; color: #ffb4bd; font-size: .7rem; }
  .profile-content-editor__conflict button { border: 1px solid rgba(255,157,169,.5); border-radius: .3rem; padding: .4rem .55rem; background: transparent; color: inherit; cursor: pointer; }
  .profile-content-editor__actions { position: sticky; bottom: .8rem; z-index: 4; min-height: 3.2rem; padding: .55rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: rgba(17,19,25,.92); box-shadow: 0 1rem 2rem rgba(0,0,0,.18); backdrop-filter: blur(16px); }
  .profile-content-editor__actions button { min-height: 2rem; padding: .45rem .75rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-content-editor__publish { border-color: var(--site-accent, #cdd2ff) !important; background: var(--site-accent, #cdd2ff) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  @media (max-width: 34rem) { .profile-content-editor__header, .profile-content-editor__panel-heading, .profile-content-editor__actions, .profile-content-editor__project-heading { align-items: stretch; flex-direction: column; } .profile-content-editor__actions { justify-content: stretch; } .profile-content-editor__actions button { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .profile-content-editor__actions { scroll-behavior: auto; } }
</style>
