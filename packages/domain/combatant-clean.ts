import type { Combatant, Attack, AbilityScores, CombatSide } from './types';

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_REGEX = /^(?:[1-9]|[12]\d|30)(?:\s*\([+-]?\d{1,2}\))?$/;

function sanitizeLine(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n`]/g, ' ').slice(0, 500).trim();
  return cleaned || fallback;
}

function sanitizeOptionalLine(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\r\n`]/g, ' ').slice(0, 500).trim();
  return cleaned || undefined;
}

function sanitizeStats(raw: unknown): AbilityScores | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  for (const k of ABILITY_KEYS) {
    if (typeof obj[k] !== 'string' || !ABILITY_REGEX.test((obj[k] as string).trim())) {
      return null;
    }
  }
  return {
    str: (obj.str as string).trim(),
    dex: (obj.dex as string).trim(),
    con: (obj.con as string).trim(),
    int: (obj.int as string).trim(),
    wis: (obj.wis as string).trim(),
    cha: (obj.cha as string).trim(),
  };
}

export function cleanCombatant(c: Partial<Combatant>): Combatant {
  const hp = Math.min(100000, Math.max(0, Math.round(Number(c.hp) || 0)));
  const rawMax = Math.min(100000, Math.max(0, Math.round(Number(c.maxHp ?? c.hp) || 10)));
  const maxHp = Math.min(100000, Math.max(rawMax, hp, 1));
  const tempHp = Math.min(100000, Math.max(0, Math.round(Number(c.tempHp) || 0)));
  const ac = Math.min(100000, Math.max(0, Math.round(Number(c.ac) || 10)));
  const rawInit = Number.isFinite(Number(c.initiative))
    ? Number(c.initiative)
    : c.dexMod
      ? 10 + c.dexMod
      : 10;
  const initiative = Math.min(1000, Math.max(-100, Math.round(rawInit)));

  const side: CombatSide =
    c.side === 'player' || c.side === 'ally' || c.side === 'neutral' || c.side === 'enemy'
      ? c.side
      : 'enemy';

  const attacks: Attack[] = (Array.isArray(c.attacks) ? c.attacks : [])
    .slice(0, 100)
    .map((a) => ({
      name: sanitizeLine(a.name, 'Атака'),
      hit: sanitizeOptionalLine(a.hit),
      dmg: sanitizeOptionalLine(a.dmg),
      type: sanitizeOptionalLine(a.type),
      desc: sanitizeOptionalLine(a.desc),
    }));

  const conditions = (Array.isArray(c.conditions) ? c.conditions : [])
    .slice(0, 100)
    .map((cond) => sanitizeOptionalLine(cond))
    .filter((cond): cond is string => Boolean(cond));

  return {
    id: sanitizeLine(c.id, `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
    name: sanitizeLine(c.name, 'Существо'),
    side,
    initiative,
    hp,
    maxHp,
    tempHp,
    ac,
    speed: sanitizeLine(c.speed, '30 фт.'),
    conditions,
    notes: typeof c.notes === 'string' ? c.notes.slice(0, 4096) : '',
    isPlayer: Boolean(c.isPlayer),
    category: sanitizeOptionalLine(c.category),
    path: c.path ? sanitizeLine(c.path, '') : null,
    talespireId: c.talespireId ? sanitizeLine(c.talespireId, '') : null,
    cameraBookmarkId: c.cameraBookmarkId ? sanitizeLine(c.cameraBookmarkId, '') : null,
    stats: sanitizeStats(c.stats),
    dexMod:
      typeof c.dexMod === 'number' && Number.isFinite(c.dexMod)
        ? Math.min(30, Math.max(-30, Math.round(c.dexMod)))
        : 0,
    attacks,
  };
}
