import { create } from 'zustand';
import { Combatant, CombatSide } from '../../../shared/types';
import { wsBridge } from '../../../shared/api/websocket';
import { taleSpireDriver } from '../../../shared/api/talespire';
import { sideToCategory, categoryToSide } from '../../../shared/lib/dnd-rules';
import { parseModifier, formatModifier } from '../../../shared/lib/text-utils';
import { cleanCombatant } from '../../../../../packages/domain/combatant-clean';

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
  setMiniature: (id: string, miniature: string | null) => void;
  setCameraBookmark: (id: string, bookmark: string | null) => void;
  syncWithObsidian: () => void;
  setFromSync: (state: {
    active: boolean;
    round: number;
    turnIndex: number;
    combatants: Combatant[];
  }) => void;
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  setMiniature: (id, miniature) => {
    if (!get().combatants.some((entry) => entry.id === id)) return;
    set({
      combatants: get().combatants.map((entry) =>
        entry.id === id ? { ...entry, talespireId: miniature } : entry,
      ),
    });
    get().syncWithObsidian();
  },
  setCameraBookmark: (id, bookmark) => {
    if (!get().combatants.some((entry) => entry.id === id)) return;
    set({
      combatants: get().combatants.map((entry) =>
        entry.id === id ? { ...entry, cameraBookmarkId: bookmark } : entry,
      ),
    });
    get().syncWithObsidian();
  },
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
      c.side || (c.isPlayer ? 'player' : c.category ? categoryToSide(c.category) : 'enemy');

    const cleaned = cleanCombatant({
      ...c,
      side: defaultSide,
      isPlayer: c.isPlayer ?? defaultSide === 'player',
      category: c.category || sideToCategory(defaultSide),
    });

    set((state) => {
      const exists = state.combatants.some(
        (existing) =>
          existing.id === cleaned.id ||
          (cleaned.talespireId && existing.talespireId === cleaned.talespireId),
      );
      if (exists) return state;
      return { combatants: [...state.combatants, cleaned] };
    });

    get().sortByInitiative();
    get().syncWithObsidian();
  },

  removeCombatant: (id) => {
    set((state) => {
      const nextList = state.combatants.filter((c) => c.id !== id);
      const activeId = state.combatants[state.turnIndex]?.id;
      const remainingIndex = nextList.findIndex((c) => c.id === activeId);
      const safeTurn =
        remainingIndex >= 0
          ? remainingIndex
          : Math.min(state.turnIndex, Math.max(0, nextList.length - 1));
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
    const c = get().combatants.find((item) => item.id === id);
    if (!c) return;
    const mod = c.dexMod ?? (c.stats?.dex ? parseModifier(c.stats.dex) : 0);
    void taleSpireDriver
      .rollForResult('1d20' + formatModifier(mod), 'Инициатива: ' + c.name)
      .then((total) => get().setInitiative(id, total))
      .catch(() => {});
  },
  rollAllInitiatives: () => {
    for (const c of get().combatants) get().rollSingleInitiative(c.id);
  },

  sortByInitiative: () => {
    set((state) => {
      const activeId = state.combatants[state.turnIndex]?.id;
      const combatants = [...state.combatants].sort(
        (a, b) => b.initiative - a.initiative || (b.dexMod ?? 0) - (a.dexMod ?? 0),
      );
      return {
        combatants,
        turnIndex: state.active
          ? Math.max(
              0,
              combatants.findIndex((c) => c.id === activeId),
            )
          : 0,
      };
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
    const cleanedList = combatants.map(cleanCombatant);
    wsBridge.send('SYNC_COMBAT_STATE', {
      active,
      round: Math.max(1, Math.round(round || 1)),
      turnIndex: Math.max(0, Math.min(turnIndex || 0, Math.max(0, cleanedList.length - 1))),
      combatants: cleanedList,
      activeCombatantId: cleanedList[turnIndex]?.id || null,
    });
  },

  setFromSync: (data) => {
    if (!data) return;
    set({
      active: Boolean(data.active),
      round: typeof data.round === 'number' ? data.round : 1,
      turnIndex: typeof data.turnIndex === 'number' ? data.turnIndex : 0,
      combatants: Array.isArray(data.combatants) ? data.combatants.map(cleanCombatant) : [],
    });
  },
}));
