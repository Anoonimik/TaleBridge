import { create } from 'zustand';
import { Combatant, CombatSide, CombatState } from '../types';
import { TB_CONFIG } from '../constants';

interface CombatStoreState extends CombatState {
  startCombat: () => void;
  endCombat: () => void;
  nextTurn: () => void;
  prevTurn: () => void;
  setInitiative: (id: string, value: number) => void;
  modifyHp: (id: string, delta: number) => void;
  setCategory: (id: string, category: CombatSide | string) => void;
  toggleCondition: (id: string, conditionId: string) => void;
  addCombatant: (combatant: Partial<Combatant> & { name: string }) => void;
  removeCombatant: (id: string) => void;
  rollAllInitiative: () => void;
  clearCombat: () => void;
  syncFromRoster: (roster: any[]) => void;
  setCombatState: (state: Partial<CombatState>) => void;
  getDexModifier: (c: Partial<Combatant>) => number;
}

const parseSavedCombat = (): CombatState => {
  try {
    const raw = localStorage.getItem(TB_CONFIG.STORAGE_KEYS.COMBAT_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        active: Boolean(parsed.active),
        round: Number(parsed.round) || 1,
        turnIndex: Number(parsed.turnIndex) || 0,
        combatants: Array.isArray(parsed.combatants) ? parsed.combatants : [],
      };
    }
  } catch (e) {
    // fallback
  }
  return { active: false, round: 1, turnIndex: 0, combatants: [] };
};

const saveState = (state: CombatState) => {
  try {
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.COMBAT_STATE, JSON.stringify({
      active: state.active,
      round: state.round,
      turnIndex: state.turnIndex,
      combatants: state.combatants,
    }));
  } catch (e) {
    // silent
  }
};

const extractDexMod = (c: Partial<Combatant>): number => {
  if (c.dexMod !== undefined && c.dexMod !== null) return Number(c.dexMod);
  const dexVal = c.stats?.dex;
  if (dexVal !== undefined && dexVal !== null) {
    const m = String(dexVal).match(/([-+]?\d+)/);
    if (m) {
      const score = parseInt(m[1], 10);
      return Math.floor((score - 10) / 2);
    }
  }
  return 0;
};

const initial = parseSavedCombat();

export const useCombatStore = create<CombatStoreState>((set, get) => ({
  ...initial,

  getDexModifier: extractDexMod,

  startCombat: () => set((state) => {
    const next = { ...state, active: true, round: 1, turnIndex: 0 };
    saveState(next);
    return next;
  }),

  endCombat: () => set((state) => {
    const next = { ...state, active: false };
    saveState(next);
    return next;
  }),

  nextTurn: () => set((state) => {
    if (state.combatants.length === 0) return state;
    let nextIndex = state.turnIndex + 1;
    let nextRound = state.round;
    if (nextIndex >= state.combatants.length) {
      nextIndex = 0;
      nextRound += 1;
    }
    const next = { ...state, turnIndex: nextIndex, round: nextRound };
    saveState(next);
    return next;
  }),

  prevTurn: () => set((state) => {
    if (state.combatants.length === 0) return state;
    let prevIndex = state.turnIndex - 1;
    let prevRound = state.round;
    if (prevIndex < 0) {
      if (prevRound > 1) {
        prevRound -= 1;
        prevIndex = state.combatants.length - 1;
      } else {
        prevIndex = 0;
      }
    }
    const next = { ...state, turnIndex: prevIndex, round: prevRound };
    saveState(next);
    return next;
  }),

  setInitiative: (id, value) => set((state) => {
    const combatants = state.combatants.map((c) => (c.id === id ? { ...c, initiative: value } : c));
    combatants.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  modifyHp: (id, delta) => set((state) => {
    const combatants = state.combatants.map((c) => {
      if (c.id === id) {
        const nextHp = Math.max(0, Math.min(c.maxHp || 999, c.hp + delta));
        return { ...c, hp: nextHp };
      }
      return c;
    });
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  setCategory: (id, category) => set((state) => {
    const combatants = state.combatants.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          category,
          isPlayer: category === 'Игроки',
        };
      }
      return c;
    });
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  toggleCondition: (id, conditionId) => set((state) => {
    const combatants = state.combatants.map((c) => {
      if (c.id === id) {
        const exists = c.conditions.includes(conditionId);
        const conditions = exists
          ? c.conditions.filter((item) => item !== conditionId)
          : [...c.conditions, conditionId];
        return { ...c, conditions };
      }
      return c;
    });
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  addCombatant: (data) => set((state) => {
    const list = [...state.combatants];
    const id = data.id || `cmb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const category = data.category || 'Враги';
    const isPlayer = Boolean(data.isPlayer || category === 'Игроки');
    const dexMod = extractDexMod(data);

    const existingIdx = list.findIndex(
      (c) => (c.creatureId && c.creatureId === data.creatureId) || c.name.toLowerCase() === data.name.toLowerCase()
    );

    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        ...data,
        category: data.category || list[existingIdx].category,
        isPlayer: data.category ? data.category === 'Игроки' : list[existingIdx].isPlayer,
        attacks: data.attacks && data.attacks.length > 0 ? data.attacks : list[existingIdx].attacks,
        dexMod,
      } as Combatant;
    } else {
      list.push({
        id,
        name: data.name,
        initiative: Number(data.initiative) || 10,
        hp: Number(data.hp ?? 10),
        maxHp: Number(data.maxHp ?? data.hp ?? 10),
        ac: Number(data.ac ?? 10),
        speed: data.speed || '30 фт.',
        category,
        isPlayer,
        conditions: Array.isArray(data.conditions) ? data.conditions : [],
        creatureId: data.creatureId || null,
        path: data.path || null,
        stats: data.stats,
        dexMod,
        attacks: Array.isArray(data.attacks) ? data.attacks : [],
      });
    }

    list.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
    const next = { ...state, combatants: list };
    saveState(next);
    return next;
  }),

  removeCombatant: (id) => set((state) => {
    const combatants = state.combatants.filter((c) => c.id !== id);
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  rollAllInitiative: () => set((state) => {
    const combatants = state.combatants.map((c) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const mod = extractDexMod(c);
      return { ...c, initiative: d20 + mod };
    });
    combatants.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
    const next = { ...state, combatants, turnIndex: 0 };
    saveState(next);
    return next;
  }),

  clearCombat: () => set((state) => {
    const next = { ...state, active: false, round: 1, turnIndex: 0, combatants: [] };
    saveState(next);
    return next;
  }),

  syncFromRoster: (roster) => set((state) => {
    if (!Array.isArray(roster) || roster.length === 0 || state.combatants.length === 0) return state;

    let changed = false;
    const combatants = state.combatants.map((c) => {
      const matched = roster.find(
        (r) => (c.path && r.path === c.path) || (r.name && r.name.toLowerCase() === c.name.toLowerCase())
      );
      if (matched) {
        changed = true;
        return {
          ...c,
          attacks: Array.isArray(matched.attacks) ? matched.attacks : c.attacks,
          stats: matched.stats || c.stats,
          dexMod: extractDexMod(matched),
          ac: Number(matched.ac) || c.ac,
          maxHp: Number(matched.hp_max || matched.hp) || c.maxHp,
          speed: matched.speed || c.speed,
        };
      }
      return c;
    });

    if (!changed) return state;
    const next = { ...state, combatants };
    saveState(next);
    return next;
  }),

  setCombatState: (incoming) => set((state) => {
    const next = { ...state, ...incoming };
    saveState(next);
    return next;
  }),
}));
