import React, { useState, useRef, useEffect } from 'react';
import { Clue } from '../../../shared';
import { useAppStore } from '../../../shared';

interface ClueCardProps {
  clue: Clue;
  onDelete: (id: string) => void;
}

export const ClueCard = ({ clue, onDelete }: ClueCardProps) => {
  const { setCinemaMedia } = useAppStore();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || isConfirmingDelete) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setIsConfirmingDelete(false);
      onDelete(clue.id);
      return;
    }

    setIsConfirmingDelete(true);
    resetTimerRef.current = setTimeout(() => {
      setIsConfirmingDelete(false);
    }, 3500);
  };

  const handleOpenMedia = () => {
    setCinemaMedia({
      type: clue.type,
      url: clue.url || '',
      title: clue.title,
      active: true,
    });
  };

  return (
    <div className="bg-[#141622] border border-[#262a3d] hover:border-[#383d57] rounded-lg p-2.5 flex flex-col gap-2 transition-all shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <strong className="text-slate-100 text-xs truncate" title={clue.title}>
          {clue.title}
        </strong>

        <button
          type="button"
          className={`h-6 text-xs rounded transition-colors cursor-pointer flex items-center justify-center font-medium ${
            isConfirmingDelete
              ? 'bg-rose-600 text-white font-bold px-2'
              : 'w-6 bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
          }`}
          onClick={handleDelete}
          title={
            isConfirmingDelete
              ? 'Нажмите еще раз для подтверждения'
              : 'Удалить из архива (Shift+клик для мгновенного удаления)'
          }
        >
          {isConfirmingDelete ? 'Удалить?' : '✕'}
        </button>
      </div>

      {clue.url && clue.type === 'image' && (
        <div
          className="w-full h-24 rounded bg-[#10111a] overflow-hidden cursor-pointer relative group"
          onClick={handleOpenMedia}
        >
          <img
            src={clue.url}
            alt={clue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-medium transition-opacity">
            Развернуть
          </div>
        </div>
      )}

      {clue.text && (
        <p className="text-xs text-slate-400 italic line-clamp-3 bg-[#10111a] p-2 rounded border border-[#1f2233]">
          {clue.text}
        </p>
      )}

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
