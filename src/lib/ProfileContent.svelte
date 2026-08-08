<script>
  import { getVisibleProfileContent } from './profileContentLegacy.js';
  import ProfileRichText from './ProfileRichText.svelte';

  export let content = null;

  $: visible = getVisibleProfileContent(content);
  $: hasContent = Boolean(visible.about || visible.projects.length);
</script>

{#if hasContent}
  <section class="profile-content" aria-labelledby="profile-content-heading">
    {#if visible.about}
      <div class="profile-content__about">
        <p class="profile-content__eyebrow">About</p>
        <h2 id="profile-content-heading">{visible.about.heading}</h2>
        {#if visible.about.version === 2 || visible.about.ast}
          <ProfileRichText ast={visible.about.ast || []} />
        {:else if visible.about.body}<p class="profile-content__body">{visible.about.body}</p>{/if}
      </div>
    {/if}
    {#if visible.projects.length}
      <div class="profile-content__projects" aria-labelledby="profile-content-projects-heading">
        <p class="profile-content__eyebrow" id="profile-content-projects-heading">Projects</p>
        <div class="profile-content__project-list">
          {#each visible.projects as project (project.order)}
            <a class="profile-content__project" href={project.url} target="_blank" rel="noopener noreferrer">
              <span>
                <strong>{project.title}</strong>
                {#if project.description}<span>{project.description}</span>{/if}
              </span>
              <span class="profile-content__arrow" aria-hidden="true">↗</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .profile-content { display: grid; gap: clamp(1.3rem, 3vw, 2.2rem); min-width: 0; padding-top: clamp(1.3rem, 3vw, 2.2rem); border-top: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 22%, transparent); }
  .profile-content__about, .profile-content__projects { min-width: 0; }
  .profile-content__eyebrow { margin: 0 0 .45rem; color: color-mix(in srgb, var(--profile-accent, #cdd2ff) 78%, white); font: 700 .62rem / 1.2 var(--font-mono-stack, monospace); letter-spacing: .14em; text-transform: uppercase; }
  .profile-content h2 { margin: 0; color: var(--color-ink-strong, #f1f6ff); font: 600 clamp(1.05rem, 2vw, 1.35rem) / 1.15 var(--font-display-stack, sans-serif); letter-spacing: -.025em; }
  .profile-content__body { max-width: 48rem; margin: .7rem 0 0; color: var(--color-ink-muted, rgba(220,230,248,.72)); font-size: .9rem; line-height: 1.65; white-space: pre-line; }
  .profile-content__projects { display: grid; gap: .7rem; }
  .profile-content__project-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .profile-content__project { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; min-width: 0; padding: .8rem .85rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 18%, transparent); border-radius: .55rem; background: color-mix(in srgb, var(--profile-surface, #11141b) 72%, transparent); color: inherit; text-decoration: none; transition: border-color .18s ease, transform .18s ease; }
  .profile-content__project:hover, .profile-content__project:focus-visible { border-color: color-mix(in srgb, var(--profile-accent, #cdd2ff) 58%, transparent); transform: translateY(-1px); }
  .profile-content__project > span:first-child { display: grid; gap: .25rem; min-width: 0; }
  .profile-content__project strong { overflow: hidden; color: var(--color-ink-strong, #f1f6ff); font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
  .profile-content__project > span:first-child > span { overflow: hidden; color: var(--color-ink-muted, rgba(220,230,248,.68)); font-size: .7rem; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
  .profile-content__arrow { flex: 0 0 auto; color: var(--profile-accent, #cdd2ff); font-size: .9rem; }
  @media (max-width: 38rem) { .profile-content__project-list { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) { .profile-content__project { transition: none; } .profile-content__project:hover, .profile-content__project:focus-visible { transform: none; } }
</style>
