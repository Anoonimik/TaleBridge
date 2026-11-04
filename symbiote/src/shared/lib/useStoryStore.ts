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
    set({ scenes });
    if (!get().activeScene && scenes.length > 0) {
      set({ activeScene: scenes[0] });
    }
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
