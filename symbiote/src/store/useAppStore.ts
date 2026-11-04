import { create } from 'zustand';
import { TB_CONFIG } from '../constants';

export type UserRole = 'gm' | 'player';
export type AppTab = 'story' | 'characters' | 'combat' | 'tools';
export type DiceMode = 'secret' | 'open';

interface AppState {
  role: UserRole;
  activeTab: AppTab;
  scale: '100%' | '85%';
  autoInspect: boolean;
  gmDiceMode: DiceMode;
  connected: boolean;
  statusText: string;
  cinemaMedia: { active: boolean; url?: string; type?: 'image' | 'audio' } | null;

  setRole: (role: UserRole) => void;
  setActiveTab: (tab: AppTab) => void;
  toggleScale: () => void;
  toggleAutoInspect: () => void;
  toggleGmDiceMode: () => void;
  setConnected: (connected: boolean, statusText?: string) => void;
  setCinemaMedia: (media: { active: boolean; url?: string; type?: 'image' | 'audio' } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: (localStorage.getItem(TB_CONFIG.STORAGE_KEYS.ROLE) as UserRole) || 'gm',
  activeTab: 'story',
  scale: (localStorage.getItem(TB_CONFIG.STORAGE_KEYS.COMPACT_MODE) === 'true' ? '85%' : '100%'),
  autoInspect: localStorage.getItem(TB_CONFIG.STORAGE_KEYS.AUTO_INSPECT) === 'true',
  gmDiceMode: (localStorage.getItem(TB_CONFIG.STORAGE_KEYS.GM_DICE_MODE) as DiceMode) || 'secret',
  connected: false,
  statusText: 'Поиск...',
  cinemaMedia: null,

  setRole: (role) => {
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.ROLE, role);
    set({ role });
  },
  setActiveTab: (activeTab) => set({ activeTab }),
  toggleScale: () => set((state) => {
    const next = state.scale === '100%' ? '85%' : '100%';
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.COMPACT_MODE, next === '85%' ? 'true' : 'false');
    return { scale: next };
  }),
  toggleAutoInspect: () => set((state) => {
    const next = !state.autoInspect;
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.AUTO_INSPECT, next ? 'true' : 'false');
    return { autoInspect: next };
  }),
  toggleGmDiceMode: () => set((state) => {
    const next = state.gmDiceMode === 'secret' ? 'open' : 'secret';
    localStorage.setItem(TB_CONFIG.STORAGE_KEYS.GM_DICE_MODE, next);
    return { gmDiceMode: next };
  }),
  setConnected: (connected, statusText) => set({
    connected,
    statusText: statusText || (connected ? 'В сети' : 'Поиск...'),
  }),
  setCinemaMedia: (cinemaMedia) => set({ cinemaMedia }),
}));
