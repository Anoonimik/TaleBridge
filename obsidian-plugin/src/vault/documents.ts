import { createHash, randomUUID } from 'node:crypto';
import { parseDocument } from 'yaml';
import type { Attack, Character, AbilityScores } from '../../../packages/domain/types';
import { parseAbilityScores, parseInventory, parsePlayerNotes } from './parsers';

export const revisionOf = (content: string) => createHash('sha256').update(content).digest('hex');
export function frontmatter(content: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  const value: unknown = match ? parseDocument(match[1]).toJS() : {};
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function patchFrontmatter(content: string, patch: Record<string, unknown>): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  const doc = parseDocument(match?.[1] || '{}');
  if (doc.errors.length) throw new Error('Некорректный YAML: запись отменена');
  for (const [key, value] of Object.entries(patch)) doc.set(key, value);
  const yaml = doc.toString().trimEnd().replace(/\r?\n/g, newline);
  return `---${newline}${yaml}${newline}---${newline}${match ? content.slice(match[0].length) : content}`;
}
function headings(content: string): { start: number; end: number; depth: number; title: string }[] {
  const result = []; let offset = 0; let fence = '';
  for (const line of content.split(/(?<=\n)/)) {
    const code = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (code) {
      if (!fence) fence = code[1][0]; else if (fence === code[1][0]) fence = '';
    } else if (!fence) {
      const match = /^(#{1,6})[ \t]+(.+?)[ \t]*\r?\n?$/.exec(line);
      if (match) result.push({ start: offset, end: offset + line.length, depth: match[1].length, title: match[2] });
    }
    offset += line.length;
  }
  return result;
}
export function replaceSection(content: string, title: string, replacement: string): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  let section = replacement.replace(/\r?\n/g, newline);
  if (title === 'Заметки игрока') {
    const start = '<!-- talebridge:player-notes:start -->', end = '<!-- talebridge:player-notes:end -->';
    const body = section.replace(/^##[^\r\n]*\r?\n/, '').replace(/^\r?\n/,'');
    if (body.includes(start) || body.includes(end)) throw new Error('Заметка содержит зарезервированную границу секции');
    const begin = content.indexOf(start), finish = content.indexOf(end,begin);
    if (begin >= 0 && finish >= begin) return content.slice(0,begin) + start + newline + body + newline + content.slice(finish);
    section = `## ${title}${newline}${start}${newline}${body}${newline}${end}`;
  }
  const all = headings(content); const index = all.findIndex(h => h.depth === 2 && h.title.trim().toLowerCase() === title.toLowerCase());
  if (index < 0) return content + (content.endsWith(newline) ? newline : newline + newline) + section + newline;
  const start = all[index].start;
  const end = all.slice(index + 1).find(h => h.depth <= 2)?.start ?? content.length;
  return content.slice(0, start) + section + newline + newline + content.slice(end);
}
export function replaceActions(content: string, attacks: Attack[]): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const blocks = attacks.map(a => ['```dnd-action', ...Object.entries(a).filter(([,v]) => Boolean(v)).map(([k,v]) => `${k}: ${v}`), '```'].join(newline));
  let index = 0;
  const updated = content.replace(/^```dnd-action[^\r\n]*\r?\n[\s\S]*?^```[ \t]*(?=\r?$)/gm, () => blocks[index++] || '');
  return index === 0 ? content + newline + newline + blocks.join(newline + newline) + newline : updated + (blocks.length > index ? newline + blocks.slice(index).join(newline + newline) + newline : '');
}
export function replaceStats(content: string, stats: AbilityScores): string {
  const pattern = /^(\|\s*(?:Сила|СИЛ|STR)\s*\|[^\r\n]*\r?\n\|[^\r\n]*\r?\n)\|[^\r\n]*/im;
  const row = `| ${stats.str} | ${stats.dex} | ${stats.con} | ${stats.int} | ${stats.wis} | ${stats.cha} |`;
  if (!pattern.test(content)) throw new Error('Таблица характеристик не найдена');
  return content.replace(pattern, (_, header: string) => header + row);
}
export function readCharacter(path: string, content: string): Character {
  const fm = frontmatter(content);
  const meta = fm.talebridge && typeof fm.talebridge === 'object' ? fm.talebridge as Partial<Character> : {};
  const number = (v: unknown, fallback: number) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const parts = String(fm.hp ?? '20').split('/');
  const hp = Math.max(0, number(parts[0], 20)); const max = Math.max(0, number(fm.hp_max ?? fm.max_hp ?? parts[1], hp || 20));
  const attacks: Attack[] = [];
  for (const block of content.matchAll(/```dnd-action\s*([\s\S]*?)```/g)) {
    const data = Object.fromEntries(block[1].split(/\r?\n/).filter(l => l.includes(':')).map(l => [l.slice(0,l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
    attacks.push({name: data.name || 'Атака', hit: data.hit, dmg: data.dmg, type: data.type, desc: data.desc});
  }
  return { ...meta, id: String(fm.talebridge_id || randomUUID()), revision: revisionOf(content), path,
    name: path.replace(/.*\//, '').replace(/\.md$/, ''), hp: Math.min(hp,max), hp_max: max,
    ac: number(fm.ac,10), speed: String(fm.speed || '9 м'), race: String(fm.race || ''), class: String(fm.class || ''),
    level: number(fm.level,1), status: String(fm.status || ''), talespire_id: String(fm.talespire_id || ''), talespire_name: String(fm.talespire_name || ''),
    attacks, stats: parseAbilityScores(content), inventory: parseInventory(content), playerNotes: parsePlayerNotes(content),
  };
}
