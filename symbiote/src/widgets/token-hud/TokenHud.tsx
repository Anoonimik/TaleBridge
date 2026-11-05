import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { useRosterStore } from '../../entities/character/model/store';
import { useAppStore } from '../../shared/lib/useAppStore';
import { wsBridge } from '../../shared/api/websocket';
import { taleSpireDriver } from '../../shared/api/talespire';
import { getHpColorClass } from '../../shared/lib/dnd-rules';
import { CombatTokenDropdown } from '../../features/manage-combat/CombatTokenDropdown';
import { TokenLinkDropdown } from './TokenLinkDropdown';

export const TokenHud = () => {
  const { selectedToken, setSelectedToken, setSelectedCharacter, roster } = useRosterStore(
    useShallow((s) => ({
      selectedToken: s.selectedToken,
      setSelectedToken: s.setSelectedToken,
      setSelectedCharacter: s.setSelectedCharacter,
      roster: s.roster,
    })),
  );
  const { role } = useAppStore(useShallow((s) => ({ role: s.role })));
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  // Token HUD is exclusively for GM
  if (!selectedToken || role === 'player') return null;

  const matchInRoster = roster.find((r) => {
    if (selectedToken.name && r.name.toLowerCase() === selectedToken.name.toLowerCase())
      return true;
    if (selectedToken.id && r.talespire_id === selectedToken.id) return true;
    if (
      r.talespire_name &&
      selectedToken.name &&
      r.talespire_name.toLowerCase() === selectedToken.name.toLowerCase()
    )
      return true;
    return false;
  });

  const handleOpenNote = () => {
    if (matchInRoster) {
      setSelectedCharacter(matchInRoster);
      if (matchInRoster.path) {
        wsBridge.send('GET_NOTE', { path: matchInRoster.path, name: matchInRoster.name });
      }
    }
  };

  const handleOpenObsidian = () => {
    if (matchInRoster?.path) {
      wsBridge.send('OPEN_IN_OBSIDIAN', { path: matchInRoster.path, name: matchInRoster.name });
      wsBridge.send('OPEN_NOTE', { path: matchInRoster.path, name: matchInRoster.name });
    }
  };

  const handleDismiss = () => {
    setSelectedToken(null);
    wsBridge.send('CREATURE_SELECTED', null);
  };

  const handleAttackRoll = (name: string, hit: string) => {
    const bonus = hit.startsWith('+') || hit.startsWith('-') ? hit : `+${hit}`;
    taleSpireDriver.rollDice(
      `1d20${bonus}`,
      `${matchInRoster?.name || selectedToken.name}: ${name} (Атака)`,
    );
  };

  const handleDamageRoll = (name: string, dmg: string) => {
    taleSpireDriver.rollDice(dmg, `${matchInRoster?.name || selectedToken.name}: ${name} (Урон)`);
  };

  const rosterHp = matchInRoster?.hp;
  const rosterMax = matchInRoster?.hp_max ?? rosterHp;
  const curHp = selectedToken.hp ?? rosterHp;
  const baseMax = rosterMax ?? selectedToken.hpMax ?? curHp ?? 10;
  const maxHp = curHp !== undefined ? Math.max(baseMax, curHp) : baseMax;

  return (
    <div className="bg-[#10111a] border-b border-[#262a3d] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none shrink-0 relative z-20 shadow-md animate-in slide-in-from-top-1 duration-150">
      {/* Left: Token info and vital stats */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />

        <div
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleOpenNote}
          title={matchInRoster ? 'Нажмите, чтобы открыть карточку существа' : selectedToken.name}
        >
          <strong className="text-slate-100 text-sm truncate max-w-[240px]">
            {matchInRoster ? matchInRoster.name : selectedToken.name}
          </strong>
          {matchInRoster?.category ? (
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-[#1a1d2d] px-1.5 py-0.5 rounded border border-[#262a3d]">
              {matchInRoster.category}
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-medium">
              Не привязан
            </span>
          )}
        </div>

        {curHp !== undefined &&
          (() => {
            const hpStyle = getHpColorClass(curHp, maxHp);
            return (
              <div className="flex flex-col gap-0.5 bg-[#141622] px-2 py-0.5 rounded border border-[#262a3d] shrink-0 min-w-[90px]">
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono leading-none">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ХП</span>
                  <strong className={hpStyle.textClass}>
                    {curHp} / {maxHp}
                  </strong>
                </div>
                <div className="w-full h-1 bg-[#1a1d2d] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      curHp <= maxHp * 0.25
                        ? 'bg-rose-500'
                        : curHp <= maxHp * 0.5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (curHp / (maxHp || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })()}

        {matchInRoster?.ac && (
          <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
            КД: {matchInRoster.ac}
          </span>
        )}

        {/* Quick attack chips */}
        {matchInRoster?.attacks && matchInRoster.attacks.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-[#262a3d]">
            {matchInRoster.attacks.slice(0, 3).map((atk, idx) => (
              <div
                key={idx}
                className="flex items-center gap-0.5 bg-[#141622] rounded border border-[#262a3d] px-1.5 py-0.5"
              >
                <span
                  className="text-slate-300 text-[11px] font-medium mr-1 truncate max-w-[90px]"
                  title={atk.name}
                >
                  {atk.name}
                </span>
                {atk.hit && (
                  <button
                    type="button"
                    className="text-[10px] font-mono text-amber-300 hover:text-amber-200 px-1 rounded bg-amber-500/20 hover:bg-amber-500/30 cursor-pointer"
                    onClick={() => handleAttackRoll(atk.name, atk.hit!)}
                    title="Бросить атаку"
                  >
                    {atk.hit}
                  </button>
                )}
                {atk.dmg && atk.dmg !== '0' && (
                  <button
                    type="button"
                    className="text-[10px] font-mono text-rose-300 hover:text-rose-200 px-1 rounded bg-rose-500/20 hover:bg-rose-500/30 cursor-pointer"
                    onClick={() => handleDamageRoll(atk.name, atk.dmg!)}
                    title="Бросить урон"
                  >
                    {atk.dmg}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0 relative">
        {matchInRoster ? (
          <>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] text-xs font-medium cursor-pointer transition-colors"
              onClick={handleOpenNote}
              title="Открыть заметку существа в TaleBridge"
            >
              Заметка
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-purple-300 border border-purple-500/30 text-xs font-medium cursor-pointer transition-colors"
              onClick={handleOpenObsidian}
              title="Открыть в десктопном приложении Obsidian"
            >
              Obsidian
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded bg-[#141622] hover:bg-[#1a1d2d] text-slate-400 hover:text-amber-300 border border-[#262a3d] text-xs cursor-pointer transition-colors"
              onClick={() => setShowLinkMenu(!showLinkMenu)}
              title="Сменить привязанную заметку в Obsidian"
            >
              🔗
            </button>
          </>
        ) : (
          <div className="relative">
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
              onClick={() => setShowLinkMenu(!showLinkMenu)}
              title="Привязать этот токен к заметке персонажа в Obsidian"
            >
              <span>🔗 Привязать</span>
              <span className="text-[10px]">▾</span>
            </button>
          </div>
        )}

        {showLinkMenu && (
          <TokenLinkDropdown
            token={selectedToken}
            roster={roster}
            onClose={() => setShowLinkMenu(false)}
          />
        )}

        <div className="relative">
          <button
            type="button"
            className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Добавить токен в трекер боя с выбором стороны"
          >
            <span>+ В бой</span>
            <span className="text-[10px]">▾</span>
          </button>

          {showAddMenu && (
            <CombatTokenDropdown token={selectedToken} onClose={() => setShowAddMenu(false)} />
          )}
        </div>

        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer transition-colors"
          onClick={handleDismiss}
          title="Снять выделение"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
