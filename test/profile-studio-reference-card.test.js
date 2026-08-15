import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Studio preview is a bounded reference card, not a public-profile renderer', async () => {
  const [preview, card, settings] = await Promise.all([
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  assert.match(preview, /import ProfileReferenceCard from '\.\/ProfileReferenceCard\.svelte'/);
  assert.match(preview, /<ProfileMotionEffect[\s\S]*inputSurface="container"/);
  assert.match(preview, /<ProfileReferenceCard[\s\S]*presentation="studio"/);
  assert.doesNotMatch(preview, /ProfileShell|ProfileLayoutFrame|profile-shell-page|overflow-y:\s*auto|scroll-cue/);
  assert.match(settings, /import\('\.\/ProfileStudioPreview\.svelte'\)/);
  assert.doesNotMatch(settings, /ProfileShell\.svelte|PreviewDockComponent|previewComponent/);

  for (const anatomy of ['profile-reference-card__avatar', 'profile-reference-card__name', 'profile-reference-card__bio', 'profile-reference-card__links', 'profile-reference-card__roll']) {
    assert.match(card, new RegExp(anatomy));
  }
  assert.match(card, /border-radius: 20px/);
  assert.match(card, /backdrop-filter: blur\(30px\) saturate\(160%\)/);
});

test('Studio and homepage share the reference card without sharing public layout wrappers', async () => {
  const [homepage, customize, layout] = await Promise.all([
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/ProfileCustomizePage.svelte'),
    read('src/lib/ProfileReferenceLayoutEditor.svelte')
  ]);

  assert.match(homepage, /import ProfileReferenceCard/);
  assert.match(homepage, /presentation="homepage"/);
  assert.match(customize, /import ProfileReferenceLayoutEditor/);
  assert.doesNotMatch(customize, /ProfileTemplatePicker|showLinks=\{false\}|components\['profile-layout'\]/);
  assert.match(layout, /data-studio-layout="reference-card"/);
  assert.doesNotMatch(layout, /Compact|Sleek|Minimal|Modern|Portfolio|ProfileTemplatePicker/);
});
