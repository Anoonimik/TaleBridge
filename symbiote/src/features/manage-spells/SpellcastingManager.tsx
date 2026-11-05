import { createId } from '../../../../packages/domain/id';
import React, { useState, useMemo, useRef } from 'react';
import {
  Character,
  Spell,
  SpellSlot,
  parseModifier,
  computeProfBonus,
  taleSpireDriver,
  useLogStore,
} from '../../shared';
import { SpellModal } from './SpellModal';
import { SpellcastingStatsHeader, SpellSlotsMatrix, SpellRow, SpellCastModal } from './ui';
import { useRosterStore } from '../../entities/character/model/store';
import { cleanDiceFormula } from '../../../../packages/domain/dice';
import { scaleDiceFormula } from './lib/spellScaling';

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
];

export const SpellcastingManager: React.FC<SpellcastingManagerProps> = ({
  playerData,
  onUpdateSpellSlots,
  onUseSpellSlot,
  onRegainSpellSlot,
  onResetAllSpellSlots,
  onSaveSpell,
  onDeleteSpell,
  onSetSpellcastingAbility,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [castingSpell, setCastingSpell] = useState<Spell | null>(null);
  const castOwner = useRef<string | undefined>(undefined);
  const castPending = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleFilter, setSelectedCircleFilter] = useState<number | 'all'>('all');
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);

  const ability = playerData?.spellcastingAbility || 'int';
  const level = playerData?.level || 1;
  const profBonus = useMemo(() => computeProfBonus(level), [level]);

  const abilityMod = useMemo(() => {
    const abilityScoreStr = playerData?.stats?.[ability] || '10';
    return parseModifier(abilityScoreStr);
  }, [playerData?.stats, ability]);

  const spellSaveDC = 8 + profBonus + abilityMod;
  const spellAttackBonus = profBonus + abilityMod;

  const spellSlots: SpellSlot[] = useMemo(() => {
    return playerData?.spellSlots && playerData.spellSlots.length > 0
      ? playerData.spellSlots
      : DEFAULT_SLOTS;
  }, [playerData?.spellSlots]);

  const spells: Spell[] = useMemo(() => playerData?.spells || [], [playerData?.spells]);

  // Filter spells
  const filteredSpells = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return spells.filter((s) => {
      const matchesQuery =
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.school && s.school.toLowerCase().includes(query)) ||
        (s.desc && s.desc.toLowerCase().includes(query));

      const matchesCircle = selectedCircleFilter === 'all' || s.level === selectedCircleFilter;

      return matchesQuery && matchesCircle;
    });
  }, [spells, searchQuery, selectedCircleFilter]);

  // Group spells by circle
  const { spellsByCircle, circleNumbers } = useMemo(() => {
    const map: Record<number, Spell[]> = {};
    filteredSpells.forEach((s) => {
      const c = s.level || 0;
      if (!map[c]) map[c] = [];
      map[c].push(s);
    });

    const numbers = Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b);

    return { spellsByCircle: map, circleNumbers: numbers };
  }, [filteredSpells]);

  if (!playerData) return null;

  const handleCastSpell = (spell: Spell) => {
    const charName = playerData.name || 'Персонаж';
    const isCantrip = (spell.level || 0) === 0;

    if (isCantrip) {
      useLogStore.getState().addLog('roll', `[Заговор] ${charName} сотворил «${spell.name}»`);
      if (spell.dmg) {
        taleSpireDriver.rollDice(spell.dmg, `${spell.name} (${charName})`);
      }
      if (spell.concentration) {
        const state = useRosterStore.getState();
        if (state.playerData)
          state.setPlayerData({
            ...state.playerData,
            activeConcentration: {
              spellId: spell.id,
              spellName: spell.name,
              instanceId: createId(),
            },
            concentrationChecks: [],
          });
      }
      return;
    }

    // Leveled spell: open SpellCastModal
    castOwner.current = playerData.id;
    castPending.current = false;
    setCastingSpell(spell);
  };

  const handleConfirmCastSpell = (spell: Spell, selectedCircle: number) => {
    const charName = playerData.name || 'Персонаж';

    const current = useRosterStore.getState().playerData;
    if (
      castPending.current ||
      !current ||
      current.id !== castOwner.current ||
      !current.spells?.some((entry) => entry.id === spell.id) ||
      !Number.isInteger(selectedCircle) ||
      selectedCircle < spell.level ||
      selectedCircle > 9 ||
      !(current.spellSlots || spellSlots).some(
        (slot) => slot.level === selectedCircle && slot.current > 0,
      )
    )
      return;
    let formula = '';
    try {
      if (spell.dmg)
        formula = cleanDiceFormula(
          scaleDiceFormula(spell.dmg, spell.level, selectedCircle, spell.desc),
        );
    } catch {
      useLogStore
        .getState()
        .addLog('action', 'Некорректная формула заклинания. Ячейка не потрачена.');
      return;
    }
    castPending.current = true;
    onUseSpellSlot(selectedCircle);

    // 2. Roll scaled dice formula in TaleSpire if spell has dmg
    if (spell.dmg) {
      const scaledFormula = formula;
      taleSpireDriver.rollDice(
        scaledFormula,
        `${spell.name} (${selectedCircle} круг) [${charName}]`,
      );
    }

    // 3. Log to useLogStore
    useLogStore
      .getState()
      .addLog(
        'roll',
        `[Заклинание] ${charName} сотворил «${spell.name}» с ячейкой ${selectedCircle} круга (базовый: ${spell.level} круг).`,
      );

    if (spell.concentration) {
      const state = useRosterStore.getState();
      if (state.playerData && state.playerData.id === castOwner.current)
        state.setPlayerData({
          ...state.playerData,
          activeConcentration: { spellId: spell.id, spellName: spell.name, instanceId: createId() },
          concentrationChecks: [],
        });
    }
    // 4. Close modal
    setCastingSpell(null);
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

    if (!updated.some((s) => s.level === circleLevel) && delta > 0) {
      updated.push({ level: circleLevel, max: delta, current: delta });
      updated.sort((a, b) => a.level - b.level);
    }
    onUpdateSpellSlots(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Header: Spellcasting DC, Attack Bonus & Ability */}
      <SpellcastingStatsHeader
        ability={ability}
        spellSaveDC={spellSaveDC}
        spellAttackBonus={spellAttackBonus}
        abilityMod={abilityMod}
        onSetSpellcastingAbility={onSetSpellcastingAbility}
        onResetAllSpellSlots={onResetAllSpellSlots}
      />

      {/* 2. Spell Slots Matrix */}
      <SpellSlotsMatrix
        spellSlots={spellSlots}
        onUseSpellSlot={onUseSpellSlot}
        onRegainSpellSlot={onRegainSpellSlot}
        onAdjustMaxSlots={handleAdjustMaxSlots}
      />

      {/* 3. Spell List Panel */}
      <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2.5">
        {/* Controls Bar: Search, Circle Filter, Add Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Поиск по названию, школе, описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingSpell(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            + Добавить заклинание
          </button>
        </div>

        {/* Circle Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setSelectedCircleFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all shrink-0 ${
              selectedCircleFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
            }`}
          >
            Все ({spells.length})
          </button>

          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
            const count = spells.filter((s) => (s.level || 0) === lvl).length;
            if (count === 0 && lvl > 3 && selectedCircleFilter !== lvl) return null;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedCircleFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-all shrink-0 ${
                  selectedCircleFilter === lvl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
                }`}
              >
                {lvl === 0 ? 'Заговоры' : `${lvl} круг`} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Spells List */}
        {circleNumbers.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            {spells.length === 0
              ? 'У персонажа пока нет добавленных заклинаний. Нажмите «+ Добавить заклинание»'
              : 'Ничего не найдено по заданному фильтру'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {circleNumbers.map((circle) => {
              const list = spellsByCircle[circle] || [];
              const groupTitle = circle === 0 ? 'Заговоры' : `${circle} круг заклинаний`;

              return (
                <div key={circle} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 border-b border-[#262a3d] pb-1">
                    <span>{groupTitle}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({list.length})</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {list.map((spell) => (
                      <SpellRow
                        key={spell.id}
                        spell={spell}
                        playerName={playerData.name || 'Персонаж'}
                        isExpanded={expandedSpellId === spell.id}
                        onToggleExpand={() =>
                          setExpandedSpellId(expandedSpellId === spell.id ? null : spell.id)
                        }
                        onCast={handleCastSpell}
                        onEdit={(s) => {
                          setEditingSpell(s);
                          setIsModalOpen(true);
                        }}
                        onDelete={onDeleteSpell}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <SpellModal
          isOpen={isModalOpen}
          initialSpell={editingSpell}
          onSave={(spell) => {
            onSaveSpell(spell);
            setIsModalOpen(false);
            setEditingSpell(null);
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSpell(null);
          }}
        />
      )}

      {/* Upcast / Cast Leveled Spell Modal */}
      {castingSpell && (
        <SpellCastModal
          isOpen={Boolean(castingSpell)}
          spell={castingSpell}
          spellSlots={spellSlots}
          onCast={handleConfirmCastSpell}
          onClose={() => setCastingSpell(null)}
        />
      )}
    </div>
  );
};
