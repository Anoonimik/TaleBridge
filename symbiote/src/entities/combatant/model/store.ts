import { create } from 'zustand';
import { Combatant, CombatSide } from '../../../shared/types';
import { wsBridge } from '../../../shared/api/websocket';
import { taleSpireDriver } from '../../../shared/api/talespire';
import { sideToCategory, categoryToSide } from '../../../shared/lib/dnd-rules';
import { parseModifier, formatModifier } from '../../../shared/lib/text-utils';

interface CombatStore {
  active: boolean;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  startCombat: () => void;
  endCombat: () => void;
  nextTurn: () => void;
  prevTurn: () => void;
  addCombatant: (c: Partial<Combatant>) => void;
  removeCombatant: (id: string) => void;
  updateCombatantHp: (id: string, delta: number) => void;
  setCombatantHp: (id: string, hp: number) => void;
  changeSide: (id: string, side: CombatSide) => void;
  setInitiative: (id: string, init: number) => void;
  rollSingleInitiative: (id: string) => void;
  rollAllInitiatives: () => void;
  sortByInitiative: () => void;
  toggleCondition: (id: string, condition: string) => void;
  setConditions: (id: string, conditions: string[]) => void;
  clearCombat: () => void;
  syncWithObsidian: () => void;
  setFromSync: (state: { active: boolean; round: number; turnIndex: number; combatants: Combatant[] }) => void;
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  active: false,
  round: 1,
  turnIndex: 0,
  combatants: [],

  startCombat: () => {
    set({ active: true, round: 1, turnIndex: 0 });
    get().sortByInitiative();
    get().syncWithObsidian();
  },

  endCombat: () => {
    set({ active: false, round: 1, turnIndex: 0 });
    get().syncWithObsidian();
  },

  nextTurn: () => {
    const { turnIndex, combatants, round } = get();
    if (combatants.length === 0) return;
    if (turnIndex + 1 >= combatants.length) {
      set({ turnIndex: 0, round: round + 1 });
    } else {
      set({ turnIndex: turnIndex + 1 });
    }
    get().syncWithObsidian();
  },

  prevTurn: () => {
    const { turnIndex, combatants, round } = get();
    if (combatants.length === 0) return;
    if (turnIndex - 1 < 0) {
      if (round > 1) {
        set({ turnIndex: combatants.length - 1, round: round - 1 });
      }
    } else {
      set({ turnIndex: turnIndex - 1 });
    }
    get().syncWithObsidian();
  },

  addCombatant: (c) => {
    const defaultSide: CombatSide =
      c.side ||
      (c.isPlayer
        ? 'player'
        : c.category
        ? categoryToSide(c.category)
        : 'enemy');

    const newCombatant: Combatant = {
      id: c.id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: c.name || 'Существо',
      side: defaultSide,
      initiative: c.initiative ?? (c.dexMod ? 10 + c.dexMod : 10),
      hp: c.hp ?? 10,
      maxHp: c.maxHp ?? c.hp ?? 10,
      tempHp: c.tempHp ?? 0,
      ac: c.ac ?? 10,
      speed: c.speed ?? '30 фт.',
      conditions: c.conditions || [],
      notes: c.notes || '',
      isPlayer: c.isPlayer || defaultSide === 'player',
      category: c.category || sideToCategory(defaultSide),
      path: c.path || null,
      talespireId: c.talespireId || null,
      stats: c.stats || null,
      dexMod: c.dexMod ?? 0,
      attacks: c.attacks || [],
    };

    set((state) => {
      const exists = state.combatants.some(
        (existing) => existing.name.toLowerCase() === newCombatant.name.toLowerCase() && existing.id === newCombatant.id
      );
      if (exists) return state;
      return { combatants: [...state.combatants, newCombatant] };
    });

    get().sortByInitiative();
    get().syncWithObsidian();
  },

  removeCombatant: (id) => {
    set((state) => {
      const nextList = state.combatants.filter((c) => c.id !== id);
      const activeId = state.combatants[state.turnIndex]?.id;
      const remainingIndex = nextList.findIndex(c => c.id === activeId);
      const safeTurn = remainingIndex >= 0 ? remainingIndex : Math.min(state.turnIndex, Math.max(0,nextList.length - 1));
      return {
        combatants: nextList,
        turnIndex: safeTurn,
      };
    });
    get().syncWithObsidian();
  },

  updateCombatantHp: (id, delta) => {
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
        return { ...c, hp: newHp };
      }),
    }));
    get().syncWithObsidian();
  },

  setCombatantHp: (id, hp) => {
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        return { ...c, hp: Math.max(0, Math.min(c.maxHp, hp)) };
      }),
    }));
    get().syncWithObsidian();
  },

  changeSide: (id, side) => {
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const isPlayer = side === 'player';
        const cat = sideToCategory(side);
        return { ...c, side, isPlayer, category: cat };
      }),
    }));
    get().syncWithObsidian();
  },

  setInitiative: (id, init) => {
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        return { ...c, initiative: init };
      }),
    }));
    get().sortByInitiative();
    get().syncWithObsidian();
  },

  rollSingleInitiative: (id) => {
    const c = get().combatants.find(item => item.id === id);
    if (!c) return;
    const mod = c.dexMod ?? (c.stats?.dex ? parseModifier(c.stats.dex) : 0);
    void taleSpireDriver.rollForResult('1d20' + formatModifier(mod), 'Инициатива: ' + c.name).then(total => get().setInitiative(id,total)).catch(() => {});
  },
  rollAllInitiatives: () => {
    for (const c of get().combatants) get().rollSingleInitiative(c.id);
  },

  sortByInitiative: () => {
    set(state => {
      const activeId = state.combatants[state.turnIndex]?.id;
      const combatants = [...state.combatants].sort((a,b) => b.initiative-a.initiative || (b.dexMod ?? 0)-(a.dexMod ?? 0));
      return {combatants,turnIndex:state.active ? Math.max(0,combatants.findIndex(c => c.id === activeId)) : 0};
    });
  },

  toggleCondition: (id, condition) => {
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const currentConditions = Array.isArray(c.conditions) ? c.conditions : [];
        const hasCond = currentConditions.includes(condition);
        const conditions = hasCond
          ? currentConditions.filter((cond) => cond !== condition)
          : [...currentConditions, condition];
        return { ...c, conditions };
      }),
    }));
    get().syncWithObsidian();
  },

  setConditions: (id, conditions) => {
    set((state) => ({
      combatants: state.combatants.map((c) => (c.id === id ? { ...c, conditions } : c)),
    }));
    get().syncWithObsidian();
  },

  clearCombat: () => {
    set({ combatants: [], active: false, round: 1, turnIndex: 0 });
    get().syncWithObsidian();
  },

  syncWithObsidian: () => {
    const { active, round, turnIndex, combatants } = get();
    wsBridge.send('SYNC_COMBAT_STATE', { active, round, turnIndex, combatants, activeCombatantId: combatants[turnIndex]?.id || null });
  },

  setFromSync: (data) => {
    if (!data) return;
    set({
      active: Boolean(data.active),
      round: typeof data.round === 'number' ? data.round : 1,
      turnIndex: typeof data.turnIndex === 'number' ? data.turnIndex : 0,
      combatants: Array.isArray(data.combatants) ? data.combatants : [],
    });
  },
}));
