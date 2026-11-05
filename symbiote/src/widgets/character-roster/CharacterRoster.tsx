import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { Character, useRosterStore, wsBridge } from '../../shared';
import { CharacterCard } from '../../entities/character/ui/CharacterCard';

export const CharacterRoster = () => {
  const { roster, pinnedNames, setSelectedCharacter } = useRosterStore(
    useShallow((s) => ({
      roster: s.roster,
      pinnedNames: s.pinnedNames,
      setSelectedCharacter: s.setSelectedCharacter,
    })),
  );
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = roster.filter((c) => {
    if (!c) return false;
    if (filter === 'pinned' && (!c.name || !pinnedNames.includes(c.name))) return false;
    if (filter !== 'all' && filter !== 'pinned' && c.category !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q))
    );
  });

  const pinnedList = roster.filter((r) => r?.name && pinnedNames.includes(r.name));

  const handleOpenNote = (char: Character) => {
    setSelectedCharacter(char);
    if (char.path) {
      wsBridge.send('GET_NOTE', { path: char.path, name: char.name });
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#0c0d14]">
      {/* Pinned characters bar */}
      {pinnedList.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141622] border-b border-[#262a3d] overflow-x-auto scrollbar-thin shrink-0">
          <span className="text-[11px] font-bold text-amber-400 shrink-0">★ Закреплено:</span>
          {pinnedList.map((p) => (
            <button
              key={p.name}
              type="button"
              className="px-2 py-0.5 rounded text-xs bg-[#1a1d2d] hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-[#262a3d] hover:border-amber-500/40 whitespace-nowrap cursor-pointer transition-colors"
              onClick={() => handleOpenNote(p)}
              title="Открыть заметку"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-3 pb-2 flex flex-col gap-2 shrink-0 border-b border-[#1f2233]">
        <input
          type="text"
          placeholder="Поиск NPC или существа по имени/категории..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'Все' },
            { id: 'pinned', label: '★ Закрепленные' },
            { id: 'Бестиарий', label: 'Бестиарий' },
            { id: 'Игроки', label: 'Игроки' },
            { id: 'Союзники', label: 'Союзники' },
            { id: 'Враги', label: 'Враги' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                filter === tab.id
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-[#141622] text-slate-400 border-[#262a3d] hover:text-slate-200 hover:bg-[#1a1d2d]'
              }`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 flex flex-col gap-2 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {roster.length === 0
              ? 'Ростер пуст. Подтяните заметки из Obsidian (нажмите Обновить в шапке).'
              : 'Ничего не найдено'}
          </div>
        ) : (
          filtered.map((char) => (
            <CharacterCard key={char.name} character={char} onOpenNote={handleOpenNote} />
          ))
        )}
      </div>
    </div>
  );
};
