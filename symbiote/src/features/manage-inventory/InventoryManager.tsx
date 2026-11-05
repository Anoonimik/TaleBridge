import { useShallow } from 'zustand/react/shallow';
import { ActionModal } from '../../entities/character/ui/ActionModal';
import { createAttackFromWeapon } from '../../shared/lib/dnd-rules';
import type { Attack } from '../../shared/types';
import { mergeInventoryEdit } from '../../../../packages/domain/inventory-edit';
import React, { useState, useMemo, useRef } from 'react';
import {
  InventoryItem,
  Character,
  useRosterStore,
  wsBridge,
  taleSpireDriver,
  useLogStore,
} from '../../shared';
import { ItemCard } from '../../entities/inventory-item/ui/ItemCard';
import { InventoryWeightGauge, AddItemForm, CoinWalletBar, EditItemModal } from './ui';
import { getConsumableActionInfo } from './lib/consumable-helper';

interface InventoryManagerProps {
  playerData: Character | null;
}

const CATEGORIES = ['all', 'Оружие', 'Броня', 'Зелья', 'Снаряжение', 'Квестовое'];

export const InventoryManager = ({ playerData }: InventoryManagerProps) => {
  const { playerCharacterName, setPlayerData, updatePlayerHp, updateCurrency, adjustCurrency } =
    useRosterStore(
      useShallow((s) => ({
        playerCharacterName: s.playerCharacterName,
        setPlayerData: s.setPlayerData,
        updatePlayerHp: s.updatePlayerHp,
        updateCurrency: s.updateCurrency,
        adjustCurrency: s.adjustCurrency,
      })),
    );

  const pendingItems = useRef(new Set<string>());
  const [draft, setDraft] = useState<{ attack: Attack; owner: string | undefined } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    item: InventoryItem;
    owner: string | undefined;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const items = useMemo(() => playerData?.inventory || [], [playerData?.inventory]);

  // Calculate items weight
  const itemsWeight = useMemo(
    () =>
      items.reduce((acc, it) => {
        const q = it.quantity || 1;
        const w = it.weight || 0;
        return acc + q * w;
      }, 0),
    [items],
  );

  // Calculate coins weight (50 coins = 1 lb ≈ 0.45 kg, or ~0.009 kg per coin)
  const currency = playerData?.currency;
  const totalCoins = useMemo(() => {
    if (!currency) return 0;
    return (
      (currency.pp || 0) +
      (currency.gp || 0) +
      (currency.ep || 0) +
      (currency.sp || 0) +
      (currency.cp || 0)
    );
  }, [currency]);

  const coinsWeight = useMemo(() => {
    return Math.round((totalCoins / 50) * 0.45 * 10) / 10;
  }, [totalCoins]);

  // Total carry weight: items + coins
  const totalWeight = useMemo(() => {
    return Math.round((itemsWeight + coinsWeight) * 10) / 10;
  }, [itemsWeight, coinsWeight]);

  // Max carry weight: STR score * 7.5 kg (or 15 lbs)
  const maxWeight = useMemo(() => {
    const strScore = parseInt(playerData?.stats?.str || '10', 10) || 10;
    return Math.round(strScore * 7.5);
  }, [playerData?.stats?.str]);

  const weightPercent = useMemo(
    () => Math.min(100, Math.round((totalWeight / (maxWeight || 1)) * 100)),
    [totalWeight, maxWeight],
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
    const current = useRosterStore.getState().playerData;
    if (!current || current.id !== playerData.id) return;
    const updated = { ...current, inventory: updatedItems };
    setPlayerData(updated);

    if (playerCharacterName) {
      wsBridge.send('UPDATE_INVENTORY', {
        characterName: playerCharacterName,
        items: updatedItems,
      });
    }
  };

  const handleToggleEquip = (id: string, equipped: boolean) => {
    const updated = (useRosterStore.getState().playerData?.inventory || []).map((it) =>
      it.id === id ? { ...it, equipped } : it,
    );
    saveInventory(updated);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = (useRosterStore.getState().playerData?.inventory || [])
      .map((it) => {
        if (it.id !== id) return it;
        const newQ = (it.quantity || 1) + delta;
        return newQ > 0 ? { ...it, quantity: newQ } : null;
      })
      .filter(Boolean) as InventoryItem[];
    saveInventory(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = (useRosterStore.getState().playerData?.inventory || []).filter(
      (it) => it.id !== id,
    );
    saveInventory(updated);
  };

  const handleAddItem = (newItem: InventoryItem) => {
    saveInventory([newItem, ...items]);
    setIsAdding(false);
  };

  const handleSaveEdit = (updatedItem: InventoryItem) => {
    const latest = useRosterStore.getState().playerData;
    if (
      !editingItem ||
      !latest ||
      latest.id !== editingItem.owner ||
      playerData?.id !== editingItem.owner
    )
      throw new Error('Выбран другой персонаж. Закройте окно и откройте предмет заново.');
    const merged = mergeInventoryEdit(
      editingItem.item,
      latest.inventory?.find((entry) => entry.id === updatedItem.id),
      updatedItem,
    );
    saveInventory(
      (latest.inventory || []).map((entry) => (entry.id === merged.id ? merged : entry)),
    );
    setEditingItem(null);
  };

  /**
   * Interactive Consumable Use (Healing Potions, Scrolls, Rations)
   */
  const handleUseConsumable = async (item: InventoryItem) => {
    if (!playerData || pendingItems.current.has(item.id)) return;
    pendingItems.current.add(item.id);
    try {
      const charName = playerData.name || 'Персонаж';
      const action = getConsumableActionInfo(item);

      // 1. If item has dice formula (e.g. 2d4+2 for healing)
      if (action.formula) {
        const rollResult = await taleSpireDriver.rollForResult(
          action.formula,
          `${action.label}: ${item.name} (${charName})`,
        );

        const latest = useRosterStore.getState().playerData;
        if (
          !latest ||
          latest.id !== playerData.id ||
          !latest.inventory?.some((entry) => entry.id === item.id && (entry.quantity ?? 1) > 0)
        )
          return;
        // If it's a healing potion, apply HP restoration
        if (action.isHealing) {
          const currentHp = latest.hp ?? 0;
          const maxHp = latest.hp_max ?? 20;
          const missingHp = Math.max(0, maxHp - currentHp);
          const actualHealed = Math.min(missingHp, rollResult);
          const newHp = currentHp + actualHealed;

          if (actualHealed > 0) {
            updatePlayerHp(actualHealed);
          }

          useLogStore
            .getState()
            .addLog(
              'roll',
              `[Зелье] ${charName} выпил «${item.name}» (бросок ${action.formula} = ${rollResult}): восстановлено ${actualHealed} ХП (текущее: ${newHp}/${maxHp})`,
            );

          setActionNotice(`+${actualHealed} ХП восстановлено (${item.name})`);
          setTimeout(() => setActionNotice(null), 4000);
        } else {
          useLogStore
            .getState()
            .addLog(
              'roll',
              `[Расходник] ${charName} использовал «${item.name}» (бросок ${action.formula} = ${rollResult})`,
            );
          setActionNotice(`Использовано: ${item.name} (бросок ${rollResult})`);
          setTimeout(() => setActionNotice(null), 4000);
        }
      } else {
        // General consumable without dice formula
        useLogStore
          .getState()
          .addLog('action', `[Расходник] ${charName} использовал «${item.name}»`);
        setActionNotice(`Использовано: ${item.name}`);
        setTimeout(() => setActionNotice(null), 3000);
      }

      // 2. Consume item: reduce quantity by 1
      handleUpdateQuantity(item.id, -1);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : 'Не удалось использовать предмет');
    } finally {
      pendingItems.current.delete(item.id);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-2.5">
      {draft && (
        <ActionModal
          isOpen
          initialAttack={draft.attack}
          onClose={() => setDraft(null)}
          onSave={(attack) => {
            const state = useRosterStore.getState();
            if (state.playerData?.id === draft.owner) state.savePlayerAttack(attack);
          }}
        />
      )}
      {/* Coin Wallet Bar */}
      <CoinWalletBar
        currency={playerData?.currency}
        onUpdateCurrency={updateCurrency}
        onAdjustCurrency={adjustCurrency}
      />

      {/* Weight Gauge Panel (Items + Coins) */}
      <InventoryWeightGauge
        totalWeight={totalWeight}
        maxWeight={maxWeight}
        weightPercent={weightPercent}
        itemsWeight={itemsWeight}
        coinsWeight={coinsWeight}
      />

      {/* Action notification banner (e.g. +7 HP healed) */}
      {actionNotice && (
        <div className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-white text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
      {isAdding && <AddItemForm onAdd={handleAddItem} onCancel={() => setIsAdding(false)} />}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {items.length === 0
              ? 'Инвентарь пуст. Добавьте предметы кнопкой выше.'
              : 'Предметы не найдены'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleEquip={handleToggleEquip}
              onUpdateQuantity={handleUpdateQuantity}
              onDelete={handleDeleteItem}
              onUseItem={handleUseConsumable}
              onEdit={(it) => setEditingItem({ item: { ...it }, owner: playerData?.id })}
              onLinkToAttack={(item) => {
                if (playerData)
                  setDraft({
                    attack: createAttackFromWeapon(item, playerData),
                    owner: playerData.id,
                  });
              }}
            />
          ))
        )}
      </div>

      {/* Edit Item Modal */}
      <EditItemModal
        key={editingItem?.owner || 'no-character'}
        isOpen={Boolean(editingItem)}
        item={editingItem?.item || null}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
