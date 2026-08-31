export const PROFILE_CONTENT_VERSION = 1;
export const PROFILE_CONTENT_MARKDOWN_VERSION = 2;
export const PROFILE_CONTENT_LIMITS = Object.freeze({
  aboutHeading: 40,
  aboutBody: 600,
  aboutMarkdown: 1200,
  projects: 10,
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

function stableProjectKey(value, fallbackOrder) {
  const candidate = String(value?.key || '').trim().toLowerCase();
  if (/^[a-z0-9][a-z0-9_-]{0,31}$/.test(candidate)) return candidate;
  const text = `${value?.title || ''}|${value?.url || ''}|${fallbackOrder}`;
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return `p${(hash >>> 0).toString(36)}`;
}

function stripRawMarkup(value) {
  return [...String(value ?? '').replace(/<[^>]*>/g, '')]
    .filter(character => {
      const code = character.codePointAt(0);
      return code >= 32 || code === 9 || code === 10;
    })
    .join('');
}

function stripUnsafeMarkdownLinks(value) {
  return String(value ?? '').replace(/\[([^\]\n]{1,80})\]\((?!https:\/\/)[^)\n]*\)/gi, '$1');
}

function pushText(nodes, text) {
  if (!text) return;
  nodes.push({ type: 'text', value: text });
}

function parseInlineMarkdown(value) {
  const source = stripRawMarkup(value);
  const nodes = [];
  let cursor = 0;
  const tokenPattern = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https:\/\/[^\s<>"]+)\))/g;
  let match;
  while ((match = tokenPattern.exec(source))) {
    pushText(nodes, source.slice(cursor, match.index));
    if (match[2]) nodes.push({ type: 'strong', children: [{ type: 'text', value: match[2] }] });
    else if (match[3]) nodes.push({ type: 'emphasis', children: [{ type: 'text', value: match[3] }] });
    else if (match[4]) nodes.push({ type: 'code', value: match[4] });
    else if (match[5] && safeUrl(match[6])) nodes.push({ type: 'link', label: match[5].slice(0, 80), url: safeUrl(match[6]) });
    else pushText(nodes, match[0]);
    cursor = match.index + match[0].length;
  }
  pushText(nodes, source.slice(cursor));
  return nodes;
}

/**
 * Parse the intentionally small Markdown subset used by V2 About text. The
 * output is an AST, never HTML. Unknown syntax is retained as text and every
 * URL is required to be HTTPS before it can become a link node.
 */
export function parseSafeMarkdown(value, maximum = PROFILE_CONTENT_LIMITS.aboutMarkdown) {
  const source = stripUnsafeMarkdownLinks(stripRawMarkup(value)).slice(0, maximum);
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInlineMarkdown(paragraph.join('\n')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', ordered: list[0].ordered, items: list.map(item => ({ children: parseInlineMarkdown(item.value) })) });
    list = [];
  };
  const flushCode = () => {
    if (code) blocks.push({ type: 'code', value: code.lines.join('\n').slice(0, 600), language: code.language });
    code = null;
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```\s*([a-z0-9_-]{0,20})\s*$/i);
    if (fence) {
      if (code) flushCode();
      else {
        flushParagraph();
        flushList();
        code = { language: fence[1] || '', lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const listMatch = line.match(/^\s*(?:([-*])|(\d+\.))\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const ordered = Boolean(listMatch[2]);
      if (list.length && list[0].ordered !== ordered) flushList();
      list.push({ ordered, value: listMatch[3] });
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushCode();
  flushParagraph();
  flushList();
  return blocks.slice(0, 40);
}

function normalizeMarkdownInlineNodes(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 80).map(node => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'text') return { type: 'text', value: stripRawMarkup(node.value).slice(0, 600) };
    if (node.type === 'strong' || node.type === 'emphasis') {
      const child = normalizeMarkdownInlineNodes(node.children)?.[0];
      return child ? { type: node.type, children: [child] } : null;
    }
    if (node.type === 'code') return { type: 'code', value: stripRawMarkup(node.value).slice(0, 240) };
    if (node.type === 'link' && safeUrl(node.url)) {
      return { type: 'link', label: stripRawMarkup(node.label).slice(0, 80), url: safeUrl(node.url) };
    }
    return null;
  }).filter(Boolean);
}

function normalizeMarkdownAst(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map(block => {
    if (!block || typeof block !== 'object') return null;
    if (block.type === 'paragraph') return { type: 'paragraph', children: normalizeMarkdownInlineNodes(block.children) };
    if (block.type === 'list') return {
      type: 'list',
      ordered: block.ordered === true,
      items: Array.isArray(block.items)
        ? block.items.slice(0, 20).map(item => ({ children: normalizeMarkdownInlineNodes(item?.children) }))
        : []
    };
    if (block.type === 'code') return { type: 'code', value: stripRawMarkup(block.value).slice(0, 600), language: stripRawMarkup(block.language).slice(0, 20) };
    return null;
  }).filter(Boolean);
}

function normalizeProject(value, fallbackOrder, maximumProjects) {
  const projectLimit = Number(maximumProjects) || Number(PROFILE_CONTENT_LIMITS.projects);
  const input = value && typeof value === 'object' ? value : {};
  const order = Number.isInteger(Number(input.order)) ? Number(input.order) : fallbackOrder;
  return {
    key: stableProjectKey(input, fallbackOrder),
    title: safeText(input.title, PROFILE_CONTENT_LIMITS.projectTitle),
    description: safeText(input.description, PROFILE_CONTENT_LIMITS.projectDescription),
    url: safeUrl(input.url),
    visible: safeBoolean(input.visible),
    order: Math.min(projectLimit - 1, Math.max(0, order))
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
  if (!value || typeof value !== 'object') return fallback;
  if (Number(value.version || 1) === PROFILE_CONTENT_MARKDOWN_VERSION) {
    const aboutInput = value.about && typeof value.about === 'object' ? value.about : {};
    const markdown = stripUnsafeMarkdownLinks(stripRawMarkup(safeText(aboutInput.markdown ?? aboutInput.body, PROFILE_CONTENT_LIMITS.aboutMarkdown, { allowLines: true })));
    const projects = Array.isArray(value.projects)
      ? value.projects.slice(0, PROFILE_CONTENT_LIMITS.premiumProjects).map((project, index) => normalizeProject(project, index, PROFILE_CONTENT_LIMITS.premiumProjects))
      : [];
    return {
      version: PROFILE_CONTENT_MARKDOWN_VERSION,
      about: {
        visible: safeBoolean(aboutInput.visible),
        heading: safeText(aboutInput.heading || fallback.about.heading, PROFILE_CONTENT_LIMITS.aboutHeading),
        markdown,
        ast: Array.isArray(aboutInput.ast) ? normalizeMarkdownAst(aboutInput.ast) : parseSafeMarkdown(markdown)
      },
      projects: projects.sort((left, right) => left.order - right.order)
    };
  }
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
  const about = content.about.visible && (content.about.heading || content.about.body)
    ? content.about
    : null;
  const markdownAbout = content.version === PROFILE_CONTENT_MARKDOWN_VERSION
    && content.about.visible
    && (content.about.heading || content.about.markdown)
    ? content.about
    : null;
  const projects = content.projects.filter(project => project.visible && project.title && project.url && HTTPS_URL_PATTERN.test(project.url));
  return { about: markdownAbout || about, projects };
}

export function hasVisibleProfileContent(value) {
  const visible = getVisibleProfileContent(value);
  return Boolean(visible.about || visible.projects.length);
}
