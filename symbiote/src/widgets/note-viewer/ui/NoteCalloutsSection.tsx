import React from 'react';
import { ParsedCallout } from '../../../shared/lib/note-parser';
import { formatInlineText } from '../../../shared/lib/format-text';
import { taleSpireDriver } from '../../../shared/api/talespire';

interface NoteCalloutsSectionProps {
  callouts: ParsedCallout[];
  characterName: string;
}

export const NoteCalloutsSection: React.FC<NoteCalloutsSectionProps> = ({
  callouts,
  characterName,
}) => {
  if (!callouts || callouts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {callouts.map((c, idx) => {
        let borderStyle = 'border-amber-500/60 bg-amber-500/5';
        let titleColor = 'text-amber-400';

        if (c.type === 'info' || c.type === 'note') {
          borderStyle = 'border-indigo-500/60 bg-indigo-500/5';
          titleColor = 'text-indigo-400';
        } else if (c.type === 'tip') {
          borderStyle = 'border-emerald-500/60 bg-emerald-500/5';
          titleColor = 'text-emerald-400';
        } else if (c.type === 'warning' || c.type === 'danger') {
          borderStyle = 'border-rose-500/60 bg-rose-500/5';
          titleColor = 'text-rose-400';
        }

        return (
          <div
            key={idx}
            className={`border-l-4 border rounded-r-lg p-3 flex flex-col gap-2 ${borderStyle}`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>
                {c.title}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-200 leading-relaxed">
              {c.lines.map((line: string, lIdx: number) => (
                <div key={lIdx} className="pl-1">
                  {formatInlineText(line, (formula, label) =>
                    taleSpireDriver.rollDice(formula, `${characterName}: ${label}`),
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
