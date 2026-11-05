import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateSymbiote } from '../scripts/validate-symbiote.mjs';

test('Symbiote manifest references valid website and existing runtime files', async () => {
  await validateSymbiote(path.resolve('symbiote'));
});

test('Packaging rejects empty website URLs and missing startup files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'talebridge-manifest-'));
  try {
    const manifest = { manifestVersion: 1, name: 'Test', entryPoint: '/index.html', about: { website: '' } };
    await writeFile(path.join(root, 'index.html'), '<html/>');
    await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(validateSymbiote(root), /Invalid URL/);
    manifest.about.website = 'https://github.com/Anoonimik/TaleBridge';
    manifest.entryPoint = '/missing.html';
    await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(validateSymbiote(root), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
