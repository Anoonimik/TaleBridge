import React from 'react';
import { Scene } from '../../../shared';

interface SceneCatalogModalProps {
  scenesCount: number;
  filteredCatalog: Scene[];
  activeSceneId?: string;
  catalogSearch: string;
  onSearchChange: (val: string) => void;
  onSelectScene: (id: string) => void;
  onClose: () => void;
}

export const SceneCatalogModal: React.FC<SceneCatalogModalProps> = ({
  scenesCount,
  filteredCatalog,
  activeSceneId,
  catalogSearch,
  onSearchChange,
  onSelectScene,
  onClose,
}) => {
  return (
    <div className="absolute top-12 left-3 right-3 max-w-lg mx-auto z-30 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl flex flex-col max-h-[75vh] overflow-hidden animate-in fade-in duration-150">
      <div className="p-3 border-b border-[#262a3d] flex items-center justify-between bg-[#10111a]">
        <span className="text-xs font-semibold text-slate-200">
          Каталог сцен ({scenesCount})
        </span>
        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="p-2 border-b border-[#1f2233]">
        <input
          type="text"
          placeholder="Поиск сцены по названию, локации или цели..."
          value={catalogSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
        {filteredCatalog.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">Сцены не найдены</div>
        ) : (
          filteredCatalog.map((s) => (
            <div
              key={s.id}
              className={`p-2 rounded text-xs cursor-pointer transition-colors border ${
                activeSceneId === s.id
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-semibold'
                  : 'bg-[#1a1d2d] border-[#262a3d] hover:bg-[#24283d] text-slate-200'
              }`}
              onClick={() => onSelectScene(s.id)}
            >
              <div className="truncate font-medium">{s.title}</div>
              {s.location && (
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{s.location}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
