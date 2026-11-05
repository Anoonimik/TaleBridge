import { inventorySchema } from '../../../packages/protocol';
import { parse as parseYaml } from 'yaml';
import type { Vault, MetadataCache } from 'obsidian';
type VaultReader = Pick<Vault, 'read' | 'getMarkdownFiles'>;
import { createHash } from 'node:crypto';
import type { Attack, InventoryItem } from '../../../packages/domain/types';
export function parseAbilityScores(content: string) {
  if (!content) return null;
  const headerRegex =
    /\|\s*(?:Сила|СИЛ|STR)\s*\|\s*(?:Ловкость|ЛОВ|DEX)\s*\|\s*(?:Телосложение|ТЕЛ|CON)\s*\|\s*(?:Интеллект|ИНТ|INT)\s*\|\s*(?:Мудрость|МУД|WIS)\s*\|\s*(?:Харизма|ХАР|CHA)\s*\|/i;
  const match = content.match(headerRegex);
  if (!match) return null;

  const afterHeader = content.slice((match.index ?? 0) + match[0].length);
  const lines = afterHeader
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    if (line.includes('---')) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length >= 6) {
      return {
        str: cells[0],
        dex: cells[1],
        con: cells[2],
        int: cells[3],
        wis: cells[4],
        cha: cells[5],
      };
    }
  }
  return null;
}

export function extractSection(text: string, headerName: string) {
  if (!text) return '';
  const regex = new RegExp(`(^|\\n)##\\s*${headerName}[^\\n]*`, 'i');
  const m = text.match(regex);
  if (!m) return '';
  const rest = text.slice((m.index ?? 0) + m[0].length);
  const nextMatch = rest.match(/\n##?\s+/);
  return nextMatch ? rest.slice(0, nextMatch.index).trim() : rest.trim();
}

export function parseInventory(content: string) {
  const sectionText = extractSection(content, 'Инвентарь');
  if (!sectionText) return [];

  const items = [];
  const lines = sectionText.split(/\r?\n/);

  for (const rawLine of lines) {
    const persistedId = rawLine.match(/<!-- talebridge-item:([A-Za-z0-9_-]+) -->\s*$/)?.[1];
    const line = rawLine.replace(/\s*<!-- talebridge-item:[A-Za-z0-9_-]+ -->\s*$/, '').trim();
    if (!line || !line.startsWith('-')) continue;

    let equipped = false;
    let rest = line.replace(/^-\s*/, '');
    if (rest.startsWith('[x]') || rest.startsWith('[X]')) {
      equipped = true;
      rest = rest.replace(/^\[[xX]\]\s*/, '');
    } else if (rest.startsWith('[ ]')) {
      equipped = false;
      rest = rest.replace(/^\[\s*\]\s*/, '');
    }

    const encoded = rest.endsWith(' <!-- talebridge-item-json:v1 -->');
    if (persistedId && (encoded || /^\{\s*"/.test(rest))) {
      const json = encoded ? rest.slice(0, -' <!-- talebridge-item-json:v1 -->'.length) : rest;
      try {
        const parsed = inventorySchema.safeParse([{ ...JSON.parse(json), id: persistedId }]);
        if (!parsed.success) throw new Error('Invalid inventory fields');
        items.push(parsed.data[0]);
        continue;
      } catch {
        throw new Error(
          `Повреждена запись предмета ${persistedId}. Исправьте JSON в заметке перед сохранением инвентаря.`,
        );
      }
    }
    let description = '';
    const descMatch = rest.match(/\s+[—–-]\s+(.*)$/);
    if (descMatch) {
      description = descMatch[1].trim();
      rest = rest.slice(0, descMatch.index).trim();
    }

    let category = 'Снаряжение';
    const catMatch = rest.match(/\[(.*?)\]/);
    if (catMatch) {
      category = catMatch[1].trim();
      rest = rest.replace(/\[(.*?)\]/, '').trim();
    }

    let quantity = 1;
    let weight = 0;
    const metaMatch = rest.match(/\((.*?)\)/);
    if (metaMatch) {
      const metaContent = metaMatch[1];
      const qtyM =
        metaContent.match(/кол-во:\s*(\d+)/i) ||
        metaContent.match(/qty:\s*(\d+)/i) ||
        metaContent.match(/(\d+)\s*шт/i);
      if (qtyM) quantity = parseInt(qtyM[1], 10) || 1;

      const weightM =
        metaContent.match(/вес:\s*([\d.]+)/i) ||
        metaContent.match(/weight:\s*([\d.]+)/i) ||
        metaContent.match(/([\d.]+)\s*(?:кг|фунт|lb)/i);
      if (weightM) weight = parseFloat(weightM[1]) || 0;

      rest = rest.replace(/\((.*?)\)/, '').trim();
    }

    const name = rest.trim();
    if (name && name !== '(Инвентарь пуст)') {
      items.push({
        id:
          persistedId ||
          'it_' +
            createHash('sha256')
              .update(name + ':' + items.length)
              .digest('hex')
              .slice(0, 16),
        name,
        equipped,
        quantity,
        weight,
        category,
        description,
      });
    }
  }
  return items;
}

export function serializeInventory(items: InventoryItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return '## Инвентарь\n- (Инвентарь пуст)';
  }

  const lines = ['## Инвентарь'];
  for (const it of items) {
    const check = it.equipped ? '[x]' : '[ ]';
    const qty = it.quantity || 1;
    const wt = it.weight !== undefined && it.weight !== null ? `, вес: ${it.weight} кг` : '';
    const cat = it.category ? ` [${it.category}]` : '';
    const desc = it.description ? ` — ${it.description}` : '';
    const legacy = `- ${check} ${it.name} (кол-во: ${qty}${wt})${cat}${desc} <!-- talebridge-item:${it.id} -->`;
    let parsed: InventoryItem | undefined;
    try {
      parsed = parseInventory(`## Инвентарь\n${legacy}`)[0];
    } catch {
      /* Use the explicit encoded representation. */
    }
    const expected = {
      ...it,
      equipped: Boolean(it.equipped),
      quantity: it.quantity ?? 1,
      weight: it.weight ?? 0,
      category: it.category || 'Снаряжение',
      description: it.description || '',
    };
    const fields = [
      'id',
      'name',
      'equipped',
      'quantity',
      'weight',
      'category',
      'description',
    ] as const;
    if (parsed && fields.every((field) => parsed?.[field] === expected[field])) lines.push(legacy);
    else
      lines.push(
        `- ${check} ${JSON.stringify(it)} <!-- talebridge-item-json:v1 --> <!-- talebridge-item:${it.id} -->`,
      );
  }
  return lines.join('\n');
}

export function parsePlayerNotes(content: string) {
  const managed =
    /<!-- talebridge:player-notes:start -->\r?\n([\s\S]*?)\r?\n<!-- talebridge:player-notes:end -->/.exec(
      content,
    );
  if (managed) return managed[1];
  return extractSection(content, 'Заметки игрока');
}

export function serializePlayerNotes(notesText: string) {
  const clean = (notesText || '').trim();
  return `## Заметки игрока\n\n${clean}`;
}

export function serializeActions(attacks: Attack[]) {
  if (!attacks || attacks.length === 0) return '';
  return attacks
    .map((atk) => {
      let block = '```dnd-action\n';
      block += `name: ${atk.name || 'Атака'}\n`;
      if (atk.hit) block += `hit: ${atk.hit}\n`;
      if (atk.dmg) block += `dmg: ${atk.dmg}\n`;
      if (atk.type) block += `type: ${atk.type}\n`;
      if (atk.desc) block += `desc: ${atk.desc}\n`;
      block += '```';
      return block;
    })
    .join('\n\n');
}

export function hasTag(tags: unknown, targetTags: string[]) {
  if (!tags) return false;
  const tagArray = (Array.isArray(tags) ? tags : [tags]).flatMap((t) =>
    String(t)
      .toLowerCase()
      .replace(/^#+/, '')
      .split(/[\s,/#]+/),
  );
  const targets = targetTags.map((t) => t.toLowerCase());
  return tagArray.some((t) => targets.includes(t));
}

export async function scanCharacters(vault: VaultReader, metadataCache: MetadataCache) {
  const files = vault.getMarkdownFiles();
  const roster = [];

  for (const file of files) {
    let fm = metadataCache.getFileCache(file)?.frontmatter;
    if (!fm) {
      try {
        const raw = await vault.read(file);
        if (raw.startsWith('---')) {
          const endIdx = raw.indexOf('\n---', 3);
          if (endIdx !== -1) {
            const yamlText = raw.substring(3, endIdx);
            fm = parseYaml(yamlText) || {};
          }
        }
      } catch {}
    }
    if (!fm) continue;

    const tags = fm.tags ? (Array.isArray(fm.tags) ? fm.tags : [fm.tags]) : [];

    const isNpc =
      hasTag(tags, [
        'npc',
        'бестиарий',
        'персонажи',
        'персонаж',
        'игрок',
        'игроки',
        'боссфайт',
        'босс',
        'monster',
        'bestiary',
        'character',
        'characters',
        'player',
        'players',
        'pc',
        'creature',
      ]) ||
      fm.hp !== undefined ||
      fm.ac !== undefined ||
      fm.playable === true ||
      fm.is_player === true ||
      fm.pc === true;

    if (isNpc) {
      const attacks = [];
      let stats = null;
      let inventory = [];
      let playerNotes = '';
      try {
        const content = await vault.read(file);
        const regex = /```dnd-action\s*([\s\S]*?)```/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
          const block = m[1];
          const aName = block.match(/name:\s*(.*)/i)?.[1]?.trim() || 'Атака';
          const aHit = block.match(/hit:\s*(.*)/i)?.[1]?.trim() || '';
          const aDmg = block.match(/dmg:\s*(.*)/i)?.[1]?.trim() || '';
          const aType = block.match(/type:\s*(.*)/i)?.[1]?.trim() || '';
          const aDesc = block.match(/desc:\s*(.*)/i)?.[1]?.trim() || '';
          attacks.push({ name: aName, hit: aHit, dmg: aDmg, type: aType, desc: aDesc });
        }
        stats = parseAbilityScores(content);
        inventory = parseInventory(content);
        playerNotes = parsePlayerNotes(content);
      } catch (e) {
        console.error(`TaleBridge: Ошибка парсинга для ${file.path}:`, e);
      }

      let isPlayable = false;
      if (fm.playable === false || fm.is_player === false || fm.pc === false) {
        isPlayable = false;
      } else if (fm.playable === true || fm.is_player === true || fm.pc === true) {
        isPlayable = true;
      } else if (hasTag(tags, ['игрок', 'игроки', 'player', 'players', 'pc', 'party'])) {
        isPlayable = true;
      }

      let category = 'NPC';
      if (
        hasTag(tags, [
          'бестиарий',
          'боссфайт',
          'босс',
          'конструкт',
          'стража',
          'bestiary',
          'monster',
          'creature',
          'boss',
        ])
      ) {
        category = 'Бестиарий';
      } else if (isPlayable) {
        category = 'Игроки';
      } else if (hasTag(tags, ['союзник', 'союзники', 'ally', 'allies'])) {
        category = 'Союзники';
      } else if (hasTag(tags, ['антагонист', 'антагонисты', 'враг', 'враги', 'enemy', 'villain'])) {
        category = 'Враги';
      }

      roster.push({
        name: file.basename,
        path: file.path,
        category: category,
        playable: isPlayable,
        tags: tags,
        hp: fm.hp !== undefined ? fm.hp : '-',
        hp_max: fm.hp_max !== undefined ? fm.hp_max : fm.hp !== undefined ? fm.hp : '-',
        ac: fm.ac || '-',
        speed: fm.speed || '-',
        race: fm.race || '',
        class: fm.class || '',
        status: fm.status || '',
        talespire_id: fm.talespire_id || '',
        talespire_name: fm.talespire_name || '',
        attacks: attacks,
        stats: stats,
        inventoryCount: inventory.length,
        hasPlayerNotes: playerNotes.length > 0,
      });
    }
  }

  roster.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return roster;
}

export async function scanScenes(vault: Vault, metadataCache: MetadataCache) {
  const files = vault
    .getMarkdownFiles()
    .sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }),
    );
  const scenes = [];

  for (const file of files) {
    // Strictly exclude templates and template folders
    const lowerPath = file.path.toLowerCase();
    const lowerName = file.basename.toLowerCase();
    if (
      lowerPath.includes('tamplates') ||
      lowerPath.includes('templates') ||
      lowerName.includes('шаблон')
    ) {
      continue;
    }
    if (
      lowerName.startsWith('00_') ||
      lowerName.includes('план') ||
      lowerName.startsWith('_архив')
    ) {
      continue;
    }

    const cache = metadataCache.getFileCache(file);
    const tags = cache?.frontmatter?.tags
      ? Array.isArray(cache.frontmatter.tags)
        ? cache.frontmatter.tags
        : [cache.frontmatter.tags]
      : [];

    const isSceneFile =
      tags.some((t) => String(t).match(/сцены|сюжет|scene|scenes|story|encounter/i)) ||
      file.basename.match(/сцены|сюжет|scene|encounter/i);
    if (!isSceneFile) continue;

    const session =
      cache?.frontmatter?.session ||
      (file.parent &&
      !['lor', 'dnd', 'tamplates', 'templates', 'сессии'].includes(file.parent.name.toLowerCase())
        ? file.parent.name
        : 'Сессия');

    try {
      const content = (await vault.read(file)).replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');

      // Determine whether file is multi-scene or single-scene
      const hasMultipleScenes = /(?=^##\s+(?:Сцена|\d+|🎬))/gim.test(content);

      let rawSections = [];
      if (hasMultipleScenes) {
        rawSections = content.split(/(?=^##\s+(?:Сцена|\d+|🎬))/gim);
      } else {
        rawSections = ['', content];
      }

      for (let i = 1; i < rawSections.length; i++) {
        const sec = rawSections[i];
        let title = '';
        let body = '';

        if (hasMultipleScenes) {
          const titleMatch = sec.match(/^##\s+(.*)/m);
          title = titleMatch ? titleMatch[1].trim() : `Сцена ${scenes.length + 1}`;
          body = sec.replace(/^##\s+.*(?:\r?\n|$)/m, '').trim();
        } else {
          const h1Match = sec.match(/^#\s+(?:🎬\s*)?(.*)/m);
          title = h1Match ? h1Match[1].trim() : file.basename;
          body = sec.replace(/^#\s+.*(?:\r?\n|$)/m, '').trim();
        }

        const stableId = body.match(/<!-- talebridge-scene:([a-f0-9-]{36}) -->/)?.[1];
        body = body.replace(/<!-- talebridge-scene:[a-f0-9-]{36} -->\r?\n?/g, '');
        // Extract Goal & Sensory
        const goalMatch = body.match(/\*\*(?:🎯\s*)?(?:Главная\s+)?цель(?:\s*сцены)?:\*\*\s*(.*)/i);
        const goal = goalMatch ? goalMatch[1].trim() : '';

        const sensoryMatch = body.match(/\*\*(?:👁️\s*)?Сенсорика(?:\s*палитра)?:\*\*\s*(.*)/i);
        const sensory = sensoryMatch ? sensoryMatch[1].trim() : '';

        const locMatch = body.match(/\*\*Локация:\*\*\s*(.*)/i);
        const location = locMatch ? locMatch[1].trim() : '';

        // Lookahead pattern to terminate callouts before next callout, hr or heading
        const calloutEnd = '(?=\\n\\s*>\\s*\\[!|\\n\\s*---\\s*|\\n\\s*##|\\n\\n\\s*[^>\\s]|$)';

        // Extract Read-Aloud block (> [!quote] Зачитать игрокам ...)
        let readAloud = '';
        const quoteRegex = new RegExp(`>\\s*\\[!quote\\][^\\n]*\\n([\\s\\S]*?)${calloutEnd}`, 'i');
        const quoteMatch = body.match(quoteRegex);
        if (quoteMatch) {
          readAloud = quoteMatch[1].replace(/^>\s?/gm, '').trim();
        }

        // Extract Personas (> [!persona] ...)
        const personas = [];
        const personaRegex = new RegExp(
          `>\\s*\\[!persona\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`,
          'gi',
        );
        let pm;
        while ((pm = personaRegex.exec(body)) !== null) {
          const pTitle = pm[1].trim() || 'Отыгрыш';
          const pBody = pm[2].replace(/^>\s?/gm, '').trim();
          personas.push({ title: pTitle, body: pBody });
        }

        // Extract Clues & Checks (> [!tip] ...)
        const clues: string[] = [];
        const tipRegex = new RegExp(
          `>\\s*\\[!tip\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`,
          'i',
        );
        const tipMatch = body.match(tipRegex);
        if (tipMatch) {
          const tipBody = tipMatch[2].replace(/^>\s?/gm, '').trim();
          const lines = tipBody.split('\n').filter((l) => l.trim().length > 0);
          lines.forEach((l) => clues.push(l.trim().replace(/^[-*]\s*/, '')));
        }

        // Extract Story Vectors & Branches (> [!todo] ...)
        const branches = [];
        let nudge = '';
        const todoRegex = new RegExp(
          `>\\s*\\[!todo\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`,
          'i',
        );
        const todoMatch = body.match(todoRegex);
        if (todoMatch) {
          const todoBody = todoMatch[2].replace(/\r/g, '').replace(/^>\s?/gm, '').trim();
          const lines = todoBody.split('\n');
          for (let j = 0; j < lines.length; j++) {
            const trimmed = lines[j]
              .trim()
              .replace(/^[-*]\s*/, '')
              .trim();
            if (/пинок\s*мастера/i.test(trimmed)) {
              let nText = trimmed.replace(/\*\*.*?\*\*:?\s*/i, '').trim();
              if (!nText && j + 1 < lines.length) {
                nText = lines[j + 1].trim();
                j++;
              }
              nudge = nText.replace(/^[*_—]+|[*_—]+$/g, '').trim();
            } else if (trimmed.length > 0) {
              branches.push(trimmed);
            }
          }
        }

        // Extract dialogue lines
        const dialogues = [];
        const lines = body.split('\n');
        for (const l of lines) {
          const trimmed = l
            .trim()
            .replace(/^>\s*/, '')
            .replace(/^[-*]\s*/, '');
          if (
            trimmed.startsWith('_—') ||
            trimmed.startsWith('—') ||
            /^[А-ЯЁ][а-яё]+:\s*_?«?[—–-]/.test(trimmed)
          ) {
            dialogues.push(trimmed.replace(/^_+|_+$/g, '').trim());
          } else if (
            trimmed.match(/\*\*(?:Фраза|Реплика|На угрозу|На мирный ответ)[:\s]*\*\*:?\s*(.*)/i)
          ) {
            const dm = trimmed.match(
              /\*\*(?:Фраза|Реплика|На угрозу|На мирный ответ)[:\s]*\*\*:?\s*(.*)/i,
            );
            if (dm && dm[1]) {
              dialogues.push(dm[1].replace(/^[_«"\s]+|[_»".\s]+$/g, '').trim());
            }
          }
        }

        // Extract Cast / Mentioned NPCs ([[Имя|Алиас]])
        const cast: string[] = [];
        const castRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
        let cm;
        while ((cm = castRegex.exec(body)) !== null) {
          const charName = cm[1].trim();
          if (
            !cast.includes(charName) &&
            charName !== file.basename &&
            !charName.toLowerCase().startsWith('сцена')
          ) {
            cast.push(charName);
          }
        }

        // Extract Master Tactics / Warnings (> [!warning] or > [!danger])
        const mechanics = [];
        const mechRegex = new RegExp(
          `>\\s*\\[!(warning|danger|caution)\\]\\s*([^\\n]*)\\n([\\s\\S]*?)${calloutEnd}`,
          'gi',
        );
        let mm;
        while ((mm = mechRegex.exec(body)) !== null) {
          const type = mm[1];
          const mTitle = mm[2] || 'Механика';
          const mContent = mm[3].replace(/^>\s?/gm, '').trim();
          mechanics.push({ type, title: mTitle, content: mContent });
        }

        scenes.push({
          id:
            stableId ||
            `scene-${createHash('sha256')
              .update(file.path + ':' + title)
              .digest('hex')
              .slice(0, 24)}`,
          scene_id: cache?.frontmatter?.scene_id || file.basename,
          session: session,
          file: file.basename,
          path: file.path,
          title: title,
          goal: goal,
          sensory: sensory,
          location: location,
          readAloud: readAloud,
          personas: personas,
          clues: clues,
          branches: branches,
          nudge: nudge,
          dialogues: dialogues,
          cast: cast,
          mechanics: mechanics,
          raw: body,
        });
      }
    } catch (e) {
      console.error(`TaleBridge: Ошибка парсинга сцен из ${file.path}:`, e);
    }
  }

  return scenes;
}
