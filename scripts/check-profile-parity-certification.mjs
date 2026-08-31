import { readFile } from 'node:fs/promises';
import { FEATURE_FLAG_KEYS, ROLLOUT_STAGES } from '../src/lib/profileFeatureFlags.js';

const fixturePath = new URL('../docs/certification/PROFILE_PARITY_CERTIFICATION.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const expectedRegions = ['identity', 'roll', 'expression', 'featured'];
const requiredConditions = ['slow-network', 'media-failure', 'reduced-motion', 'keyboard-only'];
const expectedIds = ['polished-free-default', 'premium-media-identity', 'creator-provider'];

function fail(message) {
  throw new Error(`Profile parity certification: ${message}`);
}

if (fixture.version !== 1) fail('fixture version must be 1.');
if (!Array.isArray(fixture.profiles) || fixture.profiles.length !== 3) fail('exactly three certification profiles are required.');
if (new Set(fixture.profiles.map(profile => profile.id)).size !== 3) fail('profile IDs must be unique.');
if (JSON.stringify(fixture.profiles.map(profile => profile.id)) !== JSON.stringify(expectedIds)) fail('profile IDs must keep the canonical order.');

for (const profile of fixture.profiles) {
  if (!['free', 'premium'].includes(profile.tier)) fail(`${profile.id} has an invalid tier.`);
  if (JSON.stringify(profile.regions) !== JSON.stringify(expectedRegions)) fail(`${profile.id} must preserve the four-region opening.`);
  if (!Array.isArray(profile.viewports) || !profile.viewports.includes('390x844') || !profile.viewports.includes('1440x900')) {
    fail(`${profile.id} needs desktop and mobile viewport evidence.`);
  }
  for (const condition of requiredConditions) {
    if (!profile.conditions.includes(condition)) fail(`${profile.id} is missing ${condition} coverage.`);
  }
  if (profile.tier === 'free') {
    if (profile.capabilities.links !== 6 || profile.capabilities.projects !== 4 || profile.capabilities.widgets !== 2) {
      fail('the free certification profile must retain the complete free caps.');
    }
    if (profile.capabilities.richMedia !== false) fail('the free certification profile must remain image-first.');
  } else if (profile.capabilities.links !== 6 || profile.capabilities.projects !== 10 || profile.capabilities.widgets !== 4) {
    fail(`${profile.id} must exercise the premium capacity contract.`);
  }
}

if (!FEATURE_FLAG_KEYS.every(key => typeof key === 'string')) fail('feature flag contract is malformed.');
if (!ROLLOUT_STAGES.includes('staff') || !ROLLOUT_STAGES.includes('cohort')) fail('rollout stages are incomplete.');

console.log(`Profile parity certification contract passed: ${fixture.profiles.length} profiles, ${FEATURE_FLAG_KEYS.length} rollout flags.`);
