import React, { useState } from 'react';
import { Character } from '../../types';
import { useRosterStore } from '../../store/useRosterStore';
import { CharacterCard } from './CharacterCard';
import { wsBridge } from '../../api/websocket';

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
    <div className="roster-view-panel">
      <div className="roster-container">
        {pinnedList.length > 0 && (
          <div className="pinned-bar">
            {pinnedList.map((p) => (
              <span
                key={p.name}
                className="pinned-chip"
                onClick={() => handleOpenNote(p)}
                title="Открыть заметку"
              >
                ★ {p.name}
              </span>
            ))}
          </div>
        )}

        <div className="search-bar">
          <input
            type="text"
            placeholder="Быстрый поиск NPC или существа..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          {['all', 'pinned', 'Бестиарий', 'Игроки', 'Союзники', 'Враги'].map((f) => (
            <span
              key={f}
              className={`pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'pinned' ? '★ Закрепленные' : f}
            </span>
          ))}
        </div>

        <div className="roster-list">
          {filtered.length === 0 ? (
            <div className="empty-hint">
              {roster.length === 0
                ? 'Ростер пуст. Подтяните заметки из Obsidian (нажмите Обновить).'
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
      </div>

      {selectedCharacter && (
        <div className="note-viewer-drawer">
          <div className="note-viewer-header">
            <div className="note-viewer-title">
              Заметка: <strong>{selectedCharacter.name}</strong>
            </div>
            <div className="note-viewer-controls">
              {selectedCharacter.path && (
                <button
                  type="button"
                  className="btn-note-action"
                  onClick={() => wsBridge.send('OPEN_NOTE', { path: selectedCharacter.path })}
                  title="Открыть в приложении Obsidian"
                >
                  В Obsidian
                </button>
              )}
              <button
                type="button"
                className="btn-close-note"
                onClick={() => setSelectedCharacter(null)}
                title="Закрыть заметку"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="note-viewer-body">
            <div className="note-meta-card">
              <div>КД: <strong>{selectedCharacter.ac || 10}</strong></div>
              <div>ХП: <strong>{selectedCharacter.hp || 10}</strong></div>
              <div>Скорость: <strong>{selectedCharacter.speed || '30 фт.'}</strong></div>
              <div>Категория: <strong>{selectedCharacter.category || 'Существо'}</strong></div>
            </div>
            {selectedCharacter.attacks && selectedCharacter.attacks.length > 0 && (
              <div className="note-attacks-section">
                <h4>Действия и атаки:</h4>
                {selectedCharacter.attacks.map((att, idx) => (
                  <div key={idx} className="note-attack-item">
                    <strong>{att.name}</strong>: {att.hit && `Бросок: ${att.hit}`} {att.dmg && `Урон: ${att.dmg}`}
                    {att.desc && <div className="note-attack-desc">{att.desc}</div>}
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
