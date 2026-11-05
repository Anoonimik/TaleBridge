import React, { useState } from 'react';
import {
  Character,
  ExpendableResource,
  HitDice,
  parseModifier,
  formatModifier,
} from '../../shared';
import { ResourceModal } from './ResourceModal';

interface ClassResourcesManagerProps {
  playerData: Character | null;
  onToggleInspiration: () => void;
  onUpdateResources: (resources: ExpendableResource[]) => void;
  onUpdateHitDice: (hitDice: HitDice) => void;
  onSpendHitDice: () => void;
  onPerformRest: (type: 'short' | 'long') => void;
}

export const ClassResourcesManager = ({
  playerData,
  onToggleInspiration,
  onUpdateResources,
  onUpdateHitDice,
  onSpendHitDice,
  onPerformRest,
}: ClassResourcesManagerProps) => {
  const [showAddModal, setShowAddModal] = useState(false);

  if (!playerData) return null;

  const hasInspiration = Boolean(playerData.inspiration);
  const resources = playerData.resources || [];
  const hitDice = playerData.hitDice || {
    current: playerData.level || 3,
    total: playerData.level || 3,
    dieType: 'd8',
  };

  const conMod = parseModifier(playerData.stats?.con || '10');
  const conModStr = formatModifier(conMod);

  const handleDeltaResource = (resId: string, delta: number) => {
    const updated = resources.map((r) => {
      if (r.id === resId) {
        const next = Math.max(0, Math.min(r.max, r.current + delta));
        return { ...r, current: next };
      }
      return r;
    });
    onUpdateResources(updated);
  };

  const handleDeleteResource = (resId: string) => {
    onUpdateResources(resources.filter((r) => r.id !== resId));
  };

  const handleAddResource = (newRes: ExpendableResource) => {
    onUpdateResources([...resources, newRes]);
  };

  return (
    <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-3">
      {/* Top: Inspiration & Rest Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#262a3d]">
        {/* Inspiration Toggle */}
        <button
          type="button"
          onClick={onToggleInspiration}
          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
            hasInspiration
              ? 'bg-amber-500/25 border-amber-500/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
              : 'bg-[#10111a] border-[#262a3d] text-slate-400 hover:text-slate-200 hover:border-slate-600'
          }`}
          title="Вдохновение (Heroic Inspiration): даёт преимущество на бросок кубиков"
        >
          <span className="text-sm font-black">{hasInspiration ? '★' : '☆'}</span>
          <span>Вдохновение {hasInspiration ? '(Активно)' : ''}</span>
        </button>

        {/* Short / Long Rest buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPerformRest('short')}
            className="px-2.5 py-1.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-pointer transition-colors"
            title="Короткий отдых (1 час): восстанавливает ресурсы с перезарядкой «КД»"
          >
            Короткий отдых
          </button>
          <button
            type="button"
            onClick={() => onPerformRest('long')}
            className="px-2.5 py-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-xs font-bold cursor-pointer transition-colors shadow-sm"
            title="Длинный отдых (8 часов): восстанавливает ХП до максимума, все ячейки заклинаний, кости хитов и ресурсы"
          >
            Длинный отдых (8ч)
          </button>
        </div>
      </div>

      {/* Hit Dice Tracker */}
      <div className="bg-[#10111a] p-2.5 rounded border border-[#1f2233] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-400">Кости хитов:</span>
          <select
            value={hitDice.dieType}
            onChange={(e) =>
              onUpdateHitDice({ ...hitDice, dieType: e.target.value })
            }
            className="bg-[#141622] border border-[#262a3d] text-amber-300 text-xs rounded px-1.5 py-0.5 focus:outline-none cursor-pointer font-mono font-bold"
          >
            <option value="d6">d6</option>
            <option value="d8">d8</option>
            <option value="d10">d10</option>
            <option value="d12">d12</option>
          </select>
          <span className="text-xs font-mono font-bold text-slate-200">
            {hitDice.current} / {hitDice.total}
          </span>
        </div>

        <button
          type="button"
          onClick={onSpendHitDice}
          disabled={hitDice.current <= 0}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            hitDice.current > 0
              ? 'bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border-emerald-500/40 shadow-xs'
              : 'bg-[#141622] text-slate-500 border-[#262a3d] cursor-not-allowed opacity-50'
          }`}
          title={`Бросить 1${hitDice.dieType}${conModStr} и восстановить здоровье`}
        >
          Использовать кость (1{hitDice.dieType}{conModStr})
        </button>
      </div>

      {/* Consumable Class Resources */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#262a3d]">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Расходуемые ресурсы и заряды ({resources.length})
          </h4>
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium cursor-pointer"
            onClick={() => setShowAddModal(true)}
          >
            + Ресурс
          </button>
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs">
            Нет добавленных ресурсов. Нажмите «+ Ресурс», чтобы отслеживать Ярость, Вдохновение барда, Ци, патроны и т.д.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-[#10111a] border border-[#262a3d] rounded p-2 flex items-center justify-between gap-2"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-200 text-xs truncate" title={res.name}>
                      {res.name}
                    </span>
                    {res.resetOn !== 'none' && (
                      <span className="text-[9px] px-1 rounded bg-[#1a1d2d] text-slate-400 font-mono uppercase shrink-0">
                        {res.resetOn === 'short' ? 'КД' : 'ДО'}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-[#141622] rounded-full overflow-hidden mt-1 border border-[#1f2233]">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${Math.min(100, (res.current / res.max) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDeltaResource(res.id, -1)}
                    disabled={res.current <= 0}
                    className="w-6 h-6 rounded bg-[#1a1d2d] hover:bg-[#25293d] disabled:opacity-40 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-xs text-slate-100 w-8 text-center">
                    {res.current}/{res.max}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeltaResource(res.id, 1)}
                    disabled={res.current >= res.max}
                    className="w-6 h-6 rounded bg-[#1a1d2d] hover:bg-[#25293d] disabled:opacity-40 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteResource(res.id)}
                    className="w-5 h-5 text-slate-500 hover:text-rose-400 text-xs cursor-pointer ml-1 flex items-center justify-center"
                    title="Удалить ресурс"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ResourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddResource}
      />
    </div>
  );
};
