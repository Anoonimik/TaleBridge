import React, { useState } from 'react';
import { Combatant, CombatSide, CONDITIONS, COMBAT_SIDES } from '../../../shared';
import { useCombatStore, useRosterStore, wsBridge } from '../../../shared';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onOpenConditions: (c: Combatant) => void;
  onOpenSideMenu: (e: React.MouseEvent, c: Combatant) => void;
}

export const CombatantCard = ({
  combatant,
  isActive,
  onOpenConditions,
  onOpenSideMenu,
}: CombatantCardProps) => {
  const { updateCombatantHp, setInitiative, removeCombatant } = useCombatStore();
  const { setSelectedCharacter, roster } = useRosterStore();
  const [customHpVal, setCustomHpVal] = useState('');
  const conditions = Array.isArray(combatant.conditions) ? combatant.conditions : [];

  const sideMeta =
    COMBAT_SIDES.find((s) => s.id === combatant.side) ||
    COMBAT_SIDES[3]; // default enemy

  const hpPercent = Math.min(
    100,
    Math.max(0, Math.round((combatant.hp / (combatant.maxHp || 1)) * 100))
  );

  let hpColor = 'bg-emerald-500';
  if (hpPercent <= 25) hpColor = 'bg-rose-500';
  else if (hpPercent <= 50) hpColor = 'bg-amber-500';

  const handleApplyCustomHp = (isDamage: boolean) => {
    const val = parseInt(customHpVal, 10);
    if (!isNaN(val) && val > 0) {
      updateCombatantHp(combatant.id, isDamage ? -val : val);
      setCustomHpVal('');
    }
  };

  const handleOpenNote = () => {
    const found = roster.find(
      (r) => r.name.toLowerCase() === combatant.name.toLowerCase()
    );
    if (found) {
      setSelectedCharacter(found);
      if (found.path) {
        wsBridge.send('GET_NOTE', { path: found.path, name: found.name });
      }
    }
  };

  return (
    <div
      className={`rounded-lg border p-2.5 flex flex-col gap-2 transition-all relative ${
        isActive
          ? 'bg-[#181a27] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50'
          : 'bg-[#141622] border-[#262a3d] hover:border-[#383d57]'
      }`}
    >
      {/* Top row: Side badge, Name, Initiative, Note & Delete */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border cursor-pointer uppercase transition-colors shrink-0 ${sideMeta.bg} ${sideMeta.text} ${sideMeta.border}`}
            onClick={(e) => onOpenSideMenu(e, combatant)}
            title="Сменить сторону (Игрок / Союзник / Нейтрал / Враг)"
          >
            {sideMeta.label} ▾
          </button>

          <span
            className="font-semibold text-slate-100 text-xs truncate max-w-[140px]"
            title={combatant.name}
          >
            {combatant.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#10111a] px-1.5 py-0.5 rounded border border-[#262a3d] text-xs">
            <span className="text-[10px] text-slate-500 font-mono">Иниц</span>
            <input
              type="number"
              className="w-9 bg-transparent text-right font-mono font-bold text-amber-400 focus:outline-none text-xs"
              value={combatant.initiative ?? 0}
              onChange={(e) => setInitiative(combatant.id, parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
            onClick={handleOpenNote}
            title="Открыть заметку существа"
          >
            ☰
          </button>

          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs cursor-pointer transition-colors"
            onClick={() => removeCombatant(combatant.id)}
            title="Удалить из боя"
          >
            ✕
          </button>
        </div>
      </div>

      {/* HP Bar and Quick Deltas */}
      <div className="flex flex-col gap-1 bg-[#10111a] p-2 rounded border border-[#1f2233]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">ХП</span>
            <strong className="text-slate-100 font-mono">
              {combatant.hp} / {combatant.maxHp}
            </strong>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">КД</span>
            <strong className="text-slate-200 text-xs">{combatant.ac || 10}</strong>
          </div>
        </div>

        <div className="w-full h-1.5 bg-[#1a1d2d] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${hpColor}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-0.5">
            {[-5, -1].map((val) => (
              <button
                key={val}
                type="button"
                className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded text-[10px] font-mono cursor-pointer transition-colors"
                onClick={() => updateCombatantHp(combatant.id, val)}
              >
                {val}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Урон"
              value={customHpVal}
              onChange={(e) => setCustomHpVal(e.target.value)}
              className="w-12 px-1.5 py-0.5 bg-[#141622] border border-[#262a3d] rounded text-center text-[10px] text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              className="px-1.5 py-0.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded text-[10px] cursor-pointer"
              onClick={() => handleApplyCustomHp(true)}
              title="Нанести урон"
            >
              -
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded text-[10px] cursor-pointer"
              onClick={() => handleApplyCustomHp(false)}
              title="Восстановить здоровье"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            {[1, 5].map((val) => (
              <button
                key={val}
                type="button"
                className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded text-[10px] font-mono cursor-pointer transition-colors"
                onClick={() => updateCombatantHp(combatant.id, val)}
              >
                +{val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditions list and picker button */}
      <div className="flex items-center gap-1 flex-wrap pt-0.5">
        <button
          type="button"
          className="px-1.5 py-0.5 bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] rounded text-[10px] cursor-pointer transition-colors flex items-center gap-1 shrink-0"
          onClick={() => onOpenConditions(combatant)}
          title="Добавить или снять состояния (5e)"
        >
          <span>+ Состояние</span>
          {conditions.length > 0 && (
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
              {conditions.length}
            </span>
          )}
        </button>

        {conditions.map((condName) => {
          const meta = CONDITIONS.find((c) => c.name === condName);
          return (
            <span
              key={condName}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border shrink-0"
              style={{
                backgroundColor: `${meta?.color || '#6366f1'}20`,
                borderColor: `${meta?.color || '#6366f1'}50`,
                color: meta?.color || '#e0e7ff',
              }}
              title={meta?.desc}
            >
              <span>{meta?.label || condName}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
