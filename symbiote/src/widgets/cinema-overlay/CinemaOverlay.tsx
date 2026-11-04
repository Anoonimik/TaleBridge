import React from 'react';
import { useAppStore, useRosterStore } from '../../shared';

export const CinemaOverlay = () => {
  const { cinemaMedia, setCinemaMedia, role } = useAppStore();
  const { addClue } = useRosterStore();

  if (!cinemaMedia?.active) return null;

  const handleSaveToArchive = () => {
    addClue({
      id: `clue_${Date.now()}`,
      title: cinemaMedia.title || 'Улика',
      type: cinemaMedia.type,
      url: cinemaMedia.url,
      date: new Date().toLocaleDateString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Close button */}
      <button
        type="button"
        onClick={() => setCinemaMedia(null)}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold cursor-pointer w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        title="Закрыть"
      >
        ✕
      </button>

      {/* Handout content */}
      <div className="flex flex-col items-center gap-3 max-w-4xl max-h-[90vh]">
        {cinemaMedia.title && (
          <h2 className="text-white text-base font-bold uppercase tracking-wider text-center drop-shadow-md">
            {cinemaMedia.title}
          </h2>
        )}

        <div className="max-w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
          {cinemaMedia.type === 'image' && cinemaMedia.url && (
            <img
              src={cinemaMedia.url}
              alt={cinemaMedia.title || 'Трансляция'}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
          )}

          {cinemaMedia.type === 'video' && cinemaMedia.url && (
            <video
              src={cinemaMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-lg"
            />
          )}

          {cinemaMedia.type === 'audio' && cinemaMedia.url && (
            <audio src={cinemaMedia.url} controls autoPlay className="w-80" />
          )}

          {cinemaMedia.type === 'text' && cinemaMedia.url && (
            <div className="p-6 bg-[#141622] text-slate-100 rounded-lg max-w-lg leading-relaxed text-sm whitespace-pre-wrap border border-[#262a3d]">
              {cinemaMedia.url}
            </div>
          )}
        </div>

        {/* Save to clues button for players */}
        {role === 'player' && (
          <button
            type="button"
            className="px-4 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors shadow-lg"
            onClick={handleSaveToArchive}
          >
            ★ Сохранить в архив улик
          </button>
        )}
      </div>
    </div>
  );
};
