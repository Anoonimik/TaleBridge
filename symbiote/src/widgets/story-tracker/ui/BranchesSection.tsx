import React from 'react';
import { Scene } from '../../../shared';

interface BranchesSectionProps {
  branches?: string[];
  scenes: Scene[];
  onGoToScene: (id: string) => void;
}

export const BranchesSection: React.FC<BranchesSectionProps> = ({
  branches = [],
  scenes,
  onGoToScene,
}) => {
  if (branches.length === 0) return null;

  return (
    <div className="bg-[#141622] border-l-4 border-emerald-500/80 border border-[#262a3d] p-3.5 rounded-r-lg shadow-sm flex flex-col gap-2.5">
      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
        Куда вести сюжет дальше (Развилки):
      </div>
      <div className="flex flex-col gap-2">
        {branches.map((bText, idx) => {
          // Extract wiki link target if present: [[SceneName|Label]]
          const linkMatch = bText.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
          const targetTitle = linkMatch ? linkMatch[1].trim() : null;
          const targetScene = targetTitle
            ? scenes.find(
                (s) =>
                  s.title.toLowerCase() === targetTitle.toLowerCase() ||
                  (s.scene_id && s.scene_id.toLowerCase() === targetTitle.toLowerCase())
              )
            : null;

          // Clean display text
          const cleanText = bText
            .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
              label ? label.trim() : target.trim()
            )
            .replace(/^[-*]\s*/, '');

          return (
            <div
              key={idx}
              className="p-2.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] border border-[#1f2233] hover:border-emerald-500/40 text-slate-200 transition-colors flex items-center justify-between gap-3"
            >
              <span className="font-medium text-sm leading-relaxed text-slate-100">
                ▸ {cleanText}
              </span>

              {targetScene && (
                <button
                  type="button"
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-mono shrink-0 cursor-pointer transition-colors"
                  onClick={() => onGoToScene(targetScene.id)}
                >
                  → {targetScene.title}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
