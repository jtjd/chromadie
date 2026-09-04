import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PROFILE_CONFIGURATION_V2_LIMITS,
  normalizeProfileConfigurationV2,
  upgradeProfileConfigurationV1
} from '../src/lib/profileConfigurationV2.js';
import {
  normalizeProfileIdentityPresentation,
  profileIdentityMetadata,
  PROFILE_IDENTITY_ENTRY_ANIMATION_LABELS
} from '../src/lib/profileIdentityPresentation.js';
import { normalizeProfileMetadata } from '../src/lib/profileMetadata.js';
import {
  getProfileWidgetKind,
  normalizeProfileWidgets,
  parseProfileWidgetUrl
} from '../src/lib/profileWidgets.js';
import { normalizeProfileContent } from '../src/lib/profileContent.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const spotifyId = '1234567890123456789012';
const youtubeId = 'dQw4w9WgXcQ';

test('V1 profiles upgrade into a bounded V2 envelope without losing the opening contract', () => {
  const v1 = {
    version: 1,
    signatureColor: '#AABBCC',
    modules: [
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'stats', visible: true, order: 1, size: 'wide' },
      { id: 'signature', visible: true, order: 2, size: 'medium' },
      { id: 'links', visible: true, order: 3, size: 'medium' },
      { id: 'recent', visible: true, order: 4, size: 'medium' },
      { id: 'achievements', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ],
    links: [{ label: 'Home', type: 'website', url: 'https://chromadie.com', visible: true, order: 0 }]
  };
  const upgraded = upgradeProfileConfigurationV1(v1);

  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.base.version, 1);
  assert.deepEqual(upgraded.links.map(link => link.label), ['Home']);
  assert.equal(upgraded.base.links.length, 1);
  assert.equal(upgraded.identity.showAvatar, true);
  assert.equal(upgraded.metadata.embedColor, '#CDD2FF');

  const expanded = normalizeProfileConfigurationV2({
    ...upgraded,
    links: Array.from({ length: 30 }, (_, index) => ({
      key: `link-${index}`,
      label: `Link ${index}`,
      type: 'website',
      url: `https://example.com/${index}`,
      order: index,
      visible: true
    }))
  });
  assert.equal(expanded.links.length, PROFILE_CONFIGURATION_V2_LIMITS.maxLinks);
  assert.equal(expanded.links.length, 6);
  assert.deepEqual(expanded.links.map(link => link.label), ['Link 0', 'Link 1', 'Link 2', 'Link 3', 'Link 4', 'Link 5']);
  assert.equal(expanded.base.links.length, 6);
  assert.equal(new Set(expanded.links.map(link => link.key)).size, expanded.links.length);
  assert.match(expanded.links[0].key, /^[a-z0-9][a-z0-9_-]{0,31}$/);
});

test('V2 profile reads preserve dedicated expression media at either response level', () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const base = upgradeProfileConfigurationV1({
    version: 1,
    avatar_path: avatarPath,
    signatureColor: '#AABBCC',
    modules: [
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'stats', visible: true, order: 1, size: 'wide' },
      { id: 'signature', visible: true, order: 2, size: 'medium' },
      { id: 'links', visible: true, order: 3, size: 'medium' },
      { id: 'recent', visible: true, order: 4, size: 'medium' },
      { id: 'achievements', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ]
  });
  const envelopeOnly = normalizeProfileConfigurationV2({
    ...base,
    base: { ...base.base, avatar_path: null },
    avatar_path: avatarPath
  });
  assert.equal(envelopeOnly.base.avatar_path, avatarPath);
});

test('identity and metadata controls are finite, sanitized, and media-path scoped', () => {
  const identity = normalizeProfileIdentityPresentation({
    location: 'Brooklyn\u0000, NY',
    timezone: 'America/New_York',
    showJoinDate: true,
    showAvatar: false,
    descriptionMode: 'typewriter',
    entryAnimation: 'focus'
  });
  assert.equal(identity.location, 'Brooklyn, NY');
  assert.equal(identity.timezone, 'America/New_York');
  assert.equal(identity.showJoinDate, true);
  assert.equal(identity.showAvatar, false);
  assert.equal(profileIdentityMetadata(identity).hasTimezone, true);
  assert.equal(normalizeProfileIdentityPresentation({ timezone: 'javascript:alert(1)' }).timezone, '');
  assert.equal(normalizeProfileIdentityPresentation({ entryAnimation: 'pop' }).entryAnimation, 'pop');
  assert.equal(normalizeProfileIdentityPresentation({ entryAnimation: 'unfold' }).entryAnimation, 'unfold');
  assert.equal(PROFILE_IDENTITY_ENTRY_ANIMATION_LABELS.pop, 'Bounce In');
  assert.equal(PROFILE_IDENTITY_ENTRY_ANIMATION_LABELS.unfold, 'Fold In');

  const userId = '11111111-1111-4111-8111-111111111111';
  const assetId = '22222222-2222-4222-8222-222222222222';
  const metadata = normalizeProfileMetadata({
    title: 'My profile\u0000',
    description: 'A safe description',
    embedColor: '#aabbcc',
    faviconPath: `profile_media/${userId}/${assetId}.webp`,
    bannerPath: 'https://evil.example/banner.webp'
  });
  assert.equal(metadata.title, 'My profile');
  assert.equal(metadata.embedColor, '#AABBCC');
  assert.equal(metadata.faviconPath, `profile_media/${userId}/${assetId}.webp`);
  assert.equal(metadata.bannerPath, null);
});

test('safe Markdown becomes a small AST and never accepts unsafe links or markup', () => {
  const content = normalizeProfileContent({
    version: 2,
    about: {
      visible: true,
      heading: 'Notes',
      markdown: 'Hello **bold** and *soft*.\n\n- One\n- Two\n\n`code` [safe](https://chromadie.com) [unsafe](javascript:alert(1)) <script>alert(1)</script>'
    },
    projects: Array.from({ length: 12 }, (_, index) => ({
      title: `Project ${index}`,
      url: `https://example.com/${index}`,
      visible: true,
      order: index
    }))
  });

  assert.equal(content.version, 2);
  assert.equal(content.about.markdown.includes('<script>'), false);
  assert.equal(content.projects.length, 10);
  assert.equal(content.about.ast.some(block => block.type === 'list'), true);
  const serialized = JSON.stringify(content.about.ast);
  assert.match(serialized, /https:\/\/chromadie\.com/);
  assert.doesNotMatch(serialized, /javascript:/i);
  assert.doesNotMatch(serialized, /<script|innerHTML/i);
});

test('expanded provider cards remain allowlisted and capacity-limited', () => {
  assert.deepEqual(parseProfileWidgetUrl('github', 'https://github.com/chromadie'), { type: 'user', id: 'chromadie' });
  assert.deepEqual(parseProfileWidgetUrl('twitch', 'https://www.twitch.tv/chromadie'), { type: 'channel', id: 'chromadie' });
  assert.deepEqual(parseProfileWidgetUrl('lastfm', 'https://www.last.fm/user/chromadie'), { type: 'user', id: 'chromadie' });
  assert.deepEqual(parseProfileWidgetUrl('discord', 'https://discord.gg/chromadie'), { type: 'server', id: 'chromadie' });
  assert.equal(parseProfileWidgetUrl('github', 'https://github.com/chromadie?tab=repositories'), null);
  assert.equal(getProfileWidgetKind('github'), 'card');

  const widgets = normalizeProfileWidgets([
    { provider: 'github', type: 'user', id: 'chromadie', order: 0 },
    { provider: 'twitch', type: 'channel', id: 'chromadie', order: 1 },
    { provider: 'lastfm', type: 'user', id: 'chromadie', order: 2 },
    { provider: 'discord', type: 'server', id: 'chromadie', order: 3 },
    { provider: 'youtube', type: 'video', id: youtubeId, order: 4 },
    { provider: 'spotify', type: 'track', id: spotifyId, order: 5 }
  ]);
  assert.deepEqual(widgets.map(widget => widget.provider), ['github', 'twitch', 'lastfm', 'discord']);
  assert.deepEqual(normalizeProfileWidgets(widgets, {}, { maxWidgets: 2 }).map(widget => widget.provider), ['github', 'twitch']);
});

test('V2 migration and share metadata preserve server authority and crawler-safe metadata', async () => {
  const [migration, expressionMigration, linksEditor, aliasesEditor, richText, page] = await Promise.all([
    read('supabase/migrations/20260808220000_profile_configuration_v2.sql'),
    read('supabase/migrations/20260811140000_profile_configuration_v2_expression_contract.sql'),
    read('src/lib/ProfileLinksEditor.svelte'),
    read('src/lib/ProfileAliasesEditor.svelte'),
    read('src/lib/ProfileRichText.svelte'),
    read('functions/_profilePage.js')
  ]);
  assert.match(migration, /draft_config_v2 jsonb/);
  assert.match(migration, /save_profile_configuration_v2/);
  assert.match(migration, /publish_profile_configuration_v2/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.save_profile_configuration_v2/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_profile_configuration_v2/);
  assert.match(migration, /profile_v2_normalize_links/);
  assert.match(migration, /profile_v2_normalize_metadata/);
  assert.match(migration, /v_project_limit integer := 4/);
  assert.match(migration, /profile_entitlements/);
  assert.match(migration, /v_widget_limit/);
  assert.match(expressionMigration, /profile_configuration_v2_with_expression/);
  assert.match(expressionMigration, /v_record.avatar_path/);
  assert.match(expressionMigration, /get_public_profile_configuration\(p_user_id\)/);
  assert.match(expressionMigration, /GRANT EXECUTE ON FUNCTION public\.get_public_profile_configuration_v2/);
  assert.match(linksEditor, /Structured preview metadata/);
  assert.match(linksEditor, /Share title/);
  assert.match(linksEditor, /Share description/);
  assert.match(aliasesEditor, /getProfileAliasPath/);
  assert.match(aliasesEditor, /Add alias/);
  assert.match(richText, /rel="noopener noreferrer"/);
  assert.doesNotMatch(richText, /innerHTML|{@html}|new Function|eval\s*\(/);
  assert.match(page, /normalizeProfileMetadata/);
  assert.match(page, /theme-color/);
  assert.match(page, /ogImage/);
  assert.match(page, /getPublicMediaUrl/);
});
