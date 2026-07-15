import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), 'utf8');
}

async function readPngSize(path) {
  const png = await readFile(new URL(path, root));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png[25]
  };
}

test('brand icon references use the new vector and versioned raster assets', async () => {
  const [index, app, manifestText] = await Promise.all([
    readText('index.html'),
    readText('src/App.svelte'),
    readText('public/site.webmanifest')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(index, /href="\/logo-mark\.svg"/);
  assert.match(index, /href="\/favicon-16-v2\.png"/);
  assert.match(index, /href="\/favicon-32-v2\.png"/);
  assert.match(index, /href="\/apple-touch-icon-v2\.png"/);
  assert.match(app, /src="\/logo-mark\.svg"/);
  assert.doesNotMatch(`${index}\n${app}\n${manifestText}`, /favicon-96\.png|apple-touch-icon\.png|icon-(?:192|512)\.png/);

  assert.deepEqual(manifest.icons, [
    { src: '/icon-192-v2.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-192-v2.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icon-maskable-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]);
});

test('brand raster assets have the expected dimensions and alpha behavior', async () => {
  const expected = new Map([
    ['public/favicon-16-v2.png', [16, 16, 6]],
    ['public/favicon-32-v2.png', [32, 32, 6]],
    ['public/apple-touch-icon-v2.png', [180, 180, 2]],
    ['public/icon-192-v2.png', [192, 192, 2]],
    ['public/icon-512-v2.png', [512, 512, 2]],
    ['public/icon-maskable-192-v2.png', [192, 192, 2]],
    ['public/icon-maskable-512-v2.png', [512, 512, 2]]
  ]);

  for (const [path, [width, height, colorType]] of expected) {
    assert.deepEqual(await readPngSize(path), { width, height, colorType });
  }
});

test('homepage structured data connects Google-facing logo and primary image entities', async () => {
  const index = await readText('index.html');
  const jsonLdMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'homepage JSON-LD must be present');

  const schema = JSON.parse(jsonLdMatch[1]);
  const entities = new Map(schema['@graph'].map(entity => [entity['@id'], entity]));
  const organization = entities.get('https://chromadie.com/#organization');
  const logo = entities.get('https://chromadie.com/#logo');
  const primaryImage = entities.get('https://chromadie.com/#primaryimage');
  const website = entities.get('https://chromadie.com/#website');
  const webpage = entities.get('https://chromadie.com/#webpage');
  const game = entities.get('https://chromadie.com/#game');

  assert.equal(organization['@type'], 'Organization');
  assert.deepEqual(organization.logo, { '@id': logo['@id'] });
  assert.deepEqual(
    { url: logo.contentUrl, width: logo.width, height: logo.height },
    { url: 'https://chromadie.com/icon-512-v2.png', width: 512, height: 512 }
  );
  assert.deepEqual(
    { url: primaryImage.contentUrl, width: primaryImage.width, height: primaryImage.height },
    { url: 'https://chromadie.com/og-default-v4.png', width: 1200, height: 630 }
  );
  assert.deepEqual(website.publisher, { '@id': organization['@id'] });
  assert.deepEqual(website.image, { '@id': primaryImage['@id'] });
  assert.deepEqual(webpage.primaryImageOfPage, { '@id': primaryImage['@id'] });
  assert.deepEqual(game.publisher, { '@id': organization['@id'] });
  assert.deepEqual(game.image, { '@id': primaryImage['@id'] });
});
