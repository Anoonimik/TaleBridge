import React from 'react';
import { SceneMechanic, formatInlineText } from '../../../shared';

interface MechanicsSectionProps {
  clues?: string[];
  mechanics?: SceneMechanic[];
}

export const MechanicsSection: React.FC<MechanicsSectionProps> = ({
  clues = [],
  mechanics = [],
}) => {
  if (clues.length === 0 && mechanics.length === 0) return null;

  return (
    <>
      {clues.length > 0 && (
        <div className="bg-[#141622] border-l-4 border-blue-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Улики и проверки:
          </div>
          <ul className="m-0 pl-4 list-disc space-y-1.5 text-sm text-slate-200 leading-relaxed">
            {clues.map((c, idx) => (
              <li key={idx}>{formatInlineText(c)}</li>
            ))}
          </ul>
        </div>
      )}

      {mechanics.length > 0 && (
        <div className="bg-[#141622] border-l-4 border-rose-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Тактика и опасности:
          </div>
          <div className="flex flex-col gap-2">
            {mechanics.map((m, idx) => (
              <div key={idx} className="bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
                <strong className="text-sm font-semibold text-rose-300 block mb-1">
                  {formatInlineText(m.title)}
                </strong>
                <p className="text-sm text-slate-200 leading-relaxed m-0">
                  {formatInlineText(m.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
