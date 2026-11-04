import React, { useState } from 'react';
import { Spell } from '../../shared';

interface SpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spell: Spell) => void;
  initialSpell?: Spell | null;
}

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

  if (!isOpen) return null;

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

  const schools = [
    'Воплощение',
    'Ограждение',
    'Иллюзия',
    'Некромантия',
    'Очарование',
    'Преобразование',
    'Прорицание',
    'Вызов',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262a3d] bg-[#10111a] shrink-0">
          <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">
            {initialSpell ? 'Редактировать заклинание' : 'Добавить заклинание'}
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Название заклинания
              </label>
              <input
                type="text"
                required
                placeholder="Огненный шар, Щит, Волшебная стрела..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Круг (Уровень)
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                className="w-full px-2 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
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
                className="w-full px-2 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                {schools.map((s) => (
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
                placeholder="1 действие / бонус / реакция"
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
                placeholder="Касание / 30 фт. / 60 фт."
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Урон / Лечение (формула)
              </label>
              <input
                type="text"
                placeholder="8d6 огня, 1d10, 2d8+3"
                value={dmg}
                onChange={(e) => setDmg(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-amber-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Длительность
              </label>
              <input
                type="text"
                placeholder="Мгновенно / 1 минута / 1 час"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={concentration}
                  onChange={(e) => setConcentration(e.target.checked)}
                  className="rounded accent-indigo-500 cursor-pointer"
                />
                <span>Концентрация</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={ritual}
                  onChange={(e) => setRitual(e.target.checked)}
                  className="rounded accent-indigo-500 cursor-pointer"
                />
                <span>Ритуал</span>
              </label>
            </div>
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
      </div>
    </div>
  );
};
