import type { InventoryItem } from './types';
export function mergeInventoryEdit(
  original: InventoryItem,
  current: InventoryItem | undefined,
  edited: InventoryItem,
): InventoryItem {
  if (!current || current.id !== original.id || edited.id !== original.id)
    throw new Error('Предмет удален или заменен. Закройте окно и обновите инвентарь.');
  const next = { ...current };
  const fields = ['name', 'category', 'quantity', 'weight', 'equipped', 'description'] as const;
  const defaults = {
    name: '',
    category: 'Снаряжение',
    quantity: 1,
    weight: 0,
    equipped: false,
    description: '',
  };
  const value = (item: InventoryItem, field: (typeof fields)[number]) =>
    item[field] ?? defaults[field];
  for (const field of fields) {
    if (value(edited, field) === value(original, field)) continue;
    if (
      value(current, field) !== value(original, field) &&
      value(current, field) !== value(edited, field)
    )
      throw new Error(
        'Это поле уже изменено. Закройте окно и откройте актуальный предмет; ваш ввод пока сохранен.',
      );
    Object.assign(next, { [field]: edited[field] });
  }
  return next;
}
