import React, { useState } from 'react';
import { InventoryItem, Character } from '../../shared';
import { ItemCard } from '../../entities';
import { useRosterStore, wsBridge } from '../../shared';

interface InventoryManagerProps {
  playerData: Character | null;
}

export const InventoryManager = ({ playerData }: InventoryManagerProps) => {
  const { playerCharacterName, setPlayerData } = useRosterStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Снаряжение');
  const [newQty, setNewQty] = useState(1);
  const [newWeight, setNewWeight] = useState(0);
  const [newDesc, setNewDesc] = useState('');

  const items = playerData?.inventory || [];

  // Calculate weights
  const totalWeight = items.reduce((acc, it) => {
    const q = it.quantity || 1;
    const w = it.weight || 0;
    return acc + q * w;
  }, 0);

  // Max carry weight: STR score * 7.5 kg (or 15 lbs)
  const strScore = parseInt(playerData?.stats?.str || '10', 10) || 10;
  const maxWeight = Math.round(strScore * 7.5);
  const weightPercent = Math.min(100, Math.round((totalWeight / (maxWeight || 1)) * 100));

  let weightStatusColor = 'bg-emerald-500';
  let weightStatusText = 'text-emerald-400';
  if (weightPercent >= 90) {
    weightStatusColor = 'bg-rose-500';
    weightStatusText = 'text-rose-400';
  } else if (weightPercent >= 70) {
    weightStatusColor = 'bg-amber-500';
    weightStatusText = 'text-amber-400';
  }

  const filteredItems = items.filter((it) => {
    if (activeCategory !== 'all' && it.category !== activeCategory) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      (it.description && it.description.toLowerCase().includes(q))
    );
  });

  const saveInventory = (updatedItems: InventoryItem[]) => {
    if (!playerData) return;
    const updated = { ...playerData, inventory: updatedItems };
    setPlayerData(updated);

    if (playerCharacterName) {
      wsBridge.send('UPDATE_INVENTORY', {
        characterName: playerCharacterName,
        items: updatedItems,
      });
    }
  };

  const handleToggleEquip = (id: string, equipped: boolean) => {
    const updated = items.map((it) => (it.id === id ? { ...it, equipped } : it));
    saveInventory(updated);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = items
      .map((it) => {
        if (it.id !== id) return it;
        const newQ = (it.quantity || 1) + delta;
        return newQ > 0 ? { ...it, quantity: newQ } : null;
      })
      .filter(Boolean) as InventoryItem[];
    saveInventory(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    saveInventory(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: InventoryItem = {
      id: `it_${Math.random().toString(36).substring(2, 9)}`,
      name: newName.trim(),
      category: newCategory,
      quantity: Number(newQty) || 1,
      weight: Number(newWeight) || 0,
      description: newDesc.trim() || undefined,
      equipped: newCategory === 'Оружие' || newCategory === 'Броня',
    };

    saveInventory([newItem, ...items]);
    setIsAdding(false);
    setNewName('');
    setNewQty(1);
    setNewWeight(0);
    setNewDesc('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-2.5">
      {/* Weight Gauge Panel */}
      <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Переносимый вес
          </span>
          <span className={`font-mono text-xs font-semibold ${weightStatusText}`}>
            <strong>{totalWeight.toFixed(1)}</strong> / {maxWeight} кг ({weightPercent}%)
          </span>
        </div>

        <div className="w-full h-2 bg-[#10111a] rounded-full overflow-hidden border border-[#1f2233]">
          <div
            className={`h-full transition-all duration-300 ${weightStatusColor}`}
            style={{ width: `${weightPercent}%` }}
          />
        </div>
      </div>

      {/* Controls: Search + Add Button */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Поиск предмета..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? '✕ Закрыть' : '+ Предмет'}
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin shrink-0">
        {['all', 'Оружие', 'Броня', 'Зелья', 'Снаряжение', 'Квестовое'].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-[#141622] text-slate-400 border-[#262a3d] hover:text-white'
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? `Все (${items.length})` : cat}
          </button>
        ))}
      </div>

      {/* Inline Add Item Form */}
      {isAdding && (
        <form
          onSubmit={handleAddItem}
          className="bg-[#141622] border border-[#262a3d] rounded-lg p-3 flex flex-col gap-2 shrink-0 animate-in fade-in duration-100 text-xs"
        >
          <div className="font-semibold text-slate-200 pb-1 border-b border-[#262a3d]">
            Новый предмет в инвентарь
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Название *</label>
              <input
                type="text"
                required
                placeholder="Зелье исцеления"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Категория</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
              >
                <option value="Снаряжение">Снаряжение</option>
                <option value="Оружие">Оружие</option>
                <option value="Броня">Броня</option>
                <option value="Зелья">Зелья</option>
                <option value="Квестовое">Квестовое</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Количество</label>
              <input
                type="number"
                min="1"
                value={newQty}
                onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Вес одного (кг)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={newWeight}
                onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Описание свойства</label>
            <input
              type="text"
              placeholder="Восстанавливает 2d4+2 хитов..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-[#262a3d]">
            <button
              type="button"
              className="px-3 py-1 rounded bg-[#1a1d2d] text-slate-400 hover:text-white"
              onClick={() => setIsAdding(false)}
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
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {items.length === 0 ? 'Инвентарь пуст. Добавьте предметы кнопкой выше.' : 'Предметы не найдены'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleEquip={handleToggleEquip}
              onUpdateQuantity={handleUpdateQuantity}
              onDelete={handleDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
};
