import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MILESTONE_MANIFEST, normalizeNewMilestones, normalizeProgressionData } from '../src/lib/progressionState.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Profile Studio is a full-page dashboard with a responsive owner shell', async () => {
  const [app, settings, registry, workspace, preview, shell, styles] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileStudioShell.svelte'),
    read('src/styles/site.css')
  ]);
  const studio = [settings, registry, workspace, preview].join('\n');

  assert.match(app, /\{#if !profileModeVisible && !homeModeVisible && !profileSettingsModeVisible && !homepageHeaderTransitionPending\}/);
  assert.match(app, /componentProps: \{ logoutInProgress \}/);
  assert.match(settings, /<ProfileStudioShell/);
  assert.match(settings, /on:sectionchange/);
  assert.match(settings, /showPreview=\{showDashboardPreview\}/);
  assert.match(settings, /customizePreviewAvailable && \(!isMobileViewport \|\| previewOpen\)/);
  assert.match(settings, /slot="preview"/);
  assert.match(studio, /profile-studio-preview__canvas/);
  assert.match(studio, /previewRenderSnapshot=\{previewRenderSnapshot\}/);
  assert.match(studio, /ProfileReferenceCard/);
  assert.doesNotMatch(studio, /profile-preview-drawer__backdrop/);
  assert.match(shell, /profile-studio-shell__mobile-tools/);
  assert.match(shell, /profile-studio-shell--with-preview/);
  assert.match(shell, /slot name="preview"/);
  assert.match(shell, /profile-studio-shell__more-menu/);
  assert.match(shell, /prefers-reduced-motion/);
  assert.match(styles, /\.app-main--profile-settings/);
  assert.match(studio, /profile-studio-workspace__content/);
});

test('progression manifest is a small, stable expression track', () => {
  assert.deepEqual(
    MILESTONE_MANIFEST.map(({ id, threshold, reward }) => [id, threshold, reward.itemKey]),
    [
      ['rank_silver', 4790000, 'name_motion_typewriter_name'],
      ['rank_gold', 23950000, 'name_material_carbon_cut'],
      ['rank_platinum', 71851000, 'name_motion_haunt_glow'],
      ['rank_diamond', 143703000, 'name_material_glass_emboss'],
      ['rank_chroma', 287405000, 'name_motion_letter_shuffle']
    ]
  );

  const normalized = normalizeProgressionData({
    current_ep: 23950000,
    milestones: [{ id: 'rank_silver', unlocked: true, unlocked_at: '2026-08-05T12:00:00Z' }, { id: 'not-real', unlocked: true }],
    recent_unlocks: [{ id: 'rank_gold', unlocked_at: '2026-08-05T12:00:00Z' }]
  });

  assert.equal(normalized.currentEp, 23950000);
  assert.equal(normalized.currentRank.name, 'Gold');
  assert.equal(normalized.milestones.filter(milestone => milestone.unlocked).length, 1);
  assert.equal(normalized.recentUnlocks[0].reward.name, 'Carbon Vein');
  assert.deepEqual(normalizeNewMilestones([{ id: 'rank_gold' }, { id: 'not-real' }, { id: 'rank_gold' }]).map(item => item.id), ['rank_gold']);
});

test('progression rewards remain server-authoritative and roll responses are additive', async () => {
  const [migration, profileData, progressionState, game] = await Promise.all([
    read('supabase/migrations/20260805150000_profile_progression_rewards.sql'),
    read('src/lib/profileData.js'),
    read('src/lib/progressionState.js'),
    read('src/lib/Game.svelte')
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.progression_milestones/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_progression_milestones/);
  assert.match(migration, /grant_progression_milestones/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /ON CONFLICT \(user_id, milestone_id\) DO NOTHING/);
  assert.match(migration, /jsonb_set\(v_result, '\{new_milestones\}'/);
  assert.match(profileData, /loadMyProgression/);
  assert.match(progressionState, /rpc\('get_my_progression'\)/);
  assert.match(game, /normalizeNewMilestones\(data\.new_milestones\)/);
  assert.doesNotMatch(game, /insert\(.*progression|insert\(.*inventory/s);
});
