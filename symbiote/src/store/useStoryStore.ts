import { create } from 'zustand';
import { Scene } from '../types';

interface StoryStoreState {
  scenes: Scene[];
  activeScene: Scene | null;
  sceneHistory: string[];

  setScenes: (scenes: Scene[]) => void;
  setActiveScene: (scene: Scene | null) => void;
  goToScene: (sceneId: string) => void;
  goBack: () => void;
}

export const useStoryStore = create<StoryStoreState>((set) => ({
  scenes: [],
  activeScene: null,
  sceneHistory: [],

  setScenes: (scenes) => set((state) => {
    let activeScene = state.activeScene;
    if (!activeScene && scenes.length > 0) {
      activeScene = scenes[0];
    } else if (activeScene) {
      const refreshed = scenes.find((s) => s.id === activeScene?.id);
      if (refreshed) activeScene = refreshed;
    }
    return { scenes, activeScene };
  }),

  setActiveScene: (activeScene) => set((state) => {
    if (!activeScene) return { activeScene: null };
    const sceneHistory = state.activeScene
      ? [...state.sceneHistory, state.activeScene.id]
      : state.sceneHistory;
    return { activeScene, sceneHistory };
  }),

  goToScene: (sceneId) => set((state) => {
    const target = state.scenes.find((s) => s.id === sceneId);
    if (!target) return state;
    const sceneHistory = state.activeScene
      ? [...state.sceneHistory, state.activeScene.id]
      : state.sceneHistory;
    return { activeScene: target, sceneHistory };
  }),

  goBack: () => set((state) => {
    if (state.sceneHistory.length === 0) return state;
    const prevId = state.sceneHistory[state.sceneHistory.length - 1];
    const prevScene = state.scenes.find((s) => s.id === prevId);
    if (!prevScene) return state;
    return {
      activeScene: prevScene,
      sceneHistory: state.sceneHistory.slice(0, -1),
    };
  }),
}));
