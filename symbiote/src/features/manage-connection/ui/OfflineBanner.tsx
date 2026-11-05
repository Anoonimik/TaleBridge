import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { WifiOff, Settings2 } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/useAppStore';
import { wsBridge } from '../../../shared/api/websocket';

interface OfflineBannerProps {
  onOpenSettings: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onOpenSettings }) => {
  const { connected } = useAppStore(useShallow((s) => ({ connected: s.connected })));
  const info = wsBridge.getServerInfo();

  if (connected) return null;

  return (
    <div className="bg-rose-950/40 border-b border-rose-500/30 px-3 py-1.5 flex items-center justify-between gap-2 text-xs text-rose-200 shrink-0 select-none animate-fadeIn">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="truncate">
          Ожидание связи с сервером Мастера (
          <code>
            {info.host}:{info.port}
          </code>
          )
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="px-2.5 py-0.5 rounded bg-rose-900/50 hover:bg-rose-800/70 border border-rose-500/50 text-rose-100 text-[11px] font-semibold cursor-pointer shrink-0 transition-colors flex items-center gap-1 shadow-xs"
        title="Указать IP-адрес Гейм-Мастера"
      >
        <Settings2 className="w-3 h-3" />
        <span>Указать IP Мастера</span>
      </button>
    </div>
  );
};
