/**
 * Utility functions for spell formula scaling and upcasting calculations.
 */

export function scaleDiceFormula(
  baseFormula: string,
  baseLevel: number,
  castLevel: number,
  desc?: string
): string {
  if (!baseFormula) return '';
  const diff = Math.max(0, castLevel - baseLevel);
  if (diff === 0) return baseFormula;

  let dicePerLevel = 1;
  if (desc) {
    const match = desc.match(/(?:на|увеличивается на|дополнительно)\s*(\d+)\s*d\s*(\d+)/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        dicePerLevel = parsed;
      }
    }
  }

  return baseFormula.replace(/(\d*)d(\d+)/i, (_, countStr, dieSides) => {
    const baseCount = countStr ? parseInt(countStr, 10) : 1;
    const scaledCount = baseCount + diff * dicePerLevel;
    return `${scaledCount}d${dieSides}`;
  });
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
  desc?: string
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
