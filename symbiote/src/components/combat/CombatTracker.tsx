import React, { useState, useEffect } from 'react';
import { useCombatStore } from '../../store/useCombatStore';
import { useRosterStore } from '../../store/useRosterStore';
import { wsBridge } from '../../api/websocket';
import { CombatantCard } from './CombatantCard';
import { CombatTokenDropdown } from './CombatTokenDropdown';
import { CombatRosterDropdown } from './CombatRosterDropdown';
import { ConditionsPickerModal } from './ConditionsPickerModal';

export const CombatTracker: React.FC = () => {
  const {
    active: combatActive,
    round,
    turnIndex,
    combatants,
    startCombat,
    endCombat,
    nextTurn,
    prevTurn,
    rollAllInitiative,
    clearCombat,
    addCombatant,
  } = useCombatStore();

  const { roster } = useRosterStore();

  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [showRosterDropdown, setShowRosterDropdown] = useState(false);
  const [activeConditionsCombatantId, setActiveConditionsCombatantId] = useState<string | null>(null);
  const [isSyncRotating, setIsSyncRotating] = useState(false);
  const [isClearPrimed, setIsClearPrimed] = useState(false);

  // Sync state over WebSocket
  useEffect(() => {
    wsBridge.syncCombatState({
      active: combatActive,
      round,
      turnIndex,
      combatants,
    });
  }, [combatActive, round, turnIndex, combatants]);

  // Keyboard navigation for combat turns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        nextTurn();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevTurn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextTurn, prevTurn]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || isClearPrimed) {
      setIsClearPrimed(false);
      clearCombat();
      return;
    }
    setIsClearPrimed(true);
    setTimeout(() => setIsClearPrimed(false), 3500);
  };

  const handleSyncObsidian = () => {
    setIsSyncRotating(true);
    wsBridge.requestRefresh();
    setTimeout(() => setIsSyncRotating(false), 700);
  };

  const handleAutoFillHeroes = () => {
    const heroes = roster.filter((r) => r.playable || r.category === 'Игроки');
    heroes.forEach((h) => {
      addCombatant({
        name: h.name,
        category: 'Игроки',
        hp: h.hp || 20,
        maxHp: h.hp_max || h.hp || 20,
        ac: h.ac || 14,
        speed: h.speed || '30 фт.',
        isPlayer: true,
        path: h.path || null,
        stats: h.stats,
        dexMod: h.dexMod,
        attacks: h.attacks || [],
      });
    });
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 h-full">
      {/* Encounter Header Card */}
      <div className="flex items-center justify-between p-2.5 bg-[#141624] border border-[#262b3e] rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center bg-indigo-950/80 border border-indigo-700/60 rounded-lg px-2.5 py-1 shadow-inner">
            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">РАУНД</span>
            <span className="text-lg font-black text-white leading-none">{round}</span>
          </div>

          <div className="flex items-center gap-2">
            {combatActive && combatants.length > 0 ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                <span className="text-xs text-slate-300">
                  Ход {turnIndex + 1} из {combatants.length}:{' '}
                  <strong className="text-white font-extrabold text-[13px]">
                    {combatants[turnIndex]?.name}
                  </strong>
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-400">Ожидание начала боя...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {combatActive ? (
            <>
              <button
                type="button"
                onClick={prevTurn}
                className="px-2.5 py-1 bg-[#1e2233] hover:bg-[#2b3147] text-slate-300 rounded text-xs font-bold border border-white/5 transition cursor-pointer"
                title="Предыдущий ход (Стрелка влево)"
              >
                ◂ Назад
              </button>
              <button
                type="button"
                onClick={nextTurn}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                title="Следующий ход (Стрелка вправо / Пробел)"
              >
                Вперёд ▸
              </button>
              <button
                type="button"
                onClick={endCombat}
                className="px-2.5 py-1 bg-red-950/40 hover:bg-red-800 text-red-200 rounded text-xs font-bold border border-red-900/50 transition cursor-pointer"
                title="Завершить бой"
              >
                Завершить
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startCombat}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow-md shadow-emerald-600/30 transition cursor-pointer tracking-wide"
              title="Начать бой"
            >
              Начать бой
            </button>
          )}
        </div>
      </div>

      {/* Quick Tools Toolbar */}
      <div className="relative flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setShowTokenDropdown(!showTokenDropdown);
            setShowRosterDropdown(false);
          }}
          className="px-2.5 py-1 bg-[#171a27] hover:bg-indigo-950/70 border border-[#2a3045] hover:border-indigo-500 text-slate-200 rounded text-xs font-bold transition cursor-pointer"
          title="Добавить выбранную миниатюру в TaleSpire"
        >
          + Токен ▾
        </button>

        <button
          type="button"
          onClick={() => {
            setShowRosterDropdown(!showRosterDropdown);
            setShowTokenDropdown(false);
          }}
          className="px-2.5 py-1 bg-[#171a27] hover:bg-indigo-950/70 border border-[#2a3045] hover:border-indigo-500 text-slate-200 rounded text-xs font-bold transition cursor-pointer"
          title="Добавить персонажа из ростера"
        >
          + Ростер ▾
        </button>

        <button
          type="button"
          onClick={rollAllInitiative}
          className="px-2.5 py-1 bg-[#171a27] hover:bg-indigo-950/70 border border-[#2a3045] hover:border-indigo-500 text-slate-200 rounded text-xs font-bold transition cursor-pointer"
          title="Автоматически бросить d20+ЛОВ всем участникам"
        >
          Бросить всем
        </button>

        <button
          type="button"
          onClick={handleSyncObsidian}
          className={`px-2.5 py-1 bg-sky-950/30 hover:bg-sky-900/50 border border-sky-800/60 text-sky-300 rounded text-xs font-bold transition cursor-pointer ${
            isSyncRotating ? 'rotating' : ''
          }`}
          title="Подтянуть свежие данные персонажей и новые атаки из Obsidian"
        >
          ⟳ Обновить
        </button>

        <button
          type="button"
          onClick={handleClear}
          className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ml-auto ${
            isClearPrimed
              ? 'bg-red-600 text-white font-extrabold shadow-sm'
              : 'bg-[#171a27] border border-[#2a3045] text-slate-400 hover:text-red-400 hover:border-red-900/60'
          }`}
          title="Очистить всех участников (Shift+клик для мгновенного сброса)"
        >
          {isClearPrimed ? 'Точно очистить?' : 'Очистить'}
        </button>

        {showTokenDropdown && (
          <CombatTokenDropdown onClose={() => setShowTokenDropdown(false)} />
        )}

        {showRosterDropdown && (
          <CombatRosterDropdown onClose={() => setShowRosterDropdown(false)} />
        )}
      </div>

      {/* Combatants Scroll Area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {combatants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-[#12141f] border border-dashed border-[#292f44] rounded-xl text-center my-auto">
            <div className="text-sm font-bold text-slate-200 mb-1">Бой не сформирован</div>
            <div className="text-xs text-slate-400 mb-4 max-w-[280px]">
              Добавьте персонажей из ростера или выберите миниатюру в TaleSpire и нажмите «+ Токен ▾»
            </div>
            <button
              type="button"
              onClick={handleAutoFillHeroes}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              Заполнить игроками из партии
            </button>
          </div>
        ) : (
          combatants.map((c, idx) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isCurrentTurn={combatActive && idx === turnIndex}
              onOpenConditions={(id) => setActiveConditionsCombatantId(id)}
            />
          ))
        )}
      </div>

      {activeConditionsCombatantId && (
        <ConditionsPickerModal
          combatantId={activeConditionsCombatantId}
          onClose={() => setActiveConditionsCombatantId(null)}
        />
      )}
    </div>
  );
};
