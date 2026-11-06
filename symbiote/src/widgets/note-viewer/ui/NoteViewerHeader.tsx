import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { Character, COMBAT_SIDES, CombatSide, useRosterStore, wsBridge } from '../../../shared';

interface NoteViewerHeaderProps {
  character: Character;
  categoryBadgeColor: string;
  combatAdded: boolean;
  onClose: () => void;
  onAddToCombat: (sideId: CombatSide) => void;
  onOpenObsidian: () => void;
}

export const NoteViewerHeader: React.FC<NoteViewerHeaderProps> = ({
  character,
  categoryBadgeColor,
  combatAdded,
  onClose,
  onAddToCombat,
  onOpenObsidian,
}) => {
  const { selectedToken } = useRosterStore(useShallow((s) => ({ selectedToken: s.selectedToken })));
  const [showSideSelector, setShowSideSelector] = useState(false);
  const [justLinked, setJustLinked] = useState(false);

  const isLinkedToSelected = Boolean(
    selectedToken &&
    ((character.talespire_id && character.talespire_id === selectedToken.id) ||
      (character.name &&
        selectedToken.name &&
        character.name.toLowerCase() === selectedToken.name.toLowerCase())),
  );

  const handleLinkToken = () => {
    if (!selectedToken) return;
    if (character.path) {
      wsBridge.send('OPEN_IN_OBSIDIAN', { path: character.path, name: character.name });
    }
    wsBridge.send('LINK_CREATURE_TO_NOTE', { creature: selectedToken, path: character.path });
    setJustLinked(true);
    setTimeout(() => setJustLinked(false), 2500);
  };

  return (
    <div className="p-3 bg-[#10111a] border-b border-[#262a3d] flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] text-xs font-medium cursor-pointer transition-colors shrink-0"
          onClick={onClose}
          title="Закрыть карточку"
        >
          ◂ Назад
        </button>

        <span className="font-bold text-amber-400 text-sm truncate" title={character.name}>
          {character.name}
        </span>

        <span
          className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 font-medium ${categoryBadgeColor}`}
        >
          {character.category || 'Существо'}
        </span>

        {(character.race || character.class) && (
          <span className="hidden sm:inline text-xs text-slate-400 truncate">
            {[character.race, character.class].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 relative">
        {/* Link TaleSpire token button (when miniature is selected) */}
        {selectedToken &&
          (isLinkedToSelected ? (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-medium"
              title={`Токен TaleSpire "${selectedToken.name}" привязан к этой заметке`}
            >
              <span>🎯 TS ✓</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleLinkToken}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors border flex items-center gap-1 ${
                justLinked
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border-indigo-500/40'
              }`}
              title={`Привязать выбранный токен "${selectedToken.name}" к этой заметке в Obsidian`}
            >
              <span>🔗</span>
              <span>{justLinked ? 'Привязано ✓' : `Привязать «${selectedToken.name}»`}</span>
            </button>
          ))}

        {/* Add to combat button */}
        <div className="relative">
          <button
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors border flex items-center gap-1 ${
              combatAdded
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
            }`}
            onClick={() => setShowSideSelector(!showSideSelector)}
            title="Добавить в трекер боя"
          >
            <span>{combatAdded ? 'В бою ✓' : '+ В бой'}</span>
            <span className="text-[10px]">▾</span>
          </button>

          {showSideSelector && (
            <div className="absolute top-full right-0 mt-1 z-30 bg-[#141622] border border-[#2d324a] rounded-lg shadow-xl py-1 flex flex-col w-36 animate-in fade-in duration-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 block">
                Выбор стороны:
              </span>
              {COMBAT_SIDES.map((side) => (
                <button
                  key={side.id}
                  type="button"
                  className="px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#1a1d2d] cursor-pointer flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowSideSelector(false);
                    onAddToCombat(side.id as CombatSide);
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: side.color }} />
                  <span>{side.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {character.path && (
          <button
            type="button"
            className="px-2.5 py-1 rounded text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 cursor-pointer transition-colors font-medium shrink-0"
            onClick={onOpenObsidian}
            title="Открыть оригинальную заметку в Obsidian"
          >
            В Obsidian
          </button>
        )}

        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-sm cursor-pointer transition-colors shrink-0"
          onClick={onClose}
          title="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
