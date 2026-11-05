import React, { useId, useState } from 'react';
import { ModalShell } from '../../shared/ui/ModalShell';
import { wsBridge } from '../../shared/api/websocket';
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
    <ModalShell isOpen={isOpen} onClose={onCancel} title="Доступ Мастера">
      <form onSubmit={submit} className="p-4 flex flex-col gap-3">
        <label htmlFor={id}>Код Мастера из настроек Obsidian</label>
        <input
          id={id}
          required
          type="password"
          autoComplete="current-password"
          className="input-field"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
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
