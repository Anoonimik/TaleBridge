import React, { useState } from 'react';
import { useAppStore, useCombatStore, useRosterStore, wsBridge } from '../../shared';
import { GmAuthModal } from '../../features';

export const AppHeader = () => {
  const { role, activeTab, setRole, setActiveTab, scale, setScale, connected, vaultName, gmPin } =
    useAppStore();
  const { combatants, active: combatActive } = useCombatStore();
  const { roster } = useRosterStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isGm = role === 'gm';

  const handleRoleToggle = () => {
    if (isGm) {
      sessionStorage.removeItem('tb_gm_auth');
      setRole('player');
    } else {
      const expected = (gmPin || '').trim();
      if (!expected) {
        sessionStorage.setItem('tb_gm_auth', 'true');
        setRole('gm');
        return;
      }
      if (sessionStorage.getItem('tb_gm_auth') === 'true') {
        setRole('gm');
      } else {
        setShowAuthModal(true);
      }
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    wsBridge.send('GET_CHARACTERS', {});
    wsBridge.send('GET_SCENES', {});
    wsBridge.send('GET_COMBAT_STATE', {});
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <>
      <header className="h-11 bg-[#141622] border-b border-[#262a3d] px-3 flex items-center justify-between select-none shrink-0 z-30">
        {/* Left: Logo & Role Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs">
            <span className="text-amber-400">TALE</span>
            <span className="text-indigo-400">BRIDGE</span>
          </div>

          <button
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
              isGm
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
            }`}
            onClick={handleRoleToggle}
            title={
              isGm
                ? 'Режим Мастера (нажмите для выхода и блокировки экрана ГМа)'
                : 'Режим Игрока (нажмите для перехода в режим Мастера)'
            }
          >
            <span>{isGm ? 'ГМ' : 'ИГРОК'}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
        </div>

        {/* Center: Tabs */}
        {isGm ? (
          <nav className="flex items-center gap-1 bg-[#10111a] p-0.5 rounded border border-[#262a3d]">
            {[
              { id: 'story' as const, label: 'Сюжет', badge: null },
              { id: 'characters' as const, label: 'Ростер', badge: (roster && roster.length > 0) ? roster.length : null },
              { id: 'combat' as const, label: 'Бой', badge: (combatants && combatants.length > 0) ? combatants.length : null },
              { id: 'tools' as const, label: 'Утилиты', badge: null },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1a1d2d] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span
                      className={`text-[9px] px-1 rounded-full font-mono ${
                        tab.id === 'combat' && combatActive
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-[#262a3d] text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        ) : null}

        {/* Right: Scale & Connection */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className="bg-[#10111a] border border-[#262a3d] text-slate-300 text-xs rounded px-2 py-0.5 focus:outline-none cursor-pointer"
            title="Масштаб интерфейса"
          >
            <option value="100%">100%</option>
            <option value="115%">115%</option>
            <option value="125%">125%</option>
            <option value="150%">150%</option>
            <option value="85%">85%</option>
          </select>

          <button
            type="button"
            className={`w-6 h-6 flex items-center justify-center rounded bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 border border-[#262a3d] text-xs cursor-pointer ${
              isRefreshing ? 'rotating' : ''
            }`}
            onClick={handleRefresh}
            title="Обновить данные из Obsidian"
          >
            ⟳
          </button>

          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10111a] border border-[#262a3d]"
            title={connected ? `Подключено: ${vaultName}` : 'Ожидание связи с Obsidian...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-rose-500'
              }`}
            />
            <span className="text-[10px] text-slate-400 max-w-[80px] truncate">
              {connected ? vaultName : 'Офлайн'}
            </span>
          </div>
        </div>
      </header>

      <GmAuthModal
        isOpen={showAuthModal}
        onSuccess={() => {
          setShowAuthModal(false);
          setRole('gm');
        }}
        onCancel={() => setShowAuthModal(false)}
      />
    </>
  );
};
