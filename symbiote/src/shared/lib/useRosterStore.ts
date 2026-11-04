import { create } from 'zustand';
import {
  Character,
  Attack,
  Clue,
  TaleSpireCreature,
  DeathSaves,
  SpellSlot,
  Spell,
  ExpendableResource,
  HitDice,
} from '../types';
import { wsBridge } from '../api/websocket';
import { taleSpireDriver } from '../api/talespire';
import { useLogStore } from './useLogStore';
import { parseModifier } from './text-utils';

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

const DEFAULT_SLOTS: SpellSlot[] = [
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

const getStoredArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStoredJson = <T,>(key: string): T | null => {
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
    const raw = localStorage.getItem(`tb_char_meta_${name.toLowerCase().trim()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCharMeta = (name: string | undefined, meta: Partial<StoredCharMeta>): void => {
  if (!name) return;
  try {
    const key = `tb_char_meta_${name.toLowerCase().trim()}`;
    const prev = getStoredCharMeta(name) || {};
    const merged = { ...prev, ...meta };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // ignore
  }
};

interface RosterStore {
  roster: Character[];
  selectedToken: TaleSpireCreature | null;
  selectedCharacter: Character | null;
  noteContent: { name: string; path: string; content: string } | null;
  playerCharacterName: string;
  playerData: Character | null;
  cluesArchive: Clue[];
  pinnedNames: string[];
  setRoster: (roster: Character[]) => void;
  setSelectedToken: (token: TaleSpireCreature | null) => void;
  setSelectedCharacter: (char: Character | null) => void;
  setNoteContent: (content: { name: string; path: string; content: string } | null) => void;
  setPlayerCharacterName: (name: string) => void;
  setPlayerData: (data: Character | null) => void;
  setCluesArchive: (clues: Clue[]) => void;
  addClue: (clue: Clue) => void;
  removeClue: (id: string) => void;
  togglePinCharacter: (name: string) => void;
  deletePlayerAttack: (attackIndex: number) => void;
  savePlayerAttack: (attack: Attack, attackIndex?: number) => void;
  updatePlayerHp: (delta: number) => void;

  // 5e Character Sheet actions
  updateDeathSaves: (successes: number, failures: number) => void;
  rollDeathSave: () => void;
  applyDeathSaveRoll: (roll: number) => void;
  resetDeathSaves: () => void;
  toggleInspiration: () => void;
  updateSpellSlots: (slots: SpellSlot[]) => void;
  useSpellSlot: (level: number) => void;
  regainSpellSlot: (level: number) => void;
  resetAllSpellSlots: () => void;
  saveSpell: (spell: Spell) => void;
  deleteSpell: (spellId: string) => void;
  updateResources: (resources: ExpendableResource[]) => void;
  updateHitDice: (hitDice: HitDice) => void;
  spendHitDice: () => void;
  toggleSavingThrowProficiency: (ability: string) => void;
  setSpellcastingAbility: (ability: 'int' | 'wis' | 'cha') => void;
  performRest: (type: 'short' | 'long') => void;
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  roster: [],
  selectedToken: null,
  selectedCharacter: null,
  noteContent: null,
  playerCharacterName: localStorage.getItem('tb_player_character') || '',
  playerData: (() => {
    const raw = getStoredJson<Character>('tb_player_data');
    if (!raw) return null;
    const meta = getStoredCharMeta(raw.name);
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
      savingThrowsProficient: raw.savingThrowsProficient ?? meta?.savingThrowsProficient ?? [],
    };
  })(),
  cluesArchive: getStoredArray<Clue>('tb_clues_archive'),
  pinnedNames: getStoredArray<string>('tb_pinned_roster'),

  setRoster: (roster) => set({ roster: Array.isArray(roster) ? roster : [] }),
  setSelectedToken: (selectedToken) => set({ selectedToken }),
  setSelectedCharacter: (selectedCharacter) => {
    set({ selectedCharacter, noteContent: null });
    if (selectedCharacter && (selectedCharacter.path || selectedCharacter.name)) {
      wsBridge.send('GET_NOTE', {
        path: selectedCharacter.path,
        name: selectedCharacter.name,
      });
    }
  },
  setNoteContent: (noteContent) => set({ noteContent }),

  setPlayerCharacterName: (name) => {
    localStorage.setItem('tb_player_character', name);
    const prev = get().playerData;
    if (prev && prev.name !== name) {
      set({ playerCharacterName: name, playerData: null });
      localStorage.removeItem('tb_player_data');
    } else {
      set({ playerCharacterName: name });
    }
    if (name) {
      wsBridge.send('GET_PLAYER_DATA', { characterName: name });
    }
  },

  setPlayerData: (incoming) => {
    if (incoming) {
      const meta = getStoredCharMeta(incoming.name);
      const merged: Character = {
        ...incoming,
        deathSaves: incoming.deathSaves ?? meta?.deathSaves ?? { successes: 0, failures: 0 },
        inspiration: incoming.inspiration ?? meta?.inspiration ?? false,
        spellcastingAbility: incoming.spellcastingAbility ?? meta?.spellcastingAbility ?? 'int',
        spellSlots: incoming.spellSlots ?? meta?.spellSlots ?? DEFAULT_SLOTS,
        spells: incoming.spells ?? meta?.spells ?? [],
        resources: incoming.resources ?? meta?.resources ?? [],
        hitDice: incoming.hitDice ?? meta?.hitDice ?? {
          current: incoming.level || 1,
          total: incoming.level || 1,
          dieType: 'd8',
        },
        savingThrowsProficient:
          incoming.savingThrowsProficient ?? meta?.savingThrowsProficient ?? [],
      };
      try {
        localStorage.setItem('tb_player_data', JSON.stringify(merged));
      } catch {
        // ignore
      }
      set({ playerData: merged });
    } else {
      localStorage.removeItem('tb_player_data');
      set({ playerData: null });
    }
  },

  setCluesArchive: (cluesArchive) => {
    localStorage.setItem('tb_clues_archive', JSON.stringify(cluesArchive));
    set({ cluesArchive });
  },

  addClue: (clue) => {
    set((state) => {
      const exists = state.cluesArchive.some((c) => c.id === clue.id || c.url === clue.url);
      if (exists) return state;
      const updated = [clue, ...state.cluesArchive];
      localStorage.setItem('tb_clues_archive', JSON.stringify(updated));
      return { cluesArchive: updated };
    });
  },

  removeClue: (id) => {
    set((state) => {
      const updated = state.cluesArchive.filter((c) => c.id !== id);
      localStorage.setItem('tb_clues_archive', JSON.stringify(updated));
      return { cluesArchive: updated };
    });
  },

  togglePinCharacter: (name) => {
    set((state) => {
      const isPinned = state.pinnedNames.includes(name);
      const updated = isPinned
        ? state.pinnedNames.filter((n) => n !== name)
        : [...state.pinnedNames, name];
      localStorage.setItem('tb_pinned_roster', JSON.stringify(updated));
      return { pinnedNames: updated };
    });
  },

  deletePlayerAttack: (attackIndex) => {
    const { playerData, playerCharacterName } = get();
    if (!playerData || !playerData.attacks) return;

    const updatedAttacks = playerData.attacks.filter((_, idx) => idx !== attackIndex);
    const updatedPlayerData = { ...playerData, attacks: updatedAttacks };
    set({ playerData: updatedPlayerData });

    if (playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_ACTIONS', {
        characterName: playerCharacterName,
        attacks: updatedAttacks,
      });
    }
  },

  savePlayerAttack: (attack, attackIndex) => {
    const { playerData, playerCharacterName } = get();
    if (!playerData) return;

    const currentAttacks = playerData.attacks || [];
    let updatedAttacks: Attack[];

    if (attackIndex !== undefined && attackIndex >= 0 && attackIndex < currentAttacks.length) {
      updatedAttacks = currentAttacks.map((a, idx) => (idx === attackIndex ? attack : a));
    } else {
      updatedAttacks = [...currentAttacks, attack];
    }

    const updatedPlayerData = { ...playerData, attacks: updatedAttacks };
    set({ playerData: updatedPlayerData });

    if (playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_ACTIONS', {
        characterName: playerCharacterName,
        attacks: updatedAttacks,
      });
    }
  },

  updatePlayerHp: (delta) => {
    const { playerData, playerCharacterName } = get();
    if (!playerData) return;

    const curHp = playerData.hp ?? 20;
    const maxHp = playerData.hp_max ?? curHp;
    const newHp = Math.max(0, Math.min(maxHp, curHp + delta));

    // D&D 5e rule: healing above 0 resets death saves
    let nextDeathSaves = playerData.deathSaves;
    if (newHp > 0 && nextDeathSaves && (nextDeathSaves.successes > 0 || nextDeathSaves.failures > 0)) {
      nextDeathSaves = { successes: 0, failures: 0 };
      saveCharMeta(playerData.name, { deathSaves: nextDeathSaves });
    }

    const updatedPlayerData = { ...playerData, hp: newHp, deathSaves: nextDeathSaves };
    set({ playerData: updatedPlayerData });

    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updatedPlayerData));
    } catch {
      // ignore
    }

    if (playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_HP', {
        characterName: playerCharacterName,
        hp: newHp,
        maxHp: maxHp,
      });
    }
  },

  updateDeathSaves: (successes, failures) => {
    const { playerData } = get();
    if (!playerData) return;
    const newDeathSaves: DeathSaves = {
      successes: Math.max(0, Math.min(3, successes)),
      failures: Math.max(0, Math.min(3, failures)),
    };
    const updated = { ...playerData, deathSaves: newDeathSaves };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { deathSaves: newDeathSaves });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  rollDeathSave: () => {
    const { playerData } = get();
    if (!playerData) return;

    const currentSaves = playerData.deathSaves || { successes: 0, failures: 0 };
    if (currentSaves.successes >= 3 || currentSaves.failures >= 3) return;

    const charName = playerData.name || 'Персонаж';
    taleSpireDriver.rollDice('1d20', `Спасбросок от смерти (${charName})`);
  },

  applyDeathSaveRoll: (roll: number) => {
    const { playerData } = get();
    if (!playerData) return;

    const currentSaves = playerData.deathSaves || { successes: 0, failures: 0 };
    if (currentSaves.successes >= 3 || currentSaves.failures >= 3) return;

    const charName = playerData.name || 'Персонаж';
    let nextSuccesses = currentSaves.successes;
    let nextFailures = currentSaves.failures;
    let outcomeText = '';

    if (roll === 20) {
      outcomeText = `Натуральная 20! Персонаж приходит в сознание с 1 ХП!`;
      const updated = {
        ...playerData,
        hp: Math.max(1, (playerData.hp ?? 0) + 1),
        deathSaves: { successes: 0, failures: 0 },
      };
      useLogStore.getState().addLog('roll', `[Спасбросок от смерти]: Выпало ${roll} -> ${outcomeText}`);
      set({ playerData: updated });
      saveCharMeta(charName, { deathSaves: { successes: 0, failures: 0 } });
      try {
        localStorage.setItem('tb_player_data', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (get().playerCharacterName) {
        wsBridge.send('UPDATE_CHARACTER_HP', {
          characterName: get().playerCharacterName,
          hp: updated.hp,
          maxHp: updated.hp_max ?? 20,
        });
      }
      return;
    } else if (roll === 1) {
      nextFailures = Math.min(3, nextFailures + 2);
      outcomeText = `Критический провал (1)! +2 провала (${nextFailures}/3)`;
    } else if (roll >= 10) {
      nextSuccesses = Math.min(3, nextSuccesses + 1);
      outcomeText = `Успех (${roll})! (${nextSuccesses}/3)`;
    } else {
      nextFailures = Math.min(3, nextFailures + 1);
      outcomeText = `Провал (${roll})! (${nextFailures}/3)`;
    }

    if (nextSuccesses >= 3) {
      outcomeText += ' — Персонаж стабилизирован!';
    } else if (nextFailures >= 3) {
      outcomeText += ' — ПЕРСОНАЖ ПОГИБ!';
    }

    useLogStore.getState().addLog('roll', `[Спасбросок от смерти]: Выпало ${roll} -> ${outcomeText}`);

    const newDeathSaves: DeathSaves = { successes: nextSuccesses, failures: nextFailures };
    const updated = { ...playerData, deathSaves: newDeathSaves };
    set({ playerData: updated });
    saveCharMeta(charName, { deathSaves: newDeathSaves });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  resetDeathSaves: () => {
    const { playerData } = get();
    if (!playerData) return;
    const newDeathSaves: DeathSaves = { successes: 0, failures: 0 };
    const updated = { ...playerData, deathSaves: newDeathSaves };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { deathSaves: newDeathSaves });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  toggleInspiration: () => {
    const { playerData } = get();
    if (!playerData) return;
    const nextInspiration = !playerData.inspiration;
    const updated = { ...playerData, inspiration: nextInspiration };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { inspiration: nextInspiration });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
    useLogStore.getState().addLog(
      'action',
      nextInspiration
        ? `[Вдохновение]: ${playerData.name} получил Вдохновение (★)!`
        : `[Вдохновение]: ${playerData.name} использовал/снял Вдохновение.`
    );
  },

  updateSpellSlots: (slots) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, spellSlots: slots };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spellSlots: slots });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  useSpellSlot: (level) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSlots = playerData.spellSlots || DEFAULT_SLOTS;
    const updatedSlots = currentSlots.map((s) => {
      if (s.level === level) {
        return { ...s, current: Math.max(0, s.current - 1) };
      }
      return s;
    });
    const updated = { ...playerData, spellSlots: updatedSlots };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spellSlots: updatedSlots });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  regainSpellSlot: (level) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSlots = playerData.spellSlots || DEFAULT_SLOTS;
    const updatedSlots = currentSlots.map((s) => {
      if (s.level === level) {
        return { ...s, current: Math.min(s.max, s.current + 1) };
      }
      return s;
    });
    const updated = { ...playerData, spellSlots: updatedSlots };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spellSlots: updatedSlots });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  resetAllSpellSlots: () => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSlots = playerData.spellSlots || DEFAULT_SLOTS;
    const updatedSlots = currentSlots.map((s) => ({ ...s, current: s.max }));
    const updated = { ...playerData, spellSlots: updatedSlots };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spellSlots: updatedSlots });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
    useLogStore
      .getState()
      .addLog('action', `[Ячейки]: Все ячейки заклинаний восстановлены (${playerData.name}).`);
  },

  saveSpell: (spell) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSpells = playerData.spells || [];
    const exists = currentSpells.some((s) => s.id === spell.id);
    const updatedSpells = exists
      ? currentSpells.map((s) => (s.id === spell.id ? spell : s))
      : [...currentSpells, spell];
    const updated = { ...playerData, spells: updatedSpells };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spells: updatedSpells });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  deleteSpell: (spellId) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSpells = playerData.spells || [];
    const updatedSpells = currentSpells.filter((s) => s.id !== spellId);
    const updated = { ...playerData, spells: updatedSpells };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spells: updatedSpells });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  updateResources: (resources) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, resources };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { resources });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  updateHitDice: (hitDice) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, hitDice };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { hitDice });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  spendHitDice: () => {
    const { playerData } = get();
    if (!playerData) return;
    const hitDice = playerData.hitDice || {
      current: playerData.level || 1,
      total: playerData.level || 1,
      dieType: 'd8',
    };
    if (hitDice.current <= 0) {
      useLogStore
        .getState()
        .addLog('action', `[Кости хитов]: У ${playerData.name} не осталось костей хитов!`);
      return;
    }
    const dieSides = parseInt(hitDice.dieType.replace('d', ''), 10) || 8;
    const roll = Math.floor(Math.random() * dieSides) + 1;
    const conMod = parseModifier(playerData.stats?.con || '10');
    const healed = Math.max(1, roll + conMod);
    const nextHitDice = { ...hitDice, current: hitDice.current - 1 };

    taleSpireDriver.rollDice(
      `1${hitDice.dieType}${conMod >= 0 ? '+' + conMod : conMod}`,
      `Кость хитов (${playerData.name})`
    );
    useLogStore
      .getState()
      .addLog(
        'roll',
        `[Кость хитов]: 1${hitDice.dieType} (${roll}) + Тел (${
          conMod >= 0 ? '+' + conMod : conMod
        }) = +${healed} ХП (Осталось: ${nextHitDice.current}/${nextHitDice.total})`
      );

    const curHp = playerData.hp ?? 20;
    const maxHp = playerData.hp_max ?? curHp;
    const newHp = Math.min(maxHp, curHp + healed);

    const updated = { ...playerData, hp: newHp, hitDice: nextHitDice };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { hitDice: nextHitDice });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (get().playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_HP', {
        characterName: get().playerCharacterName,
        hp: newHp,
        maxHp: maxHp,
      });
    }
  },

  toggleSavingThrowProficiency: (ability) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentProfs = playerData.savingThrowsProficient || [];
    const updatedProfs = currentProfs.includes(ability)
      ? currentProfs.filter((a) => a !== ability)
      : [...currentProfs, ability];
    const updated = { ...playerData, savingThrowsProficient: updatedProfs };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { savingThrowsProficient: updatedProfs });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  setSpellcastingAbility: (ability) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, spellcastingAbility: ability };
    set({ playerData: updated });
    saveCharMeta(playerData.name, { spellcastingAbility: ability });
    try {
      localStorage.setItem('tb_player_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  performRest: (type) => {
    const { playerData } = get();
    if (!playerData) return;

    const charName = playerData.name || 'Персонаж';

    if (type === 'short') {
      const currentRes = playerData.resources || [];
      const updatedRes = currentRes.map((r) =>
        r.resetOn === 'short' ? { ...r, current: r.max } : r
      );
      const updated = { ...playerData, resources: updatedRes };
      set({ playerData: updated });
      saveCharMeta(charName, { resources: updatedRes });
      try {
        localStorage.setItem('tb_player_data', JSON.stringify(updated));
      } catch {
        // ignore
      }
      useLogStore
        .getState()
        .addLog(
          'action',
          `[Короткий отдых] 1 час завершен. Ресурсы с перезарядкой «КД» восстановлены (${charName}).`
        );
    } else {
      const maxHp = playerData.hp_max ?? playerData.hp ?? 20;
      const currentHitDice = playerData.hitDice || {
        current: playerData.level || 1,
        total: playerData.level || 1,
        dieType: 'd8',
      };
      const regainedHitDiceCount = Math.max(1, Math.floor(currentHitDice.total / 2));
      const nextHitDice: HitDice = {
        ...currentHitDice,
        current: Math.min(currentHitDice.total, currentHitDice.current + regainedHitDiceCount),
      };

      const currentSlots = playerData.spellSlots || DEFAULT_SLOTS;
      const resetSlots = currentSlots.map((s) => ({ ...s, current: s.max }));

      const currentRes = playerData.resources || [];
      const resetRes = currentRes.map((r) => (r.resetOn !== 'none' ? { ...r, current: r.max } : r));

      const resetDeathSaves: DeathSaves = { successes: 0, failures: 0 };

      const updated: Character = {
        ...playerData,
        hp: maxHp,
        temp_hp: 0,
        deathSaves: resetDeathSaves,
        hitDice: nextHitDice,
        spellSlots: resetSlots,
        resources: resetRes,
      };

      set({ playerData: updated });
      saveCharMeta(charName, {
        deathSaves: resetDeathSaves,
        hitDice: nextHitDice,
        spellSlots: resetSlots,
        resources: resetRes,
      });
      try {
        localStorage.setItem('tb_player_data', JSON.stringify(updated));
      } catch {
        // ignore
      }

      if (get().playerCharacterName) {
        wsBridge.send('UPDATE_CHARACTER_HP', {
          characterName: get().playerCharacterName,
          hp: maxHp,
          maxHp: maxHp,
        });
      }

      useLogStore
        .getState()
        .addLog(
          'action',
          `[Длинный отдых] 8 часов завершены. ХП (${maxHp}/${maxHp}), ячейки заклинаний, кости хитов (+${regainedHitDiceCount}) и ресурсы полностью восстановлены (${charName}).`
        );
    }
  },
}));
