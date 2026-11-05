import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Server,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Network,
} from 'lucide-react';
import { wsBridge, useAppStore, DEFAULT_WS_PORT } from '../../../shared';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { connected, vaultName } = useAppStore();
  const current = wsBridge.getServerInfo();

  const [host, setHost] = useState(current.host);
  const [port, setPort] = useState(String(current.port));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    clientCount?: number;
  } | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const info = wsBridge.getServerInfo();
      setHost(info.host);
      setPort(String(info.port));
      setTestResult(null);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const p = parseInt(port, 10) || DEFAULT_WS_PORT;
    const res = await wsBridge.pingServer(host, p);
    setIsTesting(false);

    if (res.ok) {
      const clients = res.data?.clients ?? 0;
      setTestResult({
        ok: true,
        message: `Связь установлена! Сервер Obsidian активен. Подключено клиентов: ${clients}`,
        clientCount: clients,
      });
    } else {
      setTestResult({
        ok: false,
        message: `Не удалось связаться: ${res.error || 'проверьте IP и порт'}`,
      });
    }
  };

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = host.trim() || '127.0.0.1';
    const cleanPort = parseInt(port, 10) || DEFAULT_WS_PORT;
    wsBridge.setServer(cleanHost, cleanPort);
    onClose();
  };

  const detectedHostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div
        className="bg-[#141622] border border-[#262a3d] rounded-xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#10111a] border-b border-[#262a3d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                connected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Подключение к Мастеру
              </h3>
              <p className="text-[11px] text-slate-400">
                {connected
                  ? `В сети: ${vaultName || 'Obsidian Vault'}`
                  : 'Офлайн (ожидание связи)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/50 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSaveAndConnect} className="p-4 flex flex-col gap-3.5 text-xs">
          {/* Status banner */}
          <div
            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
              connected
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="font-semibold text-xs">
                {connected ? 'Соединение активно' : 'Связь с сервером отсутствует'}
              </span>
            </div>
            <span className="font-mono text-[11px] opacity-80">
              {current.host}:{current.port}
            </span>
          </div>

          {/* Host & Port inputs */}
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                IP-адрес или Хост Гейм-Мастера:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="127.0.0.1 или 192.168.1.X или 26.X.X.X"
                  className="w-full bg-[#10111a] border border-[#262a3d] text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Порт сервера (по умолчанию 30123):
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="30123"
                className="w-full bg-[#10111a] border border-[#262a3d] text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Быстрый выбор:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setHost('127.0.0.1')}
                className="px-2 py-0.5 rounded text-[11px] bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 border border-[#262a3d] cursor-pointer transition-colors"
              >
                127.0.0.1 (Локально / Я Мастер)
              </button>
              {detectedHostname && detectedHostname !== 'localhost' && detectedHostname !== '127.0.0.1' && (
                <button
                  type="button"
                  onClick={() => setHost(detectedHostname)}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#10111a] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-500/40 cursor-pointer transition-colors"
                >
                  {detectedHostname} (Хост страницы)
                </button>
              )}
            </div>
          </div>

          {/* Test result display */}
          {testResult && (
            <div
              className={`p-2 rounded text-[11px] flex items-start gap-2 border ${
                testResult.ok
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Helpful instructions */}
          <div className="bg-[#10111a] rounded p-2.5 border border-[#262a3d] text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Памятка подключения:</span>
            </div>
            <p>
              • <strong>Мастер:</strong> если Obsidian запущен на этом же компьютере, оставьте <code>127.0.0.1:30123</code>.
            </p>
            <p>
              • <strong>Игроки:</strong> введите IP-адрес Гейм-Мастера в локальной сети (Wi-Fi) или в виртуальной сети (Radmin VPN / Hamachi / Tailscale).
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#262a3d]/80">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-500/40 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Проверка...' : 'Проверить связь'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-[#141622] hover:bg-[#1e2235] text-slate-400 hover:text-white border border-[#262a3d] text-xs cursor-pointer font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm shadow-indigo-600/30 flex items-center gap-1"
              >
                <span>Подключиться</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
