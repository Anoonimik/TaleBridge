import React, { useState } from 'react';
import { Character, CombatSide, COMBAT_SIDES } from '../../shared';
import { useCombatStore, useRosterStore } from '../../shared';

interface CombatRosterDropdownProps {
  onClose: () => void;
}

export const CombatRosterDropdown = ({ onClose }: CombatRosterDropdownProps) => {
  const { addCombatant } = useCombatStore();
  const { roster } = useRosterStore();
  const [search, setSearch] = useState('');
  const [side, setSide] = useState<CombatSide>('enemy');

  const filtered = roster.filter((c) => {
    if (!search.trim()) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleAddChar = (char: Character) => {
    const hp = char.hp ?? 10;
    const maxHp = char.hp_max ?? char.hp ?? 10;

    addCombatant({
      name: char.name,
      side,
      category:
        side === 'player'
          ? 'Игроки'
          : side === 'ally'
          ? 'Союзники'
          : side === 'neutral'
          ? 'Нейтралы'
          : 'Враги',
      hp,
      maxHp,
      ac: char.ac || 10,
      speed: char.speed || '30 фт.',
      path: char.path || null,
      isPlayer: side === 'player',
      stats: char.stats,
      dexMod: char.dexMod,
      attacks: char.attacks || [],
    });
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 z-50 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl p-3 w-80 max-w-[90vw] flex flex-col gap-2.5 animate-in fade-in duration-100 text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-[#262a3d]">
        <span className="font-semibold text-slate-100 text-sm">Добавить из Бестиария / Ростера</span>
        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-xs uppercase font-bold text-slate-400 block mb-1">
          Сторона для вступающего:
        </label>
        <div className="grid grid-cols-4 gap-1">
          {COMBAT_SIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`px-2 py-1 rounded text-xs font-bold cursor-pointer border text-center transition-colors ${
                side === s.id
                  ? `${s.bg} ${s.text} ${s.border}`
                  : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d]'
              }`}
              onClick={() => setSide(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        placeholder="Поиск по имени..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
        autoFocus
      />

      <div className="max-h-56 overflow-y-auto flex flex-col gap-1 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs">Персонажи не найдены</div>
        ) : (
          filtered.slice(0, 15).map((char) => (
            <div
              key={char.name}
              className="p-2 rounded bg-[#1a1d2d] hover:bg-[#25293d] border border-[#262a3d] flex items-center justify-between cursor-pointer transition-colors"
              onClick={() => handleAddChar(char)}
            >
              <div className="truncate mr-2 font-medium text-slate-200 text-sm">{char.name}</div>
              <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400 font-mono">
                <span>КД {char.ac || 10}</span>
                <span>•</span>
                <span>ХП {char.hp || 10}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
