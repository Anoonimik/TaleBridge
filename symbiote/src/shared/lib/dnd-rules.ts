import type {
  CombatSide,
  Attack,
  Character,
  InventoryItem,
} from '../../../../packages/domain/types';
import { parseModifier, formatModifier } from './text-utils';

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
export function getHpColorClass(
  curHp: number,
  maxHp: number,
): {
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

/**
 * Doubles damage dice according to official D&D 5e Critical Hit rules.
 * E.g. "1d8 + 3" -> "2d8 + 3", "2d6 + 4" -> "4d6 + 4", "1d10" -> "2d10".
 * Modifiers and non-dice terms remain unchanged.
 */
export function doubleDamageDice(formula: string | undefined | null): string {
  if (!formula || typeof formula !== 'string') return '';
  return formula.replace(/\b(\d*)d(\d+)\b/gi, (_, countStr, sides) => {
    const count = countStr ? parseInt(countStr, 10) : 1;
    return `${count * 2}d${sides}`;
  });
}

/**
 * Checks if an item is a weapon based on its category or common weapon names.
 */
export const COMMON_WEAPON_REGEX =
  /(?:меч|топор|лук|кинжал|арбалет|молот|булава|посох|коп[ьъ]?[её]|рапира|ятаган|клинок|дубина|алебарда|пика|трезубец|кнут|дротик|праща|серп|моргенштерн|секира|глефа)/i;

export function isWeaponItem(
  item: { name?: string; category?: string } | null | undefined,
): boolean {
  if (!item) return false;
  if (item.category && item.category.trim().toLowerCase() === 'оружие') return true;
  if (item.name && COMMON_WEAPON_REGEX.test(item.name)) return true;
  return false;
}

/**
 * Automatically parses or suggests damage dice for a weapon.
 * E.g. кинжал -> 1d4, меч -> 1d8, двуручный меч -> 2d6, лук -> 1d8.
 */
export function suggestWeaponDamageDice(name: string, description?: string): string {
  // Check if description or name explicitly has damage dice formula (e.g. 1d8, 2d6, 1d6+2)
  const fullText = `${description || ''} ${name || ''}`;
  const diceMatch = fullText.match(/\b\d*d\d+(?:\s*[+-]\s*\d+)?\b/i);
  if (diceMatch) {
    const found = diceMatch[0].trim();
    if (!found.toLowerCase().includes('d20')) {
      return found;
    }
  }

  const lower = name.toLowerCase();
  if (
    /коротк[а-я]*\s+(?:меч|лук)|ручн[а-я]*\s+арбалет|shortsword|shortbow|hand crossbow/i.test(lower)
  )
    return '1d6';

  // 2d6: двуручный меч, двуручный молот
  if (
    /двуручн(?:ый|ого|ому)?\s+меч/i.test(lower) ||
    /двуручн(?:ый|ого|ому)?\s+молот/i.test(lower)
  ) {
    return '2d6';
  }

  // 1d12: двуручный топор, секира
  if (/двуручн(?:ый|ого|ому)?\s+топор/i.test(lower) || /секир/i.test(lower)) {
    return '1d12';
  }

  // 1d10: алебарда, пика, глефа, тяжелый арбалет
  if (/алебард|пик[ае]|глеф|тяж[её]л(?:ый|ого)?\s+арбалет/i.test(lower)) {
    return '1d10';
  }

  // 1d8: длинный меч, меч, боевой топор, боевой молот, длинный лук, лук, рапира, арбалет
  if (
    /длинн(?:ый|ого)?\s+меч|рапир|длинн(?:ый|ого)?\s+лук|боевой\s+топор|боевой\s+молот/i.test(lower)
  ) {
    return '1d8';
  }
  if (/меч|лук|арбалет/i.test(lower)) {
    return '1d8';
  }

  // 1d6: короткий меч, короткий лук, булава, посох, копье, копьё, ручной топор, ятаган, скимитар, ручной арбалет
  if (
    /коротк(?:ий|ого)?\s+меч|коротк(?:ий|ого)?\s+лук|ручн(?:ой|ого)?\s+топор|ручн(?:ой|ого)?\s+арбалет|булав|посох|коп[ьъ]?[её]|ятаган|скимитар|трезубец/i.test(
      lower,
    )
  ) {
    return '1d6';
  }
  if (/топор|молот/i.test(lower)) {
    return '1d6';
  }

  // 1d4: кинжал, дротик, праща, дубина, серп, кнут
  if (/кинжал|дротик|пращ|дубин|серп|кнут|нож|стилет/i.test(lower)) {
    return '1d4';
  }

  return '1d6';
}

/**
 * Creates an Attack object from an inventory weapon item, calculating attack bonus
 * based on character's STR or DEX mod + proficiency bonus.
 */
export function createAttackFromWeapon(item: InventoryItem, character: Character | null): Attack {
  const level = character?.level || 1;
  const profBonus = computeProfBonus(level);
  const strMod = parseModifier(character?.stats?.str || '10');
  const dexMod = parseModifier(character?.stats?.dex || '10');

  const itemName = item.name.trim();
  const lower = itemName.toLowerCase();

  const isRanged = /лук|арбалет|дротик|пращ|выстрел|дистанц/i.test(lower);
  const isFinesse = /кинжал|рапир|коротк(?:ий)?\s+меч|ятаган|скимитар|фехтовальн|кнут/i.test(lower);

  let abilityMod = strMod;
  if (isRanged) {
    abilityMod = /дротик/i.test(lower) ? Math.max(strMod, dexMod) : dexMod;
  } else if (isFinesse) {
    abilityMod = Math.max(strMod, dexMod);
  }

  const totalHitBonus = abilityMod + profBonus;
  const hitStr = formatModifier(totalHitBonus);

  const baseDice = suggestWeaponDamageDice(itemName, item.description);
  let dmgStr = baseDice;
  if (!/[+-]\s*\d+$/.test(baseDice)) {
    if (abilityMod > 0) {
      dmgStr = `${baseDice} + ${abilityMod}`;
    } else if (abilityMod < 0) {
      dmgStr = `${baseDice} - ${Math.abs(abilityMod)}`;
    }
  }

  const attackType = isRanged ? 'Дальнобойная' : 'Рукопашная';

  return {
    name: itemName,
    hit: hitStr,
    dmg: dmgStr,
    type: attackType,
    desc: item.description ? item.description.slice(0, 150) : undefined,
  };
}

/** The requested attack is exactly 1d20 plus an integer modifier. */
export function resolveAttackRoll(total: number, bonus: number) {
  const natural = total - bonus;
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    throw new Error('Некорректный результат d20');
  return { natural, critical: natural === 20 };
}
