import { create } from 'zustand';
import { Bookmark } from '../types';

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
  gmPin: string;
  vaultImages: VaultImage[];
  cinemaMedia: CinemaMediaPayload | null;
  bookmarks: Bookmark[];
  setRole: (role: UserRole) => void;
  setActiveTab: (tab: AppTab) => void;
  setScale: (scale: string) => void;
  setDiceSecret: (secret: boolean) => void;
  setConnected: (connected: boolean) => void;
  setVaultName: (name: string) => void;
  setGmPin: (pin: string) => void;
  setVaultImages: (images: VaultImage[]) => void;
  setCinemaMedia: (media: CinemaMediaPayload | null) => void;
  setBookmarks: (bookmarks: Bookmark[]) => void;
}

const getInitialRole = (): UserRole => {
  const storedRole = localStorage.getItem('tb_role') as UserRole;
  const isAuth = sessionStorage.getItem('tb_gm_auth') === 'true';
  if (storedRole === 'gm' && isAuth) return 'gm';
  return 'player';
};

export const useAppStore = create<AppStore>((set) => ({
  role: getInitialRole(),
  activeTab: 'story',
  scale: localStorage.getItem('tb_scale') || '100%',
  diceSecret: false,
  connected: false,
  vaultName: 'Obsidian Vault',
  gmPin: localStorage.getItem('tb_gm_pin') || '5',
  vaultImages: [],
  cinemaMedia: null,
  bookmarks: [],

  setRole: (role) => {
    localStorage.setItem('tb_role', role);
    set({ role });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setScale: (scale) => {
    localStorage.setItem('tb_scale', scale);
    set({ scale });
  },
  setDiceSecret: (diceSecret) => set({ diceSecret }),
  setConnected: (connected) => set({ connected }),
  setVaultName: (vaultName) => set({ vaultName }),
  setGmPin: (gmPin) => {
    localStorage.setItem('tb_gm_pin', gmPin);
    set({ gmPin });
  },
  setVaultImages: (vaultImages) => set({ vaultImages: Array.isArray(vaultImages) ? vaultImages : [] }),
  setCinemaMedia: (cinemaMedia) => set({ cinemaMedia }),
  setBookmarks: (bookmarks) => set({ bookmarks: Array.isArray(bookmarks) ? bookmarks : [] }),
}));
