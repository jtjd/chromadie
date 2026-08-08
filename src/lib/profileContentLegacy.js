// The public profile only needs the compact V1 renderer contract plus the
// already-sanitized V2 AST produced by profileConfigurationV2.js. Keeping the
// Markdown parser in profileContent.js leaves the optional editor path lazy.
export const PROFILE_CONTENT_VERSION = 1;
export const PROFILE_CONTENT_MARKDOWN_VERSION = 2;
export const PROFILE_CONTENT_LIMITS = Object.freeze({
  aboutHeading: 40,
  aboutBody: 600,
  aboutMarkdown: 1200,
  projects: 4,
  premiumProjects: 10,
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

/** @param {any} value @param {number} fallbackOrder @param {number} [maximumProjects] */
function normalizeProject(value, fallbackOrder, maximumProjects = PROFILE_CONTENT_LIMITS.projects) {
  const input = value && typeof value === 'object' ? value : {};
  const order = Number.isInteger(Number(input.order)) ? Number(input.order) : fallbackOrder;
  return {
    title: safeText(input.title, PROFILE_CONTENT_LIMITS.projectTitle),
    description: safeText(input.description, PROFILE_CONTENT_LIMITS.projectDescription),
    url: safeUrl(input.url),
    visible: safeBoolean(input.visible),
    order: Math.min(Math.max(0, maximumProjects - 1), Math.max(0, order))
  };
}

function normalizeInlineNodes(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 80).map(node => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'text') return { type: 'text', value: safeText(node.value, 600, { allowLines: true }) };
    if (node.type === 'code') return { type: 'code', value: safeText(node.value, 240) };
    if (node.type === 'strong' || node.type === 'emphasis') {
      const child = normalizeInlineNodes(node.children)[0];
      return child ? { type: node.type, children: [child] } : null;
    }
    if (node.type === 'link' && safeUrl(node.url)) {
      return { type: 'link', label: safeText(node.label, 80), url: safeUrl(node.url) };
    }
    return null;
  }).filter(Boolean);
}

function normalizeMarkdownAst(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map(block => {
    if (!block || typeof block !== 'object') return null;
    if (block.type === 'paragraph') return { type: 'paragraph', children: normalizeInlineNodes(block.children) };
    if (block.type === 'list') return {
      type: 'list',
      ordered: block.ordered === true,
      items: Array.isArray(block.items)
        ? block.items.slice(0, 20).map(item => ({ children: normalizeInlineNodes(item?.children) }))
        : []
    };
    if (block.type === 'code') return { type: 'code', value: safeText(block.value, 600), language: safeText(block.language, 20) };
    return null;
  }).filter(Boolean);
}

export function createDefaultProfileContent() {
  return {
    version: PROFILE_CONTENT_VERSION,
    about: { visible: true, heading: 'About', body: '' },
    projects: []
  };
}

function normalizeMarkdownContent(value) {
  const aboutInput = value.about && typeof value.about === 'object' ? value.about : {};
  const projects = Array.isArray(value.projects)
    ? value.projects.slice(0, PROFILE_CONTENT_LIMITS.premiumProjects).map((project, index) => normalizeProject(project, index, PROFILE_CONTENT_LIMITS.premiumProjects))
    : [];
  return {
    version: PROFILE_CONTENT_MARKDOWN_VERSION,
    about: {
      visible: safeBoolean(aboutInput.visible),
      heading: safeText(aboutInput.heading || 'About', PROFILE_CONTENT_LIMITS.aboutHeading),
      markdown: safeText(aboutInput.markdown ?? aboutInput.body, PROFILE_CONTENT_LIMITS.aboutMarkdown, { allowLines: true }),
      ast: normalizeMarkdownAst(aboutInput.ast)
    },
    projects: projects.sort((left, right) => left.order - right.order)
  };
}

export function normalizeProfileContent(value) {
  const fallback = createDefaultProfileContent();
  if (!value || typeof value !== 'object') return fallback;
  if (Number(value.version || 1) === PROFILE_CONTENT_MARKDOWN_VERSION) return normalizeMarkdownContent(value);
  if (Number(value.version || 1) !== PROFILE_CONTENT_VERSION) return fallback;
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
  const about = content.about.visible && (content.about.heading || content.about.body || content.about.markdown)
    ? content.about
    : null;
  const projects = content.projects.filter(project => project.visible && project.title && project.url && HTTPS_URL_PATTERN.test(project.url));
  return { about, projects };
}

export function hasVisibleProfileContent(value) {
  const visible = getVisibleProfileContent(value);
  return Boolean(visible.about || visible.projects.length);
}
