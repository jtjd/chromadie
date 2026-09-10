import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { normalizeProfileInsights } from '../src/lib/profileInsights.js';

const insightsSource = await readFile(new URL('../src/lib/ProfileInsights.svelte', import.meta.url), 'utf8');
function insightHarness(rpc) {
  const context = vm.createContext({
    supabase: { rpc },
    insights: { enabled: false, windowDays: 90, daily: [{ views: 12 }] },
    enabledDraft: true, publicViewsVisibleDraft: false,
    socialSettings: { profileViewsVisible: true },
    loading: false, saving: false, hasUnsavedPreference: true,
    windowDays: 90, preferencesLoaded: true,
    normalizeProfileInsights,
    getProfileInsightsError: result => result.error?.message || 'Failed',
    dispatch: () => {},
    Error
  });
  vm.runInContext(insightsSource.slice(insightsSource.indexOf('  async function loadInsights'), insightsSource.indexOf('  function formatNumber')), context);
  return context;
}

test('Changing insight window preserves an unsaved collection preference', async () => {
  const context = insightHarness(async () => ({ data: { enabled: false, windowDays: 7 } }));
  await context.chooseWindow(7);
  assert.equal(context.enabledDraft, true);
  assert.equal(context.insights.windowDays, 7);
});

test('Partial preference save retains confirmed state and the failed draft for retry', async () => {
  const calls = [];
  const context = insightHarness(async name => {
    calls.push(name);
    return name === 'update_my_profile_insights_settings'
      ? { data: { enabled: true, windowDays: 30 } }
      : { error: { message: 'Visibility unavailable' } };
  });
  await context.savePreference();
  assert.equal(context.insights.enabled, true);
  assert.equal(context.insights.windowDays, 90);
  assert.equal(context.insights.daily[0].views, 12);
  assert.equal(context.publicViewsVisibleDraft, false);
  assert.equal(context.saveError, 'Visibility unavailable');
  assert.equal(context.saving, false);
  await context.savePreference();
  assert.equal(calls.filter(name => name === 'update_my_profile_insights_settings').length, 1);
});

test('Thrown preference requests recover without leaving the form busy', async () => {
  const context = insightHarness(async () => { throw new Error('Offline'); });
  await context.savePreference();
  assert.equal(context.saving, false);
  assert.equal(context.saveError, 'Offline');
  assert.equal(context.enabledDraft, true);
});

test('Mark all read includes unread notifications outside the displayed page', async () => {
  const source = await readFile(new URL('../src/lib/ProfileNotifications.svelte', import.meta.url), 'utf8');
  let args;
  const context = vm.createContext({
    saving: false, unread: 0, inbox: { unreadCount: 75, notifications: [{ readAt: 'already-read' }] },
    supabase: { rpc: async (_name, input) => { args = input; return { data: { success: true } }; } }
  });
  vm.runInContext(source.slice(source.indexOf('  async function markAllRead'), source.indexOf('</script>')), context);
  await context.markAllRead();
  assert.equal(args.p_notification_ids, null);
  assert.equal(context.inbox.unreadCount, 0);
  assert.equal(context.saving, false);
});

test('Failed mark-all preserves unread state and allows retry', async () => {
  const source = await readFile(new URL('../src/lib/ProfileNotifications.svelte', import.meta.url), 'utf8');
  const context = vm.createContext({
    saving: false, unread: 1, inbox: { unreadCount: 75, notifications: [{ readAt: null }] },
    supabase: { rpc: async () => { throw new Error('Offline'); } }
  });
  vm.runInContext(source.slice(source.indexOf('  async function markAllRead'), source.indexOf('</script>')), context);
  await context.markAllRead();
  assert.equal(context.inbox.unreadCount, 75);
  assert.equal(context.inbox.notifications[0].readAt, null);
  assert.equal(context.actionError, 'Offline');
  assert.equal(context.saving, false);
});

test('Preference-only changes invoke the Studio navigation warning', async () => {
  const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
  const pending = [];
  const navigated = [];
  const context = vm.createContext({
    activeSection: 'profile-insights', navigationDirty: true,
    openDirtyPrompt: value => pending.push(value),
    setActiveSection: value => navigated.push(value)
  });
  vm.runInContext(source.slice(source.indexOf('  function handleDashboardSectionChange'), source.indexOf('  function selectCustomizeTab')), context);
  context.handleDashboardSectionChange({ detail: { sectionId: 'customize' } });
  assert.equal(pending[0].value, 'customize');
  assert.equal(navigated.length, 0);
  assert.match(source, /navigationDirty = dashboardDirty \|\| preferenceDirty/);
  assert.match(source, /if \(!navigationDirty\) return;/);
});

test('Privacy failure retains the editable draft and success accepts canonical settings', async () => {
  const source = await readFile(new URL('../src/lib/ProfileSocial.svelte', import.meta.url), 'utf8');
  let fail = true;
  const context = vm.createContext({
    isOwnProfile: true, settingsLoading: false, settingsDirty: true,
    settings: { interactionsEnabled: true },
    settingsDraft: { interactionsEnabled: false },
    invokeProfileSocialRpc: async () => {
      if (fail) throw new Error('Offline');
      return { data: { interactionsEnabled: false } };
    },
    supabase: {}, getProfileSocialError: () => 'Try again',
    normalizeProfileSocialSettings: value => ({ ...value }),
    setNotice() {}, dispatch() {}
  });
  vm.runInContext(source.slice(source.indexOf('  async function saveSettings'), source.indexOf('  function formatDate')), context);
  await context.saveSettings();
  assert.equal(context.settingsDraft.interactionsEnabled, false);
  assert.equal(context.settings.interactionsEnabled, true);
  assert.equal(context.settingsError, 'Try again');
  assert.equal(context.settingsLoading, false);
  fail = false;
  await context.saveSettings();
  assert.equal(context.settings.interactionsEnabled, false);
  assert.equal(context.settingsError, '');
});

test('Insight loading accepts the Supabase thenable builder without a catch method', async () => {
  const context = insightHarness(() => ({
    then(resolve) { return Promise.resolve({ data: { enabled: false, windowDays: 7 } }).then(resolve); }
  }));
  await context.chooseWindow(7);
  assert.equal(context.loading, false);
  assert.equal(context.insights.windowDays, 7);
});

test('Parent updates with unchanged Privacy settings preserve an unsaved draft', async () => {
  const source = await readFile(new URL('../src/lib/ProfileSocial.svelte', import.meta.url), 'utf8');
  const context = vm.createContext({
    settingsKey: '', settingsDraft: {},
    normalizeProfileSocialSettings: value => ({ ...value })
  });
  const start = source.indexOf('  function syncSettings');
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), context);
  context.syncSettings({ interactionsEnabled: true });
  context.settingsDraft.interactionsEnabled = false;
  context.syncSettings({ interactionsEnabled: true });
  assert.equal(context.settingsDraft.interactionsEnabled, false);
});
