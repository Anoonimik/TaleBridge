import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharacterIndex } from '../obsidian-plugin/src/vault/character-index';
test('warm character index reparses only changed notes, including rename and deletion', async () => {
  let full = 0;
  const singles: string[] = [];
  const records = new Map([
    ['a.md', { id: 'a', name: 'A', path: 'a.md' }],
    ['b.md', { id: 'b', name: 'B', path: 'b.md' }],
  ]);
  const index = new CharacterIndex(
    async () => {
      full++;
      return [...records.values()];
    },
    async (path) => {
      singles.push(path);
      return records.get(path) || null;
    },
  );
  await Promise.all([index.list(), index.list()]);
  assert.equal(full, 1);
  assert.equal(singles.length, 0);
  records.set('a.md', { id: 'a', name: 'Renamed', path: 'a.md' });
  index.invalidate('a.md');
  assert.equal((await index.list()).find((c) => c.id === 'a')?.name, 'Renamed');
  assert.deepEqual(singles, ['a.md']);
  assert.equal(full, 1);
  records.delete('a.md');
  records.set('new.md', { id: 'a', name: 'Renamed', path: 'new.md' });
  index.invalidate('a.md');
  index.invalidate('new.md');
  const next = await index.list();
  assert.equal(next.find((c) => c.id === 'a')?.path, 'new.md');
  assert.equal(next.length, 2);
});
test('repository updates can refresh cached character without a full scan', async () => {
  const index = new CharacterIndex(
    async () => [{ id: 'a', name: 'A', path: 'a.md', hp: 10 }],
    async () => null,
  );
  await index.list();
  index.upsert({ id: 'a', name: 'A', path: 'a.md', hp: 5 });
  assert.equal((await index.list())[0].hp, 5);
});
test('a failed incremental parse remains invalidated and is retried', async () => {
  let fail = true;
  const index = new CharacterIndex(
    async () => [{ id: 'a', name: 'old', path: 'a.md' }],
    async () => {
      if (fail) throw new Error('Bad note');
      return { id: 'a', name: 'new', path: 'a.md' };
    },
  );
  await index.list();
  index.invalidate('a.md');
  await assert.rejects(index.list(), /Bad note/);
  fail = false;
  assert.equal((await index.list())[0].name, 'new');
});
