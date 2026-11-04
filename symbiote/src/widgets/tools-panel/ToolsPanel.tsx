import React, { useState } from 'react';
import { useLogStore, useAppStore, wsBridge, taleSpireDriver } from '../../shared';
import { QuickDiceBar, BroadcastMediaModal, CameraBookmarksModal } from '../../features';

export const ToolsPanel = () => {
  const { logs, clearLogs } = useLogStore();
  const { bookmarks, cinemaMedia, setCinemaMedia } = useAppStore();
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  const handleStopBroadcast = () => {
    setCinemaMedia(null);
    wsBridge.send('DISMISS_HANDOUT', {});
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-3">
      {/* 3D Dice Bar */}
      <QuickDiceBar />

      {/* GM Utility Quick Actions */}
      <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-2 shrink-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Инструменты ГМ
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="p-2 rounded bg-[#10111a] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-colors text-center"
            onClick={() => setShowBroadcastModal(true)}
          >
            Трансляция арта / видео
          </button>

          <button
            type="button"
            className="p-2 rounded bg-[#10111a] hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-colors text-center flex items-center justify-center gap-1.5"
            onClick={() => setShowBookmarksModal(true)}
            title="Открыть список локаций и закладок камеры TaleSpire"
          >
            <span>Закладки камеры (TS)</span>
            {bookmarks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Media Broadcast Alert & Dismiss (if active) */}
      {cinemaMedia?.active && (
        <div className="bg-rose-950/40 border border-rose-500/60 p-2.5 rounded-lg flex items-center justify-between gap-2 shrink-0 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 truncate text-xs min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                В эфире у игроков ({cinemaMedia.type})
              </span>
              <strong className="text-white text-xs truncate max-w-[190px]">
                {cinemaMedia.title || cinemaMedia.url}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="px-2 py-1 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 border border-[#262a3d] text-xs font-medium cursor-pointer transition-colors"
              title="Открыть настройки трансляции"
            >
              Сменить
            </button>
            <button
              type="button"
              onClick={handleStopBroadcast}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-all shadow-xs active:scale-95"
              title="Прекратить трансляцию и закрыть экран у всех игроков"
            >
              Снять с эфира ✕
            </button>
          </div>
        </div>
      )}

      {/* Quick Board Locations Bar (if available) */}
      {bookmarks.length > 0 && (
        <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Быстрый переход к локации ({bookmarks.length})
            </span>
            <button
              type="button"
              onClick={() => taleSpireDriver.getBookmarks()}
              className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
              title="Пересканировать закладки с доски"
            >
              ↻
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
            {bookmarks.map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => taleSpireDriver.gotoBookmark(bm.id, bm.name)}
                className="px-2 py-0.5 rounded bg-[#10111a] hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] cursor-pointer transition-colors truncate max-w-[180px]"
                title={`Центрировать камеру TaleSpire на «${bm.name}»`}
              >
                {bm.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity and Roll Log */}
      <div className="flex-1 overflow-hidden bg-[#141622] rounded-lg border border-[#262a3d] p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#262a3d] shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Журнал действий ({logs.length})
          </span>
          {logs.length > 0 && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              onClick={clearLogs}
            >
              Очистить
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              История бросков и событий пока пуста
            </div>
          ) : (
            logs.map((log) => {
              let tagColor = 'text-slate-400';
              if (log.type === 'roll') tagColor = 'text-amber-400';
              else if (log.type === 'combat') tagColor = 'text-rose-400';
              else if (log.type === 'sync') tagColor = 'text-emerald-400';
              else if (log.type === 'action') tagColor = 'text-indigo-400';

              return (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-[#10111a] border border-[#1f2233] flex items-start gap-1.5"
                >
                  <span className="text-xs text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={`text-xs uppercase font-bold shrink-0 ${tagColor}`}>
                    [{log.type}]
                  </span>
                  <span className="text-slate-300 leading-tight break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BroadcastMediaModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />

      <CameraBookmarksModal
        isOpen={showBookmarksModal}
        onClose={() => setShowBookmarksModal(false)}
      />
    </div>
  );
};
