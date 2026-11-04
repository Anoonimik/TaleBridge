import React, { useState } from 'react';
import { ExpendableResource } from '../../shared';

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resource: ExpendableResource) => void;
}

export const ResourceModal = ({ isOpen, onClose, onSave }: ResourceModalProps) => {
  const [name, setName] = useState('');
  const [max, setMax] = useState('3');
  const [resetOn, setResetOn] = useState<'short' | 'long' | 'none'>('long');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const maxNum = Math.max(1, parseInt(max, 10) || 1);
    onSave({
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      current: maxNum,
      max: maxNum,
      resetOn,
    });
    onClose();
  };

  const presets = [
    { name: 'Вдохновение барда', max: 3, resetOn: 'short' as const },
    { name: 'Ярость (Варвар)', max: 2, resetOn: 'long' as const },
    { name: 'Второе дыхание (Воин)', max: 1, resetOn: 'short' as const },
    { name: 'Всплеск действий (Воин)', max: 1, resetOn: 'short' as const },
    { name: 'Ци (Монах)', max: 4, resetOn: 'short' as const },
    { name: 'Очки чародейства', max: 3, resetOn: 'long' as const },
    { name: 'Божественный канал', max: 1, resetOn: 'short' as const },
    { name: 'Наложение рук (Пул)', max: 15, resetOn: 'long' as const },
    { name: 'Стрелы / Болты', max: 20, resetOn: 'none' as const },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-sm p-4 shadow-2xl flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#262a3d]">
          <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">
            Добавить расходуемый ресурс
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">Быстрые шаблоны:</span>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setMax(String(p.max));
                  setResetOn(p.resetOn);
                }}
                className="px-2 py-0.5 rounded text-[11px] bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 hover:text-white border border-[#262a3d] cursor-pointer transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-slate-300">
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Название ресурса
            </label>
            <input
              type="text"
              required
              placeholder="Например: Вдохновение барда или Ярость"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Макс. зарядов / пула
              </label>
              <input
                type="number"
                min="1"
                required
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Восстановление
              </label>
              <select
                value={resetOn}
                onChange={(e) => setResetOn(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="short">Короткий отдых</option>
                <option value="long">Длинный отдых</option>
                <option value="none">Вручную (патроны)</option>
              </select>
            </div>
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
              Создать ресурс
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
