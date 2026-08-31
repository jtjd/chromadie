import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROFILE_LINK_LIMITS } from '../src/lib/profileConfig.js';
import { PROFILE_CONFIGURATION_V2_LIMITS } from '../src/lib/profileConfigurationV2.js';
import { PROFILE_WIDGET_LIMITS } from '../src/lib/profileWidgets.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile structure uses the same current limits for free and Plus accounts', () => {
  assert.equal(PROFILE_LINK_LIMITS.freeLinks, 6);
  assert.equal(PROFILE_LINK_LIMITS.maxLinks, 6);
  assert.equal(PROFILE_CONFIGURATION_V2_LIMITS.freeProjects, 10);
  assert.equal(PROFILE_CONFIGURATION_V2_LIMITS.premiumProjects, 10);
  assert.equal(PROFILE_CONFIGURATION_V2_LIMITS.freeWidgets, 4);
  assert.equal(PROFILE_CONFIGURATION_V2_LIMITS.premiumWidgets, 4);
  assert.equal(PROFILE_WIDGET_LIMITS.freeWidgets, 4);
});

test('Plus migration bounds hosted media and preserves compatibility', async () => {
  const migration = await read('supabase/migrations/20260829120000_plus_paid_media_distillation.sql');
  assert.match(migration, /animated_avatar/);
  assert.match(migration, /share_image/);
  assert.match(migration, /1073741824/);
  assert.match(migration, /1099511627776/);
  assert.match(migration, /v_asset_count >= 200/);
  assert.match(migration, /select_my_profile_r2_media_v2/);
  assert.match(migration, /profile_rich_media_access/);
  assert.match(migration, /v_project_limit integer := 10/);
  assert.match(migration, /v_widget_limit integer := 4/);
  assert.match(migration, /animated_avatar_asset_id = CASE WHEN p_clear_avatar OR p_avatar_id IS NOT NULL THEN NULL/);
  assert.doesNotMatch(migration, /DROP FUNCTION.*select_my_profile_r2_media\(/);
});

test('the six-link migration trims stored V1 and V2 link arrays', async () => {
  const migration = await read('supabase/migrations/20260830100000_profile_six_link_contract.sql');
  assert.match(migration, /row_number <= 6/);
  assert.match(migration, /v_order BETWEEN 0 AND 5/);
  assert.match(migration, /profile_trim_six_link_array/);
  assert.match(migration, /draft_config_v2 = public\.profile_trim_six_link_config/);
  assert.match(migration, /published_config_v2 = public\.profile_trim_six_link_config/);
  assert.match(migration, /jsonb_array_length\(draft_config->'links'\) <= 6/);
  assert.match(migration, /jsonb_array_length\(published_config_v2->'base'->'links'\) <= 6/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.profile_trim_six_link_config/);
});

test('paid copy lists only hosted-media benefits and checkout waits for R2 readiness', async () => {
  const [pricing, premium, checkout, editor, uploadIntent] = await Promise.all([
    read('src/lib/Pricing.svelte'),
    read('src/lib/ProfilePremiumPage.svelte'),
    read('supabase/functions/create-premium-checkout/index.ts'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('functions/api/profile-media/upload-intent.js')
  ]);
  for (const source of [pricing, premium]) {
    assert.match(source, /hosted media/i);
    assert.doesNotMatch(source, /premium structured templates|premium cosmetics catalog|future Plus/i);
  }
  assert.match(pricing, /\$7\.99/);
  assert.match(pricing, /1 GB/);
  assert.match(checkout, /PROFILE_MEDIA_R2_READY/);
  assert.match(editor, /processAnimatedAvatarPoster/);
  assert.match(editor, /processProfileShareImage/);
  assert.doesNotMatch(editor, /Upload banner|Replace banner|Banners/);
  assert.doesNotMatch(uploadIntent, /'banner'/);
});

test('share metadata prefers the paid image and keeps the legacy banner fallback', async () => {
  const page = await read('functions/_profilePage.js');
  assert.match(page, /shareImageUrl \|\| legacyBannerUrl/);
  assert.match(page, /og:image:type/);
  assert.match(page, /og:image:width/);
  assert.match(page, /og:image:height/);
});
