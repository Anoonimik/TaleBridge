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
  if (typeof modStr === 'number') {
    if (modStr >= 3 && modStr <= 30) {
      return Math.floor((modStr - 10) / 2);
    }
    return modStr;
  }
  if (!modStr) return 0;
  const s = String(modStr).trim();

  // Case 1: Value contains modifier in parentheses, e.g. "14 (+2)", "10 (+0)", "8 (-1)"
  const parenMatch = s.match(/\(([+-]?\d+)\)/);
  if (parenMatch) {
    return parseInt(parenMatch[1], 10);
  }

  // Case 2: Explicit signed modifier, e.g. "+2", "-1", "+0"
  if (/^[+-]\d+$/.test(s)) {
    return parseInt(s, 10);
  }

  // Case 3: Pure ability score, e.g. "10", "12", "14", "16", "18", "8"
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num >= 3 && num <= 30) {
      return Math.floor((num - 10) / 2);
    }
    return num;
  }

  const match = s.match(/([+-]?\d+)/);
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
