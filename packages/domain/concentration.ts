import type { Character } from './types';
import { createId } from './id';
export const breaksConcentration = (conditions: string[] = []) =>
  conditions.some((condition) =>
    ['incapacitated', 'unconscious', 'stunned', 'paralyzed', 'petrified'].includes(condition),
  );
export function concentrationDamage(current: Character, hp: number, damage: number) {
  if (!current.activeConcentration) return { activeConcentration: null, concentrationChecks: [] };
  if (hp <= 0 || breaksConcentration(current.conditions))
    return { activeConcentration: null, concentrationChecks: [] };
  const checks = current.concentrationChecks || [];
  if (damage <= 0)
    return { activeConcentration: current.activeConcentration, concentrationChecks: checks };
  if (checks.length >= 100) throw new Error('Сначала завершите ожидающие проверки концентрации');
  return {
    activeConcentration: current.activeConcentration,
    concentrationChecks: [
      ...checks,
      { id: createId(), dc: Math.max(10, Math.floor(damage / 2)), damage },
    ],
  };
}
