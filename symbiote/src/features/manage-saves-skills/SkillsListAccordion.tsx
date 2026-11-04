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
  englishLabel: string;
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  abilityLabel: string;
}

export const DND_SKILLS: SkillDefinition[] = [
  { id: 'acrobatics', label: 'Акробатика', englishLabel: 'Acrobatics', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'investigation', label: 'Анализ', englishLabel: 'Investigation', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'athletics', label: 'Атлетика', englishLabel: 'Athletics', ability: 'str', abilityLabel: 'СИЛ' },
  { id: 'perception', label: 'Внимательность', englishLabel: 'Perception', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'survival', label: 'Выживание', englishLabel: 'Survival', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'performance', label: 'Выступление', englishLabel: 'Performance', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'intimidation', label: 'Запугивание', englishLabel: 'Intimidation', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'history', label: 'История', englishLabel: 'History', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'sleight_of_hand', label: 'Ловкость рук', englishLabel: 'Sleight of Hand', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'arcana', label: 'Магия', englishLabel: 'Arcana', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'medicine', label: 'Медицина', englishLabel: 'Medicine', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'deception', label: 'Обман', englishLabel: 'Deception', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'nature', label: 'Природа', englishLabel: 'Nature', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'insight', label: 'Проницательность', englishLabel: 'Insight', ability: 'wis', abilityLabel: 'МУД' },
  { id: 'religion', label: 'Религия', englishLabel: 'Religion', ability: 'int', abilityLabel: 'ИНТ' },
  { id: 'stealth', label: 'Скрытность', englishLabel: 'Stealth', ability: 'dex', abilityLabel: 'ЛОВ' },
  { id: 'persuasion', label: 'Убеждение', englishLabel: 'Persuasion', ability: 'cha', abilityLabel: 'ХАР' },
  { id: 'animal_handling', label: 'Уход за животными', englishLabel: 'Animal Handling', ability: 'wis', abilityLabel: 'МУД' },
];

const HOMOGLYPHS_TO_RU: Record<string, string> = {
  'a': 'а', 'b': 'в', 'c': 'с', 'e': 'е', 'h': 'н', 'k': 'к', 'm': 'м',
  'o': 'о', 'p': 'р', 't': 'т', 'x': 'х', 'y': 'у',
  'A': 'а', 'B': 'в', 'C': 'с', 'E': 'е', 'H': 'н', 'K': 'к', 'M': 'м',
  'O': 'о', 'P': 'р', 'T': 'т', 'X': 'х', 'Y': 'у',
};

function cleanSearchString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeToRu(str: string): string {
  return cleanSearchString(str)
    .split('')
    .map((ch) => HOMOGLYPHS_TO_RU[ch] || ch)
    .join('');
}

export function getSkillProficiency(
  skillId: string,
  skillLabel: string,
  skillsData: any
): 'none' | 'proficient' | 'expert' {
  if (!skillsData) return 'none';

  if (Array.isArray(skillsData)) {
    const idLower = skillId.toLowerCase();
    const labelLower = skillLabel.toLowerCase();
    const has = skillsData.some((item) => {
      const s = String(item).toLowerCase().trim();
      return s === idLower || s === labelLower;
    });
    return has ? 'proficient' : 'none';
  }

  if (typeof skillsData === 'object') {
    const val = skillsData[skillId] ?? skillsData[skillLabel] ?? skillsData[skillLabel.toLowerCase()];
    if (val === 'expert' || val === 2) return 'expert';
    if (val === 'proficient' || val === 1 || val === true) return 'proficient';
    return 'none';
  }

  return 'none';
}

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
  const [abilityFilter, setAbilityFilter] = useState<'all' | 'str' | 'dex' | 'int' | 'wis' | 'cha' | 'proficient'>('all');

  const skillsData = playerData?.skills;

  // Counts of proficiencies and expertise
  const { proficientCount, expertCount } = useMemo(() => {
    let prof = 0;
    let exp = 0;
    DND_SKILLS.forEach((skill) => {
      const level = getSkillProficiency(skill.id, skill.label, skillsData);
      if (level === 'proficient') prof++;
      if (level === 'expert') exp++;
    });
    return { proficientCount: prof, expertCount: exp };
  }, [skillsData]);

  // Robust search and ability filtering
  const filteredSkills = useMemo(() => {
    const qClean = cleanSearchString(filterQuery);
    const qNorm = normalizeToRu(filterQuery);

    return DND_SKILLS.filter((skill) => {
      // 1. Ability filter
      if (abilityFilter === 'proficient') {
        const level = getSkillProficiency(skill.id, skill.label, skillsData);
        if (level === 'none') return false;
      } else if (abilityFilter !== 'all' && skill.ability !== abilityFilter) {
        return false;
      }

      // 2. Text query filter
      if (!qClean) return true;

      const candidates = [
        skill.label.toLowerCase(),
        skill.englishLabel.toLowerCase(),
        skill.id.toLowerCase(),
        skill.ability.toLowerCase(),
        skill.abilityLabel.toLowerCase(),
        normalizeToRu(skill.label),
      ];

      return candidates.some((c) => c.includes(qClean) || c.includes(qNorm));
    });
  }, [filterQuery, abilityFilter, skillsData]);

  const handleRollSkill = (skill: SkillDefinition, totalMod: number) => {
    const modStr = formatModifier(totalMod);
    const sign = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
    taleSpireDriver.rollDice(
      `1d20${modStr}`,
      `Навык: ${skill.label} (${sign}) [${characterName || 'Персонаж'}]`
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
        <div className="flex items-center gap-2 flex-wrap">
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

        <span className="text-[11px] text-slate-400 shrink-0">
          {isOpen ? 'Свернуть' : 'Развернуть'}
        </span>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-2.5 pt-1 border-t border-[#262a3d] flex flex-col gap-2.5 bg-[#10111a]/60">
          {/* Quick search & ability filter chips */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Поиск навыка (Выживание, Скрытность, wis, str...)"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-[#141622] border border-[#262a3d] text-slate-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-indigo-500 placeholder-slate-500"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-[#141622] rounded border border-[#262a3d] cursor-pointer"
                  title="Очистить строку поиска"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Ability Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 text-[11px]">
              {(
                [
                  { id: 'all', label: 'Все (18)' },
                  { id: 'proficient', label: `Владения (${proficientCount + expertCount})` },
                  { id: 'str', label: 'СИЛ' },
                  { id: 'dex', label: 'ЛОВ' },
                  { id: 'int', label: 'ИНТ' },
                  { id: 'wis', label: 'МУД' },
                  { id: 'cha', label: 'ХАР' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setAbilityFilter(chip.id)}
                  className={`px-2 py-0.5 rounded border whitespace-nowrap cursor-pointer transition-colors ${
                    abilityFilter === chip.id
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 font-bold'
                      : 'bg-[#141622] text-slate-400 border-[#262a3d] hover:text-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty search state */}
          {filteredSkills.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-[#141622] rounded border border-dashed border-[#262a3d]">
              <span>
                Навыки по запросу {filterQuery ? `«${filterQuery}»` : ''} не найдены
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterQuery('');
                  setAbilityFilter('all');
                }}
                className="px-2.5 py-1 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 cursor-pointer font-medium"
              >
                Сбросить фильтр и показать все 18 навыков
              </button>
            </div>
          ) : (
            /* Skills List Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {filteredSkills.map((skill) => {
                const profLevel = getSkillProficiency(skill.id, skill.label, skillsData);
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
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded border transition-colors ${
                      profLevel === 'expert'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : profLevel === 'proficient'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                        : 'bg-[#141622] border-[#262a3d] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {/* Proficiency Cycle Button */}
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

                    {/* Skill Label and Ability Tag */}
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
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
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
          )}
        </div>
      )}
    </div>
  );
};
