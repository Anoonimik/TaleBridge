import React, { useState } from 'react';
import { useLogStore, wsBridge } from '../../shared';
import { QuickDiceBar, BroadcastMediaModal } from '../../features';

export const ToolsPanel = () => {
  const { logs, clearLogs } = useLogStore();
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const handleOpenBookmarks = () => {
    wsBridge.send('GOTO_BOOKMARK', {});
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14] p-3 gap-3">
      {/* 3D Dice Bar */}
      <QuickDiceBar />

      {/* GM Utility Quick Actions */}
      <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-2 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
            className="p-2 rounded bg-[#10111a] hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-colors text-center"
            onClick={handleOpenBookmarks}
            title="Переместить камеру к закладке TaleSpire"
          >
            Закладки камеры (TS)
          </button>
        </div>
      </div>

      {/* Activity and Roll Log */}
      <div className="flex-1 overflow-hidden bg-[#141622] rounded-lg border border-[#262a3d] p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#262a3d] shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Журнал действий ({logs.length})
          </span>
          {logs.length > 0 && (
            <button
              type="button"
              className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              onClick={clearLogs}
            >
              Очистить
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 font-mono text-xs scrollbar-thin">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">Журнал пуст</div>
          ) : (
            logs.map((log) => {
              let tagColor = 'text-slate-400';
              if (log.type === 'roll') tagColor = 'text-amber-400';
              else if (log.type === 'combat') tagColor = 'text-rose-400';
              else if (log.type === 'sync') tagColor = 'text-emerald-400';

              return (
                <div
                  key={log.id}
                  className="p-1 rounded bg-[#10111a] border border-[#1f2233] flex items-start gap-1.5"
                >
                  <span className="text-[10px] text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={`text-[10px] uppercase font-bold shrink-0 ${tagColor}`}>
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
    </div>
  );
};
