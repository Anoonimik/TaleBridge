import React, { useState } from 'react';
import { Spell, ModalShell } from '../../shared';

interface SpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spell: Spell) => void;
  initialSpell?: Spell | null;
}

const SCHOOLS = [
  'Воплощение',
  'Ограждение',
  'Иллюзия',
  'Некромантия',
  'Очарование',
  'Преобразование',
  'Прорицание',
  'Вызов',
];

export const SpellModal = ({ isOpen, onClose, onSave, initialSpell }: SpellModalProps) => {
  const [name, setName] = useState(initialSpell?.name || '');
  const [level, setLevel] = useState<number>(initialSpell?.level ?? 1);
  const [school, setSchool] = useState(initialSpell?.school || 'Воплощение');
  const [time, setTime] = useState(initialSpell?.time || '1 действие');
  const [range, setRange] = useState(initialSpell?.range || '60 фт.');
  const [components, setComponents] = useState(initialSpell?.components || 'В, С');
  const [duration, setDuration] = useState(initialSpell?.duration || 'Мгновенно');
  const [concentration, setConcentration] = useState(initialSpell?.concentration || false);
  const [ritual, setRitual] = useState(initialSpell?.ritual || false);
  const [dmg, setDmg] = useState(initialSpell?.dmg || '');
  const [desc, setDesc] = useState(initialSpell?.desc || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: initialSpell?.id || `spell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      level: Number(level),
      school,
      time,
      range,
      components,
      duration,
      concentration,
      ritual,
      dmg: dmg.trim() || undefined,
      desc: desc.trim() || undefined,
      prepared: true,
    });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialSpell ? 'Редактировать заклинание' : 'Добавить заклинание'}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Название *
            </label>
            <input
              type="text"
              required
              placeholder="Огненный шар, Лечение ран..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Круг (Уровень)
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={0}>Заговор (0)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} круг
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Школа магии
            </label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Время накладывания
            </label>
            <input
              type="text"
              placeholder="1 действие / бонусное"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Дистанция
            </label>
            <input
              type="text"
              placeholder="На себя, 60 фт, 120 фт"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Длительность
            </label>
            <input
              type="text"
              placeholder="Мгновенно, 1 минута, 1 час"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Компоненты
            </label>
            <input
              type="text"
              placeholder="В, С, М (перо)"
              value={components}
              onChange={(e) => setComponents(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Формула урона / лечения
            </label>
            <input
              type="text"
              placeholder="8d6 огонь или 1d8+3"
              value={dmg}
              onChange={(e) => setDmg(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 py-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={concentration}
              onChange={(e) => setConcentration(e.target.checked)}
              className="rounded bg-[#10111a] border-[#262a3d] text-indigo-600 focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span className="text-xs text-slate-300">Концентрация</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ritual}
              onChange={(e) => setRitual(e.target.checked)}
              className="rounded bg-[#10111a] border-[#262a3d] text-indigo-600 focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span className="text-xs text-slate-300">Ритуал</span>
          </label>
        </div>

        <div>
          <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
            Описание эффекта
          </label>
          <textarea
            rows={3}
            placeholder="Подробное описание заклинания или спасброска цели..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 scrollbar-thin"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#262a3d]">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs cursor-pointer"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer"
          >
            {initialSpell ? 'Сохранить изменения' : 'Добавить заклинание'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
