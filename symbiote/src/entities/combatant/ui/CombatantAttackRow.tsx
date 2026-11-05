import React from 'react';
import { Attack, normalizeHitBonus, taleSpireDriver } from '../../../shared';

interface CombatantAttackRowProps {
  combatantName: string;
  attacks: Attack[];
  isActive: boolean;
}

export const CombatantAttackRow: React.FC<CombatantAttackRowProps> = ({
  combatantName,
  attacks,
  isActive,
}) => {
  if (attacks.length === 0) return null;

  return (
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
            const bonus = normalizeHitBonus(atk.hit);
            taleSpireDriver.rollDice(`1d20${bonus}`, `${combatantName}: ${atk.name} (Атака)`);
          };

          const handleRollDamage = () => {
            taleSpireDriver.rollDice(
              atk.dmg || '1d6',
              `${combatantName}: ${atk.name} (Урон${atk.type ? ` - ${atk.type}` : ''})`
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

              <span
                className="font-semibold text-slate-200 truncate max-w-[120px]"
                title={atk.name}
              >
                {atk.name}
              </span>

              {atk.hit && (
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] font-bold cursor-pointer transition-colors border border-amber-500/30 shrink-0"
                  onClick={handleRollAttack}
                  title={`Бросок атаки: 1d20${normalizeHitBonus(atk.hit)}${
                    isActive ? ` [Клавиша ${atkIdx + 1}]` : ''
                  }`}
                >
                  {atk.hit}
                </button>
              )}

              {atk.dmg && atk.dmg !== '0' && (
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-[11px] font-bold cursor-pointer transition-colors border border-rose-500/30 shrink-0"
                  onClick={handleRollDamage}
                  title={`Бросок урона: ${atk.dmg}${atk.type ? ` (${atk.type})` : ''}${
                    isActive ? ` [Клавиша Shift+${atkIdx + 1}]` : ''
                  }`}
                >
                  {atk.dmg}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
