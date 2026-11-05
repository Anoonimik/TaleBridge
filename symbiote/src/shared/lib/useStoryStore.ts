import { create } from 'zustand';
import { Scene } from '../types';

interface StoryStore {
  scenes: Scene[];
  activeScene: Scene | null;
  sceneHistory: string[];
  setScenes: (scenes: Scene[]) => void;
  setActiveScene: (scene: Scene | null) => void;
  goToScene: (sceneId: string) => void;
  goBack: () => void;
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  scenes: [],
  activeScene: null,
  sceneHistory: [],

  setScenes: (scenes) => {
    const safeScenes = Array.isArray(scenes) ? scenes : [];
    set({ scenes: safeScenes });
    const current = get().activeScene;
    set({ activeScene: safeScenes.find(s => s.id === current?.id) || safeScenes[0] || null, sceneHistory: get().sceneHistory.filter(id => safeScenes.some(s => s.id === id)) });
  },

  setActiveScene: (activeScene) => set({ activeScene }),

  goToScene: (sceneId) => {
    const { scenes, activeScene, sceneHistory } = get();
    const target = scenes.find((s) => s.id === sceneId);
    if (!target) return;

    if (activeScene && activeScene.id !== sceneId) {
      set({
        sceneHistory: [...sceneHistory, activeScene.id],
        activeScene: target,
      });
    } else {
      set({ activeScene: target });
    }
  },

  goBack: () => {
    const { scenes, sceneHistory } = get();
    if (sceneHistory.length === 0) return;

    const previousId = sceneHistory[sceneHistory.length - 1];
    const newHistory = sceneHistory.slice(0, -1);
    const target = scenes.find((s) => s.id === previousId);

    if (target) {
      set({ activeScene: target, sceneHistory: newHistory });
    }
  },
}));
