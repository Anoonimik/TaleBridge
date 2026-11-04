import React, { useState, useEffect } from 'react';
import { useStoryStore, wsBridge } from '../../shared';

export const StoryTracker = () => {
  const { scenes, activeScene, sceneHistory, goToScene, goBack } = useStoryStore();
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches'>('all');
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') setMode('all');
      else if (e.key === '2') setMode('readAloud');
      else if (e.key === '3') setMode('roleplay');
      else if (e.key === '4') setMode('mechanics');
      else if (e.key === '5') setMode('branches');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCatalog = scenes.filter((s) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.target && s.target.toLowerCase().includes(q))
    );
  });

  const handleRefreshScenes = () => {
    setIsRotating(true);
    wsBridge.send('GET_SCENES', {});
    setTimeout(() => setIsRotating(false), 700);
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#0c0d14]">
      {/* Top Scene Navigation Bar */}
      <div className="p-2.5 bg-[#141622] border-b border-[#262a3d] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          disabled={sceneHistory.length === 0}
          onClick={goBack}
          title="Вернуться к предыдущей сцене"
          className="px-2.5 py-1.5 bg-[#1a1d2d] hover:bg-[#25293d] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-[#262a3d] rounded text-xs cursor-pointer transition-colors shrink-0"
        >
          ◂ Назад
        </button>

        <div
          className="flex-1 flex items-center justify-between px-3 py-1.5 bg-[#1a1d2d] hover:bg-[#22263b] border border-[#2d324a] rounded cursor-pointer transition-colors text-xs min-w-0"
          onClick={() => setShowCatalog(!showCatalog)}
          title="Открыть полный каталог сцен"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 mr-2 shrink-0">
            Сцена
          </span>
          <span className="font-semibold text-slate-100 truncate flex-1">
            {activeScene ? activeScene.title : 'Выберите сцену из каталога'}
          </span>
          <span className="text-[11px] text-slate-400 shrink-0 ml-2">Каталог ▾</span>
        </div>

        <button
          type="button"
          className={`w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-[#25293d] border border-[#262a3d] text-slate-300 text-sm cursor-pointer transition-colors shrink-0 ${
            isRotating ? 'rotating' : ''
          }`}
          onClick={handleRefreshScenes}
          title="Обновить сцены из Obsidian"
        >
          ⟳
        </button>
      </div>

      {/* Directory Modal / Drawer */}
      {showCatalog && (
        <div className="absolute top-12 left-3 right-3 max-w-lg mx-auto z-30 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl flex flex-col max-h-[75vh] overflow-hidden animate-in fade-in duration-150">
          <div className="p-3 border-b border-[#262a3d] flex items-center justify-between bg-[#10111a]">
            <span className="text-xs font-semibold text-slate-200">
              Каталог сцен ({scenes.length})
            </span>
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
              onClick={() => setShowCatalog(false)}
            >
              ✕
            </button>
          </div>

          <div className="p-2 border-b border-[#1f2233]">
            <input
              type="text"
              placeholder="Поиск сцены по названию, локации или NPC..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
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
                    activeScene?.id === s.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 font-semibold'
                      : 'bg-[#1a1d2d] border-[#262a3d] hover:bg-[#24283d] text-slate-200'
                  }`}
                  onClick={() => {
                    goToScene(s.id);
                    setShowCatalog(false);
                  }}
                >
                  <div className="truncate">{s.title}</div>
                  {s.location && (
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{s.location}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mode Filters Bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#10111a] border-b border-[#1f2233] overflow-x-auto scrollbar-thin shrink-0">
        {[
          { id: 'all', num: '1', label: 'Все' },
          { id: 'readAloud', num: '2', label: 'Зачитка' },
          { id: 'roleplay', num: '3', label: 'Отыгрыш' },
          { id: 'mechanics', num: '4', label: 'Проверки' },
          { id: 'branches', num: '5', label: 'Развилки' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border flex items-center gap-1.5 whitespace-nowrap ${
              mode === tab.id
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-[#141622] text-slate-400 border-[#262a3d] hover:text-slate-200 hover:bg-[#1a1d2d]'
            }`}
            onClick={() => setMode(tab.id as typeof mode)}
          >
            <span className="text-[10px] font-mono opacity-60">[{tab.num}]</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Scene Body / Blocks */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin text-xs text-slate-200">
        {!activeScene ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Выберите сцену из каталога для просмотра описания и проверок
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Read Aloud Section */}
            {(mode === 'all' || mode === 'readAloud') &&
              activeScene.readAloud &&
              activeScene.readAloud.length > 0 && (
                <div className="bg-[#141622] border-l-4 border-amber-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Текст для зачитки игрокам:
                  </div>
                  {activeScene.readAloud.map((text, idx) => (
                    <blockquote
                      key={idx}
                      className="m-0 pl-2 text-slate-200 italic leading-relaxed border-l-2 border-amber-400/30"
                    >
                      «{text}»
                    </blockquote>
                  ))}
                </div>
              )}

            {/* Roleplay Tips Section */}
            {(mode === 'all' || mode === 'roleplay') &&
              activeScene.roleplay &&
              activeScene.roleplay.length > 0 && (
                <div className="bg-[#141622] border-l-4 border-purple-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Подсказки для отыгрыша:
                  </div>
                  <ul className="m-0 pl-4 list-disc space-y-1 text-slate-300 leading-relaxed">
                    {activeScene.roleplay.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Mechanics / Skill Checks Section */}
            {(mode === 'all' || mode === 'mechanics') &&
              activeScene.checks &&
              activeScene.checks.length > 0 && (
                <div className="bg-[#141622] border-l-4 border-blue-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Проверки характеристик:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activeScene.checks.map((c, idx) => (
                      <div
                        key={idx}
                        className="bg-[#10111a] p-2.5 rounded border border-[#1f2233] flex flex-col gap-1"
                      >
                        <div className="font-semibold text-slate-100 flex items-center justify-between">
                          <span>{c.skill}</span>
                          <span className="text-amber-400 font-mono text-[11px]">СЛ {c.dc}</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-start gap-1">
                          <span className="font-bold">✓</span>
                          <span>{c.success}</span>
                        </div>
                        <div className="text-[11px] text-rose-400 flex items-start gap-1">
                          <span className="font-bold">✕</span>
                          <span>{c.fail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Plot Branches Section */}
            {(mode === 'all' || mode === 'branches') &&
              activeScene.branches &&
              activeScene.branches.length > 0 && (
                <div className="bg-[#141622] border-l-4 border-emerald-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Сюжетные развилки:
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {activeScene.branches.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left p-2 rounded bg-[#10111a] hover:bg-[#1a1d2d] border border-[#1f2233] hover:border-emerald-500/40 text-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          const target = scenes.find(
                            (s) => s.title.toLowerCase() === b.targetScene.toLowerCase()
                          );
                          if (target) goToScene(target.id);
                        }}
                      >
                        <span className="font-medium">▸ {b.choice}</span>
                        <span className="text-[11px] text-emerald-400 font-mono shrink-0 ml-2">
                          → {b.targetScene}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
