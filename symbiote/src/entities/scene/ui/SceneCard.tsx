import React from 'react';
import { Scene } from '../../../shared';

interface SceneCardProps {
  scene: Scene;
  isActive: boolean;
  onSelect: (scene: Scene) => void;
}

export const SceneCard = ({ scene, isActive, onSelect }: SceneCardProps) => {
  return (
    <div
      onClick={() => onSelect(scene)}
      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
        isActive
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 font-semibold shadow-xs'
          : 'bg-[#141622] border-[#262a3d] hover:bg-[#1a1d2d] text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold truncate">{scene.title}</span>
        {scene.location && (
          <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">
            {scene.location}
          </span>
        )}
      </div>

      {scene.goal && (
        <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
          Цель: {scene.goal}
        </div>
      )}
    </div>
  );
};
