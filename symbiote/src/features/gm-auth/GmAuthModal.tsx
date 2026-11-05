import React, { useId, useRef, useState } from 'react';
import { ModalShell } from '../../shared/ui/ModalShell';
import { wsBridge } from '../../shared/api/websocket';
import { readClipboard } from '../../shared/lib/clipboard';
interface Props {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}
export const GmAuthModal = ({ isOpen, onSuccess, onCancel }: Props) => {
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const id = useId();
  const codeInput = useRef<HTMLInputElement>(null);
  const pasteCode = async () => {
    const pasted = await readClipboard();
    if (pasted.trim()) {
      setCode(pasted.trim());
      setError('');
    } else {
      setError('Не удалось прочитать буфер обмена. Скопируйте код и разрешите чтение буфера, если появится запрос.');
    }
    codeInput.current?.focus();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await wsBridge.authenticate('gm', code);
      setCode('');
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка подключения');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell isOpen={isOpen} onClose={onCancel} title="Доступ Мастера" closeOnBackdrop={false} closeOnEscape={false}>
      <form onSubmit={submit} className="p-4 flex flex-col gap-3">
        <label htmlFor={id}>Код Мастера из настроек Obsidian</label>
        <input
          id={id}
          ref={codeInput}
          required
          type="password"
          autoComplete="current-password"
          className="input-field select-text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => { void pasteCode(); }}
          className="self-start px-3 py-2 rounded border border-slate-500 disabled:opacity-50"
        >
          Вставить код
        </button>
        <p role="alert" className="text-rose-300">
          {error}
        </p>
        <button type="submit" disabled={busy} className="bg-indigo-600 rounded p-2 text-white">
          {busy ? 'Подключение…' : 'Войти'}
        </button>
      </form>
    </ModalShell>
  );
};
