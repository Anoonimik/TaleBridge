import React from 'react';
import { Spell, taleSpireDriver, useConfirmDelete } from '../../../shared';

interface SpellRowProps {
  spell: Spell;
  playerName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCast: (spell: Spell) => void;
  onEdit: (spell: Spell) => void;
  onDelete: (spellId: string) => void;
}

export const SpellRow: React.FC<SpellRowProps> = ({
  spell,
  playerName,
  isExpanded,
  onToggleExpand,
  onCast,
  onEdit,
  onDelete,
}) => {
  const { isConfirming: isConfirmingDelete, handleDelete } = useConfirmDelete({
    onDelete: () => onDelete(spell.id),
  });

  return (
    <div className="bg-[#10111a] rounded-lg border border-[#262a3d] p-2.5 flex flex-col gap-1.5 hover:border-slate-600 transition-colors">
      {/* Top Row: Name, Tags, Cast Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-200 text-xs">{spell.name}</span>
          {spell.school && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1d2d] text-slate-400 border border-[#262a3d]">
              {spell.school}
            </span>
          )}
          {spell.concentration && (
            <span
              className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
              title="Требует концентрации"
            >
              К
            </span>
          )}
          {spell.ritual && (
            <span
              className="text-[10px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
              title="Ритуал"
            >
              Р
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Cast Button */}
          <button
            type="button"
            onClick={() => onCast(spell)}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs active:scale-95"
            title={`Сотворить «${spell.name}» (автоматически расходует ячейку)`}
          >
            Сотворить
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(spell)}
            className="px-1.5 py-1 rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] cursor-pointer"
            title="Редактировать заклинание"
          >
            ✎
          </button>

          {/* Delete Button with 2-step confirmation */}
          <button
            type="button"
            onClick={handleDelete}
            className={`px-1.5 py-1 rounded text-[11px] cursor-pointer transition-colors font-medium ${
              isConfirmingDelete
                ? 'bg-rose-600 text-white font-bold animate-pulse px-2'
                : 'bg-[#1a1d2d] hover:bg-rose-950/60 text-slate-500 hover:text-rose-300'
            }`}
            title={
              isConfirmingDelete
                ? 'Нажмите еще раз для подтверждения'
                : 'Удалить заклинание (Shift+клик для мгновенного удаления)'
            }
          >
            {isConfirmingDelete ? 'Удалить?' : '✕'}
          </button>
        </div>
      </div>

      {/* Quick specs: Time, Range, Duration, Dmg */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
        {spell.time && <span>Время: {spell.time}</span>}
        {spell.range && <span>Дист: {spell.range}</span>}
        {spell.duration && <span>Длит: {spell.duration}</span>}
        {spell.components && <span>{spell.components}</span>}
        {spell.dmg && (
          <button
            type="button"
            onClick={() =>
              taleSpireDriver.rollDice(
                spell.dmg!,
                `${spell.name} (${playerName})`
              )
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-600/40 font-mono font-bold cursor-pointer transition-colors"
            title="Бросить урон / эффект в TaleSpire"
          >
            <span>Урон: {spell.dmg}</span>
          </button>
        )}
      </div>

      {/* Description Toggle */}
      {spell.desc && (
        <div className="flex flex-col gap-1 pt-1 border-t border-[#262a3d]/60">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-[10px] text-slate-500 hover:text-slate-300 self-start cursor-pointer transition-colors"
          >
            {isExpanded ? '▴ Скрыть описание' : '▾ Показать описание'}
          </button>
          {isExpanded && (
            <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
              {spell.desc}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
