import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, readFile, rm, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
test(
  'Windows installer preserves data.json in copy and junction updates',
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
      await writeFile(path.join(root, 'symbiote/dist/index.html'), '<html/>');
      const ps = spawnSync('pwsh', ['-v']).error ? 'powershell' : 'pwsh';
      const run = (copy: boolean) =>
        spawnSync(
          ps,
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
