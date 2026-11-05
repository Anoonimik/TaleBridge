import { create } from 'zustand';
import {
  Character,
  CharacterBasicsUpdate,
  AbilityScores,
  Clue,
  TaleSpireCreature,
  Attack,
  DeathSaves,
  SpellSlot,
  Spell,
  ExpendableResource,
  HitDice,
  Currency,
  Currency,
} from '../../../shared/types';
import { STORAGE_KEYS } from '../../../shared/config/constants';
import { wsBridge } from '../../../shared/api/websocket';
import { taleSpireDriver } from '../../../shared/api/talespire';
import { useLogStore } from '../../../shared/lib/useLogStore';
import { parseModifier } from '../../../shared/lib/text-utils';
import {
  DEFAULT_SLOTS,
  DEFAULT_CURRENCY,
  storageKey,
  getStoredArray,
  getStoredCharMeta,
  mergeCharWithMeta,
  persistPlayerData,
} from '../../../shared/lib/character-storage';

interface RosterStore {
  updateCurrency: (currency:Currency) => void;
  adjustCurrency: (type:keyof Currency,delta:number) => void;
  roster: Character[];
  playerCharacterId: string;
  charactersById: Record<string, Character>;
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
  rollDeathSave: () => Promise<void>;
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
  toggleSkillProficiency: (skillId: string) => void;
  setSkillProficiency: (skillId: string, level: 'none' | 'proficient' | 'expert') => void;
  setSpellcastingAbility: (ability: 'int' | 'wis' | 'cha') => void;
  updateCharacterBasics: (updates: CharacterBasicsUpdate) => void;
  performRest: (type: 'short' | 'long') => void;
  updateCurrency: (currency: Currency) => void;
  adjustCurrency: (type: keyof Currency, delta: number) => void;
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  updateCurrency: (currency) => {const current=get().playerData;if(!current)return;const updated={...current,currency};set({playerData:updated});persistPlayerData(updated);},
  adjustCurrency: (type,delta) => {const current=get().playerData;if(!current)return;const currency={cp:0,sp:0,ep:0,gp:0,pp:0,...current.currency};get().updateCurrency({...currency,[type]:Math.max(0,Math.trunc(currency[type]+delta))});},
  roster: [],
  selectedToken: null,
  selectedCharacter: null,
  noteContent: null,
  playerCharacterName: '',
  playerCharacterId: '',
  charactersById: {},
  playerData: null,
  cluesArchive: getStoredArray<Clue>(STORAGE_KEYS.CLUES_ARCHIVE),
  pinnedNames: getStoredArray<string>(STORAGE_KEYS.PINNED_ROSTER),

  setRoster: (roster) => set({ roster: Array.isArray(roster) ? roster : [], charactersById: Object.fromEntries(roster.filter(c => c.id).map(c => [c.id!,c])) }),
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
      localStorage.setItem(storageKey(STORAGE_KEYS.PLAYER_CHARACTER), name);
    } catch {
      // storage unavailable
    }
    const selected = get().roster.find(c => c.name === name);
    set({playerCharacterId: selected?.id || ''});
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
    if (incoming && get().playerCharacterId && incoming.id !== get().playerCharacterId) return;
    if (incoming && !get().playerCharacterId && get().playerCharacterName && incoming.name !== get().playerCharacterName) return;
    if (incoming) {
      const meta = getStoredCharMeta(incoming.name);
      const merged = mergeCharWithMeta(incoming, incoming.revision ? null : meta);
      persistPlayerData(merged);
      set({ playerData: merged, playerCharacterId: merged.id || get().playerCharacterId, charactersById: merged.id ? {...get().charactersById,[merged.id]:merged} : get().charactersById });
    } else {
      persistPlayerData(null);
      set({ playerData: null });
    }
  },

  setCluesArchive: (cluesArchive) => {
    try {
      localStorage.setItem(storageKey(STORAGE_KEYS.CLUES_ARCHIVE), JSON.stringify(cluesArchive));
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
      localStorage.setItem(storageKey(STORAGE_KEYS.CLUES_ARCHIVE), JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ cluesArchive: updated });
    useLogStore.getState().addLog('sync', `Добавлена улика в архив: «${clue.title}»`);
  },

  removeClue: (id) => {
    const updated = get().cluesArchive.filter((c) => c.id !== id);
    try {
      localStorage.setItem(storageKey(STORAGE_KEYS.CLUES_ARCHIVE), JSON.stringify(updated));
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
      localStorage.setItem(storageKey(STORAGE_KEYS.PINNED_ROSTER), JSON.stringify(updated));
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
      wsBridge.send('UPDATE_CHARACTER_ACTIONS', {
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
      wsBridge.send('UPDATE_CHARACTER_ACTIONS', {
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

  rollDeathSave: async () => {
    const current = get().playerData;
    if (!current || (current.hp ?? 0) > 0) return;
    const result = await taleSpireDriver.rollForResult('1d20', 'Спасбросок от смерти');
    if (get().playerData?.id === current.id && (get().playerData?.hp ?? 0) <= 0) get().applyDeathSaveRoll(result);
  },

  applyDeathSaveRoll: (roll: number) => {
    if (!Number.isInteger(roll) || roll < 1 || roll > 20 || (get().playerData?.hp ?? 1) > 0) return;
    const { playerData } = get();
    if (!playerData) return;

    const currentSaves = playerData.deathSaves || { successes: 0, failures: 0 };
    if (currentSaves.successes >= 3 || currentSaves.failures >= 3) return;

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

  toggleSkillProficiency: (skillId) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSkills = playerData.skills || {};
    const currentLevel = currentSkills[skillId] || 'none';
    const nextLevel: 'none' | 'proficient' | 'expert' =
      currentLevel === 'none'
        ? 'proficient'
        : currentLevel === 'proficient'
        ? 'expert'
        : 'none';
    const updatedSkills = { ...currentSkills, [skillId]: nextLevel };
    const updated = { ...playerData, skills: updatedSkills };
    set({ playerData: updated });
    persistPlayerData(updated);
  },

  setSkillProficiency: (skillId, level) => {
    const { playerData } = get();
    if (!playerData) return;
    const currentSkills = { ...(playerData.skills || {}) };
    if (level === 'none') {
      delete currentSkills[skillId];
    } else {
      currentSkills[skillId] = level;
    }
    const updated = { ...playerData, skills: currentSkills };
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

  updateCharacterBasics: (updates) => {
    const { playerData, playerCharacterName, roster } = get();
    if (!playerData) return;

    const charName = playerCharacterName || playerData.name;
    const oldHp = playerData.hp ?? 20;
    const oldHpMax = playerData.hp_max ?? 20;

    // Calculate dexMod if stats changed
    const newStats: AbilityScores | null = updates.stats
      ? { ...(playerData.stats || { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' }), ...updates.stats }
      : playerData.stats ?? null;
    const newDexMod = newStats?.dex ? parseModifier(newStats.dex) : playerData.dexMod;

    const updated: Character = {
      ...playerData,
      ...updates,
      stats: newStats,
      dexMod: newDexMod,
    };

    // If level changed and hitDice exists, adjust total hitDice
    if (updates.level !== undefined && updates.level !== playerData.level && updated.hitDice) {
      updated.hitDice = {
        ...updated.hitDice,
        total: updates.level,
        current: Math.min(updated.hitDice.current, updates.level),
      };
    }

    // Update in store and localStorage
    set({ playerData: updated });
    persistPlayerData(updated);

    // Update roster if character exists there
    if (charName && roster.length > 0) {
      const lower = charName.toLowerCase();
      const updatedRoster = roster.map((r) =>
        r.name && r.name.toLowerCase() === lower ? { ...r, ...updated } : r
      );
      set({ roster: updatedRoster });
    }

    // Send updates to Obsidian plugin
    if (charName) {
      // 1. HP / HP_MAX
      const hpChanged = updates.hp !== undefined && updates.hp !== oldHp;
      const hpMaxChanged = updates.hp_max !== undefined && updates.hp_max !== oldHpMax;
      if (hpChanged || hpMaxChanged) {
        wsBridge.send('UPDATE_CHARACTER_HP', {
          characterName: charName,
          hp: updated.hp ?? 20,
          maxHp: updated.hp_max ?? 20,
        });
      }

      // 2. Frontmatter parameters: ac, speed, level, race, class, status
      const paramKeys: (keyof CharacterBasicsUpdate)[] = ['ac', 'speed', 'level', 'race', 'class'];
      paramKeys.forEach((key) => {
        if (updates[key] !== undefined && updates[key] !== playerData[key]) {
          wsBridge.send('UPDATE_CHARACTER_PARAM', {
            characterName: charName,
            param: key,
            value: updates[key],
          });
        }
      });

      // 3. Ability scores
      if (updates.stats) {
        const formattedStats: Record<string, string> = {};
        const abilities: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        abilities.forEach((ab) => {
          const raw = updates.stats![ab] || playerData.stats?.[ab] || '10';
          const num = parseInt(raw, 10) || 10;
          const mod = Math.floor((num - 10) / 2);
          const sign = mod >= 0 ? `+${mod}` : `${mod}`;
          formattedStats[ab] = `${num} (${sign})`;
        });

        wsBridge.send('UPDATE_CHARACTER_STATS', {
          characterName: charName,
          stats: formattedStats,
        });
      }

      useLogStore
        .getState()
        .addLog(
          'action',
          `[Параметры] Базовые данные персонажа «${charName}» обновлены (КД: ${updated.ac ?? 10}, Ур. ${updated.level ?? 1}, ХП: ${updated.hp ?? 20}/${updated.hp_max ?? 20}).`
        );
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

  updateCurrency: (currency: Currency) => {
    const { playerData } = get();
    if (!playerData) return;
    const updated = { ...playerData, currency };
    set({ playerData: updated });
    persistPlayerData(updated);
  },

  adjustCurrency: (type: keyof Currency, delta: number) => {
    const { playerData } = get();
    if (!playerData) return;
    const curr = playerData.currency || DEFAULT_CURRENCY;
    const nextVal = Math.max(0, (curr[type] || 0) + delta);
    const updatedCurrency: Currency = { ...curr, [type]: nextVal };
    const updated = { ...playerData, currency: updatedCurrency };
    set({ playerData: updated });
    persistPlayerData(updated);

    const coinNames: Record<keyof Currency, string> = {
      cp: 'ММ',
      sp: 'СМ',
      ep: 'ЭМ',
      gp: 'ЗМ',
      pp: 'ПМ',
    };
    const sign = delta >= 0 ? `+${delta}` : `${delta}`;
    const charName = playerData.name || 'Персонаж';
    useLogStore
      .getState()
      .addLog('action', `[Кошелек] ${charName}: ${coinNames[type]} ${sign} (баланс: ${nextVal} ${coinNames[type]})`);
  },

}));
