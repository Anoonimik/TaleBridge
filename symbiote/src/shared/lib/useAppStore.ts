import { create } from 'zustand';
import { Bookmark } from '../types';
import { STORAGE_KEYS } from '../config/constants';
import { wsBridge } from '../api/websocket';

export type UserRole = 'gm' | 'player';
export type AppTab = 'story' | 'characters' | 'combat' | 'tools' | 'player-cockpit';

export interface VaultImage {
  name: string;
  path: string;
  extension?: string;
  isPublic?: boolean;
}

export interface CinemaMediaPayload {
  type: 'image' | 'video' | 'text' | 'audio';
  url: string;
  title?: string;
  description?: string;
  active: boolean;
}

interface AppStore {
  role: UserRole;
  activeTab: AppTab;
  scale: string;
  diceSecret: boolean;
  connected: boolean;
  vaultName: string;
  lastError: string;
  vaultImages: VaultImage[];
  cinemaMedia: CinemaMediaPayload | null;
  bookmarks: Bookmark[];
  setRole: (role: UserRole) => void;
  setActiveTab: (tab: AppTab) => void;
  setScale: (scale: string) => void;
  setDiceSecret: (secret: boolean) => void;
  setConnected: (connected: boolean) => void;
  setVaultName: (name: string) => void;
  setLastError: (error: string) => void;
  setVaultImages: (images: VaultImage[]) => void;
  setCinemaMedia: (media: CinemaMediaPayload | null) => void;
  stopBroadcast: () => void;
  setBookmarks: (bookmarks: Bookmark[]) => void;
}

const getInitialRole = (): UserRole => 'player';

const getInitialScale = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SCALE);
    if (stored) return stored;
  } catch {
    // storage unavailable
  }
  if (typeof window !== 'undefined' && (window.screen?.width >= 2560 || window.screen?.height >= 1440)) {
    return '150%';
  }
  return '100%';
};

export const useAppStore = create<AppStore>((set) => ({
  role: getInitialRole(),
  activeTab: 'story',
  scale: getInitialScale(),
  diceSecret: false,
  connected: false,
  vaultName: 'Obsidian Vault',
  lastError: '',
  vaultImages: [],
  cinemaMedia: null,
  bookmarks: [],

  setRole: (role) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROLE, role);
    } catch {
      // storage unavailable
    }
    set({ role });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setScale: (scale) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCALE, scale);
    } catch {
      // storage unavailable
    }
    set({ scale });
  },
  setDiceSecret: (diceSecret) => set({ diceSecret }),
  setConnected: (connected) => set({ connected }),
  setVaultName: (vaultName) => set({ vaultName }),
  setLastError: (lastError) => set({lastError}),
  setVaultImages: (vaultImages) => set({ vaultImages: Array.isArray(vaultImages) ? vaultImages : [] }),
  setCinemaMedia: (cinemaMedia) => set({ cinemaMedia }),
  stopBroadcast: () => {
    set({ cinemaMedia: null });
    wsBridge.send('DISMISS_HANDOUT', {});
  },
  setBookmarks: (bookmarks) => set({ bookmarks: Array.isArray(bookmarks) ? bookmarks : [] }),
}));
