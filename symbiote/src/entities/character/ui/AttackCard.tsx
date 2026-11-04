import React, { useState, useRef, useEffect } from 'react';
import { Attack } from '../../../shared';
import { taleSpireDriver } from '../../../shared';

interface AttackCardProps {
  attack: Attack;
  index: number;
  canManage?: boolean;
  onEdit?: (attack: Attack, index: number) => void;
  onDelete?: (index: number) => void;
}

export const AttackCard = ({
  attack,
  index,
  canManage = false,
  onEdit,
  onDelete,
}: AttackCardProps) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Instant delete on Shift+Click
    if (e.shiftKey || isConfirmingDelete) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setIsConfirmingDelete(false);
      onDelete?.(index);
      return;
    }

    // 2-step inline confirmation
    setIsConfirmingDelete(true);
    resetTimerRef.current = setTimeout(() => {
      setIsConfirmingDelete(false);
    }, 3500);
  };

  const handleRollHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attack.hit) return;
    const bonus = attack.hit.startsWith('+') || attack.hit.startsWith('-') ? attack.hit : `+${attack.hit}`;
    taleSpireDriver.rollDice(`1d20${bonus}`, `${attack.name} - Атака`);
  };

  const handleRollDamage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attack.dmg) return;
    taleSpireDriver.rollDice(attack.dmg, `${attack.name} - Урон`);
  };

  return (
    <div className="bg-[#141622] border border-[#262a3d] hover:border-[#383d57] rounded-lg p-2.5 flex flex-col gap-2 transition-all shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <strong className="text-slate-100 text-xs font-semibold truncate" title={attack.name}>
            {attack.name}
          </strong>
          {attack.type && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
              {attack.type}
            </span>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                onClick={() => onEdit(attack, index)}
                title="Редактировать действие"
              >
                ✎
              </button>
            )}

            <button
              type="button"
              className={`px-1.5 h-6 flex items-center justify-center rounded text-xs cursor-pointer transition-colors font-medium ${
                isConfirmingDelete
                  ? 'bg-rose-600 text-white font-bold animate-pulse px-2'
                  : 'bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 w-6'
              }`}
              onClick={handleDeleteClick}
              title={
                isConfirmingDelete
                  ? 'Нажмите еще раз для подтверждения удаления'
                  : 'Удалить действие (Shift+клик для мгновенного удаления)'
              }
            >
              {isConfirmingDelete ? 'Удалить?' : '✕'}
            </button>
          </div>
        )}
      </div>

      {attack.desc && (
        <p className="text-[11px] text-slate-400 leading-relaxed m-0 italic bg-[#10111a] p-1.5 rounded border border-[#1f2233]">
          {attack.desc}
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        {attack.hit && (
          <button
            type="button"
            className="flex-1 px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1"
            onClick={handleRollHit}
            title="Бросок попадания"
          >
            <span>Атака</span>
            <span className="font-mono text-[11px]">({attack.hit})</span>
          </button>
        )}

        {attack.dmg && (
          <button
            type="button"
            className="flex-1 px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1"
            onClick={handleRollDamage}
            title="Бросок урона"
          >
            <span>Урон</span>
            <span className="font-mono text-[11px]">({attack.dmg})</span>
          </button>
        )}
      </div>
    </div>
  );
};
