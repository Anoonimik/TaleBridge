import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, readFile, rm, lstat, readdir, symlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
test(
  'Windows installer copies only runtime files and preserves settings when replacing a junction',
  { skip: process.platform !== 'win32' },
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'talebridge-installer-'));
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
    assert.ok(path.basename(root).startsWith('talebridge-installer-'));
    try {
      await copyFile('install.ps1', path.join(root, 'install.ps1'));
      for (const dir of ['obsidian-plugin/web', 'symbiote/dist', 'vault', 'table'])
        await mkdir(path.join(root, dir), { recursive: true });
      await writeFile(path.join(root, 'obsidian-plugin/web/index.html'), '<html/>');
      await writeFile(path.join(root, 'obsidian-plugin/main.js'), 'v1');
      await writeFile(path.join(root, 'obsidian-plugin/manifest.json'), '{}');
      await writeFile(path.join(root, 'obsidian-plugin/styles.css'), '');
      await writeFile(path.join(root, 'symbiote/dist/index.html'), '<html/>');
      await copyFile('symbiote/manifest.json', path.join(root, 'symbiote/manifest.json'));
      await writeFile(path.join(root, 'symbiote/README.md'), 'Runtime');
      await mkdir(path.join(root, 'symbiote/node_modules'));
      await writeFile(path.join(root, 'symbiote/node_modules/do-not-install.txt'), 'development only');
      await symlink(path.join(root, 'symbiote'), path.join(root, 'table/TaleBridge'), 'junction');
      const run = (copy: boolean) =>
        spawnSync(
          'pwsh',
          [
            '-NoProfile',
            '-NonInteractive',
            '-File',
            path.join(root, 'install.ps1'),
            '-VaultPath',
            path.join(root, 'vault'),
            '-TaleSpirePath',
            path.join(root, 'table'),
            ...(copy ? ['-CopyMode'] : []),
          ],
          { encoding: 'utf8', windowsHide: true },
        );
      let result = run(true);
      assert.equal(result.status, 0, result.stderr);
      const installed = path.join(root, 'vault/.obsidian/plugins/talebridge');
      await writeFile(path.join(installed, 'data.json'), '{"keep":"secret-settings"}');
      await writeFile(path.join(root, 'obsidian-plugin/main.js'), 'v2');
      result = run(false);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        await readFile(path.join(installed, 'data.json'), 'utf8'),
        '{"keep":"secret-settings"}',
      );
      assert.equal(await readFile(path.join(installed, 'main.js'), 'utf8'), 'v2');
      assert.ok(!(await lstat(installed)).isSymbolicLink());
      result = run(true);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        await readFile(path.join(installed, 'data.json'), 'utf8'),
        '{"keep":"secret-settings"}',
      );
      assert.ok(!(await lstat(path.join(root, 'table/TaleBridge'))).isSymbolicLink());
      assert.deepEqual((await readdir(path.join(root, 'table/TaleBridge'))).sort(), ['README.md', 'dist', 'manifest.json']);
      assert.deepEqual((await readdir(path.join(root, 'table'))).sort(), ['.talebridge-install', 'TaleBridge']);
      const backups = await readdir(path.join(root, 'table/.talebridge-install'));
      assert.equal(backups.length, 3);
      const backupLinks = await Promise.all(backups.map(async (entry) =>
        (await lstat(path.join(root, 'table/.talebridge-install', entry))).isSymbolicLink()));
      assert.equal(backupLinks.filter(Boolean).length, 1);
      assert.equal(await readFile(path.join(root, 'symbiote/node_modules/do-not-install.txt'), 'utf8'), 'development only');
      const failure = spawnSync(
        'pwsh',
        [
          '-NoProfile',
          '-NonInteractive',
          '-File',
          path.join(root, 'install.ps1'),
          '-VaultPath',
          path.join(root, 'missing-vault'),
          '-TaleSpirePath',
          path.join(root, 'table'),
        ],
        { encoding: 'utf8', windowsHide: true },
      );
      assert.notEqual(failure.status, 0);
      assert.equal(
        await readFile(path.join(installed, 'data.json'), 'utf8'),
        '{"keep":"secret-settings"}',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
