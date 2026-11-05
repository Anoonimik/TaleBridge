import React from 'react';
import { Character, ParsedCreatureNote } from '../../../shared';

interface NoteVitalsBarProps {
  character: Character;
  parsedVitals: ParsedCreatureNote['vitals'];
  initBonus: string | null;
  onRollInitiative: (bonus: string) => void;
}

export const NoteVitalsBar: React.FC<NoteVitalsBarProps> = ({
  character,
  parsedVitals,
  initBonus,
  onRollInitiative,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2 bg-[#10111a] p-3 rounded-lg border border-[#1f2233]">
      <div>
        <span className="text-slate-400 text-xs uppercase font-bold block">КД</span>
        <strong className="text-slate-100 text-base font-mono">
          {character.ac || parsedVitals.ac || 10}
        </strong>
      </div>

      <div>
        <span className="text-slate-400 text-xs uppercase font-bold block">ХП</span>
        <strong className="text-emerald-400 text-base font-mono">
          {character.hp || parsedVitals.hp || 10}
          {character.hp_max ? ` / ${character.hp_max}` : ''}
        </strong>
      </div>

      <div>
        <span className="text-slate-400 text-xs uppercase font-bold block">Скорость</span>
        <span className="text-slate-200 text-sm">
          {character.speed || parsedVitals.speed || '9 м'}
        </span>
      </div>

      <div>
        <span className="text-slate-400 text-xs uppercase font-bold block">Инициатива</span>
        {initBonus ? (
          <button
            type="button"
            onClick={() => onRollInitiative(initBonus)}
            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
            title="Бросить инициативу в TaleSpire"
          >
            <svg
              className="w-3 h-3 text-amber-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{initBonus}</span>
          </button>
        ) : (
          <span className="text-slate-400 text-xs font-mono">+0</span>
        )}
      </div>
    </div>
  );
};
