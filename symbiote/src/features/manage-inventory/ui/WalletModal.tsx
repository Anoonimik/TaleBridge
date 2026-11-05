import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X } from 'lucide-react';
import { Currency, ModalShell } from '../../../shared';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  onUpdateCurrency: (currency: Currency) => void;
  onAdjustCurrency: (type: keyof Currency, delta: number) => void;
}

const COIN_CONFIG: {
  key: keyof Currency;
  short: string;
  name: string;
  rateToGp: number;
  textColor: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: 'pp',
    short: 'ПМ',
    name: 'Платина (10 ЗМ)',
    rateToGp: 10,
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/40',
  },
  {
    key: 'gp',
    short: 'ЗМ',
    name: 'Золото (1 ЗМ)',
    rateToGp: 1,
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/50',
  },
  {
    key: 'ep',
    short: 'ЭМ',
    name: 'Электрум (0.5 ЗМ)',
    rateToGp: 0.5,
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-cyan-500/40',
  },
  {
    key: 'sp',
    short: 'СМ',
    name: 'Серебро (0.1 ЗМ)',
    rateToGp: 0.1,
    textColor: 'text-slate-200',
    bgColor: 'bg-slate-800/60',
    borderColor: 'border-slate-500/40',
  },
  {
    key: 'cp',
    short: 'ММ',
    name: 'Медь (0.01 ЗМ)',
    rateToGp: 0.01,
    textColor: 'text-amber-600',
    bgColor: 'bg-orange-950/40',
    borderColor: 'border-amber-700/40',
  },
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  currency,
  onUpdateCurrency,
  onAdjustCurrency,
}) => {
  const [activeTab, setActiveTab] = useState<'transaction' | 'exact'>('transaction');

  // Transaction state
  const [opType, setOpType] = useState<'add' | 'spend'>('add');
  const [opCoin, setOpCoin] = useState<keyof Currency>('gp');
  const [opAmount, setOpAmount] = useState<number>(10);

  // Exact state
  const [exactBalances, setExactBalances] = useState<Currency>({
    cp: currency.cp || 0,
    sp: currency.sp || 0,
    ep: currency.ep || 0,
    gp: currency.gp || 0,
    pp: currency.pp || 0,
  });

  useEffect(() => {
    if (isOpen) setExactBalances({ ...currency });
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const handleApplyTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.abs(Number(opAmount)) || 0;
    if (amount <= 0) return;

    const delta = opType === 'add' ? amount : -amount;
    onAdjustCurrency(opCoin, delta);
    setOpAmount(10);
    onClose();
  };

  const handleSaveExact = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCurrency(exactBalances);
    onClose();
  };

  const totalInGold =
    (currency.pp || 0) * 10 +
    (currency.gp || 0) +
    (currency.ep || 0) * 0.5 +
    (currency.sp || 0) * 0.1 +
    (currency.cp || 0) * 0.01;

  const totalCoins =
    (currency.pp || 0) +
    (currency.gp || 0) +
    (currency.ep || 0) +
    (currency.sp || 0) +
    (currency.cp || 0);

  const coinsWeightKg = Math.round((totalCoins / 50) * 0.45 * 10) / 10;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Кошелек персонажа">
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl shadow-2xl p-4 w-full max-w-md flex flex-col gap-3 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262a3d] pb-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase">Кошелек персонажа</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1a1d2d] cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Total Summary */}
        <div className="grid grid-cols-2 gap-2 bg-[#10111a] border border-[#262a3d] p-2.5 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Эквивалент в золоте:</span>
            <span className="text-amber-300 font-mono font-bold text-sm">
              ~{totalInGold.toFixed(1)} ЗМ
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Вес монет (50 шт = 1 фнт):</span>
            <span className="text-slate-300 font-mono font-bold text-sm">
              {coinsWeightKg} кг ({totalCoins} шт)
            </span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-[#10111a] p-0.5 rounded-lg border border-[#262a3d] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('transaction')}
            className={`flex-1 py-1 rounded text-center font-medium cursor-pointer transition-colors ${
              activeTab === 'transaction'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Быстрая операция (+ / -)
          </button>
          <button
            type="button"
            onClick={() => {
              setExactBalances({
                cp: currency.cp || 0,
                sp: currency.sp || 0,
                ep: currency.ep || 0,
                gp: currency.gp || 0,
                pp: currency.pp || 0,
              });
              setActiveTab('exact');
            }}
            className={`flex-1 py-1 rounded text-center font-medium cursor-pointer transition-colors ${
              activeTab === 'exact'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Точный баланс
          </button>
        </div>

        {/* Tab 1: Transaction (Add / Spend) */}
        {activeTab === 'transaction' && (
          <form onSubmit={handleApplyTransaction} className="flex flex-col gap-3 text-xs">
            {/* Op Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpType('add')}
                className={`py-1.5 px-3 rounded border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-colors ${
                  opType === 'add'
                    ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#10111a] border-[#262a3d] text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Получить (добыча)</span>
              </button>
              <button
                type="button"
                onClick={() => setOpType('spend')}
                className={`py-1.5 px-3 rounded border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-colors ${
                  opType === 'spend'
                    ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                    : 'bg-[#10111a] border-[#262a3d] text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Потратить (оплата)</span>
              </button>
            </div>

            {/* Coin selector */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Выберите валюту:</label>
              <div className="grid grid-cols-5 gap-1">
                {COIN_CONFIG.map((coin) => (
                  <button
                    key={coin.key}
                    type="button"
                    onClick={() => setOpCoin(coin.key)}
                    className={`p-1.5 rounded border text-center cursor-pointer transition-all ${
                      opCoin === coin.key
                        ? `${coin.bgColor} ${coin.borderColor} ${coin.textColor} font-bold ring-1 ring-white/20`
                        : 'bg-[#10111a] border-[#262a3d] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">{coin.short}</span>
                    <span className="block text-[10px] opacity-75 font-mono">
                      {currency[coin.key] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input + Quick presets */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Количество:</label>
              <input
                type="number"
                min="1"
                step="1"
                value={opAmount}
                onChange={(e) => setOpAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#10111a] border border-[#262a3d] rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex gap-1.5 mt-1.5">
                {[1, 5, 10, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOpAmount(preset)}
                    className="flex-1 py-0.5 rounded bg-[#10111a] border border-[#262a3d] text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#262a3d]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-[#1a1d2d] text-slate-400 hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 rounded font-bold text-white cursor-pointer transition-colors ${
                  opType === 'add'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {opType === 'add' ? 'Добавить в кошелек' : 'Списать из кошелька'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Exact Balances */}
        {activeTab === 'exact' && (
          <form onSubmit={handleSaveExact} className="flex flex-col gap-2.5 text-xs">
            <span className="text-[11px] text-slate-400">
              Укажите точное количество каждого типа монет:
            </span>

            <div className="flex flex-col gap-1.5">
              {COIN_CONFIG.map((coin) => (
                <div
                  key={coin.key}
                  className={`flex items-center justify-between p-2 rounded-lg border ${coin.bgColor} ${coin.borderColor}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold font-mono text-sm ${coin.textColor}`}>
                      {coin.short}
                    </span>
                    <span className="text-[11px] text-slate-400">{coin.name}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={exactBalances[coin.key] || 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setExactBalances((prev) => ({ ...prev, [coin.key]: val }));
                    }}
                    className="w-24 bg-[#10111a] border border-[#262a3d] rounded px-2 py-1 text-right font-mono font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#262a3d]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-[#1a1d2d] text-slate-400 hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Сохранить баланс
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
};
