import React, { useState } from 'react';
import { Character, useRosterStore, wsBridge } from '../../shared';
import { CharacterCard } from '../../entities';

export const CharacterRoster = () => {
  const { roster, pinnedNames, selectedCharacter, setSelectedCharacter } = useRosterStore();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = roster.filter((c) => {
    if (filter === 'pinned' && !pinnedNames.includes(c.name)) return false;
    if (filter !== 'all' && filter !== 'pinned' && c.category !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q))
    );
  });

  const pinnedList = roster.filter((r) => pinnedNames.includes(r.name));

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
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {roster.length === 0
              ? 'Ростер пуст. Подтяните заметки из Obsidian (нажмите Обновить в шапке).'
              : 'Ничего не найдено'}
          </div>
        ) : (
          filtered.map((char) => (
            <CharacterCard
              key={char.name}
              character={char}
              onOpenNote={handleOpenNote}
            />
          ))
        )}
      </div>

      {/* Note Viewer Drawer */}
      {selectedCharacter && (
        <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-[#141622] border-l border-[#262a3d] shadow-2xl flex flex-col z-20 animate-in slide-in-from-right duration-200">
          <div className="p-3 border-b border-[#262a3d] flex items-center justify-between gap-2 bg-[#10111a]">
            <div className="text-xs truncate font-semibold text-slate-100">
              Заметка: <span className="text-amber-400">{selectedCharacter.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedCharacter.path && (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded text-[11px] bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 cursor-pointer transition-colors"
                  onClick={() => wsBridge.send('OPEN_NOTE', { path: selectedCharacter.path })}
                  title="Открыть в десктопном приложении Obsidian"
                >
                  В Obsidian
                </button>
              )}
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
                onClick={() => setSelectedCharacter(null)}
                title="Закрыть"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-2 bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">КД</span>
                <strong className="text-slate-100 text-sm">{selectedCharacter.ac || 10}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">ХП</span>
                <strong className="text-emerald-400 text-sm">{selectedCharacter.hp || 10}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Скорость</span>
                <span className="text-slate-200">{selectedCharacter.speed || '30 фт.'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Категория</span>
                <span className="text-slate-200">{selectedCharacter.category || 'Существо'}</span>
              </div>
            </div>

            {selectedCharacter.attacks && selectedCharacter.attacks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  Действия и атаки:
                </h4>
                {selectedCharacter.attacks.map((att, idx) => (
                  <div key={idx} className="bg-[#10111a] p-2 rounded border border-[#1f2233] flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-amber-300">{att.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {att.hit && `Бросок: ${att.hit}`} {att.dmg && `Урон: ${att.dmg}`}
                      </span>
                    </div>
                    {att.desc && (
                      <p className="text-[11px] text-slate-400 leading-relaxed m-0">{att.desc}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
