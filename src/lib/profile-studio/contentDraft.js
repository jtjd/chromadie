import { normalizeProfileConfig } from '../profileConfig.js';
import { normalizeProfileContent, PROFILE_CONTENT_LIMITS } from '../profileContent.js';

export function normalizeProfileContentDraft(value, draftConfig, publishedConfig) {
  const config = normalizeProfileConfig(value || draftConfig || publishedConfig);
  return { ...config, content: normalizeProfileContent(config.content) };
}

export function updateProfileContentDraft(draft, next, draftConfig, publishedConfig) {
  const content = { ...draft.content, ...next };
  const nextDraft = normalizeProfileContentDraft({ ...draft, content }, draftConfig, publishedConfig);

  // The public projection rejects incomplete URLs; retain bounded input while
  // the owner is editing, then let publish validation enforce HTTPS.
  nextDraft.content.projects = nextDraft.content.projects.map((project, index) => ({
    ...project,
    title: String(content.projects[index]?.title || '').slice(0, PROFILE_CONTENT_LIMITS.projectTitle),
    description: String(content.projects[index]?.description || '').slice(0, PROFILE_CONTENT_LIMITS.projectDescription),
    url: String(content.projects[index]?.url || '').slice(0, PROFILE_CONTENT_LIMITS.projectUrl)
  }));

  return nextDraft;
}
