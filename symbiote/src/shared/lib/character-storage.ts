import {
  Character,
  SpellSlot,
  DeathSaves,
  ExpendableResource,
  HitDice,
  Spell,
} from '../types';
import { STORAGE_KEYS } from '../config/constants';

export interface StoredCharMeta {
  deathSaves?: DeathSaves;
  inspiration?: boolean;
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  spellSlots?: SpellSlot[];
  spells?: Spell[];
  resources?: ExpendableResource[];
  hitDice?: HitDice;
  savingThrowsProficient?: string[];
}

export const DEFAULT_SLOTS: SpellSlot[] = [
  { level: 1, max: 4, current: 4 },
  { level: 2, max: 3, current: 3 },
  { level: 3, max: 2, current: 2 },
  { level: 4, max: 0, current: 0 },
  { level: 5, max: 0, current: 0 },
  { level: 6, max: 0, current: 0 },
  { level: 7, max: 0, current: 0 },
  { level: 8, max: 0, current: 0 },
  { level: 9, max: 0, current: 0 },
];

export const getStoredArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getStoredJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredCharMeta = (name?: string): StoredCharMeta | null => {
  if (!name) return null;
  try {
    const key = `tb_char_meta_${name.toLowerCase().trim()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCharMeta = (
  name: string | undefined,
  meta: Partial<StoredCharMeta>
): void => {
  if (!name) return;
  try {
    const key = `tb_char_meta_${name.toLowerCase().trim()}`;
    const prev = getStoredCharMeta(name) || {};
    const merged = { ...prev, ...meta };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // storage full or blocked
  }
};

export const mergeCharWithMeta = (
  raw: Character,
  meta: StoredCharMeta | null
): Character => {
  return {
    ...raw,
    deathSaves: raw.deathSaves ?? meta?.deathSaves ?? { successes: 0, failures: 0 },
    inspiration: raw.inspiration ?? meta?.inspiration ?? false,
    spellcastingAbility: raw.spellcastingAbility ?? meta?.spellcastingAbility ?? 'int',
    spellSlots: raw.spellSlots ?? meta?.spellSlots ?? DEFAULT_SLOTS,
    spells: raw.spells ?? meta?.spells ?? [],
    resources: raw.resources ?? meta?.resources ?? [],
    hitDice: raw.hitDice ?? meta?.hitDice ?? {
      current: raw.level || 1,
      total: raw.level || 1,
      dieType: 'd8',
    },
    savingThrowsProficient:
      raw.savingThrowsProficient ?? meta?.savingThrowsProficient ?? [],
  };
};

export const persistPlayerData = (data: Character | null): void => {
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEYS.PLAYER_DATA, JSON.stringify(data));
      saveCharMeta(data.name, {
        deathSaves: data.deathSaves,
        inspiration: data.inspiration,
        spellcastingAbility: data.spellcastingAbility,
        spellSlots: data.spellSlots,
        spells: data.spells,
        resources: data.resources,
        hitDice: data.hitDice,
        savingThrowsProficient: data.savingThrowsProficient,
      });
    } else {
      localStorage.removeItem(STORAGE_KEYS.PLAYER_DATA);
    }
  } catch {
    // ignore storage issues
  }
};
