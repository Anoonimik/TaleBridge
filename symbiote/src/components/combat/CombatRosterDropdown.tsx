import React, { useState } from 'react';
import { CombatSide } from '../../types';
import { useRosterStore } from '../../store/useRosterStore';
import { useCombatStore } from '../../store/useCombatStore';

interface Props {
  onClose: () => void;
}

export const CombatRosterDropdown = ({ onClose }: Props) => {
  const { roster } = useRosterStore();
  const { addCombatant } = useCombatStore();
  const [search, setSearch] = useState('');
  const [selectedSide, setSelectedSide] = useState<'default' | CombatSide>('default');

  const filtered = roster.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.name && r.name.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q));
  });

  const handleAdd = (charName: string, specificSide?: CombatSide) => {
    const found = roster.find((r) => r.name === charName);
    if (!found) return;

    let finalCategory = specificSide;
    if (!finalCategory) {
      finalCategory = selectedSide === 'default' ? (found.category as CombatSide) || 'Враги' : selectedSide;
    }

    addCombatant({
      name: found.name,
      category: finalCategory,
      hp: found.hp || 10,
      maxHp: found.hp_max || found.hp || 10,
      ac: found.ac || 10,
      speed: found.speed || '30 фт.',
      path: found.path || null,
      isPlayer: finalCategory === 'Игроки' || Boolean(found.playable || found.category === 'Игроки'),
      stats: found.stats,
      dexMod: found.dexMod,
      attacks: found.attacks || [],
    });
    onClose();
  };

  return (
    <div className="absolute top-[82px] left-3 right-3 z-30 bg-[#161825] border border-[#2e344a] rounded-lg shadow-2xl p-3 flex flex-col gap-2.5 max-h-[300px] animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <span className="text-xs font-bold text-slate-300">Добавить из ростера:</span>
        <button
          type="button"
          className="text-slate-400 hover:text-white text-xs cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Поиск персонажа или существа..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#0f111c] border border-[#2c3248] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pb-1.5 border-b border-white/5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Сторона:</span>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
            selectedSide === 'default'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setSelectedSide('default')}
        >
          По умолч.
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
            selectedSide === 'Враги'
              ? 'bg-red-600 border-red-500 text-white'
              : 'bg-red-950/30 border-red-900/50 text-red-300 hover:text-red-100'
          }`}
          onClick={() => setSelectedSide('Враги')}
        >
          🔴 Враг
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
            selectedSide === 'Союзники'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300 hover:text-emerald-100'
          }`}
          onClick={() => setSelectedSide('Союзники')}
        >
          🟢 Союзник
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
            selectedSide === 'Нейтрал'
              ? 'bg-amber-600 border-amber-500 text-white'
              : 'bg-amber-950/30 border-amber-900/50 text-amber-300 hover:text-amber-100'
          }`}
          onClick={() => setSelectedSide('Нейтрал')}
        >
          🟡 Нейтрал
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
            selectedSide === 'Игроки'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-300 hover:text-indigo-100'
          }`}
          onClick={() => setSelectedSide('Игроки')}
        >
          🔵 Игрок
        </button>
      </div>

      <div className="overflow-y-auto flex flex-col gap-1 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-3">Ничего не найдено</div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between p-2 rounded bg-white/2 hover:bg-white/6 transition cursor-pointer"
              onClick={() => handleAdd(r.name)}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-slate-200 truncate">{r.name}</span>
                <span className="text-[10px] text-slate-400">
                  {r.category || 'Существо'} • КД {r.ac || 10} • {r.hp || 10} HP
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-950/50 hover:bg-red-800 text-red-200 border border-red-900/50 transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(r.name, 'Враги');
                  }}
                  title="Добавить как Врага"
                >
                  Враг
                </button>
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-950/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-900/50 transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(r.name, 'Союзники');
                  }}
                  title="Добавить как Союзника"
                >
                  Союзник
                </button>
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-950/50 hover:bg-amber-800 text-amber-200 border border-amber-900/50 transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(r.name, 'Нейтрал');
                  }}
                  title="Добавить как Нейтрала"
                >
                  Нейтрал
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
