import React, { useState } from 'react';
import { Combatant, CONDITIONS, COMBAT_SIDES, taleSpireDriver } from '../../../shared';
import { useCombatStore, useRosterStore, wsBridge } from '../../../shared';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onOpenConditions: (id: string) => void;
  onOpenSideMenu: (e: React.MouseEvent, c: Combatant) => void;
}

export const CombatantCard = ({
  combatant,
  isActive,
  onOpenConditions,
  onOpenSideMenu,
}: CombatantCardProps) => {
  const { updateCombatantHp, setInitiative, removeCombatant, toggleCondition } = useCombatStore();
  const { setSelectedCharacter, roster } = useRosterStore();
  const [customHpVal, setCustomHpVal] = useState('');
  const conditions = Array.isArray(combatant.conditions) ? combatant.conditions : [];

  const attacks =
    combatant.attacks && combatant.attacks.length > 0
      ? combatant.attacks
      : roster.find((r) => r.name.toLowerCase() === combatant.name.toLowerCase())?.attacks || [];

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
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className={`text-xs px-2 py-0.5 rounded font-bold border cursor-pointer uppercase transition-colors shrink-0 ${sideMeta.bg} ${sideMeta.text} ${sideMeta.border}`}
            onClick={(e) => onOpenSideMenu(e, combatant)}
            title="Сменить сторону (Игрок / Союзник / Нейтрал / Враг)"
          >
            {sideMeta.label} ▾
          </button>

          <span
            className="font-semibold text-slate-100 text-sm truncate max-w-[150px]"
            title={combatant.name}
          >
            {combatant.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#10111a] px-2 py-0.5 rounded border border-[#262a3d] text-xs">
            <span className="text-xs text-slate-400 font-mono">Иниц</span>
            <input
              type="number"
              className="w-10 bg-transparent text-right font-mono font-bold text-amber-400 focus:outline-none text-sm"
              value={combatant.initiative ?? 0}
              onChange={(e) => setInitiative(combatant.id, parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white text-sm cursor-pointer transition-colors"
            onClick={handleOpenNote}
            title="Открыть заметку существа"
          >
            ☰
          </button>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-sm cursor-pointer transition-colors"
            onClick={() => removeCombatant(combatant.id)}
            title="Удалить из боя"
          >
            ✕
          </button>
        </div>
      </div>

      {/* HP Bar and Quick Deltas */}
      <div className="flex flex-col gap-1.5 bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase font-bold">ХП</span>
            <strong className="text-slate-100 font-mono text-sm">
              {combatant.hp} / {combatant.maxHp}
            </strong>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 uppercase font-bold">КД</span>
            <strong className="text-slate-200 text-sm font-mono">{combatant.ac || 10}</strong>
          </div>
        </div>

        <div className="w-full h-2 bg-[#1a1d2d] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${hpColor}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-1">
            {[-5, -1].map((val) => (
              <button
                key={val}
                type="button"
                className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded text-xs font-mono cursor-pointer transition-colors"
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
              className="w-14 px-1.5 py-0.5 bg-[#141622] border border-[#262a3d] rounded text-center text-xs text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              className="px-2 py-0.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded text-xs cursor-pointer font-bold"
              onClick={() => handleApplyCustomHp(true)}
              title="Нанести урон"
            >
              -
            </button>
            <button
              type="button"
              className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded text-xs cursor-pointer font-bold"
              onClick={() => handleApplyCustomHp(false)}
              title="Восстановить здоровье"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1">
            {[1, 5].map((val) => (
              <button
                key={val}
                type="button"
                className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded text-xs font-mono cursor-pointer transition-colors"
                onClick={() => updateCombatantHp(combatant.id, val)}
              >
                +{val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditions list and picker button */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <button
          type="button"
          className="px-2 py-0.5 bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] rounded text-xs cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
          onClick={() => onOpenConditions(combatant.id)}
          title="Добавить или снять состояния (5e)"
        >
          <span>+ Состояние</span>
          {conditions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
              {conditions.length}
            </span>
          )}
        </button>

        {conditions.map((condName) => {
          const meta = CONDITIONS.find((c) => c.name === condName);
          return (
            <span
              key={condName}
              className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 border shrink-0"
              style={{
                backgroundColor: `${meta?.color || '#6366f1'}20`,
                borderColor: `${meta?.color || '#6366f1'}50`,
                color: meta?.color || '#e0e7ff',
              }}
              title={meta?.desc}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta?.color || '#6366f1' }} />
              <span>{meta?.label || condName}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-white cursor-pointer ml-0.5"
                onClick={() => toggleCondition(combatant.id, condName)}
                title="Снять состояние"
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      {/* Conditions rules explanations */}
      {conditions.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-[#0e1018] rounded-md border border-[#222638] p-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Эффекты состояний ({conditions.length}):</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {conditions.map((condName) => {
              const meta = CONDITIONS.find((c) => c.name === condName);
              if (!meta) return null;
              return (
                <div
                  key={condName}
                  className="flex items-start gap-2 text-xs bg-[#141622] rounded p-1.5 border border-[#1f2233]"
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 border"
                    style={{
                      backgroundColor: `${meta.color}20`,
                      borderColor: `${meta.color}60`,
                      color: meta.color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span>{meta.label}</span>
                  </span>
                  <span className="text-slate-300 text-[11px] leading-snug flex-1">
                    {meta.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions & Attacks list */}
      {attacks.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#1f2233]">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Действия и атаки ({attacks.length}):</span>
            {isActive && (
              <span className="text-amber-400 font-mono text-[9px] lowercase font-normal">
                клавиши: 1-9 (атака), Shift+1-9 (урон)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {attacks.map((atk, atkIdx) => {
              const handleRollAttack = () => {
                const bonus = (atk.hit || '').startsWith('+') || (atk.hit || '').startsWith('-')
                  ? atk.hit
                  : `+${atk.hit}`;
                taleSpireDriver.rollDice(`1d20${bonus}`, `${combatant.name}: ${atk.name} (Атака)`);
              };

              const handleRollDamage = () => {
                taleSpireDriver.rollDice(
                  atk.dmg || '1d6',
                  `${combatant.name}: ${atk.name} (Урон${atk.type ? ` - ${atk.type}` : ''})`
                );
              };

              return (
                <div
                  key={atkIdx}
                  className={`flex items-center gap-1 bg-[#10111a] rounded border px-2 py-1 text-xs transition-colors ${
                    isActive
                      ? 'border-amber-500/40 hover:border-amber-500 bg-[#171926]'
                      : 'border-[#262a3d] hover:border-[#383d57]'
                  }`}
                  title={atk.desc || atk.name}
                >
                  {isActive && (
                    <span
                      className="w-4 h-4 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0"
                      title={`Горячая клавиша: ${atkIdx + 1}`}
                    >
                      {atkIdx + 1}
                    </span>
                  )}

                  <span className="font-semibold text-slate-200 truncate max-w-[120px]" title={atk.name}>
                    {atk.name}
                  </span>

                  {atk.hit && (
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] font-bold cursor-pointer transition-colors border border-amber-500/30 shrink-0"
                      onClick={handleRollAttack}
                      title={`Бросок атаки: 1d20${atk.hit.startsWith('+') || atk.hit.startsWith('-') ? atk.hit : `+${atk.hit}`}${isActive ? ` [Клавиша ${atkIdx + 1}]` : ''}`}
                    >
                      {atk.hit}
                    </button>
                  )}

                  {atk.dmg && atk.dmg !== '0' && (
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-[11px] font-bold cursor-pointer transition-colors border border-rose-500/30 shrink-0"
                      onClick={handleRollDamage}
                      title={`Бросок урона: ${atk.dmg}${atk.type ? ` (${atk.type})` : ''}${isActive ? ` [Клавиша Shift+${atkIdx + 1}]` : ''}`}
                    >
                      {atk.dmg}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
