import React, { useState } from 'react';
import {
  Character,
  Spell,
  SpellSlot,
  parseModifier,
  formatModifier,
  taleSpireDriver,
  useLogStore,
} from '../../shared';
import { SpellModal } from './SpellModal';

interface SpellcastingManagerProps {
  playerData: Character | null;
  onUpdateSpellSlots: (slots: SpellSlot[]) => void;
  onUseSpellSlot: (level: number) => void;
  onRegainSpellSlot: (level: number) => void;
  onResetAllSpellSlots: () => void;
  onSaveSpell: (spell: Spell) => void;
  onDeleteSpell: (spellId: string) => void;
  onSetSpellcastingAbility: (ability: 'int' | 'wis' | 'cha') => void;
}

const DEFAULT_SLOTS: SpellSlot[] = [
  { level: 1, max: 4, current: 4 },
  { level: 2, max: 3, current: 3 },
  { level: 3, max: 2, current: 2 },
  { level: 4, max: 0, current: 0 },
  { level: 5, max: 0, current: 0 },
  { level: 6, max: 0, current: 0 },
  { level: 7, max: 0, current: 0 },
  { level: 8, max: 0, current: 0 },
  { level: 9, max: 0, current: 0 },
];

export const SpellcastingManager = ({
  playerData,
  onUpdateSpellSlots,
  onUseSpellSlot,
  onRegainSpellSlot,
  onResetAllSpellSlots,
  onSaveSpell,
  onDeleteSpell,
  onSetSpellcastingAbility,
}: SpellcastingManagerProps) => {
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleFilter, setSelectedCircleFilter] = useState<number | 'all'>('all');
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);

  if (!playerData) return null;

  const ability = playerData.spellcastingAbility || 'int';
  const level = playerData.level || 1;
  const profBonus = Math.floor((level - 1) / 4) + 2;

  const abilityScoreStr = playerData.stats?.[ability] || '10';
  const abilityMod = parseModifier(abilityScoreStr);
  const spellSaveDC = 8 + profBonus + abilityMod;
  const spellAttackBonus = profBonus + abilityMod;

  const spellSlots: SpellSlot[] = playerData.spellSlots && playerData.spellSlots.length > 0
    ? playerData.spellSlots
    : DEFAULT_SLOTS;

  const spells: Spell[] = playerData.spells || [];

  // Filter spells
  const filteredSpells = spells.filter((s) => {
    const matchesQuery =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.school && s.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.desc && s.desc.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCircle = selectedCircleFilter === 'all' || s.level === selectedCircleFilter;

    return matchesQuery && matchesCircle;
  });

  // Group spells by circle
  const spellsByCircle: { [circle: number]: Spell[] } = {};
  filteredSpells.forEach((s) => {
    const c = s.level || 0;
    if (!spellsByCircle[c]) spellsByCircle[c] = [];
    spellsByCircle[c].push(s);
  });

  const circleNumbers = Object.keys(spellsByCircle)
    .map(Number)
    .sort((a, b) => a - b);

  const handleCastSpell = (spell: Spell) => {
    const charName = playerData.name || 'Персонаж';
    const isCantrip = (spell.level || 0) === 0;

    if (isCantrip) {
      useLogStore.getState().addLog('roll', `[Заговор] ${charName} сотворил «${spell.name}»`);
      if (spell.dmg) {
        taleSpireDriver.rollDice(spell.dmg, `${spell.name} (${charName})`);
      }
      return;
    }

    const slot = spellSlots.find((s) => s.level === spell.level);
    if (slot && slot.current > 0) {
      onUseSpellSlot(spell.level);
      useLogStore
        .getState()
        .addLog(
          'roll',
          `[Заклинание] ${charName} сотворил «${spell.name}» (${spell.level} круг). Израсходована ячейка (осталось: ${slot.current - 1}/${slot.max})`
        );
    } else {
      useLogStore
        .getState()
        .addLog(
          'roll',
          `[Заклинание] ${charName} сотворил «${spell.name}» (${spell.level} круг) [без доступных ячеек]`
        );
    }

    if (spell.dmg) {
      taleSpireDriver.rollDice(spell.dmg, `${spell.name} (${charName})`);
    }
  };

  const handleAdjustMaxSlots = (circleLevel: number, delta: number) => {
    const updated = spellSlots.map((s) => {
      if (s.level === circleLevel) {
        const nextMax = Math.max(0, s.max + delta);
        const nextCur = Math.min(nextMax, s.current);
        return { ...s, max: nextMax, current: nextCur };
      }
      return s;
    });
    // If level doesn't exist yet
    if (!updated.some((s) => s.level === circleLevel) && delta > 0) {
      updated.push({ level: circleLevel, max: delta, current: delta });
      updated.sort((a, b) => a.level - b.level);
    }
    onUpdateSpellSlots(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Header: Spellcasting DC, Attack Bonus & Ability */}
      <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Базовая характеристика:
            </span>
            <div className="flex items-center gap-1">
              {(['int', 'wis', 'cha'] as const).map((ab) => {
                const label = ab === 'int' ? 'ИНТ' : ab === 'wis' ? 'МУД' : 'ХАР';
                const isSelected = ability === ab;
                return (
                  <button
                    key={ab}
                    type="button"
                    onClick={() => onSetSpellcastingAbility(ab)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onResetAllSpellSlots}
            className="px-2.5 py-1 rounded bg-[#10111a] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-colors"
            title="Восстановить все потраченные ячейки заклинаний"
          >
            Восстановить ячейки
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Сл спасброска</span>
            <span className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {spellSaveDC}
            </span>
            <span className="text-[9px] text-slate-500">8 + БМ + мод</span>
          </div>

          <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Бонус атаки</span>
            <span className="text-base font-bold text-indigo-300 font-mono mt-0.5">
              {formatModifier(spellAttackBonus)}
            </span>
            <span className="text-[9px] text-slate-500">БМ + мод</span>
          </div>

          <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Модификатор</span>
            <span className="text-base font-bold text-slate-200 font-mono mt-0.5">
              {formatModifier(abilityMod)}
            </span>
            <span className="text-[9px] text-slate-500 uppercase">{ability}</span>
          </div>
        </div>
      </div>

      {/* 2. Spell Slots Matrix */}
      <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Ячейки заклинаний
          </h4>
          <span className="text-[10px] text-slate-400">
            Клик по ячейке — потратить / вернуть
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {spellSlots
            .filter((s) => s.max > 0 || s.level <= 5)
            .map((slot) => {
              const bubbles = Array.from({ length: slot.max });
              return (
                <div
                  key={slot.level}
                  className="bg-[#10111a] px-2.5 py-1.5 rounded border border-[#262a3d] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-indigo-300 font-mono w-4">
                      {slot.level}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">круг</span>
                  </div>

                  {/* Bubbles */}
                  <div className="flex items-center gap-1 flex-wrap flex-1 justify-center">
                    {slot.max === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">нет ячеек</span>
                    ) : (
                      bubbles.map((_, bIdx) => {
                        const isAvailable = bIdx < slot.current;
                        return (
                          <button
                            key={bIdx}
                            type="button"
                            onClick={() => {
                              if (isAvailable) {
                                onUseSpellSlot(slot.level);
                              } else {
                                onRegainSpellSlot(slot.level);
                              }
                            }}
                            className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                              isAvailable
                                ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)] hover:bg-indigo-400'
                                : 'bg-transparent border-slate-600 hover:border-slate-400'
                            }`}
                            title={isAvailable ? 'Потратить ячейку' : 'Восстановить ячейку'}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Max controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAdjustMaxSlots(slot.level, -1)}
                      disabled={slot.max <= 0}
                      className="w-4 h-4 rounded flex items-center justify-center bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-mono cursor-pointer"
                      title="Уменьшить макс. ячеек"
                    >
                      -
                    </button>
                    <span className="text-[11px] font-mono text-slate-300 w-3 text-center">
                      {slot.max}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustMaxSlots(slot.level, 1)}
                      className="w-4 h-4 rounded flex items-center justify-center bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer"
                      title="Увеличить макс. ячеек"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. Spells List & Filtering */}
      <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Заклинания ({spells.length})
            </h4>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingSpell(null);
              setIsModalOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
          >
            <span>+</span> Добавить заклинание
          </button>
        </div>

        {/* Search & Circle Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="Поиск по названию, школе или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
          />

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setSelectedCircleFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                selectedCircleFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
              }`}
            >
              Все
            </button>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedCircleFilter(lvl)}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  selectedCircleFilter === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
                }`}
              >
                {lvl === 0 ? '0' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Spells Grouped by Level */}
        {spells.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-[#262a3d] rounded-lg flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">В книге заклинаний пока ничего нет</span>
            <button
              type="button"
              onClick={() => {
                setEditingSpell(null);
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold cursor-pointer transition-colors"
            >
              + Добавить первое заклинание
            </button>
          </div>
        ) : filteredSpells.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Ничего не найдено по запросу «{searchQuery}»
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {circleNumbers.map((cNum) => {
              const list = spellsByCircle[cNum] || [];
              const groupTitle = cNum === 0 ? 'Заговоры (0 круг)' : `${cNum}-й круг`;

              return (
                <div key={cNum} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 border-b border-[#262a3d] pb-1">
                    <span>{groupTitle}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({list.length})</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {list.map((spell) => {
                      const isExpanded = expandedSpellId === spell.id;

                      return (
                        <div
                          key={spell.id}
                          className="bg-[#10111a] rounded-lg border border-[#262a3d] p-2.5 flex flex-col gap-1.5 hover:border-slate-600 transition-colors"
                        >
                          {/* Top Row: Name, Tags, Cast Button */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-200 text-xs">{spell.name}</span>
                              {spell.school && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1d2d] text-slate-400 border border-[#262a3d]">
                                  {spell.school}
                                </span>
                              )}
                              {spell.concentration && (
                                <span
                                  className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                                  title="Требует концентрации"
                                >
                                  К
                                </span>
                              )}
                              {spell.ritual && (
                                <span
                                  className="text-[10px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                                  title="Ритуал"
                                >
                                  Р
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Cast Button */}
                              <button
                                type="button"
                                onClick={() => handleCastSpell(spell)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs active:scale-95"
                                title={`Сотворить «${spell.name}» (автоматически расходует ячейку)`}
                              >
                                Сотворить
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSpell(spell);
                                  setIsModalOpen(true);
                                }}
                                className="px-1.5 py-1 rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] cursor-pointer"
                                title="Редактировать заклинание"
                              >
                                ✎
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Удалить заклинание «${spell.name}»?`)) {
                                    onDeleteSpell(spell.id);
                                  }
                                }}
                                className="px-1.5 py-1 rounded bg-[#1a1d2d] hover:bg-rose-950/60 text-slate-500 hover:text-rose-300 text-[11px] cursor-pointer"
                                title="Удалить заклинание"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Quick specs: Time, Range, Duration, Dmg */}
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                            {spell.time && <span>⏳ {spell.time}</span>}
                            {spell.range && <span>🎯 {spell.range}</span>}
                            {spell.duration && <span>🕒 {spell.duration}</span>}
                            {spell.components && <span>📜 {spell.components}</span>}
                            {spell.dmg && (
                              <button
                                type="button"
                                onClick={() =>
                                  taleSpireDriver.rollDice(
                                    spell.dmg!,
                                    `${spell.name} (${playerData.name})`
                                  )
                                }
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-600/40 font-mono font-bold cursor-pointer transition-colors"
                                title="Бросить урон / эффект в TaleSpire"
                              >
                                🎲 {spell.dmg}
                              </button>
                            )}
                          </div>

                          {/* Description Toggle */}
                          {spell.desc && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-[#262a3d]/60">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSpellId(isExpanded ? null : spell.id)
                                }
                                className="text-[10px] text-slate-500 hover:text-slate-300 self-start cursor-pointer transition-colors"
                              >
                                {isExpanded ? '▴ Скрыть описание' : '▾ Показать описание'}
                              </button>
                              {isExpanded && (
                                <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
                                  {spell.desc}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spell Modal */}
      <SpellModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSpell(null);
        }}
        onSave={onSaveSpell}
        initialSpell={editingSpell}
      />
    </div>
  );
};
