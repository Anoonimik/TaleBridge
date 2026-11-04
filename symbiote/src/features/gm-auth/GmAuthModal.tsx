import React, { useState } from 'react';
import { useAppStore } from '../../shared';

interface GmAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GmAuthModal = ({ isOpen, onSuccess, onCancel }: GmAuthModalProps) => {
  const { gmPin } = useAppStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = (gmPin || '5').trim();

    if (!expected || pin.trim() === expected) {
      sessionStorage.setItem('tb_gm_auth', 'true');
      onSuccess();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-xs p-4 shadow-2xl flex flex-col gap-3 transition-transform ${
          error ? 'border-rose-500 animate-shake' : ''
        }`}
      >
        <div className="text-center">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Доступ к пульту Гейм-Мастера
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Введите PIN-код для перехода в режим управления:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            type="password"
            placeholder="PIN-код"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-3 py-2 bg-[#10111a] border border-[#262a3d] rounded text-center text-sm font-mono tracking-widest text-slate-100 focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          {error && (
            <div className="text-center text-rose-400 text-[11px] font-medium">
              Неверный PIN-код Мастера
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="flex-1 py-1.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs cursor-pointer"
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
    </div>
  );
};
