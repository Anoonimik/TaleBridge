import { useShallow } from 'zustand/react/shallow';
import React, { useState, useMemo } from 'react';
import {
  Character,
  CombatSide,
  ParsedCreatureNote,
  useCombatStore,
  useRosterStore,
  wsBridge,
  taleSpireDriver,
  parseModifier,
  formatModifier,
  parseCreatureNote,
  normalizeHitBonus,
  sideToCategory,
} from '../../shared';
import {
  NoteViewerHeader,
  NoteVitalsBar,
  NoteAbilityGrid,
  NoteActionsSection,
  NoteCalloutsSection,
  NoteMarkdownBody,
} from './ui';

interface NoteViewerProps {
  character: Character | null;
  onClose: () => void;
}

export const NoteViewer: React.FC<NoteViewerProps> = ({ character, onClose }) => {
  const { addCombatant } = useCombatStore(useShallow((s) => ({ addCombatant: s.addCombatant })));
  const { noteContent } = useRosterStore(useShallow((s) => ({ noteContent: s.noteContent })));
  const [combatAdded, setCombatAdded] = useState(false);

  const rawMarkdown = useMemo(() => {
    if (!character) return '';
    return noteContent?.content || character.playerNotes || '';
  }, [noteContent?.content, character]);

  const parsed: ParsedCreatureNote = useMemo(() => {
    if (!character)
      return { vitals: {}, stats: undefined, actions: [], callouts: [], remainingMarkdown: '' };
    return parseCreatureNote(rawMarkdown, character.attacks || []);
  }, [rawMarkdown, character]);

  if (!character) return null;

  const handleOpenObsidian = () => {
    if (character.path) {
      wsBridge.send('OPEN_IN_OBSIDIAN', { path: character.path, name: character.name });
    }
  };

  const handleAddToCombat = (side: CombatSide) => {
    const hp = character.hp || parsed.vitals.hp || 10;
    const maxHp = character.hp_max || character.hp || parsed.vitals.hpMax || hp;
    const ac = character.ac || parsed.vitals.ac || 10;
    const speed = character.speed || parsed.vitals.speed || '30 фт.';
    const stats = character.stats || parsed.stats;
    const attacks = parsed.actions.length > 0 ? parsed.actions : character.attacks || [];

    addCombatant({
      name: character.name,
      side,
      category: sideToCategory(side),
      hp,
      maxHp,
      ac,
      speed,
      path: character.path || null,
      isPlayer: side === 'player',
      stats,
      dexMod: character.dexMod,
      attacks,
    });
    setCombatAdded(true);
    setTimeout(() => setCombatAdded(false), 2200);
  };

  const handleRollAttack = (attName: string, hit: string) => {
    const bonus = normalizeHitBonus(hit);
    taleSpireDriver.rollDice(`1d20${bonus}`, `${character.name}: ${attName} (Атака)`);
  };

  const handleRollDamage = (attName: string, dmg: string) => {
    taleSpireDriver.rollDice(dmg, `${character.name}: ${attName} (Урон)`);
  };

  const handleRollStat = (label: string, name: string, scoreStr: string) => {
    const mod = parseModifier(scoreStr);
    const modStr = formatModifier(mod);
    taleSpireDriver.rollDice(`1d20${modStr}`, `${character.name}: Проверка ${name}`);
  };

  const handleRollInitiative = (bonus: string) => {
    const b = normalizeHitBonus(bonus);
    taleSpireDriver.rollDice(`1d20${b}`, `${character.name}: Инициатива`);
  };

  let categoryBadgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (character.category === 'Игроки' || character.playable) {
    categoryBadgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  } else if (character.category === 'Союзники') {
    categoryBadgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (character.category === 'Бестиарий') {
    categoryBadgeColor = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  }

  // Active stats source: character.stats or parsed.stats
  const activeStats = character.stats || parsed.stats;

  // Initiative calculation
  const initBonus =
    parsed.vitals.initiativeBonus ||
    (activeStats?.dex ? formatModifier(parseModifier(activeStats.dex)) : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Карточка: ${character.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#141622] border border-[#2d324a] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <NoteViewerHeader
          character={character}
          categoryBadgeColor={categoryBadgeColor}
          combatAdded={combatAdded}
          onClose={onClose}
          onAddToCombat={handleAddToCombat}
          onOpenObsidian={handleOpenObsidian}
        />

        {/* Unified Single-Window Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 scrollbar-thin text-sm">
          {/* 1. Primary Vital Stats Bar */}
          <NoteVitalsBar
            character={character}
            parsedVitals={parsed.vitals}
            initBonus={initBonus}
            onRollInitiative={handleRollInitiative}
          />

          {/* 2. Ability Scores Grid */}
          {activeStats && <NoteAbilityGrid stats={activeStats} onRollStat={handleRollStat} />}

          {/* 3. Actions & Attacks Section */}
          <NoteActionsSection
            actions={parsed.actions}
            characterName={character.name}
            onRollAttack={handleRollAttack}
            onRollDamage={handleRollDamage}
          />

          {/* 4. Obsidian Callouts */}
          <NoteCalloutsSection callouts={parsed.callouts} characterName={character.name} />

          {/* 5. Additional Remaining Lore / Markdown */}
          {parsed.remainingMarkdown && (
            <NoteMarkdownBody markdown={parsed.remainingMarkdown} characterName={character.name} />
          )}

          {/* Fallback if note has no markdown text loaded yet */}
          {!rawMarkdown && character.path && (
            <div className="text-center py-6 text-slate-500 text-xs">
              Загрузка текста заметки из Obsidian...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
