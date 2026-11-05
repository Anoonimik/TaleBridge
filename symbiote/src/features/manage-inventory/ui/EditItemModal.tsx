import { inventorySchema } from '../../../../../packages/protocol';
import { useAsyncAction } from '../../../shared/lib/hooks/useAsyncAction';
import React, { useState } from 'react';
import { Package, Save } from 'lucide-react';
import type { InventoryItem } from '../../../../../packages/domain/types';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void | Promise<void>;
  item: InventoryItem | null;
}

const CATEGORIES = ['Снаряжение', 'Оружие', 'Броня', 'Зелья', 'Квестовое'];

export const EditItemModal = (props: EditItemModalProps) => {
  if (!props.isOpen || !props.item) return null;
  return <EditItemForm key={props.item.id} {...props} item={props.item} />;
};

function EditItemForm({
  onClose,
  onSave,
  item,
}: Omit<EditItemModalProps, 'item'> & { item: InventoryItem }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || 'Снаряжение');
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1));
  const [weight, setWeight] = useState(String(item.weight ?? 0));
  const [error, setError] = useState('');
  const { pending, error: saveError, run } = useAsyncAction();
  const [equipped, setEquipped] = useState(Boolean(item.equipped));
  const [description, setDescription] = useState(item.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const edited = {
      ...item,
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: Number(quantity),
      weight: Number(weight),
      equipped,
      description: description.trim() || undefined,
    };
    const parsed = inventorySchema.safeParse([edited]);
    if (!parsed.success) {
      setError(
        'Проверьте поля: название и категория — до 500 символов, описание — до 4096, количество — целое от 1 до 100000, вес — от 0 до 100000.',
      );
      return;
    }
    setError('');
    void run(async (isCurrent) => {
      await onSave(parsed.data[0]);
      if (isCurrent()) onClose();
    });
  };

  const allCategories = CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES];

  return (
    <ModalShell
      isOpen
      onClose={pending ? () => {} : onClose}
      closeOnBackdrop={!pending}
      closeOnEscape={!pending}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Редактировать предмет</span>
        </div>
      }
      subtitle={item.name}
      maxWidthClass="max-w-md"
    >
      <form
        onSubmit={handleSubmit}
        className="p-4 flex flex-col gap-3.5 overflow-y-auto scrollbar-thin text-xs"
      >
        <fieldset disabled={pending} className="contents">
          {/* Name and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Название <span className="text-rose-400">*</span>
              </label>
              <input
                aria-label="Название предмета"
                maxLength={500}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название предмета..."
                className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300">Категория</label>
              <select
                aria-label="Категория предмета"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 focus:outline-none transition-colors cursor-pointer"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity and Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300">Количество (шт.)</label>
              <input
                type="number"
                aria-label="Количество предметов"
                required
                max="100000"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300">Вес одного (кг)</label>
              <input
                type="number"
                aria-label="Вес одного предмета (кг)"
                required
                max="100000"
                min="0"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Equipped Checkbox / Toggle */}
          <div className="p-2.5 bg-[#10111a] border border-[#262a3d] rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Экипировка</span>
              <span className="text-[11px] text-slate-400">
                {equipped ? 'Предмет надет или готов к бою' : 'Предмет находится в рюкзаке'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                aria-label="Предмет экипирован"
                type="checkbox"
                checked={equipped}
                onChange={(e) => setEquipped(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1a1d2d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Description / Properties / Dice Formula */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-300">Описание / Свойства</label>
            <textarea
              aria-label="Описание предмета"
              maxLength={4096}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание свойств, эффект зелья (например: Восстанавливает 2d4+2 хитов), особенности или заметки..."
              className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none scrollbar-thin"
            />
          </div>

          <p role="alert" className="text-rose-300">
            {error || saveError}
          </p>
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a3d] mt-1">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{pending ? 'Сохранение…' : 'Сохранить'}</span>
            </button>
          </div>
        </fieldset>
      </form>
    </ModalShell>
  );
}
