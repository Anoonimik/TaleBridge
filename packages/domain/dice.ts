/** The supported expression is a sum of dice terms and integer modifiers. Never truncate. */
export function cleanDiceFormula(raw: string): string {
  let value = String(raw || '1d20').replace(/\s+/g, '').toLowerCase();
  if (/^[+-]?\d+$/.test(value)) value = `1d20${value.startsWith('-') || value.startsWith('+') ? '' : '+'}${value}`;
  if (value.length > 200 || !/^\d*d\d+(?:(?:kh|kl)\d+)?(?:[+-](?:\d*d\d+(?:(?:kh|kl)\d+)?|\d+))*$/.test(value)) throw new Error('Неподдерживаемая формула броска');
  for (const match of value.matchAll(/(\d*)d(\d+)(?:(kh|kl)(\d+))?/g)) {
    const count = Number(match[1] || 1), sides = Number(match[2]), keep = Number(match[4] || count);
    if (count < 1 || count > 100 || sides < 2 || sides > 1000 || keep < 1 || keep > count) throw new Error('Недопустимые параметры кубиков');
  }
  return value;
}
