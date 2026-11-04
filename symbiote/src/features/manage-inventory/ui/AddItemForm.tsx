import React, { useState } from 'react';
import { InventoryItem } from '../../../shared';

interface AddItemFormProps {
  onAdd: (item: InventoryItem) => void;
  onCancel: () => void;
}

const CATEGORIES = ['Снаряжение', 'Оружие', 'Броня', 'Зелья', 'Квестовое'];

export const AddItemForm: React.FC<AddItemFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Снаряжение');
  const [qty, setQty] = useState(1);
  const [weight, setWeight] = useState(0);
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: `it_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      category,
      quantity: Number(qty) || 1,
      weight: Number(weight) || 0,
      description: desc.trim() || undefined,
      equipped: category === 'Оружие' || category === 'Броня',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#141622] border border-[#262a3d] rounded-lg p-3 flex flex-col gap-2 shrink-0 animate-in fade-in duration-100 text-xs"
    >
      <div className="font-semibold text-slate-200 pb-1 border-b border-[#262a3d]">
        Новый предмет в инвентарь
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Название *</label>
          <input
            type="text"
            required
            placeholder="Зелье исцеления"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Количество</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Вес одного (кг)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Описание свойства</label>
        <input
          type="text"
          placeholder="Восстанавливает 2d4+2 хитов..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-[#262a3d]">
        <button
          type="button"
          className="px-3 py-1 rounded bg-[#1a1d2d] text-slate-400 hover:text-white"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
        >
          Добавить
        </button>
      </div>
    </form>
  );
};
