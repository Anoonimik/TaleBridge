import React from 'react';
import { useCombatStore, useRosterStore } from '../../shared';

export const PlayerCombatHud = () => {
  const { active: combatActive, round, turnIndex, combatants } = useCombatStore();
  const { playerCharacterName } = useRosterStore();

  if (!combatActive || combatants.length === 0) return null;

  const currentCombatant = combatants[turnIndex];
  const isMyTurn =
    Boolean(currentCombatant?.name && playerCharacterName) &&
    currentCombatant.name.toLowerCase() === playerCharacterName.toLowerCase();

  return (
    <div
      className={`border-b px-3 py-2 flex flex-col gap-2 shrink-0 transition-all duration-200 ${
        isMyTurn
          ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
          : 'bg-[#141622] border-[#262a3d]'
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="font-bold tracking-wider text-amber-400 uppercase text-xs">
            Бой: Раунд {round}
          </span>
        </div>

        <div
          className={`px-3 py-1 rounded text-xs font-semibold border flex items-center gap-2 ${
            isMyTurn
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              : 'bg-[#1a1d2d] text-slate-300 border-[#262a3d]'
          }`}
        >
          {isMyTurn ? (
            <span className="font-bold tracking-wide text-amber-300">СЕЙЧАС ВАШ ХОД!</span>
          ) : (
            <span>
              Ходит: <strong className="text-white">{currentCombatant?.name ?? '—'}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {combatants.map((c, idx) => {
          const isActive = idx === turnIndex;
          const isMe =
            Boolean(playerCharacterName) &&
            c.name.toLowerCase() === playerCharacterName.toLowerCase();
          const hasActed = idx < turnIndex;

          let catColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
          if (c.isPlayer || c.category === 'Игроки' || c.category === 'Игрок') {
            catColor = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
          } else if (c.category === 'Союзники' || c.category === 'Союзник') {
            catColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
          } else if (c.category === 'Нейтрал' || c.category === 'Нейтралы' || c.category === 'Нейтральный') {
            catColor = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
          }

          return (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/60'
                  : hasActed
                  ? 'opacity-40 bg-[#10111a] border-[#1d2030] text-slate-500'
                  : 'bg-[#1a1d2d] border-[#262a3d] text-slate-300'
              } ${isMe && !isActive ? 'ring-1 ring-blue-500/60' : ''}`}
            >
              <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>

              <span className="font-semibold text-slate-100 text-sm max-w-[130px] truncate" title={c.name}>
                {c.name}
              </span>

              {isMe && (
                <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/40">
                  ВЫ
                </span>
              )}

              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-normal ${catColor}`}>
                {c.category || 'Враг'}
              </span>

              <span className="text-xs font-mono text-slate-300" title="Инициатива">
                [{c.initiative ?? '—'}]
              </span>

              {isActive ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  ХОДИТ
                </span>
              ) : hasActed ? (
                <span className="text-[10px] text-slate-500">(ходил)</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
