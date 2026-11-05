import { Attack, AbilityScores } from '../types';

export interface ParsedCallout {
  type: string;
  title: string;
  lines: string[];
}

export interface ParsedCreatureNote {
  vitals: {
    ac?: number;
    hp?: number;
    hpMax?: number;
    speed?: string;
    initiativeBonus?: string;
  };
  stats?: AbilityScores;
  actions: Attack[];
  callouts: ParsedCallout[];
  remainingMarkdown: string;
}

const STATS_MAP: Record<string, string> = {
  сил: 'str',
  str: 'str',
  сила: 'str',
  лов: 'dex',
  dex: 'dex',
  ловкость: 'dex',
  тел: 'con',
  con: 'con',
  телосложение: 'con',
  инт: 'int',
  int: 'int',
  интеллект: 'int',
  муд: 'wis',
  wis: 'wis',
  мудрость: 'wis',
  хар: 'cha',
  cha: 'cha',
  харизма: 'cha',
};

/**
 * Parses raw Obsidian creature note markdown into structured components:
 * - Strips YAML frontmatter
 * - Extracts and strips ```dnd-action blocks
 * - Extracts and strips > [!callout] blocks
 * - Extracts ability scores and initiative if present
 * - Cleans up redundant boilerplate headers
 */
export const parseCreatureNote = (
  rawContent: string,
  fallbackAttacks: Attack[] = []
): ParsedCreatureNote => {
  if (!rawContent || !rawContent.trim()) {
    return {
      vitals: {},
      actions: fallbackAttacks,
      callouts: [],
      remainingMarkdown: '',
    };
  }

  // Step 1: Strip YAML frontmatter
  let text = rawContent.replace(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*/, '').trim();

  // Step 2: Extract dnd-action code blocks
  const actions: Attack[] = [];
  const actionRegex = /```dnd-action\s*([\s\S]*?)```/g;
  let mAction: RegExpExecArray | null;

  while ((mAction = actionRegex.exec(text)) !== null) {
    const block = mAction[1];
    const name = block.match(/name:\s*(.*)/i)?.[1]?.trim() || 'Действие';
    const hit = block.match(/hit:\s*(.*)/i)?.[1]?.trim() || '';
    const dmg = block.match(/dmg:\s*(.*)/i)?.[1]?.trim() || '';
    const type = block.match(/type:\s*(.*)/i)?.[1]?.trim() || '';
    const desc = block.match(/desc:\s*(.*)/i)?.[1]?.trim() || '';

    actions.push({ name, hit, dmg, type, desc });
  }

  // Merge with fallback attacks if note didn't have actions or had fewer
  const mergedActions: Attack[] = [...actions];
  fallbackAttacks.forEach((fbAtk) => {
    if (!mergedActions.some((a) => a.name.toLowerCase() === fbAtk.name.toLowerCase())) {
      mergedActions.push(fbAtk);
    }
  });

  // Remove dnd-action blocks from text
  text = text.replace(/```dnd-action\s*([\s\S]*?)```/g, '').trim();

  // Step 3: Extract Initiative bonus from text
  let initiativeBonus: string | undefined;
  const initDiceMatch = text.match(/\[dice:1d20([+-]\d+)[^\]]*\]/);
  if (initDiceMatch) {
    initiativeBonus = initDiceMatch[1];
  } else {
    const initMatch = text.match(/Инициатива:\s*([+-]?\d+)/i);
    if (initMatch) {
      const val = initMatch[1].trim();
      initiativeBonus = val.startsWith('+') || val.startsWith('-') ? val : `+${val}`;
    }
  }

  // Step 4: Extract Ability Scores from ## Характеристики or Markdown Table
  let stats: AbilityScores | undefined;
  const statsRegex = /[-*]\s*\*\*([^*:]+):?\*\*:?\s*([^\r\n]+)/g;
  let mStat: RegExpExecArray | null;
  const foundStats: Record<string, string> = {};

  while ((mStat = statsRegex.exec(text)) !== null) {
    const rawKey = mStat[1].toLowerCase().trim();
    const val = mStat[2].trim();
    if (STATS_MAP[rawKey]) {
      foundStats[STATS_MAP[rawKey]] = val;
    }
  }
  if (Object.keys(foundStats).length >= 3) {
    stats = {
      str: foundStats.str || '10',
      dex: foundStats.dex || '10',
      con: foundStats.con || '10',
      int: foundStats.int || '10',
      wis: foundStats.wis || '10',
      cha: foundStats.cha || '10',
    };
  }

  // Step 4b: Extract Ability Scores from markdown table if present
  const statsTableRegex =
    /\|\s*(?:Сила|СИЛ|Str|Strength)\s*\|\s*(?:Ловкость|ЛОВ|Dex|Dexterity)\s*\|\s*(?:Телосложение|ТЕЛ|Con|Constitution)\s*\|\s*(?:Интеллект|ИНТ|Int|Intelligence)\s*\|\s*(?:Мудрость|МУД|Wis|Wisdom)\s*\|\s*(?:Харизма|ХАР|Cha|Charisma)\s*\|[\r\n]+(?:\|[^\r\n]+\|[\r\n]+)?\|\s*([^|\r\n]+)\s*\|\s*([^|\r\n]+)\s*\|\s*([^|\r\n]+)\s*\|\s*([^|\r\n]+)\s*\|\s*([^|\r\n]+)\s*\|\s*([^|\r\n]+)\s*\|/i;

  const mStatsTable = text.match(statsTableRegex);
  if (mStatsTable) {
    if (!stats) {
      stats = {
        str: mStatsTable[1].trim(),
        dex: mStatsTable[2].trim(),
        con: mStatsTable[3].trim(),
        int: mStatsTable[4].trim(),
        wis: mStatsTable[5].trim(),
        cha: mStatsTable[6].trim(),
      };
    }
    text = text.replace(statsTableRegex, '').trim();
  }

  // Strip duplicate stat and combat parameter blocks (already in top vitals block)
  text = text.replace(/#{1,3}\s*Боевые параметры[\s\S]*?(?=(?:\r?\n#{1,3}\s+|$))/i, '').trim();
  text = text.replace(/#{1,3}\s*Характеристики[\s\S]*?(?=(?:\r?\n#{1,3}\s+|$))/i, '').trim();

  // Step 5: Extract Callouts (> [!type] Title)
  const callouts: ParsedCallout[] = [];
  const lines = text.split(/\r?\n/);
  const remainingLines: string[] = [];
  let inCallout = false;
  let currentCallout: ParsedCallout | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const calloutStart = line.match(/^>\s*\[!([a-zA-Z0-9_-]+)\][ \t]*(.*)$/);

    if (calloutStart) {
      if (currentCallout) callouts.push(currentCallout);
      currentCallout = {
        type: calloutStart[1].toLowerCase(),
        title: calloutStart[2].trim() || calloutStart[1].toUpperCase(),
        lines: [],
      };
      inCallout = true;
      continue;
    }

    if (inCallout) {
      if (line.startsWith('>')) {
        const cleanLine = line.replace(/^>\s?/, '');
        if (cleanLine.trim()) currentCallout?.lines.push(cleanLine.trim());
        continue;
      } else if (!line.trim()) {
        // Keep callout open if subsequent line is still in callout
        if (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
          continue;
        }
        inCallout = false;
        if (currentCallout) callouts.push(currentCallout);
        currentCallout = null;
        continue;
      } else {
        inCallout = false;
        if (currentCallout) callouts.push(currentCallout);
        currentCallout = null;
      }
    }

    remainingLines.push(line);
  }
  if (currentCallout) callouts.push(currentCallout);

  // Step 6: Clean remaining lines:
  // - Strip top-level # Title (already in header)
  // - Strip duplicate Боевые параметры & Характеристики
  let cleanRemaining = remainingLines.join('\n').trim();
  cleanRemaining = cleanRemaining.replace(/^#\s+[^\r\n]+\r?\n?/, '').trim();
  cleanRemaining = cleanRemaining.replace(/#{1,3}\s*Боевые параметры[\s\S]*?(?=(?:\r?\n#{1,3}\s+|$))/i, '').trim();
  cleanRemaining = cleanRemaining.replace(/#{1,3}\s*Характеристики[\s\S]*?(?=(?:\r?\n#{1,3}\s+|$))/i, '').trim();
  cleanRemaining = cleanRemaining.replace(/^---+$/gm, '').trim();

  return {
    vitals: {
      initiativeBonus,
    },
    stats,
    actions: mergedActions,
    callouts,
    remainingMarkdown: cleanRemaining.trim(),
  };
};
