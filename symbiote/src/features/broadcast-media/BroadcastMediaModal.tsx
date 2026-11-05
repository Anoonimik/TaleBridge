import { DialogLayer } from '../../shared/ui/DialogLayer';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useAppStore,
  wsBridge,
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  cleanFileNameToTitle,
} from '../../shared';
import { BroadcastPreviewBox, BroadcastImageForm } from './ui';

interface BroadcastMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BroadcastMediaModal = ({ isOpen, onClose }: BroadcastMediaModalProps) => {
  const { cinemaMedia, setCinemaMedia, stopBroadcast, vaultImages } = useAppStore();
  const [type, setType] = useState<'image' | 'video' | 'text' | 'audio'>('image');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVaultImage, setSelectedVaultImage] = useState('');



  // Request latest vault images when modal opens
  useEffect(() => {
    if (isOpen) {
      wsBridge.send('GET_VAULT_IMAGES', {});
    }
  }, [isOpen]);

  const ytId = useMemo(() => getYouTubeVideoId(url), [url]);
  const ytEmbedPreview = useMemo(() => (ytId ? getYouTubeEmbedUrl(url, false) : null), [ytId, url]);

  if (!isOpen) return null;

  // Handle URL change with smart auto-detection
  const handleUrlChange = (value: string) => {
    setUrl(value);
    setSelectedVaultImage('');

    if (getYouTubeVideoId(value) || /\.(mp4|webm|mov|mkv)$/i.test(value)) {
      if (type !== 'video') setType('video');
    } else if (/\.(png|jpe?g|webp|gif|svg)$/i.test(value)) {
      if (type !== 'image') setType('image');
    } else if (/\.(mp3|ogg|wav)$/i.test(value)) {
      if (type !== 'audio') setType('audio');
    }
  };

  // Handle Vault Image selection
  const handleSelectVaultImage = (path: string) => {
    setSelectedVaultImage(path);
    setUrl(path);
    setType('image');
    if (!title || title === cleanFileNameToTitle(url)) {
      setTitle(cleanFileNameToTitle(path));
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (type !== 'text' && !url.trim()) return;
    if (type === 'text' && !description.trim()) return;

    const handout = {
      type,
      url: type === 'text' ? '' : url.trim(),
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      content: type === 'text' ? description.trim() : undefined,
      active: true,
    };

    setCinemaMedia(handout);
    wsBridge.send('BROADCAST_HANDOUT', handout);
    onClose();
  };

  return (
    <DialogLayer title="Трансляция материала" onClose={onClose}><div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262a3d] bg-[#10111a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">
              Трансляция медиа игрокам (Handout Showcase)
            </h3>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-base font-bold cursor-pointer w-6 h-6 rounded flex items-center justify-center transition-colors"
            onClick={onClose}
            title="Закрыть (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
          {/* Active Broadcast Banner */}
          {cinemaMedia?.active && (
            <div className="bg-rose-950/40 border border-rose-500/60 p-2.5 rounded-lg flex items-center justify-between gap-2 shrink-0 shadow-sm animate-pulse">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0"></span>
                <span className="text-rose-200 text-xs truncate">
                  В эфире у игроков:{' '}
                  <strong className="text-white">
                    {cinemaMedia.title || cinemaMedia.url || 'Свиток'}
                  </strong>{' '}
                  <span className="text-rose-300">({cinemaMedia.type})</span>
                </span>
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs shrink-0 font-bold cursor-pointer transition-all shadow-xs active:scale-95"
                onClick={stopBroadcast}
              >
                Снять с трансляции ✕
              </button>
            </div>
          )}

          {/* Media Type Tabs */}
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
              Тип трансляции
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'image', label: 'Изображение' },
                { id: 'video', label: 'Видео' },
                { id: 'text', label: 'Манускрипт' },
                { id: 'audio', label: 'Аудио' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`py-1.5 px-2 rounded text-xs font-medium cursor-pointer border text-center transition-all ${
                    type === tab.id
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 font-bold shadow-xs'
                      : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border-[#262a3d]'
                  }`}
                  onClick={() => setType(tab.id as 'image' | 'video' | 'text' | 'audio')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form id="broadcastForm" onSubmit={handleBroadcast} className="flex flex-col gap-3">
            {/* Title Input (common for all types) */}
            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                {type === 'text' ? 'Заголовок свитка / документа' : 'Заголовок материала (для игроков)'}
              </label>
              <input
                type="text"
                placeholder={
                  type === 'text'
                    ? 'Например: Письмо Калиокса или Древний указ'
                    : type === 'video'
                    ? 'Например: Вступительное синематик-видео'
                    : 'Например: Карта катакомб или Портрет чародея'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            {/* --- IMAGE VIEW --- */}
            {type === 'image' && (
              <BroadcastImageForm
                vaultImages={vaultImages}
                selectedVaultImage={selectedVaultImage}
                url={url}
                description={description}
                onRefreshVault={() => wsBridge.send('GET_VAULT_IMAGES', {})}
                onSelectVaultImage={handleSelectVaultImage}
                onUrlChange={handleUrlChange}
                onDescriptionChange={setDescription}
              />
            )}

            {/* --- VIDEO VIEW --- */}
            {type === 'video' && (
              <div className="flex flex-col gap-2.5 bg-[#10111a]/70 border border-[#262a3d] p-3 rounded-lg">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Ссылка на видео (YouTube или прямой файл MP4/WebM)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/... или file.mp4"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    autoFocus
                  />
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Поддерживаются ссылки YouTube (включая Shorts) и прямые видеофайлы.</span>
                    {ytId && (
                      <span className="text-emerald-400 font-semibold shrink-0">
                        YouTube распознан ({ytId}) ✓
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Описание / Подсказка к видео (опционально)
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Катсцена перехода на второй уровень"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* --- MANUSCRIPT / TEXT VIEW --- */}
            {type === 'text' && (
              <div className="flex flex-col gap-2.5 bg-[#10111a]/70 border border-[#262a3d] p-3 rounded-lg">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] uppercase font-bold text-slate-300">
                      Текст манускрипта или записки
                    </label>
                    <div className="flex gap-1.5 text-[11px]">
                      <button
                        type="button"
                        className="text-amber-400 hover:text-amber-300 cursor-pointer"
                        onClick={() =>
                          setDescription(
                            '«Доверенным лицам Цеха.\n\nПроект Калиокса входит в завершающую стадию. Доставьте кристалл-резонатор к вентилям реактора не позднее полуночи. Нарушители будут дезинтегрированы на месте.»'
                          )
                        }
                      >
                        Пример
                      </button>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                        onClick={() => setDescription('')}
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    required
                    placeholder="Введите текст, который игроки увидят на экране в виде древнего свитка..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs leading-relaxed font-serif"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* --- AUDIO VIEW --- */}
            {type === 'audio' && (
              <div className="flex flex-col gap-2.5 bg-[#10111a]/70 border border-[#262a3d] p-3 rounded-lg">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Ссылка на аудиофайл (URL или путь в Vault)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="public/ambience.mp3 или https://.../horn.wav"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* --- LIVE PREVIEW BOX --- */}
            <BroadcastPreviewBox
              type={type}
              url={url}
              title={title}
              description={description}
              ytEmbedPreview={ytEmbedPreview}
              ytId={ytId}
            />
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#262a3d] bg-[#10111a] shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
              onClick={onClose}
            >
              Отмена
            </button>

            {cinemaMedia?.active && (
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 text-xs font-semibold cursor-pointer transition-colors"
                onClick={stopBroadcast}
                title="Прекратить трансляцию и закрыть экран у игроков"
              >
                Снять трансляцию ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            form="broadcastForm"
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-md"
          >
            Транслировать игрокам ▸
          </button>
        </div>
      </div>
    </div></DialogLayer>
  );
};
