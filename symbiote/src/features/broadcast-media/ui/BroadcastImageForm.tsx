import React from 'react';
import { VaultImage } from '../../../shared';

interface BroadcastImageFormProps {
  vaultImages: VaultImage[];
  selectedVaultImage: string;
  url: string;
  description: string;
  onRefreshVault: () => void;
  onSelectVaultImage: (path: string) => void;
  onUrlChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const BroadcastImageForm: React.FC<BroadcastImageFormProps> = ({
  vaultImages,
  selectedVaultImage,
  url,
  description,
  onRefreshVault,
  onSelectVaultImage,
  onUrlChange,
  onDescriptionChange,
}) => {
  const publicImages = vaultImages.filter((img) => img.isPublic);

  return (
    <div className="flex flex-col gap-2.5 bg-[#10111a]/70 border border-[#262a3d] p-3 rounded-lg">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] uppercase font-bold text-slate-300">
            Выбор из хранилища Obsidian ({vaultImages.length} найдено)
          </label>
          <button
            type="button"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
            onClick={onRefreshVault}
            title="Пересканировать папку public/ и файлы хранилища"
          >
            ↻ Обновить список
          </button>
        </div>

        <select
          value={selectedVaultImage}
          onChange={(e) => onSelectVaultImage(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="">
            {vaultImages.length > 0
              ? '-- Выберите подготовленную картинку --'
              : '-- Нет картинок в хранилище (добавьте в public/) --'}
          </option>
          {vaultImages.map((img) => (
            <option key={img.path} value={img.path}>
              {img.isPublic ? '[public] ' : ''}
              {img.name} ({img.path})
            </option>
          ))}
        </select>
      </div>

      {/* Quick Public Pills */}
      {publicImages.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">
            Быстрый выбор из public/:
          </span>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
            {publicImages.slice(0, 10).map((img) => (
              <button
                key={img.path}
                type="button"
                onClick={() => onSelectVaultImage(img.path)}
                className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer transition-colors ${
                  selectedVaultImage === img.path
                    ? 'bg-indigo-600/40 text-indigo-200 border-indigo-400'
                    : 'bg-[#141622] text-slate-400 hover:text-slate-200 border-[#262a3d]'
                }`}
              >
                {img.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual URL / Path Input */}
      <div>
        <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
          Или прямая веб-ссылка / путь к файлу
        </label>
        <input
          type="text"
          required={!url}
          placeholder="public/art.png или https://.../image.webp"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
        />
      </div>

      {/* Caption */}
      <div>
        <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
          Подпись к изображению (опционально)
        </label>
        <input
          type="text"
          placeholder="Например: Схема защитного барьера лаборатории"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#141622] border border-[#262a3d] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
        />
      </div>
    </div>
  );
};
