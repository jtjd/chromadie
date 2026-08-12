<script>
  import { getVisibleProfileContent } from './profileContentLegacy.js';
  import ProfileRichText from './ProfileRichText.svelte';

  export let content = null;
  /** @type {(entryKey: string) => void} */
  export let onEntryClick = () => {};

  $: visible = getVisibleProfileContent(content);
  $: hasAboutContent = Boolean(visible.about && (visible.about.body || visible.about.markdown || visible.about.ast?.length));
  $: hasContent = Boolean(hasAboutContent || visible.projects.length);
</script>

{#if hasContent}
  <section class="profile-content" aria-labelledby={hasAboutContent ? 'profile-content-heading' : 'profile-content-projects-heading'}>
    {#if hasAboutContent}
      <div class="profile-content__about">
        <h2 id="profile-content-heading">{visible.about.heading && visible.about.heading !== 'About' ? visible.about.heading : 'About me'}</h2>
        {#if visible.about.version === 2 || visible.about.ast}
          <ProfileRichText ast={visible.about.ast || []} onLinkClick={onEntryClick} />
        {:else if visible.about.body}<p class="profile-content__body">{visible.about.body}</p>{/if}
      </div>
    {/if}
    {#if visible.projects.length}
      <div class="profile-content__projects" aria-labelledby="profile-content-projects-heading">
        <h2 id="profile-content-projects-heading">Projects</h2>
        <div class="profile-content__project-list">
          {#each visible.projects as project (project.order)}
            <a class="profile-content__project" href={project.url} target="_blank" rel="noopener noreferrer" on:click={() => onEntryClick(project.key || `project-${project.order}`)}>
              <span>
                <strong>{project.title}</strong>
                {#if project.description}<span>{project.description}</span>{/if}
              </span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .profile-content { display: grid; gap: 1.15rem; min-width: 0; }
  .profile-content__about, .profile-content__projects { min-width: 0; padding: 1.1rem 1.15rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 18%, transparent); border-radius: .85rem; background: color-mix(in srgb, var(--profile-surface, #11141b) 74%, transparent); box-shadow: 0 .8rem 2rem rgba(0, 0, 0, .12); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .profile-content h2 { margin: 0; color: var(--color-ink-strong, #f1f6ff); font: 600 clamp(1.2rem, 2.5vw, 1.45rem) / 1.15 var(--font-display-stack, sans-serif); letter-spacing: -.025em; }
  .profile-content__body { max-width: 48rem; margin: .7rem 0 0; color: var(--color-ink-muted, rgba(220,230,248,.78)); font-size: .94rem; line-height: 1.65; white-space: pre-line; }
  .profile-content__projects { display: grid; gap: .8rem; }
  .profile-content__project-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
  .profile-content__project { display: flex; align-items: flex-start; min-width: 0; min-height: 5rem; padding: .9rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 18%, transparent); border-radius: .7rem; background: color-mix(in srgb, var(--profile-surface, #11141b) 52%, transparent); color: inherit; text-decoration: none; transition: border-color .18s ease, transform .18s ease, background-color .18s ease; }
  .profile-content__project:hover, .profile-content__project:focus-visible { border-color: color-mix(in srgb, var(--profile-accent, #cdd2ff) 58%, transparent); background: color-mix(in srgb, var(--profile-accent, #cdd2ff) 8%, transparent); transform: translateY(-1px); }
  .profile-content__project > span:first-child { display: grid; gap: .28rem; min-width: 0; }
  .profile-content__project strong { overflow: hidden; color: var(--color-ink-strong, #f1f6ff); font-size: .92rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-content__project > span:first-child > span { overflow: hidden; color: var(--color-ink-muted, rgba(220,230,248,.72)); font-size: .8rem; line-height: 1.45; text-overflow: ellipsis; }
  @media (max-width: 38rem) { .profile-content__project-list { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) { .profile-content__project { transition: none; } .profile-content__project:hover, .profile-content__project:focus-visible { transform: none; } }
</style>
