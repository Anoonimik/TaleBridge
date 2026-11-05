import { DialogLayer } from '../../../shared/ui/DialogLayer';
import React, { useState, useEffect, useId } from 'react';
import { UserCog, X, User, Shield, Activity, Save } from 'lucide-react';
import {
  Character,
  CharacterBasicsUpdate,
  AbilityScores,
  parseModifier,
  computeProfBonus,
} from '../../../shared';

interface EditCharacterBasicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: Character | null;
  onSave: (updates: CharacterBasicsUpdate) => void;
}

const COMMON_RACES = [
  'Человек',
  'Эльф',
  'Полуэльф',
  'Дварф',
  'Тифлинг',
  'Хафлинг',
  'Гном',
  'Драконорожденный',
  'Полуорк',
];

const COMMON_CLASSES = [
  'Воин',
  'Варвар',
  'Плут',
  'Жрец',
  'Волшебник',
  'Паладин',
  'Бард',
  'Следопыт',
  'Друид',
  'Колдун',
  'Чародей',
  'Монах',
  'Изобретатель',
];

const ABILITY_INFO: Record<keyof AbilityScores, { short: string; full: string; desc: string }> = {
  str: { short: 'СИЛ', full: 'Сила', desc: 'Атлетика, оружие ближнего боя' },
  dex: { short: 'ЛОВ', full: 'Ловкость', desc: 'КД, инициатива, скрытность, акробатика' },
  con: { short: 'ТЕЛ', full: 'Телосложение', desc: 'ХП за уровень, спасброски концентрации' },
  int: { short: 'ИНТ', full: 'Интеллект', desc: 'Магия, анализ, история, природа, религия' },
  wis: { short: 'МУД', full: 'Мудрость', desc: 'Внимательность, проницательность, медицина' },
  cha: { short: 'ХАР', full: 'Харизма', desc: 'Убеждение, обман, запугивание, выступление' },
};

export const EditCharacterBasicsModal: React.FC<EditCharacterBasicsModalProps> = ({
  isOpen,
  onClose,
  playerData,
  onSave,
}) => {
  const fieldId = useId();
  const [race, setRace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [level, setLevel] = useState(1);
  const [hp, setHp] = useState(20);
  const [hpMax, setHpMax] = useState(20);
  const [tempHp, setTempHp] = useState(0);
  const [ac, setAc] = useState(10);
  const [speed, setSpeed] = useState('9 м');

  const [stats, setStats] = useState<AbilityScores>({
    str: '10',
    dex: '10',
    con: '10',
    int: '10',
    wis: '10',
    cha: '10',
  });

  // Populate local form state when modal opens or playerData changes
  useEffect(() => {
    if (playerData) {
      setRace(playerData.race || '');
      setCharacterClass(playerData.class || '');
      setLevel(playerData.level || 1);
      const cur = playerData.hp ?? 20;
      const max = playerData.hp_max ?? cur;
      setHp(cur);
      setHpMax(max);
      setTempHp(playerData.temp_hp ?? 0);
      setAc(playerData.ac ?? 10);
      setSpeed(playerData.speed || '9 м');

      const existingStats = playerData.stats || {
        str: '10',
        dex: '10',
        con: '10',
        int: '10',
        wis: '10',
        cha: '10',
      };

      const cleanScore = (val: string | undefined): string => {
        if (!val) return '10';
        const m = String(val).match(/\d+/);
        return m ? m[0] : '10';
      };

      setStats({
        str: cleanScore(existingStats.str),
        dex: cleanScore(existingStats.dex),
        con: cleanScore(existingStats.con),
        int: cleanScore(existingStats.int),
        wis: cleanScore(existingStats.wis),
        cha: cleanScore(existingStats.cha),
      });
    }
  }, [playerData, isOpen]);

  // Handle escape key

  if (!isOpen || !playerData) return null;

  const profBonus = computeProfBonus(level);

  const handleStatChange = (key: keyof AbilityScores, delta: number) => {
    const current = parseInt(stats[key], 10) || 10;
    const next = Math.max(1, Math.min(30, current + delta));
    setStats((prev) => ({ ...prev, [key]: String(next) }));
  };

  const handleStatInput = (key: keyof AbilityScores, value: string) => {
    const clean = value.replace(/\D/g, '');
    setStats((prev) => ({ ...prev, [key]: clean }));
  };

  const handleStatBlur = (key: keyof AbilityScores) => {
    const num = parseInt(stats[key], 10);
    if (isNaN(num) || num < 1) {
      setStats((prev) => ({ ...prev, [key]: '10' }));
    } else if (num > 30) {
      setStats((prev) => ({ ...prev, [key]: '30' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalHpMax = Math.max(1, hpMax);
    const finalHp = Math.max(0, Math.min(finalHpMax, hp));
    const finalAc = Math.max(0, Math.min(40, ac));
    const finalLevel = Math.max(1, Math.min(20, level));

    const finalStats: AbilityScores = {
      str: String(Math.max(1, Math.min(30, parseInt(stats.str, 10) || 10))),
      dex: String(Math.max(1, Math.min(30, parseInt(stats.dex, 10) || 10))),
      con: String(Math.max(1, Math.min(30, parseInt(stats.con, 10) || 10))),
      int: String(Math.max(1, Math.min(30, parseInt(stats.int, 10) || 10))),
      wis: String(Math.max(1, Math.min(30, parseInt(stats.wis, 10) || 10))),
      cha: String(Math.max(1, Math.min(30, parseInt(stats.cha, 10) || 10))),
    };

    onSave({
      race: race.trim(),
      class: characterClass.trim(),
      level: finalLevel,
      hp: finalHp,
      hp_max: finalHpMax,
      temp_hp: tempHp >= 0 ? tempHp : 0,
      ac: finalAc,
      speed: speed.trim() || '9 м',
      stats: finalStats,
    });

    onClose();
  };

  return (
    <DialogLayer title="Параметры персонажа" onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
        <div
          className="bg-[#141622] border border-[#262a3d] rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-4 py-3 bg-[#10111a] border-b border-[#262a3d] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <UserCog className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Параметры персонажа</h3>
                <p className="text-[11px] text-slate-400">
                  «{playerData.name}» • Синхронизация с заметкой Obsidian
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body / Scrollable Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 overflow-y-auto space-y-4 scrollbar-thin text-xs text-slate-300">
              {/* Section 1: Core Profile */}
              <div className="bg-[#10111a]/70 border border-[#262a3d] rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#262a3d]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-300">
                    <User className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>1. Раса, Класс и Уровень</span>
                  </div>
                  <span className="text-[11px] text-indigo-300 font-medium font-mono">
                    Мастерство: +{profBonus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Race */}
                  <div>
                    <label
                      htmlFor={fieldId + '-race'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      Раса
                    </label>
                    <input
                      type="text"
                      list="race-list"
                      id={fieldId + '-race'}
                      aria-label="Раса"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="Человек, Эльф..."
                      className="w-full bg-[#141622] border border-[#262a3d] text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    />
                    <datalist id="race-list">
                      {COMMON_RACES.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>

                  {/* Class */}
                  <div>
                    <label
                      htmlFor={fieldId + '-characterClass'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      Класс и Архетип
                    </label>
                    <input
                      type="text"
                      list="class-list"
                      id={fieldId + '-characterClass'}
                      aria-label="Класс и Архетип"
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      placeholder="Воин, Плут..."
                      className="w-full bg-[#141622] border border-[#262a3d] text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    />
                    <datalist id="class-list">
                      {COMMON_CLASSES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Level */}
                  <div>
                    <label
                      htmlFor={fieldId + '-level'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      Уровень (1 - 20)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLevel((prev) => Math.max(1, prev - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#1e2235] hover:bg-[#252b42] text-slate-200 border border-[#262a3d] cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        id={fieldId + '-level'}
                        aria-label="Уровень (1 - 20)"
                        value={level}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setLevel(Math.max(1, Math.min(20, val)));
                        }}
                        className="flex-1 text-center bg-[#141622] border border-[#262a3d] text-slate-100 text-xs rounded py-1.5 font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setLevel((prev) => Math.max(1, Math.min(20, prev + 1)))}
                        className="w-7 h-7 flex items-center justify-center rounded bg-[#1e2235] hover:bg-[#252b42] text-slate-200 border border-[#262a3d] cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Vitals & Defense */}
              <div className="bg-[#10111a]/70 border border-[#262a3d] rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#262a3d]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-300">
                    <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>2. Здоровье, Защита и Скорость</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Текущие ХП: {hp} / {hpMax}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Max HP */}
                  <div>
                    <label
                      htmlFor={fieldId + '-hpMax'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      Максимум ХП
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      id={fieldId + '-hpMax'}
                      aria-label="Максимум ХП"
                      value={hpMax}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setHpMax(Math.max(1, val));
                      }}
                      className="w-full bg-[#141622] border border-[#262a3d] text-emerald-400 font-bold text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Current HP */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor={fieldId + '-hp'}
                        className="text-[11px] text-slate-400 font-medium"
                      >
                        Текущие ХП
                      </label>
                      <button
                        type="button"
                        onClick={() => setHp(hpMax)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                        title="Восстановить до максимума"
                      >
                        = Макс
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={hpMax}
                      id={fieldId + '-hp'}
                      aria-label="Текущие ХП"
                      value={hp}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setHp(Math.max(0, Math.min(hpMax, val)));
                      }}
                      className="w-full bg-[#141622] border border-[#262a3d] text-slate-100 font-bold text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Armor Class (AC) */}
                  <div>
                    <label
                      htmlFor={fieldId + '-ac'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      КД (Класс Доспеха)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      id={fieldId + '-ac'}
                      aria-label="КД (Класс Доспеха)"
                      value={ac}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setAc(Math.max(1, val));
                      }}
                      className="w-full bg-[#141622] border border-[#262a3d] text-amber-300 font-bold text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <label
                      htmlFor={fieldId + '-speed'}
                      className="block text-[11px] text-slate-400 font-medium mb-1"
                    >
                      Скорость
                    </label>
                    <input
                      type="text"
                      id={fieldId + '-speed'}
                      aria-label="Скорость"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      placeholder="9 м (30 фт.)"
                      className="w-full bg-[#141622] border border-[#262a3d] text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: 6 Ability Scores */}
              <div className="bg-[#10111a]/70 border border-[#262a3d] rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#262a3d]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-300">
                    <Activity className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>3. Шесть характеристик (1 - 30)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Модификатор: (Значение - 10) / 2
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as (keyof AbilityScores)[]).map(
                    (key) => {
                      const info = ABILITY_INFO[key];
                      const rawVal = stats[key] || '10';
                      const mod = parseModifier(rawVal);
                      const sign = mod >= 0 ? `+${mod}` : `${mod}`;

                      return (
                        <div
                          key={key}
                          className="bg-[#141622] border border-[#262a3d] rounded-lg p-2 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-200">{info.short}</span>
                            <span
                              className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                                mod > 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : mod < 0
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {sign}
                            </span>
                          </div>

                          {/* Stepper & input */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatChange(key, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-[#1e2235] hover:bg-[#252b42] text-slate-200 border border-[#262a3d] cursor-pointer font-bold text-xs"
                              title={info.full + ' -1'}
                            >
                              -
                            </button>
                            <input
                              type="text"
                              aria-label={info.full}
                              value={stats[key]}
                              onChange={(e) => handleStatInput(key, e.target.value)}
                              onBlur={() => handleStatBlur(key)}
                              className="flex-1 text-center bg-[#10111a] border border-[#262a3d] text-slate-100 font-bold text-xs rounded py-1 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleStatChange(key, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-[#1e2235] hover:bg-[#252b42] text-slate-200 border border-[#262a3d] cursor-pointer font-bold text-xs"
                              title={info.full + ' +1'}
                            >
                              +
                            </button>
                          </div>

                          <span
                            className="text-[10px] text-slate-500 leading-tight truncate"
                            title={info.desc}
                          >
                            {info.full}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-[#10111a] border-t border-[#262a3d] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-[#141622] hover:bg-[#1e2235] text-slate-300 border border-[#262a3d] text-xs cursor-pointer font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs cursor-pointer font-bold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>Сохранить параметры</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DialogLayer>
  );
};
