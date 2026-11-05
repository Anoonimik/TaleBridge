import React, { useState, useEffect } from 'react';
import { Package, Save } from 'lucide-react';
import { InventoryItem, ModalShell } from '../../../shared';

export interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  item: InventoryItem | null;
}

const CATEGORIES = ['Снаряжение', 'Оружие', 'Броня', 'Зелья', 'Квестовое'];

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Снаряжение');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState(0);
  const [equipped, setEquipped] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || 'Снаряжение');
      setQuantity(item.quantity ?? 1);
      setWeight(item.weight ?? 0);
      setEquipped(Boolean(item.equipped));
      setDescription(item.description || '');
    }
  }, [item, isOpen]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: item.id,
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
      weight: Math.max(0, Number(weight) || 0),
      equipped,
      description: description.trim() || undefined,
    });
    onClose();
  };

  const allCategories = CATEGORIES.includes(category)
    ? CATEGORIES
    : [category, ...CATEGORIES];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Редактировать предмет</span>
        </div>
      }
      subtitle={item.name}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 overflow-y-auto scrollbar-thin text-xs">
        {/* Name and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Название <span className="text-rose-400">*</span>
            </label>
            <input
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
            <label className="text-[11px] font-semibold text-slate-300">
              Категория
            </label>
            <select
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
            <label className="text-[11px] font-semibold text-slate-300">
              Количество (шт.)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Вес одного (кг)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Equipped Checkbox / Toggle */}
        <div className="p-2.5 bg-[#10111a] border border-[#262a3d] rounded-lg flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">
              Экипировка
            </span>
            <span className="text-[11px] text-slate-400">
              {equipped ? 'Предмет надет или готов к бою' : 'Предмет находится в рюкзаке'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
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
          <label className="text-[11px] font-semibold text-slate-300">
            Описание / Свойства
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание свойств, эффект зелья (например: Восстанавливает 2d4+2 хитов), особенности или заметки..."
            className="px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] focus:border-indigo-500 rounded text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none scrollbar-thin"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a3d] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
