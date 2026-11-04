import React from 'react';
import { useRosterStore } from '../../store/useRosterStore';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';
import { wsBridge } from '../../api/websocket';

export const TokenHud = () => {
  const { activeToken, roster, setSelectedCharacter } = useRosterStore();
  const { addCombatant } = useCombatStore();
  const { setActiveTab } = useAppStore();

  if (!activeToken) return null;

  const matched = roster.find((r) => r.name.toLowerCase() === activeToken.name.toLowerCase());
  const hp = activeToken.hp ?? matched?.hp ?? 14;
  const maxHp = activeToken.maxHp ?? matched?.hp_max ?? matched?.hp ?? 14;
  const hpPct = Math.max(0, Math.min(100, (hp / (maxHp || 1)) * 100));

  const handleOpenNote = () => {
    if (matched?.path) {
      wsBridge.send('OPEN_NOTE', { path: matched.path });
    }
  };

  const handleFocusRoster = () => {
    if (matched) {
      setSelectedCharacter(matched);
      setActiveTab('characters');
    }
  };

  const handleAddToCombat = () => {
    addCombatant({
      name: activeToken.name,
      category: matched?.category || 'Враги',
      hp,
      maxHp,
      ac: matched?.ac || 12,
      speed: matched?.speed || '30 фт.',
      creatureId: activeToken.id,
      path: matched?.path || null,
      stats: matched?.stats,
      dexMod: matched?.dexMod,
      attacks: matched?.attacks || [],
    });
    setActiveTab('combat');
  };

  return (
    <div className="bg-[#141624] border border-indigo-950/80 rounded-lg p-2.5 mx-3 mt-2 mb-1 shadow-md flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
          <span className="text-[13px] font-bold text-white tracking-wide">{activeToken.name}</span>
          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
            {matched?.category || 'Токен'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-400">
            {hp} / {maxHp} HP
          </span>
          <div className="w-18 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-300 ${
                hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
        <div>
          КД: <strong className="text-slate-200">{matched?.ac || 12}</strong> • Скорость:{' '}
          <strong className="text-slate-200">{matched?.speed || '30 фт.'}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="px-2 py-0.8 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10.5px] font-semibold transition cursor-pointer"
            onClick={handleOpenNote}
          >
            Заметка
          </button>
          <button
            type="button"
            className="px-2 py-0.8 bg-[#1f2334] hover:bg-[#2a3047] text-slate-300 rounded text-[10.5px] font-semibold border border-[#30374e] transition cursor-pointer"
            onClick={handleFocusRoster}
          >
            В ростере
          </button>
          <button
            type="button"
            className="px-2 py-0.8 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10.5px] font-bold transition cursor-pointer"
            onClick={handleAddToCombat}
          >
            + В бой
          </button>
        </div>
      </div>

      {matched?.attacks && matched.attacks.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
          {matched.attacks.map((att, idx) => (
            <button
              key={idx}
              type="button"
              className="px-2 py-0.5 bg-[#1b1e2c] hover:bg-indigo-950/80 text-indigo-300 hover:text-white border border-indigo-900/50 rounded text-[10px] font-semibold transition cursor-pointer"
              onClick={() => {
                if (att.hit) wsBridge.rollDice(att.hit, `Атака [${matched.name}]: ${att.name}`);
              }}
            >
              {att.name} ({att.hit || att.dmg})
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
