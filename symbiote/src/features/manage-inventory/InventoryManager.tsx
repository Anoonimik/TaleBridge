import React, { useState, useMemo } from 'react';
import { InventoryItem, Character, useRosterStore, wsBridge } from '../../shared';
import { ItemCard } from '../../entities';
import { InventoryWeightGauge, AddItemForm } from './ui';

interface InventoryManagerProps {
  playerData: Character | null;
}

const CATEGORIES = ['all', 'Оружие', 'Броня', 'Зелья', 'Снаряжение', 'Квестовое'];

export const InventoryManager = ({ playerData }: InventoryManagerProps) => {
  const { playerCharacterName, setPlayerData } = useRosterStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const items = useMemo(() => playerData?.inventory || [], [playerData?.inventory]);

  // Calculate weights with memoization
  const totalWeight = useMemo(
    () =>
      items.reduce((acc, it) => {
        const q = it.quantity || 1;
        const w = it.weight || 0;
        return acc + q * w;
      }, 0),
    [items]
  );

  // Max carry weight: STR score * 7.5 kg (or 15 lbs)
  const maxWeight = useMemo(() => {
    const strScore = parseInt(playerData?.stats?.str || '10', 10) || 10;
    return Math.round(strScore * 7.5);
  }, [playerData?.stats?.str]);

  const weightPercent = useMemo(
    () => Math.min(100, Math.round((totalWeight / (maxWeight || 1)) * 100)),
    [totalWeight, maxWeight]
  );

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (activeCategory !== 'all' && it.category !== activeCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q))
      );
    });
  }, [items, activeCategory, search]);

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

  const handleAddItem = (newItem: InventoryItem) => {
    saveInventory([newItem, ...items]);
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-2.5">
      {/* Weight Gauge Panel */}
      <InventoryWeightGauge
        totalWeight={totalWeight}
        maxWeight={maxWeight}
        weightPercent={weightPercent}
      />

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
        {CATEGORIES.map((cat) => (
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
        <AddItemForm onAdd={handleAddItem} onCancel={() => setIsAdding(false)} />
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
