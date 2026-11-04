import { create } from 'zustand';
import {
  Character,
  Clue,
  TaleSpireCreature,
  Attack,
  DeathSaves,
  SpellSlot,
  Spell,
  ExpendableResource,
  HitDice,
} from '../types';
import { STORAGE_KEYS } from '../config/constants';
import { wsBridge } from '../api/websocket';
import { taleSpireDriver } from '../api/talespire';
import { useLogStore } from './useLogStore';
import { parseModifier } from './text-utils';
import {
  DEFAULT_SLOTS,
  getStoredArray,
  getStoredJson,
  getStoredCharMeta,
  mergeCharWithMeta,
  persistPlayerData,
} from './character-storage';

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
  playerCharacterName: (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PLAYER_CHARACTER) || '';
    } catch {
      return '';
    }
  })(),
  playerData: (() => {
    const raw = getStoredJson<Character>(STORAGE_KEYS.PLAYER_DATA);
    if (!raw) return null;
    const meta = getStoredCharMeta(raw.name);
    return mergeCharWithMeta(raw, meta);
  })(),
  cluesArchive: getStoredArray<Clue>(STORAGE_KEYS.CLUES_ARCHIVE),
  pinnedNames: getStoredArray<string>(STORAGE_KEYS.PINNED_ROSTER),

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
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_CHARACTER, name);
    } catch {
      // storage unavailable
    }
    const prev = get().playerData;
    if (prev && prev.name !== name) {
      set({ playerCharacterName: name, playerData: null });
      persistPlayerData(null);
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
      const merged = mergeCharWithMeta(incoming, meta);
      persistPlayerData(merged);
      set({ playerData: merged });
    } else {
      persistPlayerData(null);
      set({ playerData: null });
    }
  },

  setCluesArchive: (cluesArchive) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLUES_ARCHIVE, JSON.stringify(cluesArchive));
    } catch {
      // ignore
    }
    set({ cluesArchive });
  },

  addClue: (clue) => {
    const current = get().cluesArchive;
    const exists = current.some((c) => c.id === clue.id || (c.url && c.url === clue.url));
    if (exists) return;

    const updated = [clue, ...current];
    try {
      localStorage.setItem(STORAGE_KEYS.CLUES_ARCHIVE, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ cluesArchive: updated });
    useLogStore.getState().addLog('sync', `Добавлена улика в архив: «${clue.title}»`);
  },

  removeClue: (id) => {
    const updated = get().cluesArchive.filter((c) => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.CLUES_ARCHIVE, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ cluesArchive: updated });
  },

  togglePinCharacter: (name) => {
    const current = get().pinnedNames;
    const isPinned = current.includes(name);
    const updated = isPinned ? current.filter((n) => n !== name) : [...current, name];
    try {
      localStorage.setItem(STORAGE_KEYS.PINNED_ROSTER, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ pinnedNames: updated });
  },

  deletePlayerAttack: (attackIndex) => {
    const { playerData } = get();
    if (!playerData || !playerData.attacks) return;

    const updatedAttacks = playerData.attacks.filter((_, idx) => idx !== attackIndex);
    const updated = { ...playerData, attacks: updatedAttacks };
    set({ playerData: updated });
    persistPlayerData(updated);

    if (get().playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_ATTACKS', {
        characterName: get().playerCharacterName,
        attacks: updatedAttacks,
      });
    }
  },

  savePlayerAttack: (attack, attackIndex) => {
    const { playerData } = get();
    if (!playerData) return;

    const currentAttacks = playerData.attacks ? [...playerData.attacks] : [];
    if (typeof attackIndex === 'number' && attackIndex >= 0 && attackIndex < currentAttacks.length) {
      currentAttacks[attackIndex] = attack;
    } else {
      currentAttacks.push(attack);
    }

    const updated = { ...playerData, attacks: currentAttacks };
    set({ playerData: updated });
    persistPlayerData(updated);

    if (get().playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_ATTACKS', {
        characterName: get().playerCharacterName,
        attacks: currentAttacks,
      });
    }
  },

  updatePlayerHp: (delta) => {
    const { playerData } = get();
    if (!playerData) return;

    const currentHp = playerData.hp ?? 20;
    const maxHp = playerData.hp_max ?? currentHp;
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));

    const updated = { ...playerData, hp: newHp };
    set({ playerData: updated });
    persistPlayerData(updated);

    if (get().playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_HP', {
        characterName: get().playerCharacterName,
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
    persistPlayerData(updated);
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
      persistPlayerData(updated);
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
    persistPlayerData(updated);
  },

  resetDeathSaves: () => {
    const { playerData } = get();
    if (!playerData) return;
    const newDeathSaves: DeathSaves = { successes: 0, failures: 0 };
    const updated = { ...playerData, deathSaves: newDeathSaves };
    set({ playerData: updated });
    persistPlayerData(updated);
  },

  toggleInspiration: () => {
    const { playerData } = get();
    if (!playerData) return;
    const nextInspiration = !playerData.inspiration;
    const updated = { ...playerData, inspiration: nextInspiration };
    set({ playerData: updated });
    persistPlayerData(updated);
    useLogStore.getState().addLog(
      'action',
      nextInspiration
        ? `[Вдохновение]: ${playerData.name} получил Вдохновение!`
        : `[Вдохновение]: ${playerData.name} использовал/снял Вдохновение.`
    );
  },

  updateSpellSlots: (slots) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, spellSlots: slots };
    set({ playerData: updated });
    persistPlayerData(updated);
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
    persistPlayerData(updated);
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
    persistPlayerData(updated);
  },

  resetAllSpellSlots: () => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSlots = playerData.spellSlots || DEFAULT_SLOTS;
    const updatedSlots = currentSlots.map((s) => ({ ...s, current: s.max }));
    const updated = { ...playerData, spellSlots: updatedSlots };
    set({ playerData: updated });
    persistPlayerData(updated);
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
    persistPlayerData(updated);
  },

  deleteSpell: (spellId) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSpells = playerData.spells || [];
    const updatedSpells = currentSpells.filter((s) => s.id !== spellId);
    const updated = { ...playerData, spells: updatedSpells };
    set({ playerData: updated });
    persistPlayerData(updated);
  },

  updateResources: (resources) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, resources };
    set({ playerData: updated });
    persistPlayerData(updated);
  },

  updateHitDice: (hitDice) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, hitDice };
    set({ playerData: updated });
    persistPlayerData(updated);
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
        .addLog('roll', `[Кость хитов]: Нет доступных костей хитов для траты (${playerData.name}).`);
      return;
    }

    const nextCurrent = hitDice.current - 1;
    const updatedHitDice: HitDice = { ...hitDice, current: nextCurrent };

    const conMod = parseModifier(playerData.stats?.con || '10');
    const dieType = hitDice.dieType || 'd8';
    const rollFormula = conMod >= 0 ? `1${dieType}+${conMod}` : `1${dieType}${conMod}`;

    taleSpireDriver.rollDice(
      rollFormula,
      `Кость хитов (${playerData.name}: осталось ${nextCurrent}/${hitDice.total})`
    );

    const updated = { ...playerData, hitDice: updatedHitDice };
    set({ playerData: updated });
    persistPlayerData(updated);
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
    persistPlayerData(updated);
  },

  setSpellcastingAbility: (ability) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, spellcastingAbility: ability };
    set({ playerData: updated });
    persistPlayerData(updated);
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
      persistPlayerData(updated);
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
      persistPlayerData(updated);

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
