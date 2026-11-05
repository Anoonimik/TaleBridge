import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Vault, TFile, MetadataCache } from 'obsidian';
import {
  frontmatter,
  readCharacter,
  migrateSceneIds,
} from '../obsidian-plugin/src/vault/documents';
import { scanCharacters, scanScenes } from '../obsidian-plugin/src/vault/parsers';
import { inventorySchema, stateSchema } from '../packages/protocol';
import { scaleDiceFormula } from '../symbiote/src/features/manage-spells/lib/spellScaling';

const library = 'examples/obsidian-templates';
async function recipe(name: string) {
  const source = await readFile(path.join(library, name), 'utf8');
  const match = /^````markdown\r?\n([\s\S]*?)^````/m.exec(source);
  assert.ok(match, `Copyable Markdown missing from ${name}`);
  assert.ok(/^---\r?\n/.test(match[1]), 'Pasted note must begin with frontmatter');
  return match[1];
}

function sources(notes: Record<string, string>) {
  const files = Object.keys(notes).map(
    (filePath) =>
      ({
        path: filePath,
        basename: path.posix.basename(filePath, '.md'),
        extension: 'md',
        parent: { name: path.posix.basename(path.posix.dirname(filePath)) },
      }) as TFile,
  );
  const vault = {
    getMarkdownFiles: () => files,
    read: async (file: TFile) => notes[file.path],
  } as unknown as Vault;
  const metadata = {
    getFileCache: (file: TFile) =>
      /^---\r?\n/.test(notes[file.path]) ? { frontmatter: frontmatter(notes[file.path]) } : null,
  } as unknown as MetadataCache;
  return { vault, metadata };
}

test('copyable character recipes produce real playable, ally and bestiary records', async () => {
  const notes = {
    'Персонажи/Новый герой.md': await recipe('01_Шаблон игрового персонажа.md'),
    'Персонажи/Лина-Смотрительница.md': await recipe('02_Шаблон NPC.md'),
    'Бестиарий/Гоблин-Часовой.md': await recipe('03_Шаблон противника.md'),
  };
  const { vault, metadata } = sources(notes);
  const records = await scanCharacters(vault, metadata);
  const hero = records.find((entry) => entry.name === 'Новый герой')!;
  assert.equal(hero.playable, true);
  assert.equal(hero.category, 'Игроки');
  assert.equal(hero.stats?.dex, '14');
  assert.equal(hero.attacks[0].dmg, '1d6+2');
  assert.equal(records.find((entry) => entry.name === 'Лина-Смотрительница')?.category, 'Союзники');
  assert.equal(records.find((entry) => entry.name === 'Гоблин-Часовой')?.category, 'Бестиарий');
  assert.equal(records.filter((entry) => entry.playable).length, 1);
  const character = readCharacter('Персонажи/Новый герой.md', notes['Персонажи/Новый герой.md']);
  assert.equal(character.inventory?.length, 3);
  assert.equal(character.inventory?.[1].name, 'Зелье лечения');
  assert.equal(character.inventory?.[1].quantity, 2);
  assert.equal(character.inventory?.[1].weight, 0.2);
  assert.ok(inventorySchema.safeParse(character.inventory).success);
  assert.ok(character.playerNotes?.includes('зацепки'));
});

test('scene recipe populates dedicated UI fields and receives a persistent scene identity', async () => {
  const original = await recipe('04_Шаблон сцены.md');
  const migrated = migrateSceneIds(original);
  assert.equal(migrateSceneIds(migrated), migrated);
  const { vault, metadata } = sources({ 'Сцены/02/01_Сцена — Закрытые ворота.md': migrated });
  const scenes = await scanScenes(vault, metadata);
  assert.equal(scenes.length, 1);
  const scene = scenes[0];
  assert.match(scene.id, /^[a-f0-9-]{36}$/);
  assert.equal(scene.session, 'Сессия 02 — Маяк');
  assert.equal(scene.location, 'Южные ворота порта.');
  assert.ok(scene.goal.includes('попасть к маяку'));
  assert.ok(scene.sensory.includes('водорослей'));
  assert.ok(scene.readAloud.includes('Над воротами'));
  assert.equal(scene.personas.length, 1);
  assert.equal(scene.clues.length, 3);
  assert.equal(scene.branches.length, 2);
  assert.equal(scene.nudge, 'Из-за ворот доносится звон разбитого стекла.');
  assert.equal(scene.mechanics.length, 1);
  assert.equal(scene.dialogues.length, 1);
  assert.deepEqual(scene.cast, ['Лина-Смотрительница', 'Гоблин-Часовой']);
});

test('copying the instruction library into a vault creates no phantom characters or scenes', async () => {
  const entries = await readdir(library);
  const notes = Object.fromEntries(
    await Promise.all(
      entries
        .filter((name) => name.endsWith('.md'))
        .map(async (name) => [
          `Инструкции TaleBridge/${name}`,
          await readFile(path.join(library, name), 'utf8'),
        ]),
    ),
  );
  const { vault, metadata } = sources(notes);
  assert.deepEqual(await scanCharacters(vault, metadata), []);
  assert.deepEqual(await scanScenes(vault, metadata), []);
});

test('plan and lore recipes stay out of the scene and character lists', async () => {
  const { vault, metadata } = sources({
    'Сцены/02/00_План сессии.md': await recipe('05_Шаблон плана сессии.md'),
    'Лор/Старый маяк.md': await recipe('06_Шаблон локации.md'),
  });
  assert.deepEqual(await scanCharacters(vault, metadata), []);
  assert.deepEqual(await scanScenes(vault, metadata), []);
});

test('advanced state example validates and its explicit upcasting rule actually scales dice', async () => {
  const guide = await readFile('docs/OBSIDIAN_TEMPLATES.md', 'utf8');
  const yaml = /^```yaml\r?\n([\s\S]*?)^```/m.exec(guide)?.[1];
  assert.ok(yaml);
  const state = stateSchema.parse(frontmatter(`---\n${yaml}---\n`).talebridge);
  assert.equal(state.currency?.gp, 10);
  const spell = state.spells![0];
  assert.equal(scaleDiceFormula(spell.dmg!, spell.level, 3, spell.desc), '4d6');
});

test('starter vault has readable stats, inventory, player journal and scene callouts', async () => {
  const root = 'examples/starter-vault';
  const hero = readCharacter(
    'Персонажи/Артём.md',
    await readFile(`${root}/Персонажи/Артём.md`, 'utf8'),
  );
  assert.equal(hero.level, 3);
  assert.equal(hero.stats?.str, '16');
  assert.equal(hero.inventory?.length, 6);
  assert.equal(hero.inventory?.[3].quantity, 2);
  assert.ok(hero.playerNotes?.includes('Стражник'));
  const goblin = readCharacter(
    'Бестиарий/Гоблин-Часовой.md',
    await readFile(`${root}/Бестиарий/Гоблин-Часовой.md`, 'utf8'),
  );
  assert.equal(goblin.stats?.str, '8');
  const scenePath = 'Сцены/Сессия 01 - Побег/01_Сцена 1 - Пробуждение в камере.md';
  const { vault, metadata } = sources({
    [scenePath]: await readFile(`${root}/${scenePath}`, 'utf8'),
  });
  const [scene] = await scanScenes(vault, metadata);
  assert.ok(scene.readAloud.includes('гранитный'));
  assert.equal(scene.clues.length, 5);
  assert.equal(scene.branches.length, 2);
  assert.deepEqual(scene.cast, ['Гоблин-Часовой']);
});
