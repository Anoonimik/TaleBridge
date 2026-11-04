import React from 'react';
import { Scene } from '../../../shared';

interface SceneNavigationBarProps {
  activeScene: Scene | null;
  canGoBack: boolean;
  isRotating: boolean;
  onGoBack: () => void;
  onToggleCatalog: () => void;
  onRefreshScenes: () => void;
}

export const SceneNavigationBar: React.FC<SceneNavigationBarProps> = ({
  activeScene,
  canGoBack,
  isRotating,
  onGoBack,
  onToggleCatalog,
  onRefreshScenes,
}) => {
  return (
    <div className="p-2.5 bg-[#141622] border-b border-[#262a3d] flex items-center justify-between gap-2 shrink-0">
      <button
        type="button"
        disabled={!canGoBack}
        onClick={onGoBack}
        title="Вернуться к предыдущей сцене"
        className="px-2.5 py-1.5 bg-[#1a1d2d] hover:bg-[#25293d] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-[#262a3d] rounded text-xs cursor-pointer transition-colors shrink-0"
      >
        ◂ Назад
      </button>

      <div
        className="flex-1 flex items-center justify-between px-3 py-1.5 bg-[#1a1d2d] hover:bg-[#22263b] border border-[#2d324a] rounded cursor-pointer transition-colors text-sm min-w-0"
        onClick={onToggleCatalog}
        title="Открыть полный каталог сцен"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 mr-2 shrink-0">
          Сцена
        </span>
        <span className="font-semibold text-slate-100 truncate flex-1 text-sm">
          {activeScene ? activeScene.title : 'Выберите сцену из каталога'}
        </span>
        <span className="text-xs text-slate-400 shrink-0 ml-2">Каталог ▾</span>
      </div>

      <button
        type="button"
        className={`w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-[#25293d] border border-[#262a3d] text-slate-300 text-sm cursor-pointer transition-colors shrink-0 ${
          isRotating ? 'rotating' : ''
        }`}
        onClick={onRefreshScenes}
        title="Обновить сцены из Obsidian"
      >
        ⟳
      </button>
    </div>
  );
};
