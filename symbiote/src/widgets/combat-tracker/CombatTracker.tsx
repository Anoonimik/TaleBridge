import React, { useState } from 'react';
import { Combatant } from '../../shared';
import { useCombatStore } from '../../shared';
import { CombatantCard } from '../../entities';
import {
  CombatRosterDropdown,
  CombatSideMenu,
  ConditionsPickerModal,
} from '../../features';

export const CombatTracker = () => {
  const {
    active,
    round,
    turnIndex,
    combatants,
    startCombat,
    endCombat,
    nextTurn,
    prevTurn,
    rollAllInitiatives,
    sortByInitiative,
    clearCombat,
  } = useCombatStore();

  const [showRosterDropdown, setShowRosterDropdown] = useState(false);
  const [conditionsCombatant, setConditionsCombatant] = useState<Combatant | null>(null);
  const [sideMenuState, setSideMenuState] = useState<{
    combatant: Combatant;
    position: { top: number; left: number };
  } | null>(null);

  const handleOpenSideMenu = (e: React.MouseEvent, c: Combatant) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSideMenuState({
      combatant: c,
      position: { top: rect.bottom + 4, left: rect.left },
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] relative">
      {/* Top Header: Round, Turn Controls & Lifecycle */}
      <div className="p-3 bg-[#141622] border-b border-[#262a3d] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {active ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-bold text-amber-400 text-sm uppercase tracking-wider">
                Раунд {round}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-sm font-semibold">Бой не начат</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {active ? (
            <>
              <button
                type="button"
                className="px-2.5 py-1 bg-[#1a1d2d] hover:bg-[#25293d] text-slate-200 border border-[#262a3d] rounded text-xs cursor-pointer font-medium"
                onClick={prevTurn}
                title="Предыдущий ход"
              >
                ◂ Пред.
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs cursor-pointer font-bold"
                onClick={nextTurn}
                title="Следующий ход"
              >
                След. ▸
              </button>
              <button
                type="button"
                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-xs cursor-pointer"
                onClick={endCombat}
                title="Завершить бой"
              >
                Завершить
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={combatants.length === 0}
              className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-bold cursor-pointer transition-colors"
              onClick={startCombat}
            >
              Начать бой
            </button>
          )}
        </div>
      </div>

      {/* Sub-toolbar: Initiative roll, Add from roster, Clear */}
      <div className="px-3 py-2 bg-[#10111a] border-b border-[#1f2233] flex items-center justify-between gap-2 shrink-0 relative">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="px-2.5 py-1 bg-[#141622] hover:bg-[#1a1d2d] text-slate-200 border border-[#262a3d] rounded text-xs cursor-pointer"
            onClick={rollAllInitiatives}
            title="Бросить инициативу всем существам без броска"
          >
            Бросить всем
          </button>
          <button
            type="button"
            className="px-2.5 py-1 bg-[#141622] hover:bg-[#1a1d2d] text-slate-200 border border-[#262a3d] rounded text-xs cursor-pointer"
            onClick={sortByInitiative}
            title="Сортировать по инициативе"
          >
            Сортировать
          </button>
        </div>

        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-medium cursor-pointer flex items-center gap-1"
            onClick={() => setShowRosterDropdown(!showRosterDropdown)}
          >
            <span>+ Из ростера</span>
            <span className="text-[10px]">▾</span>
          </button>

          {showRosterDropdown && (
            <CombatRosterDropdown onClose={() => setShowRosterDropdown(false)} />
          )}

          {combatants.length > 0 && (
            <button
              type="button"
              className="px-2 py-1 bg-[#141622] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#262a3d] rounded text-xs cursor-pointer"
              onClick={clearCombat}
              title="Очистить всех бойцов"
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      {/* Combatants List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
        {combatants.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            В бою пока никого нет. Выберите фигурку на доске или добавьте существ из Ростера.
          </div>
        ) : (
          combatants.map((c, idx) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={active && idx === turnIndex}
              onOpenConditions={(target) => setConditionsCombatant(target)}
              onOpenSideMenu={handleOpenSideMenu}
            />
          ))
        )}
      </div>

      {/* Conditions Picker Modal */}
      {conditionsCombatant && (
        <ConditionsPickerModal
          combatant={conditionsCombatant}
          onClose={() => setConditionsCombatant(null)}
        />
      )}

      {/* Side Selection Menu */}
      {sideMenuState && (
        <CombatSideMenu
          combatant={sideMenuState.combatant}
          position={sideMenuState.position}
          onClose={() => setSideMenuState(null)}
        />
      )}
    </div>
  );
};
