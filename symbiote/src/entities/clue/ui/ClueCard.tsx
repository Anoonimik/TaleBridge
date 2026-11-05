import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import {
  Clue,
  useAppStore,
  useConfirmDelete,
  resolveMediaUrl,
  getYouTubeThumbnailUrl,
} from '../../../shared';

interface ClueCardProps {
  clue: Clue;
  onDelete: (id: string) => void;
}

export const ClueCard = ({ clue, onDelete }: ClueCardProps) => {
  const { setCinemaMedia } = useAppStore(useShallow((s) => ({ setCinemaMedia: s.setCinemaMedia })));
  const { isConfirming: isConfirmingDelete, handleDelete } = useConfirmDelete({
    onDelete: () => onDelete(clue.id),
  });

  const handleOpenMedia = () => {
    setCinemaMedia({
      type: clue.type,
      url: clue.url || '',
      title: clue.title,
      description: clue.text,
      active: true,
      source: 'archive',
    });
  };

  const ytThumb = getYouTubeThumbnailUrl(clue.url);

  return (
    <div className="bg-[#141622] border border-[#262a3d] hover:border-[#383d57] rounded-lg p-2.5 flex flex-col gap-2 transition-all shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#10111a] text-slate-400 border border-[#262a3d] shrink-0">
            {clue.type === 'image'
              ? 'Арт'
              : clue.type === 'video'
                ? 'Видео'
                : clue.type === 'text'
                  ? 'Свиток'
                  : 'Аудио'}
          </span>
          <strong className="text-slate-100 text-xs truncate" title={clue.title}>
            {clue.title}
          </strong>
        </div>

        <button
          type="button"
          className={`h-6 text-xs rounded transition-colors cursor-pointer flex items-center justify-center font-medium ${
            isConfirmingDelete
              ? 'bg-rose-600 text-white font-bold px-2'
              : 'w-6 bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
          }`}
          onClick={handleDelete}
          aria-label={
            isConfirmingDelete
              ? `Подтвердить удаление «${clue.title}» у себя`
              : `Удалить «${clue.title}» только у себя`
          }
          title={
            isConfirmingDelete
              ? 'Нажмите еще раз для подтверждения'
              : 'Удалить только из моего архива (Shift+клик — сразу)'
          }
        >
          {isConfirmingDelete ? 'Удалить?' : '✕'}
        </button>
      </div>

      {/* Image Preview */}
      {clue.url && clue.type === 'image' && (
        <div
          className="w-full h-28 rounded bg-[#10111a] overflow-hidden cursor-pointer relative group border border-[#1f2233]"
          onClick={handleOpenMedia}
        >
          <img
            src={resolveMediaUrl(clue.url)}
            alt={clue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-medium transition-opacity">
            Развернуть
          </div>
        </div>
      )}

      {/* YouTube / Video Preview */}
      {clue.type === 'video' && (
        <div
          className="w-full h-28 rounded bg-[#10111a] overflow-hidden cursor-pointer relative group border border-[#1f2233] flex items-center justify-center"
          onClick={handleOpenMedia}
        >
          {ytThumb ? (
            <img
              src={ytThumb}
              alt={clue.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="text-indigo-400 text-xs font-semibold">▶ Видеофайл</div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-indigo-600/80 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
              ▶
            </span>
          </div>
        </div>
      )}

      {/* Text / Manuscript Preview */}
      {clue.type === 'text' && clue.text && (
        <div
          className="p-2.5 bg-[#f5ebd7] text-[#2c1d11] rounded border border-[#8c6f48]/40 font-serif text-[11px] leading-relaxed line-clamp-3 cursor-pointer"
          onClick={handleOpenMedia}
        >
          {clue.text}
        </div>
      )}

      {/* Caption for image/video */}
      {clue.text && clue.type !== 'text' && (
        <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-[#10111a] p-1.5 rounded border border-[#1f2233] m-0">
          {clue.text}
        </p>
      )}

      {/* Date */}
      {clue.date && <div className="text-[10px] text-slate-500">{clue.date}</div>}

      <button
        type="button"
        className="w-full py-1.5 bg-[#1a1d2d] hover:bg-[#25293d] text-indigo-300 border border-indigo-500/20 rounded text-xs font-medium cursor-pointer transition-colors"
        onClick={handleOpenMedia}
      >
        Открыть
      </button>
    </div>
  );
};
