import React, { useState } from 'react';
import { useAppStore, useCombatStore, useRosterStore, wsBridge } from '../../shared';
import { GmAuthModal } from '../../features';

export const AppHeader = () => {
  const {
    role,
    activeTab,
    setRole,
    setActiveTab,
    scale,
    setScale,
    connected,
    vaultName,
    gmPin,
    diceSecret,
    setDiceSecret,
    cinemaMedia,
    stopBroadcast,
  } = useAppStore();
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
      <header className="bg-[#141622] border-b border-[#262a3d] px-2.5 py-1.5 flex flex-col gap-1.5 select-none shrink-0 z-30 shadow-xs">
        {/* Row 1: Brand, Role & Dice Secret Mode (Left) + Active Broadcast + Scale, Reload & Status (Right) */}
        <div className="flex items-center justify-between gap-1.5 w-full flex-wrap sm:flex-nowrap">
          {/* Left: Brand + Role + GM Secret Mode */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5 font-bold tracking-wider text-xs shrink-0">
              <span className="text-amber-400 font-black">TALE</span>
              <span className="text-indigo-400 font-black">BRIDGE</span>
            </div>

            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-xs font-bold border transition-colors cursor-pointer flex items-center gap-0.5 shrink-0 ${
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

            {isGm && (
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  diceSecret
                    ? 'bg-purple-600/25 text-purple-200 border-purple-500/50 hover:bg-purple-600/35 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                    : 'bg-amber-500/20 text-amber-200 border-amber-500/50 hover:bg-amber-500/30'
                }`}
                onClick={() => setDiceSecret(!diceSecret)}
                title={
                  diceSecret
                    ? 'Броски Мастера: Скрытые (видны только вам в GM-лотке). Нажмите для переключения в открытые'
                    : 'Броски Мастера: Открытые (видны всем в общем лотке). Нажмите для переключения в скрытые'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    diceSecret ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{diceSecret ? 'Скрытно' : 'В открытую'}</span>
              </button>
            )}
          </div>

          {/* Center: Live Media Broadcast Indicator (if GM and active) */}
          {isGm && cinemaMedia?.active && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/70 border border-rose-500/70 text-xs shrink-0 shadow-sm animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span className="text-rose-200 text-[10px] uppercase font-bold hidden md:inline">
                В эфире:
              </span>
              <span className="text-white text-[11px] font-semibold truncate max-w-[100px] md:max-w-[140px]">
                {cinemaMedia.title || cinemaMedia.url}
              </span>
              <button
                type="button"
                onClick={stopBroadcast}
                className="px-1.5 py-0.2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer ml-0.5 transition-colors"
                title="Снять материал с трансляции для всех игроков"
              >
                ✕ Снять
              </button>
            </div>
          )}

          {/* Right: Scale + Refresh + Connection */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="bg-[#10111a] border border-[#262a3d] text-slate-300 text-xs rounded px-1.5 py-0.5 focus:outline-none cursor-pointer shrink-0"
              title="Масштаб интерфейса и шрифта"
            >
              <option value="100%">100%</option>
              <option value="115%">115%</option>
              <option value="125%">125%</option>
              <option value="140%">140%</option>
              <option value="150%">150% (2K)</option>
              <option value="175%">175% (2K+)</option>
              <option value="200%">200% (4K)</option>
              <option value="85%">85%</option>
            </select>

            <button
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 border border-[#262a3d] text-xs cursor-pointer shrink-0 ${
                isRefreshing ? 'rotating' : ''
              }`}
              onClick={handleRefresh}
              title="Обновить данные из Obsidian"
            >
              ⟳
            </button>

            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#10111a] border border-[#262a3d] shrink-0"
              title={connected ? `Подключено: ${vaultName}` : 'Ожидание связи с Obsidian...'}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                    : 'bg-rose-500'
                }`}
              />
              <span className="hidden xl:inline text-[10px] text-slate-400 max-w-[60px] truncate">
                {connected ? vaultName : 'Офлайн'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: GM Main Navigation Tabs */}
        {isGm && (
          <nav className="grid grid-cols-4 gap-1 bg-[#10111a] p-0.5 rounded border border-[#262a3d] w-full shrink-0">
            {[
              { id: 'story' as const, label: 'Сюжет', badge: null },
              {
                id: 'characters' as const,
                label: 'Ростер',
                badge: roster && roster.length > 0 ? roster.length : null,
              },
              {
                id: 'combat' as const,
                label: 'Бой',
                badge: combatants && combatants.length > 0 ? combatants.length : null,
              },
              { id: 'tools' as const, label: 'Утилиты', badge: null },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`py-1 px-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 text-center shrink-0 ${
                    isActive
                      ? 'bg-[#1a1d2d] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.badge !== null && (
                    <span
                      className={`text-[9px] px-1 rounded-full font-mono shrink-0 ${
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
        )}
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
