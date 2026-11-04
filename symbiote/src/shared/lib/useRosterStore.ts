import { create } from 'zustand';
import { Character, Attack, Clue, TaleSpireCreature } from '../types';
import { wsBridge } from '../api/websocket';

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
}

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

export const useRosterStore = create<RosterStore>((set, get) => ({
  roster: [],
  selectedToken: null,
  selectedCharacter: null,
  noteContent: null,
  playerCharacterName: localStorage.getItem('tb_player_character') || '',
  playerData: getStoredJson<Character>('tb_player_data'),
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

  setPlayerData: (playerData) => {
    if (playerData) {
      try {
        localStorage.setItem('tb_player_data', JSON.stringify(playerData));
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem('tb_player_data');
    }
    set({ playerData });
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

    set({ playerData: { ...playerData, hp: newHp } });

    if (playerCharacterName) {
      wsBridge.send('UPDATE_CHARACTER_HP', {
        characterName: playerCharacterName,
        hp: newHp,
        maxHp: maxHp,
      });
    }
  },
}));
