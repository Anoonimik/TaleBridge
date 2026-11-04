import React from 'react';
import { useAppStore, AppTab } from '../../store/useAppStore';
import { useCombatStore } from '../../store/useCombatStore';
import { useRosterStore } from '../../store/useRosterStore';

export const AppHeader = () => {
  const {
    role,
    activeTab,
    scale,
    autoInspect,
    gmDiceMode,
    connected,
    statusText,
    setRole,
    setActiveTab,
    toggleScale,
    toggleAutoInspect,
    toggleGmDiceMode,
  } = useAppStore();

  const { active: combatActive, round } = useCombatStore();
  const { playerCharacterName } = useRosterStore();

  const isGm = role === 'gm';

  return (
    <header className="bg-[#12141f] border-b border-[#232738] px-3.5 py-2.5 flex flex-col gap-2.5 select-none shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-extrabold tracking-wide text-white drop-shadow-sm">
            TaleBridge
          </span>
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
            {isGm ? 'GM Screen' : `Игрок: ${playerCharacterName}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-medium text-slate-400">
            Obsidian: <strong className={connected ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>{statusText}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setRole(isGm ? 'player' : 'gm')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition shadow-sm cursor-pointer ${
            isGm
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title="Переключить режим интерфейса"
        >
          {isGm ? 'Режим: Мастер' : 'Режим: Игрок'}
        </button>

        {isGm && (
          <>
            <button
              type="button"
              onClick={toggleAutoInspect}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                autoInspect
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                  : 'bg-[#181b28] border-[#2c3245] text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title="Автоматически открывать карточку при клике по фигурке на столе"
            >
              Авто: {autoInspect ? 'ВКЛ' : 'ВЫКЛ'}
            </button>

            <button
              type="button"
              onClick={toggleGmDiceMode}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                gmDiceMode === 'secret'
                  ? 'bg-purple-950/70 border-purple-600 text-purple-200 hover:bg-purple-900/80'
                  : 'bg-amber-950/70 border-amber-600 text-amber-200 hover:bg-amber-900/80'
              }`}
              title={`Броски Мастера: ${gmDiceMode === 'secret' ? 'Скрытые (GM-лоток)' : 'Открытые (Общий лоток)'}. Клик для смены`}
            >
              Броски: {gmDiceMode === 'secret' ? 'Скрытые' : 'Открытые'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleScale}
          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#181b28] border border-[#2c3245] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition cursor-pointer ml-auto"
          title="Переключить масштаб интерфейса (100% / 85%)"
        >
          Масштаб: {scale}
        </button>
      </div>

      {isGm && (
        <nav className="flex items-center gap-1 pt-1 border-t border-[#232738]/60">
          {(
            [
              { id: 'story', label: 'Сюжет', badge: null },
              { id: 'characters', label: 'Персонажи', badge: null },
              { id: 'combat', label: 'Бой', badge: combatActive ? `R${round}` : null },
              { id: 'tools', label: 'Утилиты', badge: null },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AppTab)}
              className={`flex-1 py-1.5 rounded-md text-[11.5px] font-bold tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="bg-red-500 text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-extrabold shadow-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
