import React from 'react';
import { Attack, formatInlineText, taleSpireDriver } from '../../../shared';

interface NoteActionsSectionProps {
  actions: Attack[];
  characterName: string;
  onRollAttack: (name: string, hit: string) => void;
  onRollDamage: (name: string, dmg: string) => void;
}

export const NoteActionsSection: React.FC<NoteActionsSectionProps> = ({
  actions,
  characterName,
  onRollAttack,
  onRollDamage,
}) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
        Действия и атаки ({actions.length}):
      </h4>

      <div className="flex flex-col gap-2">
        {actions.map((att, idx) => (
          <div
            key={idx}
            className="bg-[#10111a] p-3 rounded-lg border border-[#1f2233] flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <strong className="text-amber-300 text-sm font-semibold truncate">
                  {att.name}
                </strong>
                {att.type && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                    {att.type}
                  </span>
                )}
              </div>

              {/* Interactive roll buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {att.hit && (
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    onClick={() => onRollAttack(att.name, att.hit!)}
                    title="Бросок атаки"
                  >
                    <span>Атака</span>
                    <span className="font-mono text-xs">({att.hit})</span>
                  </button>
                )}

                {att.dmg && att.dmg !== '0' && (
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    onClick={() => onRollDamage(att.name, att.dmg!)}
                    title="Бросок урона"
                  >
                    <span>Урон</span>
                    <span className="font-mono text-xs">({att.dmg})</span>
                  </button>
                )}
              </div>
            </div>

            {att.desc && (
              <div className="text-xs text-slate-300 leading-relaxed m-0 bg-[#141622] p-2.5 rounded border border-[#262a3d]">
                {formatInlineText(att.desc, (formula, label) =>
                  taleSpireDriver.rollDice(formula, `${characterName}: ${label}`)
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
