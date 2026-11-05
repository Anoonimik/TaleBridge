import { CombatSide } from '../types';

/**
 * Computes D&D 5e Proficiency Bonus from character level.
 * Level 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6.
 */
export function computeProfBonus(level: number | undefined | null): number {
  const safeLevel = Math.max(1, Math.min(20, Number(level) || 1));
  return Math.floor((safeLevel - 1) / 4) + 2;
}

/**
 * Returns color classes and semantic color code for HP thresholds:
 * > 50%: emerald (healthy)
 * 26% - 50%: amber (wounded)
 * <= 25%: rose (critical)
 */
export function getHpColorClass(curHp: number, maxHp: number): {
  color: string;
  textClass: string;
  bgClass: string;
  barColor: string;
} {
  const safeMax = Math.max(1, maxHp || 1);
  const ratio = curHp / safeMax;

  if (ratio <= 0.25) {
    return {
      color: '#ef4444',
      textClass: 'text-rose-400',
      bgClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      barColor: '#ef4444',
    };
  }
  if (ratio <= 0.5) {
    return {
      color: '#f59e0b',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      barColor: '#f59e0b',
    };
  }
  return {
    color: '#10b981',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    barColor: '#10b981',
  };
}

/**
 * Normalizes an attack hit bonus with a '+' or '-' sign.
 * E.g. "5" -> "+5", "+5" -> "+5", "-2" -> "-2"
 */
export function normalizeHitBonus(hit: string | number | undefined | null): string {
  if (hit === undefined || hit === null) return '+0';
  const str = String(hit).trim();
  if (!str) return '+0';
  if (str.startsWith('+') || str.startsWith('-')) return str;
  return `+${str}`;
}

/**
 * Maps CombatSide ('player', 'ally', 'neutral', 'enemy') to Russian category label.
 */
export function sideToCategory(side: CombatSide | string | undefined): string {
  switch (side) {
    case 'player':
      return 'Игроки';
    case 'ally':
      return 'Союзники';
    case 'neutral':
      return 'Нейтралы';
    case 'enemy':
    default:
      return 'Враги';
  }
}

/**
 * Maps category string to CombatSide.
 */
export function categoryToSide(category: string | undefined): CombatSide {
  switch (category) {
    case 'Игроки':
      return 'player';
    case 'Союзники':
      return 'ally';
    case 'Нейтралы':
      return 'neutral';
    case 'Враги':
    default:
      return 'enemy';
  }
}
