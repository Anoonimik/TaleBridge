import { InventoryItem } from '../../../shared';

export interface ConsumableActionInfo {
  isConsumable: boolean;
  isHealing: boolean;
  formula: string | null;
  label: string;
}

/**
 * Standard D&D 5e healing potion formulas.
 */
const HEALING_POTIONS = [
  { match: /(?:высш|supreme)/i, formula: '10d4+20', name: 'Высшее зелье лечения' },
  { match: /(?:отличн|superior)/i, formula: '8d4+8', name: 'Отличное зелье лечения' },
  { match: /(?:больш(?:ое|его)?|greater)/i, formula: '4d4+4', name: 'Большое зелье лечения' },
  {
    match: /(?:зелье(?:\s+исцеления|\s+лечения)?|potion(?:\s+of\s+healing)?|лечебн|исцелен)/i,
    formula: '2d4+2',
    name: 'Зелье лечения',
  },
];

/**
 * Detects if an inventory item is consumable (potion, elixir, scroll, ration, etc.).
 */
export function isConsumableItem(item: InventoryItem): boolean {
  if (!item || !item.name) return false;

  // 1. Category check
  const cat = (item.category || '').toLowerCase();
  if (
    cat === 'зелья' ||
    cat === 'зелье' ||
    cat === 'снадобья' ||
    cat === 'свитки' ||
    cat === 'расходники'
  ) {
    return true;
  }

  // 2. Name keywords
  const name = item.name.toLowerCase();
  const consumableKeywords = [
    'зелье',
    'potion',
    'эликсир',
    'снадобье',
    'бальзам',
    'мазь',
    'припарка',
    'настойка',
    'свиток',
    'scroll',
    'факел',
    'рацион',
    'паек',
    'паёк',
    'антидот',
    'противоядие',
  ];

  if (consumableKeywords.some((kw) => name.includes(kw))) {
    return true;
  }

  // 3. Description check for dice formula (e.g. "2d4+2")
  const desc = (item.description || '').toLowerCase();
  if (
    /\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/i.test(desc) &&
    (desc.includes('хит') ||
      desc.includes('хп') ||
      desc.includes('восстанав') ||
      desc.includes('леч'))
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts or determines the healing dice formula for a potion item.
 */
export function getHealingPotionFormula(item: InventoryItem): string | null {
  const fullText = `${item.name} ${item.description || ''}`;

  for (const potion of HEALING_POTIONS) {
    if (potion.match.test(fullText)) {
      return potion.formula;
    }
  }

  // Check description for explicit formula with healing keywords
  const desc = item.description || '';
  if (/(?:хит|хп|восстанав|леч|heal|hp)/i.test(desc)) {
    const diceMatch = desc.match(/\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/i);
    if (diceMatch) {
      return diceMatch[1].replace(/\s+/g, '');
    }
  }

  return null;
}

/**
 * Fast deterministic and random local dice formula evaluator for offline use or fallback.
 */
export function evaluateLocalDiceFormula(formula: string): number {
  if (!formula || !formula.trim()) return 0;
  const clean = formula.replace(/\s+/g, '').toLowerCase();

  const match = clean.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
  if (!match) {
    const directNum = parseInt(clean, 10);
    return isNaN(directNum) ? 0 : directNum;
  }

  const count = parseInt(match[1], 10) || 1;
  const sides = parseInt(match[2], 10) || 4;
  const sign = match[3] || '+';
  const bonus = parseInt(match[4] || '0', 10) || 0;

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }

  return sign === '-' ? total - bonus : total + bonus;
}

/**
 * Returns complete UI and mechanical action metadata for an item.
 */
export function getConsumableActionInfo(item: InventoryItem): ConsumableActionInfo {
  if (!isConsumableItem(item)) {
    return {
      isConsumable: false,
      isHealing: false,
      formula: null,
      label: 'Использовать',
    };
  }

  const healingFormula = getHealingPotionFormula(item);
  if (healingFormula) {
    return {
      isConsumable: true,
      isHealing: true,
      formula: healingFormula,
      label: 'Выпить',
    };
  }

  const name = item.name.toLowerCase();
  const isDrinkable =
    name.includes('зелье') ||
    name.includes('potion') ||
    name.includes('эликсир') ||
    name.includes('настойка');

  // Check for non-healing dice formula (e.g. damage scroll)
  const desc = item.description || '';
  const genericDiceMatch = desc.match(/\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/i);

  return {
    isConsumable: true,
    isHealing: false,
    formula: genericDiceMatch ? genericDiceMatch[1].replace(/\s+/g, '') : null,
    label: isDrinkable ? 'Выпить' : 'Использовать',
  };
}
