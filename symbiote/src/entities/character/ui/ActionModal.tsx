import React, { useState } from 'react';
import { Attack } from '../../../shared';

interface ActionModalProps {
  initialAttack?: Attack | null;
  index?: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (attack: Attack, index?: number) => void;
}

export const ActionModal = ({
  initialAttack,
  index,
  isOpen,
  onClose,
  onSave,
}: ActionModalProps) => {
  const [name, setName] = useState(initialAttack?.name || '');
  const [hit, setHit] = useState(initialAttack?.hit || '');
  const [dmg, setDmg] = useState(initialAttack?.dmg || '');
  const [type, setType] = useState(initialAttack?.type || '');
  const [desc, setDesc] = useState(initialAttack?.desc || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(
      {
        name: name.trim(),
        hit: hit.trim() || undefined,
        dmg: dmg.trim() || undefined,
        type: type.trim() || undefined,
        desc: desc.trim() || undefined,
      },
      index
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-sm p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#262a3d]">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            {index !== undefined ? 'Редактировать действие' : 'Новое действие / атака'}
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 text-xs text-slate-300">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Название *</label>
            <input
              type="text"
              required
              placeholder="Например: Длинный меч или Огненный шар"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Попадание (hit)</label>
              <input
                type="text"
                placeholder="+5"
                value={hit}
                onChange={(e) => setHit(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Урон (dmg)</label>
              <input
                type="text"
                placeholder="1d8+3 колющий"
                value={dmg}
                onChange={(e) => setDmg(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Тип / Тег</label>
            <input
              type="text"
              placeholder="Оружие, Заклинание, Бонусное действие..."
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Описание / Эффект</label>
            <textarea
              rows={2}
              placeholder="Дополнительные свойства, условия или спасбросок..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a3d]">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs cursor-pointer transition-colors"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
