export const PROFILE_CONTENT_VERSION = 1;
export const PROFILE_CONTENT_LIMITS = Object.freeze({
  aboutHeading: 40,
  aboutBody: 600,
  projects: 4,
  projectTitle: 60,
  projectDescription: 180,
  projectUrl: 2048
});

const HTTPS_URL_PATTERN = /^https:\/\/[^\s<>"']+$/;

function safeBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeText(value, maximum, { allowLines = false } = {}) {
  let text = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!allowLines) text = text.replace(/[\n\t]/g, ' ');
  text = [...text].filter(character => {
    const code = character.codePointAt(0);
    return code >= 32 || (allowLines && code === 10) || (allowLines && code === 9);
  }).join('');
  return text.trim().slice(0, maximum);
}

function safeUrl(value) {
  const url = String(value ?? '').trim().slice(0, PROFILE_CONTENT_LIMITS.projectUrl);
  return !url || HTTPS_URL_PATTERN.test(url) ? url : '';
}

function normalizeProject(value, fallbackOrder) {
  const input = value && typeof value === 'object' ? value : {};
  const order = Number.isInteger(Number(input.order)) ? Number(input.order) : fallbackOrder;
  return {
    title: safeText(input.title, PROFILE_CONTENT_LIMITS.projectTitle),
    description: safeText(input.description, PROFILE_CONTENT_LIMITS.projectDescription),
    url: safeUrl(input.url),
    visible: safeBoolean(input.visible),
    order: Math.min(PROFILE_CONTENT_LIMITS.projects - 1, Math.max(0, order))
  };
}

export function createDefaultProfileContent() {
  return {
    version: PROFILE_CONTENT_VERSION,
    about: { visible: true, heading: 'About', body: '' },
    projects: []
  };
}

export function normalizeProfileContent(value) {
  const fallback = createDefaultProfileContent();
  if (!value || typeof value !== 'object' || Number(value.version || 1) !== PROFILE_CONTENT_VERSION) return fallback;
  const about = value.about && typeof value.about === 'object' ? value.about : {};
  const projects = Array.isArray(value.projects)
    ? value.projects.slice(0, PROFILE_CONTENT_LIMITS.projects).map(normalizeProject)
    : [];
  return {
    version: PROFILE_CONTENT_VERSION,
    about: {
      visible: safeBoolean(about.visible),
      heading: safeText(about.heading || fallback.about.heading, PROFILE_CONTENT_LIMITS.aboutHeading),
      body: safeText(about.body, PROFILE_CONTENT_LIMITS.aboutBody, { allowLines: true })
    },
    projects: projects.sort((left, right) => left.order - right.order)
  };
}

export function getVisibleProfileContent(value) {
  const content = normalizeProfileContent(value);
  const about = content.about.visible && (content.about.heading || content.about.body)
    ? content.about
    : null;
  const projects = content.projects.filter(project => project.visible && project.title && project.url && HTTPS_URL_PATTERN.test(project.url));
  return { about, projects };
}

export function hasVisibleProfileContent(value) {
  const visible = getVisibleProfileContent(value);
  return Boolean(visible.about || visible.projects.length);
}
