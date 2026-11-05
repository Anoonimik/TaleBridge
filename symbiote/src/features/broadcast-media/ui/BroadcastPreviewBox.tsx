import React from 'react';
import { resolveMediaUrl } from '../../../shared';

interface BroadcastPreviewBoxProps {
  type: 'image' | 'video' | 'text' | 'audio';
  url: string;
  title: string;
  description: string;
  ytEmbedPreview: string | null;
  ytId: string | null;
}

export const BroadcastPreviewBox: React.FC<BroadcastPreviewBoxProps> = ({
  type,
  url,
  title,
  description,
  ytEmbedPreview,
  ytId,
}) => {
  return (
    <div>
      <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
        Предпросмотр перед отправкой
      </label>
      <div className="bg-[#0c0d14] border border-[#262a3d] rounded-lg p-2.5 flex items-center justify-center min-h-[120px] overflow-hidden">
        {type === 'image' && url && (
          <div className="flex flex-col items-center gap-1 max-w-full">
            <img
              src={resolveMediaUrl(url)}
              alt="Предпросмотр"
              className="max-h-48 max-w-full object-contain rounded border border-[#1f2233]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {title && <span className="text-[11px] text-slate-300 font-semibold">{title}</span>}
            {description && <span className="text-[10px] text-slate-400 italic">{description}</span>}
          </div>
        )}

        {type === 'image' && !url && (
          <span className="text-slate-500 text-xs text-center">
            Выберите файл из списка выше или введите URL для предпросмотра
          </span>
        )}

        {type === 'video' && ytEmbedPreview && (
          <div className="w-full max-w-sm aspect-video rounded overflow-hidden border border-[#262a3d] bg-black">
            <iframe
              src={ytEmbedPreview}
              title="Предпросмотр YouTube"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}

        {type === 'video' && !ytId && url && (
          <div className="flex flex-col items-center gap-1 w-full max-w-sm">
            <video
              src={resolveMediaUrl(url)}
              controls
              className="max-h-44 max-w-full rounded bg-black"
            />
            {title && <span className="text-[11px] text-slate-300 font-semibold">{title}</span>}
          </div>
        )}

        {type === 'video' && !url && (
          <span className="text-slate-500 text-xs text-center">
            Вставьте ссылку на YouTube или видеофайл для предпросмотра
          </span>
        )}

        {type === 'text' && description && (
          <div className="bg-[#f5ebd7] text-[#2c1d11] p-3.5 rounded-lg border-2 border-[#8c6f48] w-full max-w-md font-serif text-xs leading-relaxed shadow-sm">
            <div className="text-center pb-1 mb-2 border-b border-[#8c6f48]/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8c6f48]">
                {title || '~ Манускрипт ~'}
              </span>
            </div>
            <div className="whitespace-pre-wrap">{description}</div>
          </div>
        )}

        {type === 'text' && !description && (
          <span className="text-slate-500 text-xs text-center">
            Введите текст послания для предпросмотра свитка
          </span>
        )}

        {type === 'audio' && url && (
          <div className="w-full max-w-sm flex flex-col items-center gap-2 p-2">
            <span className="text-xs text-slate-200 font-semibold">{title || 'Аудио'}</span>
            <audio src={resolveMediaUrl(url)} controls className="w-full" />
          </div>
        )}

        {type === 'audio' && !url && (
          <span className="text-slate-500 text-xs text-center">
            Введите ссылку на аудиодорожку для предпросмотра
          </span>
        )}
      </div>
    </div>
  );
};
