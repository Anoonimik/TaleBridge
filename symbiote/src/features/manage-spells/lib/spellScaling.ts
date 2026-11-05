import { cleanUpcastDice } from '../../../../../packages/domain/dice';

/**
 * Utility functions for spell formula scaling and upcasting calculations.
 */

export function scaleDiceFormula(
  baseFormula: string,
  baseLevel: number,
  castLevel: number,
  desc?: string,
  upcastDice?: string,
): string {
  if (!baseFormula) return '';
  if (
    !Number.isInteger(baseLevel) ||
    !Number.isInteger(castLevel) ||
    baseLevel < 1 ||
    castLevel < baseLevel ||
    castLevel > 9
  )
    return baseFormula;
  const diff = castLevel - baseLevel;
  if (!diff) return baseFormula;
  // A higher slot does not imply extra dice. Require an explicit per-slot rule.
  const rule = desc?.match(
    /(?:увеличива[а-я]* на|дополнительно|increases? by|additional)\s*(\d+)d(\d+)[^.\n]{0,120}?(?:за кажд[а-я]*|for each|per)[^.\n]{0,80}?(?:уров[а-я]*|круг[а-я]*|slot level)/i,
  );
  const explicit = upcastDice ? /^(\d*)d(\d+)$/.exec(cleanUpcastDice(upcastDice)) : null;
  if (!explicit && !rule) return baseFormula;
  const count = Number(explicit ? explicit[1] || 1 : rule![1]) * diff;
  const sides = Number(explicit ? explicit[2] : rule![2]);
  if (!count || count > 100 || sides < 2 || sides > 1000)
    throw new Error('Слишком много дополнительных кубиков для одного броска.');
  const first = /^(\d*)d(\d+)(?=[+-]|$)/i.exec(baseFormula);
  if (first && Number(first[2]) === sides && Number(first[1] || 1) + count <= 100)
    return baseFormula.replace(
      /^(\d*)d(\d+)(?=[+-]|$)/i,
      `${Number(first[1] || 1) + count}d${sides}`,
    );
  return `${baseFormula}+${count}d${sides}`;
}

export interface FormulaScalingPreview {
  baseFormula: string;
  scaledFormula: string;
  diff: number;
  hasScaling: boolean;
  previewText: string;
  error?: string;
}

export function getFormulaScalingPreview(
  baseFormula: string | undefined,
  baseLevel: number,
  castLevel: number,
  desc?: string,
  upcastDice?: string,
): FormulaScalingPreview | null {
  if (!baseFormula || !baseFormula.match(/\d*d\d+/i)) {
    return null;
  }

  const diff = Math.max(0, castLevel - baseLevel);
  let scaledFormula: string;
  try {
    scaledFormula = scaleDiceFormula(baseFormula, baseLevel, castLevel, desc, upcastDice);
  } catch (error) {
    return {
      baseFormula,
      scaledFormula: baseFormula,
      diff,
      hasScaling: false,
      previewText: `Базовый урон: ${baseFormula}`,
      error: error instanceof Error ? error.message : 'Некорректное усиление.',
    };
  }
  const hasScaling = diff > 0 && scaledFormula !== baseFormula;

  const previewText = hasScaling
    ? `Базовый урон: ${baseFormula} -> При касте ${castLevel} кругом: ${scaledFormula}`
    : `Базовый урон: ${baseFormula}`;

  return {
    baseFormula,
    scaledFormula,
    diff,
    hasScaling,
    previewText,
  };
}
