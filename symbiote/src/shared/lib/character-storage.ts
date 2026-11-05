import {
  Character,
  SpellSlot,
  DeathSaves,
  ExpendableResource,
  HitDice,
  Spell,
  Currency,
} from '../types';
import { STORAGE_KEYS } from '../config/constants';

export interface StoredCharMeta {
  currency?: Character['currency'];
  skills?: Character['skills'];
  temp_hp?: number;
  deathSaves?: DeathSaves;
  inspiration?: boolean;
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  spellSlots?: SpellSlot[];
  spells?: Spell[];
  resources?: ExpendableResource[];
  hitDice?: HitDice;
  savingThrowsProficient?: string[];
  currency?: Currency;
}

let campaignScope = 'unbound';
export const storageKey = (key:string) => `tb_v2:${campaignScope}:${key}`;
export function configureCharacterStorage(campaignId:string) {
  campaignScope = campaignId;
  try {
    if (!localStorage.getItem('tb_legacy_backup_v1')) {
      const backup:Record<string,string> = {};
      for(let i=0;i<localStorage.length;i++) {const key=localStorage.key(i);if(key && (key.startsWith('tb_char_meta_') || Object.values(STORAGE_KEYS).includes(key))){const value=localStorage.getItem(key);if(value!==null)backup[key]=value;}}
      localStorage.setItem('tb_legacy_backup_v1',JSON.stringify(backup));
    }
  } catch { /* Existing legacy values are left intact when storage is unavailable. */ }
}

export const DEFAULT_CURRENCY: Currency = {
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
};

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
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getStoredJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredCharMeta = (name?: string): StoredCharMeta | null => {
  if (!name) return null;
  try {
    const key = storageKey(`char:${name}`);
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
    const key = storageKey(`char:${name}`);
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
    currency: raw.currency ?? meta?.currency ?? {cp:0,sp:0,ep:0,gp:0,pp:0},
    skills: raw.skills ?? meta?.skills ?? {},
    temp_hp: raw.temp_hp ?? meta?.temp_hp ?? 0,
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
    currency: raw.currency ?? meta?.currency ?? DEFAULT_CURRENCY,
  };
};

export const persistPlayerData = (data: Character | null): void => {
  try {
    if (data) {
      localStorage.setItem(storageKey(STORAGE_KEYS.PLAYER_DATA), JSON.stringify(data));
      saveCharMeta(data.id || data.name, {
        currency: data.currency,
        skills: data.skills,
        temp_hp: data.temp_hp,
        deathSaves: data.deathSaves,
        inspiration: data.inspiration,
        spellcastingAbility: data.spellcastingAbility,
        spellSlots: data.spellSlots,
        spells: data.spells,
        resources: data.resources,
        hitDice: data.hitDice,
        savingThrowsProficient: data.savingThrowsProficient,
        currency: data.currency,
      });
    } else {
      localStorage.removeItem(storageKey(STORAGE_KEYS.PLAYER_DATA));
    }
  } catch {
    // ignore storage issues
  }
};
