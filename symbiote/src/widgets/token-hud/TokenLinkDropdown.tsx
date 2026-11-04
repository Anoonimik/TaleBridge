import React, { useState, useEffect, useMemo } from 'react';
import { TaleSpireCreature, Character, wsBridge } from '../../shared';

interface TokenLinkDropdownProps {
  token: TaleSpireCreature;
  roster: Character[];
  onClose: () => void;
  onLinked?: () => void;
}

export const TokenLinkDropdown: React.FC<TokenLinkDropdownProps> = ({
  token,
  roster,
  onClose,
  onLinked,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [roster, search]);

  const handleLinkToActive = () => {
    wsBridge.send('LINK_CREATURE_TO_NOTE', { creature: token });
    onLinked?.();
    onClose();
  };

  const handleLinkToCharacter = (char: Character) => {
    if (char.path) {
      wsBridge.send('OPEN_IN_OBSIDIAN', { path: char.path, name: char.name });
      wsBridge.send('OPEN_NOTE', { path: char.path, name: char.name });
    }
    wsBridge.send('LINK_CREATURE_TO_NOTE', { creature: token });
    onLinked?.();
    onClose();
  };

  return (
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-full right-0 mt-1.5 z-50 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl p-2.5 w-72 flex flex-col gap-2 text-xs animate-in fade-in duration-100">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#262a3d]">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <span className="text-amber-400 font-bold">🔗</span>
            <span className="font-semibold text-slate-100 truncate">
              Привязать токен: <strong className="text-amber-300">{token.name}</strong>
            </span>
          </div>
          <button
            type="button"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Option 1: To the active open note in Obsidian */}
        <button
          type="button"
          onClick={handleLinkToActive}
          className="p-2 rounded bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-medium text-left cursor-pointer transition-colors flex items-center gap-2"
          title="Записать ID этого токена в frontmatter открытой сейчас заметки в Obsidian"
        >
          <span className="text-sm">📝</span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-100 leading-tight">
              К открытой в Obsidian заметке
            </span>
            <span className="text-[10px] text-indigo-300 leading-tight">
              Использует текущую активную вкладку
            </span>
          </div>
        </button>

        {/* Option 2: Search and choose specific character from roster */}
        <div className="flex flex-col gap-1 pt-1 border-t border-[#262a3d]">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Или выберите существо из базы:
          </label>
          <input
            type="text"
            placeholder="Поиск по имени или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            autoFocus
          />
        </div>

        <div className="max-h-48 overflow-y-auto flex flex-col gap-1 scrollbar-thin">
          {filteredRoster.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-slate-500">
              Персонажи не найдены
            </div>
          ) : (
            filteredRoster.map((char) => (
              <button
                key={char.name}
                type="button"
                onClick={() => handleLinkToCharacter(char)}
                className="p-1.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-left text-slate-200 hover:text-white border border-[#1f2233] hover:border-amber-500/40 cursor-pointer transition-colors flex items-center justify-between gap-1"
                title={`Привязать к заметке «${char.name}» (${char.path || ''})`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate font-medium">{char.name}</span>
                  {char.talespire_id && (
                    <span className="text-[9px] text-emerald-400 font-mono shrink-0">
                      (TS ✓)
                    </span>
                  )}
                </div>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#141622] text-slate-400 uppercase shrink-0 border border-[#262a3d]">
                  {char.category || 'NPC'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};
