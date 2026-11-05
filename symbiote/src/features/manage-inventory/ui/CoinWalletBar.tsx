import React, { useState } from 'react';
import { Coins, Sliders } from 'lucide-react';
import { Currency } from '../../../shared';
import { WalletModal } from './WalletModal';

interface CoinWalletBarProps {
  currency?: Currency;
  onUpdateCurrency: (currency: Currency) => void;
  onAdjustCurrency: (type: keyof Currency, delta: number) => void;
}

const DEFAULT_COINS: Currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export const CoinWalletBar: React.FC<CoinWalletBarProps> = ({
  currency = DEFAULT_COINS,
  onUpdateCurrency,
  onAdjustCurrency,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const curr = currency || DEFAULT_COINS;

  const totalInGold =
    (curr.pp || 0) * 10 +
    (curr.gp || 0) +
    (curr.ep || 0) * 0.5 +
    (curr.sp || 0) * 0.1 +
    (curr.cp || 0) * 0.01;

  const totalCoins =
    (curr.pp || 0) +
    (curr.gp || 0) +
    (curr.ep || 0) +
    (curr.sp || 0) +
    (curr.cp || 0);

  const coinsWeightKg = Math.round((totalCoins / 50) * 0.45 * 10) / 10;

  return (
    <>
      <div className="bg-[#141622] rounded-lg border border-[#262a3d] p-2 flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Left: Icon & Coins Pills */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div
            className="flex items-center gap-1 text-amber-400 font-bold text-xs cursor-pointer select-none"
            onClick={() => setIsModalOpen(true)}
            title="Открыть кошелек персонажа"
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Кошелек:</span>
          </div>

          {/* Platinum */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono cursor-pointer hover:border-purple-400"
            onClick={() => setIsModalOpen(true)}
            title="Платина (10 ЗМ)"
          >
            <span className="text-[10px] font-sans text-purple-400 font-bold">ПМ</span>
            <span className="font-bold">{curr.pp || 0}</span>
          </div>

          {/* Gold (Primary) */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold shadow-xs cursor-pointer hover:border-amber-400 ring-1 ring-amber-500/20"
            onClick={() => setIsModalOpen(true)}
            title="Золото (1 ЗМ)"
          >
            <span className="text-[10px] font-sans text-amber-400 font-bold">ЗМ</span>
            <span>{curr.gp || 0}</span>
          </div>

          {/* Electrum */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono cursor-pointer hover:border-cyan-400"
            onClick={() => setIsModalOpen(true)}
            title="Электрум (0.5 ЗМ)"
          >
            <span className="text-[10px] font-sans text-cyan-400 font-bold">ЭМ</span>
            <span>{curr.ep || 0}</span>
          </div>

          {/* Silver */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-500/30 text-slate-200 text-xs font-mono cursor-pointer hover:border-slate-300"
            onClick={() => setIsModalOpen(true)}
            title="Серебро (0.1 ЗМ)"
          >
            <span className="text-[10px] font-sans text-slate-400 font-bold">СМ</span>
            <span>{curr.sp || 0}</span>
          </div>

          {/* Copper */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-950/40 border border-amber-700/40 text-amber-500 text-xs font-mono cursor-pointer hover:border-amber-500"
            onClick={() => setIsModalOpen(true)}
            title="Медь (0.01 ЗМ)"
          >
            <span className="text-[10px] font-sans text-amber-600 font-bold">ММ</span>
            <span>{curr.cp || 0}</span>
          </div>
        </div>

        {/* Right: Quick actions & Totals */}
        <div className="flex items-center gap-2 shrink-0 ml-auto text-xs">
          <div
            className="text-[11px] text-slate-400 hidden md:flex items-center gap-2 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
            title="Суммарный вес всех монет"
          >
            <span>~{totalInGold.toFixed(1)} ЗМ</span>
            <span>•</span>
            <span>{coinsWeightKg} кг ({totalCoins} шт)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2 py-1 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-slate-300 hover:text-white border border-[#262a3d] text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
            title="Управление монетами (добыча, оплата, баланс)"
          >
            <Sliders className="w-3 h-3 text-slate-400" />
            <span>Монеты</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <WalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currency={curr}
          onUpdateCurrency={onUpdateCurrency}
          onAdjustCurrency={onAdjustCurrency}
        />
      )}
    </>
  );
};
