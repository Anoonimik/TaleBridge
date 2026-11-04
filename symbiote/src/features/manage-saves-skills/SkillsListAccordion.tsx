import React, { useState, useMemo } from 'react';
import {
  Character,
  parseModifier,
  formatModifier,
  taleSpireDriver,
} from '../../shared';

export interface SkillDefinition {
  id: string;
  label: string;
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  abilityLabel: string;
}

export const DND_SKILLS: SkillDefinition[] = [
  { id: 'acrobatics', label: 'Акробатика', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'investigation', label: 'Анализ', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'athletics', label: 'Атлетика', ability: 'str', abilityLabel: 'СИЛ' },
  { id: 'perception', label: 'Внимательность', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'survival', label: 'Выживание', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'performance', label: 'Выступление', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'intimidation', label: 'Запугивание', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'history', label: 'История', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'sleight_of_hand', label: 'Ловкость рук', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'arcana', label: 'Магия', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'medicine', label: 'Медицина', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'deception', label: 'Обман', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'nature', label: 'Природа', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'insight', label: 'Проницательность', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'religion', label: 'Религия', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'stealth', label: 'Скрытность', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'persuasion', label: 'Убеждение', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'animal_handling', label: 'Уход за животными', ability: 'wis', abilityLabel: 'МУД' },
];

interface SkillsListAccordionProps {
  playerData: Character | null;
  profBonus: number;
  characterName: string;
  onToggleSkill: (skillId: string) => void;
}

export const SkillsListAccordion: React.FC<SkillsListAccordionProps> = ({
  playerData,
  profBonus,
  characterName,
  onToggleSkill,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const skillsData = playerData?.skills || {};

  // Summary counts
  const { proficientCount, expertCount } = useMemo(() => {
    let prof = 0;
    let exp = 0;
    Object.values(skillsData).forEach((level) => {
      if (level === 'proficient') prof++;
      if (level === 'expert') exp++;
    });
    return { proficientCount: prof, expertCount: exp };
  }, [skillsData]);

  const filteredSkills = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return DND_SKILLS;
    return DND_SKILLS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.abilityLabel.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  const handleRollSkill = (skill: SkillDefinition, totalMod: number) => {
    const modStr = formatModifier(totalMod);
    const sign = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
    taleSpireDriver.rollDice(
      `1d20${modStr}`,
      `Навык: ${skill.label} (${sign}) [${characterName}]`
    );
  };

  return (
    <div className="bg-[#141622] rounded-lg border border-[#262a3d] overflow-hidden transition-all shadow-xs">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#181d2d] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs text-slate-400 transform transition-transform duration-200 inline-block ${
              isOpen ? 'rotate-90 text-amber-300' : ''
            }`}
          >
            ▶
          </span>
          <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            Навыки (18)
          </span>

          {proficientCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
              Владений: {proficientCount}
            </span>
          )}

          {expertCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              Экспертиз: {expertCount}
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400">
          {isOpen ? 'Свернуть' : 'Развернуть'}
        </span>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-2.5 pt-1 border-t border-[#262a3d] flex flex-col gap-2 bg-[#10111a]/60">
          {/* Quick search input */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <input
              type="text"
              placeholder="Поиск по 18 навыкам..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-[#141622] border border-[#262a3d] text-slate-200 text-xs rounded px-2 py-1 w-full focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                title="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>

          {/* Skills Grid: 2 columns on small/medium screens, 3 on large */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {filteredSkills.map((skill) => {
              const profLevel = skillsData[skill.id] || 'none';
              const abilityScoreStr = playerData?.stats?.[skill.ability] || '10';
              const baseMod = parseModifier(abilityScoreStr);
              const bonus =
                profLevel === 'expert'
                  ? 2 * profBonus
                  : profLevel === 'proficient'
                  ? profBonus
                  : 0;
              const totalMod = baseMod + bonus;
              const formattedMod = formatModifier(totalMod);

              return (
                <div
                  key={skill.id}
                  className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border transition-colors ${
                    profLevel === 'expert'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : profLevel === 'proficient'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                      : 'bg-[#141622] border-[#262a3d] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {/* Proficiency Toggle Button */}
                  <button
                    type="button"
                    onClick={() => onToggleSkill(skill.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700/40 cursor-pointer shrink-0 text-xs transition-transform active:scale-90"
                    title={`Владение: ${
                      profLevel === 'expert'
                        ? 'Экспертиза (+2x мастерство). Нажмите, чтобы снять'
                        : profLevel === 'proficient'
                        ? 'Владение (+мастерство). Нажмите для Экспертизы'
                        : 'Нет владения. Нажмите, чтобы добавить владение'
                    }`}
                  >
                    {profLevel === 'expert' ? (
                      <span className="text-amber-400 font-bold text-sm">★</span>
                    ) : profLevel === 'proficient' ? (
                      <span className="text-indigo-400 font-bold text-sm">●</span>
                    ) : (
                      <span className="text-slate-500 hover:text-slate-300 text-sm">○</span>
                    )}
                  </button>

                  {/* Skill Name & Base Ability Tag */}
                  <div
                    className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer select-none"
                    onClick={() => handleRollSkill(skill, totalMod)}
                    title={`Бросить проверку: ${skill.label} (${formattedMod})`}
                  >
                    <span className="text-xs truncate font-medium">
                      {skill.label}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 uppercase font-mono px-1 py-0.2 rounded bg-[#0c0d14]/70 border border-[#262a3d]">
                      {skill.abilityLabel}
                    </span>
                  </div>

                  {/* Roll Modifier Button */}
                  <button
                    type="button"
                    onClick={() => handleRollSkill(skill, totalMod)}
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
                      profLevel === 'expert'
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : profLevel === 'proficient'
                        ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-[#10111a] hover:bg-[#1e2235] text-slate-300 border border-[#262a3d]'
                    }`}
                    title={`Бросить d20 ${formattedMod} в TaleSpire`}
                  >
                    {formattedMod}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
