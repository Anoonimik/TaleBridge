import { clueKey } from '../../shared/lib/personal-clues';
import { createId } from '../../../../packages/domain/id';
import type { CinemaMediaPayload } from '../../shared/lib/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { DialogLayer } from '../../shared/ui/DialogLayer';
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../shared/lib/useAppStore';
import { useRosterStore } from '../../entities/character/model/store';
import { resolveMediaUrl, getYouTubeVideoId } from '../../shared/lib/media';

export const CinemaOverlay = () => {
  const media = useAppStore((s) => s.cinemaMedia);
  if (!media?.active) return null;
  return (
    <CinemaSession
      key={clueKey({
        type: media.type,
        url: media.url,
        title: media.title || 'Улика',
        text: media.description,
      })}
      cinemaMedia={media}
    />
  );
};

function CinemaSession({ cinemaMedia }: { cinemaMedia: CinemaMediaPayload }) {
  const { setCinemaMedia, stopBroadcast, role } = useAppStore(
    useShallow((s) => ({
      setCinemaMedia: s.setCinemaMedia,
      stopBroadcast: s.stopBroadcast,
      role: s.role,
    })),
  );
  const { addClue } = useRosterStore(useShallow((s) => ({ addClue: s.addClue })));
  const [imgError, setImgError] = useState(false);
  const isSaved = useRosterStore((s) =>
    s.cluesArchive.some(
      (clue) =>
        clueKey(clue) ===
        clueKey({
          type: cinemaMedia.type,
          url: cinemaMedia.url,
          title: cinemaMedia.title || 'Улика',
          text: cinemaMedia.description,
        }),
    ),
  );
  const isBroadcast = cinemaMedia.source !== 'archive';

  const handleClose = useCallback(() => {
    if (role === 'gm' && isBroadcast) {
      stopBroadcast();
    } else {
      setCinemaMedia(null);
    }
  }, [role, isBroadcast, stopBroadcast, setCinemaMedia]);

  if (!cinemaMedia?.active) return null;

  const handleSaveToArchive = () => {
    addClue({
      id: createId(),
      title: cinemaMedia.title || 'Улика',
      type: cinemaMedia.type,
      url: cinemaMedia.url,
      text: cinemaMedia.description,
      date: new Date().toLocaleDateString(),
    });
  };

  const ytId = getYouTubeVideoId(cinemaMedia.url);
  const isVideo = cinemaMedia.type === 'video' || !!ytId;
  const isAudio = cinemaMedia.type === 'audio';
  const isText = cinemaMedia.type === 'text';
  const isImage = cinemaMedia.type === 'image' && !ytId;

  const getTypeLabel = () => {
    if (ytId) return 'YouTube Видео';
    if (isVideo) return 'Видеозапись';
    if (isAudio) return 'Аудиозапись';
    if (isText) return 'Манускрипт';
    return 'Изображение';
  };

  return (
    <DialogLayer title="Материал Мастера" onClose={handleClose}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        {/* Handout Card */}
        <div className="relative flex flex-col items-center gap-3 max-w-5xl w-full max-h-[92vh]">
          {/* Top Header Bar */}
          <div className="w-full flex items-center justify-between px-2 gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                {getTypeLabel()}
              </span>
              {cinemaMedia.title && (
                <h2 className="text-white text-sm sm:text-base font-bold uppercase tracking-wider truncate drop-shadow-md">
                  {cinemaMedia.title}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {role === 'gm' && isBroadcast && (
                <button
                  type="button"
                  onClick={stopBroadcast}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  title="Прекратить трансляцию и закрыть экран у всех игроков"
                >
                  <span>✕</span>
                  <span>Снять с трансляции (для всех)</span>
                </button>
              )}

              <button
                type="button"
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors border ${
                  isSaved
                    ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                }`}
                onClick={handleSaveToArchive}
                disabled={isSaved}
                title="Сохранить в мой архив улик"
              >
                {isSaved ? 'Сохранено в улики ✓' : 'Сохранить у себя'}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="text-white/70 hover:text-white text-lg font-bold cursor-pointer w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title={role === 'gm' && isBroadcast ? 'Снять с эфира и закрыть' : 'Закрыть (Esc)'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Media Container */}
          <div className="max-w-full max-h-[76vh] flex items-center justify-center overflow-hidden rounded-xl shadow-2xl w-full">
            {/* YouTube Video Embed */}
            {ytId && (
              <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-[#262a3d] bg-black shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={cinemaMedia.title || 'YouTube Видео'}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Direct HTML Video File */}
            {isVideo && !ytId && cinemaMedia.url && (
              <video
                src={resolveMediaUrl(cinemaMedia.url)}
                controls
                autoPlay
                className="max-w-[88vw] max-h-[75vh] rounded-xl shadow-2xl bg-black border border-[#262a3d]"
              />
            )}

            {/* Image */}
            {isImage && cinemaMedia.url && (
              <div className="flex flex-col items-center">
                {imgError ? (
                  <div className="p-8 bg-[#141622] border border-rose-500/40 text-rose-300 rounded-xl text-center text-xs">
                    Не удалось загрузить изображение по указанному адресу:
                    <div className="text-slate-400 mt-1 font-mono break-all">{cinemaMedia.url}</div>
                  </div>
                ) : (
                  <img
                    src={resolveMediaUrl(cinemaMedia.url)}
                    alt={cinemaMedia.title || 'Трансляция'}
                    onError={() => setImgError(true)}
                    className="max-w-[88vw] max-h-[75vh] object-contain rounded-xl shadow-2xl border border-[#262a3d]"
                  />
                )}
              </div>
            )}

            {/* Audio */}
            {isAudio && cinemaMedia.url && (
              <div className="bg-[#141622] border border-[#262a3d] p-6 rounded-xl flex flex-col items-center gap-4 shadow-2xl max-w-md w-full">
                <div className="text-slate-100 text-sm font-semibold text-center">
                  {cinemaMedia.title || 'Аудиодорожка'}
                </div>
                <audio
                  src={resolveMediaUrl(cinemaMedia.url)}
                  controls
                  autoPlay
                  className="w-full"
                />
              </div>
            )}

            {/* Manuscript / Text */}
            {isText && (
              <div className="bg-[#f5ebd7] text-[#2c1d11] p-6 sm:p-8 rounded-xl max-w-2xl w-full max-h-[75vh] overflow-y-auto shadow-2xl border-4 border-[#8c6f48] font-serif leading-relaxed">
                <div className="text-center pb-3 mb-4 border-b border-[#8c6f48]/40">
                  <span className="text-xs uppercase tracking-widest text-[#8c6f48] font-bold">
                    ~ Послание ~
                  </span>
                </div>
                <div className="text-sm sm:text-base whitespace-pre-wrap font-serif">
                  {cinemaMedia.description || cinemaMedia.url}
                </div>
              </div>
            )}
          </div>

          {/* Caption or Description (for Image / Video) */}
          {cinemaMedia.description && !isText && (
            <div className="max-w-2xl text-center text-slate-200 text-xs bg-black/60 backdrop-blur-xs px-4 py-2 rounded-lg border border-white/10">
              {cinemaMedia.description}
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {role === 'gm' && isBroadcast ? (
              <>
                <button
                  type="button"
                  onClick={stopBroadcast}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  title="Снять материал с трансляции для всех участников"
                >
                  <span>✕</span>
                  <span>Снять трансляцию у всех игроков</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCinemaMedia(null)}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                  title="Скрыть окно только у себя (трансляция у игроков продолжится)"
                >
                  Скрыть только у себя
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCinemaMedia(null)}
                className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Свернуть окно (Esc)
              </button>
            )}
          </div>
        </div>
      </div>
    </DialogLayer>
  );
}
