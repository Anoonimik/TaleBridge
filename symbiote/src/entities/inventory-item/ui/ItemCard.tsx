import React from 'react';
import { HeartPulse, Sparkles, Trash2, Plus, Minus, Swords } from 'lucide-react';
import { InventoryItem, useConfirmDelete, isWeaponItem } from '../../../shared';
import { getConsumableActionInfo } from '../../../features/manage-inventory/lib/consumable-helper';

interface ItemCardProps {
  item: InventoryItem;
  onToggleEquip: (id: string, equipped: boolean) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onLinkToAttack?: (item: InventoryItem) => void;
  onUseItem?: (item: InventoryItem) => void;
}

export const ItemCard = ({
  item,
  onToggleEquip,
  onUpdateQuantity,
  onDelete,
  onUseItem,
  onLinkToAttack,
}: ItemCardProps) => {
  const { isConfirming: isConfirmingDelete, handleDelete } = useConfirmDelete({
    onDelete: () => onDelete(item.id),
  });

  const actionInfo = getConsumableActionInfo(item);

  return (
    <div
      className={`rounded-lg border p-2.5 flex flex-col gap-1.5 transition-all shadow-xs ${
        item.equipped
          ? 'bg-[#181d2d] border-indigo-500/40 ring-1 ring-indigo-500/20'
          : 'bg-[#141622] border-[#262a3d] hover:border-[#383d57]'
      }`}
    >
      {/* Top Header: Equip checkbox, Name, Tags, Quick Use & Quantity Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={Boolean(item.equipped)}
            onChange={(e) => onToggleEquip(item.id, e.target.checked)}
            title={item.equipped ? 'Надето / Экипировано' : 'В рюкзаке (нажмите чтобы экипировать)'}
            className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer shrink-0"
          />

          <span
            className={`text-xs font-semibold truncate ${
              item.equipped ? 'text-indigo-200' : 'text-slate-200'
            }`}
            title={item.name}
          >
            {item.name}
          </span>

          {item.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10111a] border border-[#262a3d] text-slate-400 shrink-0">
              {item.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {isWeaponItem(item) && onLinkToAttack && (
            <button
              type="button"
              onClick={() => onLinkToAttack(item)}
              title="Создать черновик атаки из оружия"
              className="px-2 py-1 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500/70 rounded cursor-pointer transition-colors"
            >
              <Swords className="w-3 h-3 inline" /> В атаки
            </button>
          )}
          {/* Quick Consumable Action (Выпить / Использовать) */}
          {actionInfo.isConsumable && onUseItem && (
            <button
              type="button"
              onClick={() => onUseItem(item)}
              title={
                actionInfo.isHealing
                  ? `Выпить зелье (${actionInfo.formula || 'восстанавливает ХП'}). Списывает 1 шт.`
                  : actionInfo.formula
                    ? `Использовать (бросок ${actionInfo.formula}). Списывает 1 шт.`
                    : `Использовать расходник. Списывает 1 шт.`
              }
              className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs ${
                actionInfo.isHealing
                  ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {actionInfo.isHealing ? (
                <HeartPulse className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
              )}
              <span>{actionInfo.label}</span>
              {actionInfo.formula && (
                <span className="text-[10px] opacity-75 font-mono">({actionInfo.formula})</span>
              )}
            </button>
          )}

          {/* Quantity Controls */}
          <div className="flex items-center gap-1 bg-[#10111a] px-1.5 py-0.5 rounded border border-[#262a3d] text-xs">
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer"
              onClick={() => onUpdateQuantity(item.id, -1)}
              title="Уменьшить количество"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-slate-200 px-0.5 text-xs font-medium">
              {item.quantity || 1} шт
            </span>
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer"
              onClick={() => onUpdateQuantity(item.id, 1)}
              title="Увеличить количество"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Delete Button with 2-step confirmation */}
          <button
            type="button"
            className={`h-6 text-xs rounded transition-colors cursor-pointer flex items-center justify-center font-medium ${
              isConfirmingDelete
                ? 'bg-rose-600 text-white font-bold px-2'
                : 'w-6 bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
            }`}
            onClick={handleDelete}
            title={isConfirmingDelete ? 'Нажмите еще раз для подтверждения' : 'Удалить предмет'}
          >
            {isConfirmingDelete ? 'Удалить?' : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Row: Weight & Description */}
      {(item.weight || item.description) && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5 border-t border-[#1f2233]/60 gap-2">
          <span className="shrink-0 text-[11px]">
            {item.weight ? `Вес: ${item.weight} кг` : '—'}
          </span>
          {item.description && (
            <span className="text-slate-300 truncate text-[11px]" title={item.description}>
              {item.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
