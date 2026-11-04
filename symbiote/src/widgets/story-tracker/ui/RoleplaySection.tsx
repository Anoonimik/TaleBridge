import React from 'react';
import { ScenePersona, formatInlineText } from '../../../shared';

interface RoleplaySectionProps {
  personas?: ScenePersona[];
  dialogues?: string[];
}

export const RoleplaySection: React.FC<RoleplaySectionProps> = ({
  personas = [],
  dialogues = [],
}) => {
  if (personas.length === 0 && dialogues.length === 0) return null;

  return (
    <>
      {personas.length > 0 && (
        <div className="bg-[#141622] border-l-4 border-purple-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Отыгрыш персонажей:
          </div>
          <div className="flex flex-col gap-2">
            {personas.map((p, idx) => (
              <div key={idx} className="bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
                <strong className="text-sm font-semibold text-purple-300 block mb-1">
                  {formatInlineText(p.title)}
                </strong>
                <div className="text-sm text-slate-300 leading-relaxed m-0 whitespace-pre-wrap">
                  {formatInlineText(p.body)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dialogues.length > 0 && (
        <div className="bg-[#141622] border-l-4 border-indigo-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Реплики и диалоги:
          </div>
          <div className="flex flex-col gap-1.5">
            {dialogues.map((d, idx) => (
              <div
                key={idx}
                className="bg-[#10111a] p-2 rounded border border-[#1f2233] italic text-sm text-slate-100"
              >
                {formatInlineText(d)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
