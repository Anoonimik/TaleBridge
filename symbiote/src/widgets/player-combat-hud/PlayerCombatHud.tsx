import { useShallow } from 'zustand/react/shallow';
import { wsBridge } from '../../shared/api/websocket';
import React, { useState, useRef, useEffect } from 'react';
import { useCombatStore } from '../../entities/combatant/model/store';
import { useRosterStore } from '../../entities/character/model/store';
import { CONDITIONS, COMBAT_SIDES } from '../../shared/config/constants';

export const PlayerCombatHud = () => {
  const {
    active: combatActive,
    round,
    turnIndex,
    combatants,
  } = useCombatStore(
    useShallow((s) => ({
      active: s.active,
      round: s.round,
      turnIndex: s.turnIndex,
      combatants: s.combatants,
    })),
  );
  const { playerCharacterName } = useRosterStore(
    useShallow((s) => ({ playerCharacterName: s.playerCharacterName })),
  );
  const [showQueue, setShowQueue] = useState(true);
  const queueRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const finishTurn = () => {
    wsBridge.send('END_PLAYER_TURN');
  };
  const currentCombatant = combatants[turnIndex];
  const isMyTurn =
    Boolean(currentCombatant?.name && playerCharacterName) &&
    currentCombatant.name.toLowerCase() === playerCharacterName.toLowerCase();

  const myIndex = combatants.findIndex(
    (c) => playerCharacterName && c.name.toLowerCase() === playerCharacterName.toLowerCase(),
  );
  const myCombatant = myIndex !== -1 ? combatants[myIndex] : null;
  const myConditions = Array.isArray(myCombatant?.conditions) ? myCombatant.conditions : [];

  let turnsUntilMine: string | null = null;
  if (myIndex !== -1 && !isMyTurn) {
    if (myIndex > turnIndex) {
      const diff = myIndex - turnIndex;
      turnsUntilMine = diff === 1 ? 'ваш ход следующий!' : `ваш ход через ${diff}`;
    } else {
      const diff = combatants.length - turnIndex + myIndex;
      turnsUntilMine = `ваш ход через ${diff} (след. раунд)`;
    }
  }

  // Auto-scroll timeline to active combatant on turn change
  useEffect(() => {
    if (showQueue && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [turnIndex, showQueue]);

  const scrollQueue = (direction: 'left' | 'right') => {
    if (queueRef.current) {
      const offset = direction === 'left' ? -180 : 180;
      queueRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!combatActive || combatants.length === 0) return null;

  return (
    <div
      className={`border-b flex flex-col shrink-0 transition-all duration-200 select-none ${
        isMyTurn
          ? 'bg-[#1a1408] border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
          : 'bg-[#10111a] border-[#262a3d]'
      }`}
    >
      {/* Main Bar: Round & Current Turn Status & Action Buttons */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Round & Turn info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#141622] border border-[#262a3d] shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-bold text-amber-400 uppercase text-xs tracking-wider">
              Раунд {round}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs truncate">
            {isMyTurn ? (
              <span className="font-bold text-amber-300 text-sm animate-pulse tracking-wide flex items-center gap-1">
                <span>СЕЙЧАС ВАШ ХОД!</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400">Ходит:</span>
                <strong className="text-slate-100 font-semibold truncate max-w-[220px]">
                  {currentCombatant?.name ?? '—'}
                </strong>
                {turnsUntilMine && (
                  <span className="text-slate-400 font-normal hidden sm:inline">
                    ({turnsUntilMine})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: End Turn button & Toggle Queue button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isMyTurn && (
            <button
              type="button"
              className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs rounded shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 animate-pulse"
              onClick={finishTurn}
              title="Завершить ход и передать инициативу следующему бойцу"
            >
              <span>Завершить ход</span>
              <span className="text-sm font-black">▸</span>
            </button>
          )}

          <button
            type="button"
            className="px-2 py-1 rounded bg-[#141622] hover:bg-[#1f2233] text-slate-300 border border-[#262a3d] text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
            onClick={() => setShowQueue(!showQueue)}
            title={showQueue ? 'Скрыть очередь ходов' : 'Показать очередь ходов'}
          >
            <span>Очередь ({combatants.length})</span>
            <span className="text-[10px] text-slate-400">{showQueue ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Initiative Queue Timeline */}
      {showQueue && (
        <div className="px-2 pb-2 pt-0.5 relative group flex items-center">
          {/* Scroll Left Button */}
          <button
            type="button"
            className="w-5 h-7 rounded-l bg-[#141622]/90 hover:bg-[#25293d] border border-[#262a3d] text-slate-400 hover:text-white text-xs cursor-pointer flex items-center justify-center shrink-0 z-10 transition-colors"
            onClick={() => scrollQueue('left')}
            title="Прокрутить влево"
          >
            ‹
          </button>

          {/* Timeline chips */}
          <div
            ref={queueRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 scroll-smooth"
          >
            {combatants.map((c, idx) => {
              const isActive = idx === turnIndex;
              const isMe =
                Boolean(playerCharacterName) &&
                c.name.toLowerCase() === playerCharacterName.toLowerCase();
              const hasActed = idx < turnIndex;

              const sideMeta =
                COMBAT_SIDES.find((s) => s.id === c.side) ||
                (c.isPlayer || c.category === 'Игроки' ? COMBAT_SIDES[0] : COMBAT_SIDES[3]);

              return (
                <div
                  key={c.id}
                  ref={isActive ? activeItemRef : undefined}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500'
                      : hasActed
                        ? 'opacity-40 bg-[#10111a] border-[#1d2030] text-slate-500 hover:opacity-75'
                        : 'bg-[#141622] border-[#262a3d] text-slate-300 hover:border-[#383d57]'
                  } ${isMe && !isActive ? 'ring-1 ring-blue-500/60 border-blue-500/40' : ''}`}
                >
                  <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>

                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sideMeta.color }}
                    title={sideMeta.label}
                  />

                  <span
                    className="font-medium text-slate-100 max-w-[110px] truncate"
                    title={c.name}
                  >
                    {c.name}
                  </span>

                  {isMe && (
                    <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-1 rounded border border-blue-500/40 shrink-0">
                      ВЫ
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-slate-400" title="Инициатива">
                    [{c.initiative ?? '—'}]
                  </span>

                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1 rounded border border-amber-500/40 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      ХОДИТ
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            className="w-5 h-7 rounded-r bg-[#141622]/90 hover:bg-[#25293d] border border-[#262a3d] text-slate-400 hover:text-white text-xs cursor-pointer flex items-center justify-center shrink-0 z-10 transition-colors"
            onClick={() => scrollQueue('right')}
            title="Прокрутить вправо"
          >
            ›
          </button>
        </div>
      )}

      {/* Player Conditions Reminder Banner */}
      {myConditions.length > 0 && (
        <div className="px-3 py-1 bg-rose-950/20 border-t border-rose-500/20 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-rose-400 font-bold uppercase text-[10px] tracking-wider shrink-0">
            Ваши состояния ({myConditions.length}):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {myConditions.map((condName) => {
              const meta = CONDITIONS.find((c) => c.name === condName);
              return (
                <span
                  key={condName}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1"
                  style={{
                    backgroundColor: `${meta?.color || '#ef4444'}20`,
                    borderColor: `${meta?.color || '#ef4444'}50`,
                    color: meta?.color || '#fca5a5',
                  }}
                  title={meta?.desc}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta?.color || '#ef4444' }}
                  />
                  <span>{meta?.label || condName}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
