import assert from 'node:assert/strict';
import test from 'node:test';
const { default: worker } = await import('../dist/server/index.js');
const env = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
for (const path of [
  '/',
  '/chat',
  '/compare',
  '/playground',
  '/providers',
  '/models',
  '/usage',
  '/history',
  '/settings',
  '/about',
])
  test(`production route ${path} renders ModelDock`, async () => {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: { accept: 'text/html' } }),
      env,
      ctx,
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /ModelDock/);
    assert.doesNotMatch(html, /Starter Project|Ship something real/);
  });
