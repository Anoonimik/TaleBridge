import React, { useState, useEffect } from 'react';
import { useStoryStore, useRosterStore, useAppStore, wsBridge, formatInlineText } from '../../shared';

export const StoryTracker = () => {
  const { scenes, activeScene, sceneHistory, goToScene, goBack } = useStoryStore();
  const { setSelectedCharacter, roster } = useRosterStore();
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches'>('all');
  const [isRotating, setIsRotating] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

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
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.goal && s.goal.toLowerCase().includes(q))
    );
  });

  const handleRefreshScenes = () => {
    setIsRotating(true);
    wsBridge.send('GET_SCENES', {});
    setTimeout(() => setIsRotating(false), 700);
  };

  const handleFocusCharacter = (name: string) => {
    const found = roster.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedCharacter(found);
      if (found.path) {
        wsBridge.send('GET_NOTE', { path: found.path, name: found.name });
      }
    }
  };

  // Safe read aloud array extraction
  const getReadAloudList = (): string[] => {
    if (!activeScene?.readAloud) return [];
    if (Array.isArray(activeScene.readAloud)) return activeScene.readAloud.filter(Boolean);
    if (typeof activeScene.readAloud === 'string') {
      const clean = activeScene.readAloud.trim();
      return clean ? [clean] : [];
    }
    return [];
  };

  const readAloudItems = getReadAloudList();

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
          className="flex-1 flex items-center justify-between px-3 py-1.5 bg-[#1a1d2d] hover:bg-[#22263b] border border-[#2d324a] rounded cursor-pointer transition-colors text-sm min-w-0"
          onClick={() => setShowCatalog(!showCatalog)}
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
              placeholder="Поиск сцены по названию, локации или цели..."
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
                  <div className="truncate font-medium">{s.title}</div>
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
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 scrollbar-thin text-sm text-slate-200">
        {!activeScene ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Выберите сцену из каталога для просмотра описания и проверок
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Context Header: Location, Goal, Cast, Nudge Button */}
            <div className="bg-[#141622] border border-[#262a3d] rounded-lg p-3.5 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {activeScene.session && (
                    <span className="text-xs uppercase font-bold text-slate-400 bg-[#10111a] px-2 py-0.5 rounded border border-[#1f2233] shrink-0">
                      {activeScene.session}
                    </span>
                  )}
                  {activeScene.location && (
                    <span className="text-sm text-amber-400 font-semibold truncate">
                      {activeScene.location}
                    </span>
                  )}
                </div>

                {activeScene.nudge && (
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors ${
                      showNudge
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d] hover:text-white'
                    }`}
                    onClick={() => setShowNudge(!showNudge)}
                    title="Подсказка: что делать, если игроки молчат или застряли"
                  >
                    Пинок Мастера
                  </button>
                )}
              </div>

              {activeScene.goal && (
                <div className="text-sm text-slate-200 bg-[#10111a] p-2.5 rounded border border-[#1f2233] leading-relaxed">
                  <strong className="text-slate-100 font-semibold">Цель:</strong> {formatInlineText(activeScene.goal)}
                </div>
              )}

              {activeScene.sensory && (
                <div className="text-xs text-slate-300 italic bg-[#10111a] px-2.5 py-2 rounded border border-[#1f2233]">
                  <strong className="text-slate-200 font-semibold">Сенсорика:</strong> {formatInlineText(activeScene.sensory)}
                </div>
              )}

              {activeScene.cast && activeScene.cast.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-xs uppercase font-bold text-slate-500">Участники:</span>
                  {activeScene.cast.map((charName) => (
                    <button
                      key={charName}
                      type="button"
                      className="px-2 py-0.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-indigo-300 border border-indigo-500/30 text-xs cursor-pointer transition-colors"
                      onClick={() => handleFocusCharacter(charName)}
                      title={`Открыть карточку ${charName}`}
                    >
                      {charName}
                    </button>
                  ))}
                </div>
              )}

              {showNudge && activeScene.nudge && (
                <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded text-sm text-amber-200 flex flex-col gap-1 animate-in fade-in duration-100">
                  <strong className="text-amber-400 uppercase text-xs tracking-wider">
                    Пинок Мастера:
                  </strong>
                  <p className="m-0 leading-relaxed">{formatInlineText(activeScene.nudge)}</p>
                </div>
              )}
            </div>

            {/* Read Aloud Section */}
            {(mode === 'all' || mode === 'readAloud') && readAloudItems.length > 0 && (
              <div className="bg-[#141622] border-l-4 border-amber-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Текст для зачитки игрокам:
                </div>
                {readAloudItems.map((text, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 pl-3 border-l-2 border-amber-400/50">
                    <blockquote className="m-0 text-sm text-amber-200/90 italic leading-relaxed">
                      «{formatInlineText(text)}»
                    </blockquote>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const handout = {
                            type: 'text' as const,
                            url: '',
                            title: activeScene.title || 'Сюжетное послание',
                            description: text,
                            content: text,
                            active: true,
                          };
                          useAppStore.getState().setCinemaMedia(handout);
                          wsBridge.send('BROADCAST_HANDOUT', handout);
                        }}
                        className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer font-medium transition-colors"
                        title="Показать этот текст игрокам на весь экран как древний свиток"
                      >
                        Транслировать свиток ▸
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Roleplay Tips / Personas / Dialogues Section */}
            {(mode === 'all' || mode === 'roleplay') && (
              <>
                {activeScene.personas && activeScene.personas.length > 0 && (
                  <div className="bg-[#141622] border-l-4 border-purple-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Отыгрыш персонажей:
                    </div>
                    <div className="flex flex-col gap-2">
                      {activeScene.personas.map((p, idx) => (
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

                {activeScene.dialogues && activeScene.dialogues.length > 0 && (
                  <div className="bg-[#141622] border-l-4 border-indigo-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Реплики и диалоги:
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {activeScene.dialogues.map((d, idx) => (
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
            )}

            {/* Mechanics, Checks & Clues Section */}
            {(mode === 'all' || mode === 'mechanics') && (
              <>
                {activeScene.clues && activeScene.clues.length > 0 && (
                  <div className="bg-[#141622] border-l-4 border-blue-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Улики и проверки:
                    </div>
                    <ul className="m-0 pl-4 list-disc space-y-1.5 text-sm text-slate-200 leading-relaxed">
                      {activeScene.clues.map((c, idx) => (
                        <li key={idx}>{formatInlineText(c)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeScene.mechanics && activeScene.mechanics.length > 0 && (
                  <div className="bg-[#141622] border-l-4 border-rose-500/80 border border-[#262a3d] p-3 rounded-r-lg shadow-sm flex flex-col gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Тактика и опасности:
                    </div>
                    <div className="flex flex-col gap-2">
                      {activeScene.mechanics.map((m, idx) => (
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
            )}

            {/* Plot Branches Section */}
            {(mode === 'all' || mode === 'branches') &&
              activeScene.branches &&
              activeScene.branches.length > 0 && (
                <div className="bg-[#141622] border-l-4 border-emerald-500/80 border border-[#262a3d] p-3.5 rounded-r-lg shadow-sm flex flex-col gap-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Куда вести сюжет дальше (Развилки):
                  </div>
                  <div className="flex flex-col gap-2">
                    {activeScene.branches.map((bText, idx) => {
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
                        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => (label ? label.trim() : target.trim()))
                        .replace(/^[-*]\s*/, '');

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] border border-[#1f2233] hover:border-emerald-500/40 text-slate-200 transition-colors flex items-center justify-between gap-3"
                        >
                          <span className="font-medium text-sm leading-relaxed text-slate-100">▸ {cleanText}</span>

                          {targetScene && (
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-mono shrink-0 cursor-pointer transition-colors"
                              onClick={() => goToScene(targetScene.id)}
                            >
                              → {targetScene.title}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
