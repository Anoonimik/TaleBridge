import React from 'react';
import { Character, wsBridge } from '../../shared';

interface NoteViewerProps {
  character: Character | null;
  onClose: () => void;
}

export const NoteViewer = ({ character, onClose }: NoteViewerProps) => {
  if (!character) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-[#141622] border-l border-[#262a3d] shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
      <div className="p-3 border-b border-[#262a3d] flex items-center justify-between gap-2 bg-[#10111a]">
        <div className="text-sm truncate font-semibold text-slate-100">
          Заметка: <span className="text-amber-400">{character.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {character.path && (
            <button
              type="button"
              className="px-2.5 py-1 rounded text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 cursor-pointer transition-colors"
              onClick={() => wsBridge.send('OPEN_NOTE', { path: character.path })}
              title="Открыть в десктопном приложении Obsidian"
            >
              В Obsidian
            </button>
          )}
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-sm cursor-pointer"
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin text-sm text-slate-300">
        <div className="grid grid-cols-2 gap-2.5 bg-[#10111a] p-3 rounded border border-[#1f2233]">
          <div>
            <span className="text-slate-400 text-xs uppercase font-bold block">КД</span>
            <strong className="text-slate-100 text-base font-mono">{character.ac || 10}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase font-bold block">ХП</span>
            <strong className="text-emerald-400 text-base font-mono">{character.hp || 10}</strong>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase font-bold block">Скорость</span>
            <span className="text-slate-200 text-xs">{character.speed || '30 фт.'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase font-bold block">Категория</span>
            <span className="text-slate-200 text-xs">{character.category || 'Существо'}</span>
          </div>
        </div>

        {character.attacks && character.attacks.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Действия и атаки:
            </h4>
            {character.attacks.map((att, idx) => (
              <div key={idx} className="bg-[#10111a] p-2.5 rounded border border-[#1f2233] flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <strong className="text-amber-300 text-sm">{att.name}</strong>
                  <span className="text-xs text-slate-400 font-mono">
                    {att.hit && `Бросок: ${att.hit}`} {att.dmg && `Урон: ${att.dmg}`}
                  </span>
                </div>
                {att.desc && (
                  <p className="text-xs text-slate-300 leading-relaxed m-0">{att.desc}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
