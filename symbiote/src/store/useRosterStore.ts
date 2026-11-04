import { create } from 'zustand';
import { Character, Attack, TSToken } from '../types';
import { TB_CONFIG } from '../constants';

interface RosterStoreState {
  roster: Character[];
  activeToken: TSToken | null;
  selectedCharacter: Character | null;
  playerCharacterName: string;
  playerData: Character | null;
  pinnedNames: string[];

  setRoster: (roster: Character[]) => void;
  setActiveToken: (token: TSToken | null) => void;
  setSelectedCharacter: (char: Character | null) => void;
  setPlayerCharacterName: (name: string) => void;
  setPlayerData: (data: Character | null) => void;
  togglePinCharacter: (name: string) => void;
  updatePlayerAttacks: (attacks: Attack[]) => void;
}

const loadPinned = (): string[] => {
  try {
    const raw = localStorage.getItem(TB_CONFIG.STORAGE_KEYS.PINNED_CHARS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return [];
};

export const useRosterStore = create<RosterStoreState>((set) => ({
  roster: [],
  activeToken: null,
  selectedCharacter: null,
  playerCharacterName: localStorage.getItem(TB_CONFIG.STORAGE_KEYS.PLAYER_CHAR) || 'Артём',
  playerData: null,
  pinnedNames: loadPinned(),

  setRoster: (roster) => set({ roster }),
  setActiveToken: (activeToken) => set({ activeToken }),
  setSelectedCharacter: (selectedCharacter) => set({ selectedCharacter }),
  setPlayerCharacterName: (playerCharacterName) => {
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.PLAYER_CHAR, playerCharacterName);
    set({ playerCharacterName });
  },
  setPlayerData: (playerData) => set({ playerData }),
  togglePinCharacter: (name) => set((state) => {
    const exists = state.pinnedNames.includes(name);
    const pinnedNames = exists
      ? state.pinnedNames.filter((n) => n !== name)
      : [...state.pinnedNames, name];
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.PINNED_CHARS, JSON.stringify(pinnedNames));
    return { pinnedNames };
  }),
  updatePlayerAttacks: (attacks) => set((state) => {
    if (!state.playerData) return state;
    return { playerData: { ...state.playerData, attacks } };
  }),
}));
