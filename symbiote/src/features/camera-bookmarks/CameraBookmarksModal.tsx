import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore, taleSpireDriver, wsBridge, ModalShell } from '../../shared';

interface CameraBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraBookmarksModal = ({ isOpen, onClose }: CameraBookmarksModalProps) => {
  const { bookmarks } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load / refresh bookmarks when modal opens
  useEffect(() => {
    if (isOpen) {
      taleSpireDriver.getBookmarks();
      wsBridge.send('GET_BOOKMARKS', {});
    }
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await taleSpireDriver.getBookmarks();
    wsBridge.send('GET_BOOKMARKS', {});
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleFlyTo = async (id: string, name: string) => {
    setActiveBookmarkId(id);
    await taleSpireDriver.gotoBookmark(id, name);
    setTimeout(() => {
      setActiveBookmarkId(null);
    }, 2000);
  };

  const filteredBookmarks = useMemo(
    () =>
      bookmarks.filter((bm) =>
        bm.name.toLowerCase().includes(search.toLowerCase().trim())
      ),
    [bookmarks, search]
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Закладки камеры TaleSpire ({bookmarks.length})</span>
        </div>
      }
      maxWidthClass="max-w-md"
      maxHeightClass="max-h-[85vh]"
      headerRight={
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs text-amber-300 hover:text-amber-200 cursor-pointer transition-colors border border-amber-500/30 bg-[#141622] ${
            isRefreshing ? 'opacity-50' : ''
          }`}
          onClick={handleRefresh}
          title="Пересканировать закладки на доске TaleSpire"
        >
          {isRefreshing ? 'Запрос...' : '↻ Обновить'}
        </button>
      }
    >
      {/* Search Bar */}
      <div className="p-3 border-b border-[#262a3d] bg-[#10111a]/50 shrink-0">
        <input
          type="text"
          placeholder="Поиск по названию локации..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
          autoFocus
        />
      </div>

      {/* Bookmarks List */}
      <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-1.5 scrollbar-thin">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-2">
            <span className="text-slate-300 font-semibold text-xs">
              {bookmarks.length === 0
                ? 'Закладок на текущей доске TaleSpire не найдено'
                : 'По запросу ничего не найдено'}
            </span>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed m-0">
              {bookmarks.length === 0
                ? 'Чтобы создать закладку, откройте режим закладок в TaleSpire (Ctrl+B) или установите на карте Marker Block с нужным именем.'
                : 'Попробуйте изменить поисковый запрос.'}
            </p>
            {bookmarks.length === 0 && (
              <button
                type="button"
                className="mt-2 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium cursor-pointer transition-colors"
                onClick={handleRefresh}
              >
                ↻ Повторить поиск на доске
              </button>
            )}
          </div>
        ) : (
          filteredBookmarks.map((bm) => {
            const isCurrent = activeBookmarkId === bm.id;
            return (
              <div
                key={bm.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-[#10111a] hover:bg-[#181a29] border-[#262a3d] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141622] text-amber-400 border border-amber-500/30 shrink-0">
                    TS
                  </span>
                  <span className="text-xs font-medium truncate" title={bm.name}>
                    {bm.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleFlyTo(bm.id, bm.name)}
                  className={`px-3 py-1 rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors border ${
                    isCurrent
                      ? 'bg-emerald-600/40 text-emerald-200 border-emerald-500/60'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isCurrent ? 'Камера наведена ✓' : 'Перейти ▸'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#262a3d] bg-[#10111a] shrink-0 text-slate-400 text-[11px]">
        <span>Клик по «Перейти» мгновенно центрирует камеру TaleSpire</span>
        <button
          type="button"
          className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 hover:text-white cursor-pointer"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
    </ModalShell>
  );
};
