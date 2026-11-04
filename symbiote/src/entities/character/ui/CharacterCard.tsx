import React, { useState } from 'react';
import { Character, CombatSide } from '../../../shared';
import { useCombatStore, useRosterStore, useAppStore, wsBridge } from '../../../shared';

interface CharacterCardProps {
  character: Character;
  onOpenNote: (char: Character) => void;
}

export const CharacterCard = ({ character, onOpenNote }: CharacterCardProps) => {
  const { addCombatant } = useCombatStore();
  const { pinnedNames, togglePinCharacter } = useRosterStore();
  const { setActiveTab } = useAppStore();
  const [showSideSelector, setShowSideSelector] = useState(false);

  const isPinned = pinnedNames.includes(character.name);
  const hp = character.hp ?? 10;
  const maxHp = character.hp_max ?? character.hp ?? 10;

  const handleAddToCombatWithSide = (side: CombatSide) => {
    addCombatant({
      name: character.name,
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
      ac: character.ac || 10,
      speed: character.speed || '30 фт.',
      path: character.path || null,
      isPlayer: side === 'player',
      stats: character.stats,
      dexMod: character.dexMod,
      attacks: character.attacks || [],
    });
    setShowSideSelector(false);
    setActiveTab('combat');
  };

  const handleOpenObsidian = () => {
    if (character.path) {
      wsBridge.send('OPEN_NOTE', { path: character.path });
    }
  };

  let categoryBadgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  if (character.category === 'Игроки' || character.playable) {
    categoryBadgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
  } else if (character.category === 'Союзники') {
    categoryBadgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  } else if (character.category === 'Бестиарий') {
    categoryBadgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/20';
  }

  return (
    <div className="bg-[#141622] border border-[#262a3d] hover:border-[#383d57] rounded-lg p-2.5 flex flex-col gap-2 transition-all shadow-sm relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            className={`w-6 h-6 flex items-center justify-center rounded text-sm transition-colors cursor-pointer shrink-0 ${
              isPinned
                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => togglePinCharacter(character.name)}
            title={isPinned ? 'Открепить' : 'Закрепить'}
          >
            ★
          </button>
          <span className="font-semibold text-slate-100 text-sm truncate" title={character.name}>
            {character.name}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 font-medium ${categoryBadgeColor}`}
          >
            {character.category || 'Существо'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          <button
            type="button"
            className="px-2 py-1 bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] rounded text-[11px] cursor-pointer transition-colors"
            onClick={() => onOpenNote(character)}
            title="Открыть карточку заметки"
          >
            Заметка
          </button>
          {character.path && (
            <button
              type="button"
              className="px-2 py-1 bg-[#1a1d2d] hover:bg-[#25293d] text-purple-300 border border-purple-500/20 rounded text-[11px] cursor-pointer transition-colors"
              onClick={handleOpenObsidian}
              title="Открыть заметку в Obsidian"
            >
              Obsidian
            </button>
          )}

          {/* Add to combat with side picker */}
          <div className="relative">
            <button
              type="button"
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1"
              onClick={() => setShowSideSelector(!showSideSelector)}
              title="Добавить в трекер боя с выбором стороны"
            >
              <span>В бой</span>
              <span className="text-[9px]">▾</span>
            </button>

            {showSideSelector && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-[#141622] border border-[#2d324a] rounded shadow-xl py-1 flex flex-col w-32 animate-in fade-in duration-100">
                <span className="text-[9px] uppercase font-bold text-slate-400 px-2.5 py-1 block">
                  Сторона:
                </span>
                <button
                  type="button"
                  className="px-2.5 py-1 text-left text-xs text-rose-300 hover:bg-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  onClick={() => handleAddToCombatWithSide('enemy')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Враг
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-left text-xs text-blue-300 hover:bg-blue-500/20 cursor-pointer flex items-center gap-1.5"
                  onClick={() => handleAddToCombatWithSide('player')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Игрок
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-left text-xs text-emerald-300 hover:bg-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                  onClick={() => handleAddToCombatWithSide('ally')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Союзник
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-left text-xs text-amber-300 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5"
                  onClick={() => handleAddToCombatWithSide('neutral')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Нейтрал
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 bg-[#10111a] px-2 py-1 rounded border border-[#1f2233]">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold">КД</span>
          <strong className="text-slate-200">{character.ac || 10}</strong>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold">ХП</span>
          <strong className="text-emerald-400">
            {hp}/{maxHp}
          </strong>
        </div>
        {character.speed && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Скор</span>
            <span className="text-slate-300">{character.speed}</span>
          </div>
        )}
      </div>

      {character.attacks && character.attacks.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center pt-0.5">
          {character.attacks.map((att, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 bg-[#1a1d2d] border border-[#2a2f45] rounded text-slate-300 font-mono"
            >
              <span className="font-semibold text-slate-200">{att.name}</span>
              {(att.hit || att.dmg) && (
                <span className="text-slate-400 ml-1">
                  ({att.hit ? `${att.hit}` : ''}
                  {att.hit && att.dmg ? ' / ' : ''}
                  {att.dmg ? `${att.dmg}` : ''})
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
