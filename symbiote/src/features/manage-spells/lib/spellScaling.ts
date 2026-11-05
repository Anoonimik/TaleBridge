/**
 * Utility functions for spell formula scaling and upcasting calculations.
 */

export function scaleDiceFormula(
  baseFormula: string,
  baseLevel: number,
  castLevel: number,
  desc?: string,
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
  if (!diff || !desc) return baseFormula;
  // A higher slot does not imply extra dice. Require an explicit per-slot rule.
  const rule = desc.match(
    /(?:увеличива[а-я]* на|дополнительно|increases? by|additional)\s*(\d+)d(\d+)[^.\n]{0,120}?(?:за кажд[а-я]*|for each|per)[^.\n]{0,80}?(?:уров[а-я]*|круг[а-я]*|slot level)/i,
  );
  if (!rule) return baseFormula;
  const count = Number(rule[1]) * diff;
  const sides = Number(rule[2]);
  if (!count || count > 100 || sides < 2 || sides > 1000) return baseFormula;
  const first = /^(\d*)d(\d+)/i.exec(baseFormula);
  if (first && Number(first[2]) === sides && Number(first[1] || 1) + count <= 100)
    return baseFormula.replace(/^(\d*)d(\d+)/i, `${Number(first[1] || 1) + count}d${sides}`);
  return `${baseFormula}+${count}d${sides}`;
}

export interface FormulaScalingPreview {
  baseFormula: string;
  scaledFormula: string;
  diff: number;
  hasScaling: boolean;
  previewText: string;
}

export function getFormulaScalingPreview(
  baseFormula: string | undefined,
  baseLevel: number,
  castLevel: number,
  desc?: string,
): FormulaScalingPreview | null {
  if (!baseFormula || !baseFormula.match(/\d*d\d+/i)) {
    return null;
  }

  const diff = Math.max(0, castLevel - baseLevel);
  const scaledFormula = scaleDiceFormula(baseFormula, baseLevel, castLevel, desc);
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
