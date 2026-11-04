import React from 'react';
import { InventoryItem, useConfirmDelete } from '../../../shared';

interface ItemCardProps {
  item: InventoryItem;
  onToggleEquip: (id: string, equipped: boolean) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
}

export const ItemCard = ({
  item,
  onToggleEquip,
  onUpdateQuantity,
  onDelete,
}: ItemCardProps) => {
  const { isConfirming: isConfirmingDelete, handleDelete } = useConfirmDelete({
    onDelete: () => onDelete(item.id),
  });

  return (
    <div
      className={`rounded-lg border p-2.5 flex flex-col gap-1.5 transition-all shadow-xs ${
        item.equipped
          ? 'bg-[#181d2d] border-indigo-500/40 ring-1 ring-indigo-500/20'
          : 'bg-[#141622] border-[#262a3d] hover:border-[#383d57]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={Boolean(item.equipped)}
            onChange={(e) => onToggleEquip(item.id, e.target.checked)}
            title={item.equipped ? 'Надето / Экипировано' : 'В рюкзаке (нажмите чтобы экипировать)'}
            className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
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
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#10111a] border border-[#262a3d] text-slate-400 shrink-0">
              {item.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#10111a] px-2 py-0.5 rounded border border-[#262a3d] text-xs">
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer font-bold"
              onClick={() => onUpdateQuantity(item.id, -1)}
              title="Уменьшить количество"
            >
              -
            </button>
            <span className="font-mono text-slate-200 px-1">{item.quantity || 1} шт</span>
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer font-bold"
              onClick={() => onUpdateQuantity(item.id, 1)}
              title="Увеличить количество"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={`h-6 text-xs rounded transition-colors cursor-pointer flex items-center justify-center font-medium ${
              isConfirmingDelete
                ? 'bg-rose-600 text-white font-bold px-2'
                : 'w-6 bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
            }`}
            onClick={handleDelete}
            title={
              isConfirmingDelete
                ? 'Нажмите еще раз для подтверждения'
                : 'Удалить предмет (Shift+клик для мгновенного удаления)'
            }
          >
            {isConfirmingDelete ? 'Удалить?' : '✕'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
        <span>Вес: {item.weight ? `${item.weight} кг` : '—'}</span>
        {item.description && (
          <span className="text-slate-300 truncate max-w-[200px]" title={item.description}>
            {item.description}
          </span>
        )}
      </div>
    </div>
  );
};
