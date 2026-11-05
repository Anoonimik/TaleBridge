import React from 'react';
import { Scene, formatInlineText, taleSpireDriver } from '../../../shared';

interface SceneContextHeaderProps {
  scene: Scene;
  showNudge: boolean;
  onToggleNudge: () => void;
  onFocusCharacter: (name: string) => void;
}

export const SceneContextHeader: React.FC<SceneContextHeaderProps> = ({
  scene,
  showNudge,
  onToggleNudge,
  onFocusCharacter,
}) => {
  return (
    <div className="bg-[#141622] border border-[#262a3d] rounded-lg p-3.5 flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {scene.session && (
            <span className="text-xs uppercase font-bold text-slate-400 bg-[#10111a] px-2 py-0.5 rounded border border-[#1f2233] shrink-0">
              {scene.session}
            </span>
          )}
          {scene.location && (
            <button
              type="button"
              onClick={() => taleSpireDriver.gotoBookmark(undefined, scene.location)}
              className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer font-semibold truncate flex items-center gap-1 transition-colors"
              title={`Навести камеру TaleSpire на локацию «${scene.location}»`}
            >
              <span className="text-[10px] uppercase font-bold text-amber-400">Камера:</span>
              <span className="truncate">{scene.location}</span>
            </button>
          )}
        </div>

        {scene.nudge && (
          <button
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors ${
              showNudge
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d] hover:text-white'
            }`}
            onClick={onToggleNudge}
            title="Подсказка: что делать, если игроки молчат или застряли"
          >
            Пинок Мастера
          </button>
        )}
      </div>

      {scene.goal && (
        <div className="text-sm text-slate-200 bg-[#10111a] p-2.5 rounded border border-[#1f2233] leading-relaxed">
          <strong className="text-slate-100 font-semibold">Цель:</strong>{' '}
          {formatInlineText(scene.goal)}
        </div>
      )}

      {scene.sensory && (
        <div className="text-xs text-slate-300 italic bg-[#10111a] px-2.5 py-2 rounded border border-[#1f2233]">
          <strong className="text-slate-200 font-semibold">Сенсорика:</strong>{' '}
          {formatInlineText(scene.sensory)}
        </div>
      )}

      {scene.cast && scene.cast.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <span className="text-xs uppercase font-bold text-slate-500">Участники:</span>
          {scene.cast.map((charName) => (
            <button
              key={charName}
              type="button"
              className="px-2 py-0.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-indigo-300 border border-indigo-500/30 text-xs cursor-pointer transition-colors"
              onClick={() => onFocusCharacter(charName)}
              title={`Открыть карточку ${charName}`}
            >
              {charName}
            </button>
          ))}
        </div>
      )}

      {showNudge && scene.nudge && (
        <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded text-sm text-amber-200 flex flex-col gap-1 animate-in fade-in duration-100">
          <strong className="text-amber-400 uppercase text-xs tracking-wider">
            Пинок Мастера:
          </strong>
          <p className="m-0 leading-relaxed">{formatInlineText(scene.nudge)}</p>
        </div>
      )}
    </div>
  );
};
