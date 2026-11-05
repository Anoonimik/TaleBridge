import { performance } from 'node:perf_hooks';
import { writeFile, mkdir } from 'node:fs/promises';
import { CharacterIndex } from '../obsidian-plugin/src/vault/character-index';
import type { Character } from '../packages/domain/types';
const result = [];
for (const count of [100, 1000, 5000]) {
  let fullScans = 0,
    parsed = 0;
  const records: Character[] = Array.from({ length: count }, (_, i) => ({
    id: String(i),
    name: `Character ${i}`,
    path: `characters/${i}.md`,
    hp: 10,
  }));
  const index = new CharacterIndex(
    async () => {
      fullScans++;
      parsed += records.length;
      return records;
    },
    async (path) => {
      parsed++;
      return records.find((c) => c.path === path) || null;
    },
  );
  const start = performance.now();
  await index.list();
  const coldMs = performance.now() - start;
  const before = parsed,
    warmStart = performance.now();
  for (let i = 0; i < 20; i++) await index.list();
  const warm20Ms = performance.now() - warmStart;
  const warmParsed = parsed - before;
  index.invalidate('characters/1.md');
  await index.list();
  result.push({
    characters: count,
    coldMs: Number(coldMs.toFixed(3)),
    warm20Ms: Number(warm20Ms.toFixed(3)),
    fullScans,
    warmParsed,
    singleEditParsed: parsed - before - warmParsed,
  });
}
await mkdir('test-results', { recursive: true });
await writeFile(
  'test-results/vault-index.json',
  JSON.stringify(
    {
      synthetic: true,
      note: 'In-memory index, excludes disk, YAML and TaleSpire WebView costs.',
      result,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(result, null, 2));
