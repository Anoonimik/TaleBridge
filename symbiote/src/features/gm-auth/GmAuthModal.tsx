import React, { useState } from 'react';
import { useAppStore, ModalShell, STORAGE_KEYS } from '../../shared';

interface GmAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GmAuthModal = ({ isOpen, onSuccess, onCancel }: GmAuthModalProps) => {
  const { gmPin } = useAppStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = (gmPin || '5').trim();

    if (!expected || pin.trim() === expected) {
      sessionStorage.setItem(STORAGE_KEYS.GM_AUTH, 'true');
      setPin('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Доступ к пульту Гейм-Мастера"
      maxWidthClass="max-w-xs"
    >
      <div className={`p-4 flex flex-col gap-3 ${error ? 'border-t-2 border-rose-500 animate-shake' : ''}`}>
        <p className="text-xs text-slate-400 leading-relaxed text-center">
          Введите PIN-код для перехода в режим управления (по умолчанию: 5, настраивается в Obsidian):
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            type="password"
            placeholder="PIN-код"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(false);
            }}
            className="w-full px-3 py-2 bg-[#10111a] border border-[#262a3d] rounded text-center text-sm font-mono tracking-widest text-slate-100 focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          {error && (
            <div className="text-center text-rose-400 text-xs font-medium">
              Неверный PIN-код Мастера
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="flex-1 py-1.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs cursor-pointer font-medium"
              onClick={onCancel}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};
