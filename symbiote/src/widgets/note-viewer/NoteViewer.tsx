import React, { useState } from 'react';
import {
  Character,
  CombatSide,
  COMBAT_SIDES,
  useCombatStore,
  useRosterStore,
  wsBridge,
  taleSpireDriver,
  formatInlineText,
  parseModifier,
  parseCreatureNote,
} from '../../shared';

interface NoteViewerProps {
  character: Character | null;
  onClose: () => void;
}

export const NoteViewer = ({ character, onClose }: NoteViewerProps) => {
  const { addCombatant } = useCombatStore();
  const { noteContent } = useRosterStore();
  const [showSideSelector, setShowSideSelector] = useState(false);
  const [combatAdded, setCombatAdded] = useState(false);

  if (!character) return null;

  const rawMarkdown = noteContent?.content || character.playerNotes || '';
  const parsed = parseCreatureNote(rawMarkdown, character.attacks || []);

  const handleOpenObsidian = () => {
    if (character.path) {
      wsBridge.send('OPEN_NOTE', { path: character.path });
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
      ac,
      speed,
      path: character.path || null,
      isPlayer: side === 'player',
      stats,
      dexMod: character.dexMod,
      attacks,
    });
    setShowSideSelector(false);
    setCombatAdded(true);
    setTimeout(() => setCombatAdded(false), 2200);
  };

  const handleRollAttack = (attName: string, hit: string) => {
    const bonus = hit.startsWith('+') || hit.startsWith('-') ? hit : `+${hit}`;
    taleSpireDriver.rollDice(`1d20${bonus}`, `${character.name}: ${attName} (Атака)`);
  };

  const handleRollDamage = (attName: string, dmg: string) => {
    taleSpireDriver.rollDice(dmg, `${character.name}: ${attName} (Урон)`);
  };

  const handleRollStat = (label: string, name: string, scoreStr: string) => {
    const mod = parseModifier(scoreStr);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    taleSpireDriver.rollDice(`1d20${modStr}`, `${character.name}: Проверка ${name}`);
  };

  const handleRollInitiative = (bonus: string) => {
    const b = bonus.startsWith('+') || bonus.startsWith('-') ? bonus : `+${bonus}`;
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
    (activeStats?.dex ? `${parseModifier(activeStats.dex) >= 0 ? '+' : ''}${parseModifier(activeStats.dex)}` : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#141622] border border-[#2d324a] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
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
                      onClick={() => handleAddToCombat(side.id)}
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
                onClick={handleOpenObsidian}
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

        {/* Unified Single-Window Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 scrollbar-thin text-sm">
          {/* 1. Primary Vital Stats Bar */}
          <div className="grid grid-cols-4 gap-2 bg-[#10111a] p-3 rounded-lg border border-[#1f2233]">
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold block">КД</span>
              <strong className="text-slate-100 text-base font-mono">
                {character.ac || parsed.vitals.ac || 10}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 text-xs uppercase font-bold block">ХП</span>
              <strong className="text-emerald-400 text-base font-mono">
                {character.hp || parsed.vitals.hp || 10}
                {character.hp_max ? ` / ${character.hp_max}` : ''}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 text-xs uppercase font-bold block">Скорость</span>
              <span className="text-slate-200 text-sm">
                {character.speed || parsed.vitals.speed || '9 м'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-xs uppercase font-bold block">Инициатива</span>
              {initBonus ? (
                <button
                  type="button"
                  onClick={() => handleRollInitiative(initBonus)}
                  className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  title="Бросить инициативу в TaleSpire"
                >
                  <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span>{initBonus}</span>
                </button>
              ) : (
                <span className="text-slate-400 text-xs font-mono">+0</span>
              )}
            </div>
          </div>

          {/* 2. Ability Scores Grid (if available) */}
          {activeStats && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Характеристики:
              </h4>
              <div className="grid grid-cols-6 gap-1.5">
                {(
                  [
                    { key: 'str', label: 'СИЛ', name: 'Сила' },
                    { key: 'dex', label: 'ЛОВ', name: 'Ловкость' },
                    { key: 'con', label: 'ТЕЛ', name: 'Телосложение' },
                    { key: 'int', label: 'ИНТ', name: 'Интеллект' },
                    { key: 'wis', label: 'МУД', name: 'Мудрость' },
                    { key: 'cha', label: 'ХАР', name: 'Харизма' },
                  ] as const
                ).map(({ key, label, name }) => {
                  const val = activeStats[key] || '10';
                  const mod = parseModifier(val);
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

                  return (
                    <div
                      key={key}
                      onClick={() => handleRollStat(label, name, val)}
                      className="bg-[#10111a] hover:bg-[#181b29] border border-[#1f2233] hover:border-amber-500/40 p-2 rounded flex flex-col items-center justify-center cursor-pointer transition-all group"
                      title={`Бросок проверки ${name} (1d20${modStr})`}
                    >
                      <span className="text-xs uppercase font-bold text-slate-400 group-hover:text-amber-300">
                        {label}
                      </span>
                      <span className="text-base font-bold text-slate-100 my-0.5">{val.split(' ')[0]}</span>
                      <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1 rounded">
                        {modStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Actions & Attacks Section */}
          {parsed.actions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Действия и атаки ({parsed.actions.length}):
              </h4>

              <div className="flex flex-col gap-2">
                {parsed.actions.map((att, idx) => (
                  <div
                    key={idx}
                    className="bg-[#10111a] p-3 rounded-lg border border-[#1f2233] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <strong className="text-amber-300 text-sm font-semibold truncate">
                          {att.name}
                        </strong>
                        {att.type && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                            {att.type}
                          </span>
                        )}
                      </div>

                      {/* Interactive roll buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {att.hit && (
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                            onClick={() => handleRollAttack(att.name, att.hit!)}
                            title="Бросок атаки"
                          >
                            <span>Атака</span>
                            <span className="font-mono text-xs">({att.hit})</span>
                          </button>
                        )}

                        {att.dmg && att.dmg !== '0' && (
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                            onClick={() => handleRollDamage(att.name, att.dmg!)}
                            title="Бросок урона"
                          >
                            <span>Урон</span>
                            <span className="font-mono text-xs">({att.dmg})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {att.desc && (
                      <div className="text-xs text-slate-300 leading-relaxed m-0 bg-[#141622] p-2.5 rounded border border-[#262a3d]">
                        {formatInlineText(att.desc, (f, l) =>
                          taleSpireDriver.rollDice(f, `${character.name}: ${l}`)
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Obsidian Callouts (Сводка для Мастера, Тактика, Лут) */}
          {parsed.callouts.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {parsed.callouts.map((c, idx) => {
                let borderStyle = 'border-amber-500/60 bg-amber-500/5';
                let titleColor = 'text-amber-400';

                if (c.type === 'info' || c.type === 'note') {
                  borderStyle = 'border-indigo-500/60 bg-indigo-500/5';
                  titleColor = 'text-indigo-400';
                } else if (c.type === 'tip') {
                  borderStyle = 'border-emerald-500/60 bg-emerald-500/5';
                  titleColor = 'text-emerald-400';
                } else if (c.type === 'warning' || c.type === 'danger') {
                  borderStyle = 'border-rose-500/60 bg-rose-500/5';
                  titleColor = 'text-rose-400';
                }

                return (
                  <div
                    key={idx}
                    className={`border-l-4 border rounded-r-lg p-3 flex flex-col gap-2 ${borderStyle}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>
                        {c.title}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-slate-200 leading-relaxed">
                      {c.lines.map((line, lIdx) => (
                        <div key={lIdx} className="pl-1">
                          {formatInlineText(line, (f, l) =>
                            taleSpireDriver.rollDice(f, `${character.name}: ${l}`)
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Additional Remaining Lore / Markdown */}
          {parsed.remainingMarkdown && (
            <div className="bg-[#10111a] p-3.5 rounded-lg border border-[#1f2233] flex flex-col gap-2 text-xs leading-relaxed text-slate-300">
              {parsed.remainingMarkdown.split('\n\n').map((paragraph, pIdx) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;

                // Heading 2 or 3
                if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                  const headingText = trimmed.replace(/^#{2,3}\s+/, '');
                  return (
                    <h4
                      key={pIdx}
                      className="text-xs uppercase font-bold text-amber-300 tracking-wider pt-1 border-b border-[#1f2233] pb-1"
                    >
                      {headingText}
                    </h4>
                  );
                }

                // Regular paragraph
                return (
                  <p key={pIdx} className="m-0 leading-relaxed">
                    {formatInlineText(trimmed, (f, l) =>
                      taleSpireDriver.rollDice(f, `${character.name}: ${l}`)
                    )}
                  </p>
                );
              })}
            </div>
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
