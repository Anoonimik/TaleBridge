import React, { useState } from 'react';
import { useAppStore, wsBridge } from '../../shared';

interface BroadcastMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BroadcastMediaModal = ({ isOpen, onClose }: BroadcastMediaModalProps) => {
  const { cinemaMedia, setCinemaMedia } = useAppStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'text' | 'audio'>('image');

  if (!isOpen) return null;

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const handout = {
      type,
      url: url.trim(),
      title: title.trim() || undefined,
      active: true,
    };

    setCinemaMedia(handout);
    wsBridge.send('BROADCAST_HANDOUT', handout);
    onClose();
  };

  const handleDismiss = () => {
    setCinemaMedia(null);
    wsBridge.send('DISMISS_HANDOUT', {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-sm p-4 shadow-2xl flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#262a3d]">
          <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">
            Трансляция медиа игрокам (Handout)
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {cinemaMedia?.active && (
          <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded flex items-center justify-between">
            <span className="text-amber-300 truncate mr-2">
              Сейчас транслируется: <strong>{cinemaMedia.title || cinemaMedia.url}</strong>
            </span>
            <button
              type="button"
              className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded text-xs shrink-0 font-medium cursor-pointer"
              onClick={handleDismiss}
            >
              Снять
            </button>
          </div>
        )}

        <form onSubmit={handleBroadcast} className="flex flex-col gap-2.5 text-slate-300">
          <div>
            <label className="text-xs uppercase font-bold text-slate-400 block mb-1">
              Тип медиа
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['image', 'video', 'audio'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`py-1 rounded text-xs capitalize cursor-pointer border ${
                    type === t
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-bold'
                      : 'bg-[#10111a] text-slate-400 border-[#262a3d]'
                  }`}
                  onClick={() => setType(t)}
                >
                  {t === 'image' ? 'Картинка' : t === 'video' ? 'Видео' : 'Аудио'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-slate-400 block mb-1">
              URL или путь в Vault
            </label>
            <input
              type="text"
              required
              placeholder="https://... или public/art.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-slate-400 block mb-1">
              Заголовок (опционально)
            </label>
            <input
              type="text"
              placeholder="Таинственное письмо / Карта катакомб"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#10111a] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#262a3d]">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-[#1a1d2d] text-slate-400 hover:text-white"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              Транслировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
