export const cleanFormula = (raw: string): string => {
  if (!raw) return '1d20';
  const trimmed = raw.trim();
  if (/^[+-]\d+$/.test(trimmed)) {
    return `1d20${trimmed}`;
  }
  if (/^\d+$/.test(trimmed)) {
    return `1d20+${trimmed}`;
  }
  return trimmed;
};

export const parseModifier = (modStr: string | number | undefined): number => {
  if (typeof modStr === 'number') return modStr;
  if (!modStr) return 0;
  const match = String(modStr).match(/([+-]?\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
