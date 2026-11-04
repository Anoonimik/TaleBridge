import { useRosterStore } from '../store/useRosterStore';
import { useAppStore } from '../store/useAppStore';
import { useLogStore } from '../store/useLogStore';

export const initTaleSpire = () => {
  if (typeof window === 'undefined') return;

  // Global callback for TaleSpire selection changes
  (window as any).handleSelectionChanged = async (response: any) => {
    try {
      if (window.TS?.creatures?.getSelectedCreatures) {
        const creatures = await window.TS.creatures.getSelectedCreatures();
        if (creatures && creatures.length > 0) {
          const c = creatures[0];
          const token = {
            id: c.id,
            name: c.name || 'Миниатюра',
            hp: c.hp?.value ?? 14,
            maxHp: c.hp?.max ?? 14,
          };
          useRosterStore.getState().setActiveToken(token);

          // Auto-inspect if enabled
          if (useAppStore.getState().autoInspect) {
            const roster = useRosterStore.getState().roster;
            const matched = roster.find((r) => r.name.toLowerCase() === token.name.toLowerCase());
            if (matched) {
              useRosterStore.getState().setSelectedCharacter(matched);
            }
          }
          return;
        }
      }
    } catch (e) {
      console.warn('[TaleSpire] Error fetching selected creature:', e);
    }
    useRosterStore.getState().setActiveToken(null);
  };

  // Global callback for TaleSpire dice roll results
  (window as any).handleRollResults = (response: any) => {
    try {
      if (response && response.results) {
        useLogStore.getState().addLog(`Результат броска: ${JSON.stringify(response.results)}`, 'roll');
      }
    } catch (e) {
      // silent
    }
  };
};
