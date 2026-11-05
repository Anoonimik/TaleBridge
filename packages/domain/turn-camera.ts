import type { CombatState } from './types';
export function turnCameraBookmark(previous: CombatState, next: CombatState): string | null {
  if (!next.active) return null;
  const id = next.activeCombatantId || next.combatants[next.turnIndex]?.id;
  const oldId = previous.activeCombatantId || previous.combatants[previous.turnIndex]?.id;
  if (previous.active && oldId === id && previous.round === next.round) return null;
  return next.combatants.find((entry) => entry.id === id)?.cameraBookmarkId || null;
}
