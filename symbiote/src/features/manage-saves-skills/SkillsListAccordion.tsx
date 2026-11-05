import React, { useState, useMemo } from 'react';
import { ChevronRight, X, Star } from 'lucide-react';
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
  skillsData: unknown
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
    const skills = skillsData as Record<string,unknown>;
    const val = skills[skillId] ?? skills[skillLabel] ?? skills[skillLabel.toLowerCase()];
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
  onSetSkillProficiency?: (skillId: string, level: 'none' | 'proficient' | 'expert') => void;
}

export const SkillsListAccordion: React.FC<SkillsListAccordionProps> = ({
  playerData,
  profBonus,
  characterName,
  onToggleSkill,
}) => {
  const [isOpen, setIsOpen] = useState(true);
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
    <div className="bg-[#141622] rounded-lg border border-[#262a3d] transition-all shadow-xs">
      {/* Accordion Header */}
      <div className="w-full px-3 py-2 flex items-center justify-between text-left bg-[#141622] hover:bg-[#181d2d] transition-colors select-none flex-wrap gap-2 rounded-t-lg">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-400 transform transition-transform duration-200 inline-block ${
              isOpen ? 'rotate-90 text-amber-300' : ''
            }`}
          />
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

        {/* Right side controls: Mode Switcher & Collapse */}
        <div className="flex items-center gap-2">
          {/* Quick toggle: All 18 vs Only Proficient */}
          <div className="inline-flex rounded bg-[#10111a] border border-[#262a3d] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setAbilityFilter('all');
              }}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                abilityFilter !== 'proficient'
                  ? 'bg-[#1e2235] text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все 18
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setAbilityFilter('proficient');
              }}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
                abilityFilter === 'proficient'
                  ? 'bg-indigo-600/40 text-indigo-200 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span>Владения</span>
              <span className="text-[10px] opacity-80">({proficientCount + expertCount})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isOpen ? 'Свернуть' : 'Развернуть'}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-2.5 pt-2 border-t border-[#262a3d] flex flex-col gap-2 bg-[#10111a]/60 rounded-b-lg">
          {/* Search bar & Ability filter chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Поиск по названию или характеристике (Выживание, wis, dex...)"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-[#141622] border border-[#262a3d] text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:outline-none focus:border-indigo-500 placeholder-slate-500 pr-7"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                  title="Очистить"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ability Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 text-[11px] shrink-0">
              {(
                [
                  { id: 'all', label: 'Все' },
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

          {/* Empty state with clear actionable instructions */}
          {filteredSkills.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-[#141622] rounded-lg border border-dashed border-[#262a3d] p-3">
              {abilityFilter === 'proficient' ? (
                <>
                  <span className="font-medium text-slate-300">
                    У персонажа пока нет добавленных владений навыками
                  </span>
                  <span className="text-[11px] text-slate-500 max-w-sm">
                    Нажмите «Показать все 18 навыков» и кликните по кружку ○ рядом с нужным навыком, чтобы отметить владение.
                  </span>
                  <button
                    type="button"
                    onClick={() => setAbilityFilter('all')}
                    className="mt-1 px-3 py-1 text-xs rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 cursor-pointer font-bold transition-colors"
                  >
                    Показать все 18 навыков
                  </button>
                </>
              ) : (
                <>
                  <span>
                    Навык по запросу {filterQuery ? `«${filterQuery}»` : ''} не найден
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
                </>
              )}
            </div>
          ) : (
            /* Skills List Grid: Clean 2 columns, perfectly spaced with zero clipping */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
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
                    className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border transition-colors ${
                      profLevel === 'expert'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : profLevel === 'proficient'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                        : 'bg-[#141622] border-[#262a3d] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {/* Proficiency Cycle Button (○ None -> ● Proficient -> ★ Expert) */}
                    <button
                      type="button"
                      onClick={() => onToggleSkill(skill.id)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700/40 cursor-pointer shrink-0 text-xs transition-transform active:scale-90"
                      title={`Владение: ${
                        profLevel === 'expert'
                          ? 'Экспертиза (+2x мастерство). Нажмите, чтобы снять'
                          : profLevel === 'proficient'
                          ? 'Владение (+мастерство). Нажмите для Экспертизы'
                          : 'Нет владения. Нажмите, чтобы отметить владение'
                      }`}
                    >
                      {profLevel === 'expert' ? (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ) : profLevel === 'proficient' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block shadow-xs shadow-indigo-500/50" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-500 inline-block hover:border-slate-300 transition-colors" />
                      )}
                    </button>

                    {/* Skill Label and Ability Tag */}
                    <div
                      className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer select-none"
                      onClick={() => handleRollSkill(skill, totalMod)}
                      title={`Бросить проверку: ${skill.label} (${formattedMod}) в TaleSpire`}
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
