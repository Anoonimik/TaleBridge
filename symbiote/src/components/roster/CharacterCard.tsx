import React from 'react';
import { Character } from '../../types';
import { useCombatStore } from '../../store/useCombatStore';
import { useRosterStore } from '../../store/useRosterStore';
import { useAppStore } from '../../store/useAppStore';
import { wsBridge } from '../../api/websocket';

interface Props {
  character: Character;
  onOpenNote: (char: Character) => void;
}

export const CharacterCard: React.FC<Props> = ({ character, onOpenNote }) => {
  const { addCombatant } = useCombatStore();
  const { pinnedNames, togglePinCharacter } = useRosterStore();
  const { setActiveTab } = useAppStore();

  const isPinned = pinnedNames.includes(character.name);
  const hp = character.hp ?? 10;
  const maxHp = character.hp_max ?? character.hp ?? 10;

  const handleAddToCombat = () => {
    addCombatant({
      name: character.name,
      category: character.category || 'Враги',
      hp,
      maxHp,
      ac: character.ac || 10,
      speed: character.speed || '30 фт.',
      path: character.path || null,
      isPlayer: character.playable || character.category === 'Игроки',
      stats: character.stats,
      dexMod: character.dexMod,
      attacks: character.attacks || [],
    });
    setActiveTab('combat');
  };

  const handleOpenObsidian = () => {
    if (character.path) {
      wsBridge.send('OPEN_NOTE', { path: character.path });
    }
  };

  return (
    <div className="char-card">
      <div className="char-card-top">
        <button
          type="button"
          className={`btn-pin ${isPinned ? 'pinned' : ''}`}
          onClick={() => togglePinCharacter(character.name)}
          title={isPinned ? 'Открепить' : 'Закрепить'}
        >
          ★
        </button>
        <span className="char-name" title={character.name}>
          {character.name}
        </span>
        <span className="char-category-badge">{character.category || 'Существо'}</span>
        <div className="char-quick-actions">
          <button type="button" className="btn-char-action" onClick={() => onOpenNote(character)}>
            Заметка
          </button>
          <button type="button" className="btn-char-action" onClick={handleOpenObsidian}>
            Obsidian
          </button>
          <button type="button" className="btn-char-action primary" onClick={handleAddToCombat}>
            В бой
          </button>
        </div>
      </div>

      <div className="char-stats-row">
        <span>КД: {character.ac || 10}</span>
        <span>ХП: {hp}/{maxHp}</span>
        {character.speed && <span>Скорость: {character.speed}</span>}
      </div>

      {character.attacks && character.attacks.length > 0 && (
        <div className="char-attacks-summary">
          {character.attacks.map((att, idx) => (
            <span key={idx} className="char-atk-tag">
              {att.name} ({att.hit || att.dmg})
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
