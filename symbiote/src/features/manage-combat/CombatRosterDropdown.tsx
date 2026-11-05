import { DialogLayer } from '../../shared/ui/DialogLayer';
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
    <DialogLayer title="Добавить участника боя" onClose={onClose}><div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#141622] border border-[#2d324a] rounded-xl shadow-2xl p-4 w-full max-w-sm flex flex-col gap-3 max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#262a3d]">
          <span className="font-semibold text-slate-100 text-sm">Добавить из Бестиария / Ростера</span>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-sm cursor-pointer transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-xs uppercase font-bold text-slate-400 block mb-1.5">
            Сторона для вступающего:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {COMBAT_SIDES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`px-2 py-1.5 rounded text-xs font-bold cursor-pointer border text-center transition-colors ${
                  side === s.id
                    ? `${s.bg} ${s.text} ${s.border}`
                    : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d] hover:text-slate-200'
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

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin min-h-[120px] max-h-[45vh] pr-0.5">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">Персонажи не найдены</div>
          ) : (
            filtered.map((char) => (
              <div
                key={char.name}
                className="p-2.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] border border-[#262a3d] hover:border-indigo-500/40 flex items-center justify-between cursor-pointer transition-colors"
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
    </div></DialogLayer>
  );
};
