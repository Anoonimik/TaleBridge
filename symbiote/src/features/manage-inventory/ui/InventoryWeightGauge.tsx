import React from 'react';

interface InventoryWeightGaugeProps {
  totalWeight: number;
  maxWeight: number;
  weightPercent: number;
  itemsWeight?: number;
  coinsWeight?: number;
}

export const InventoryWeightGauge: React.FC<InventoryWeightGaugeProps> = ({
  totalWeight,
  maxWeight,
  weightPercent,
  itemsWeight,
  coinsWeight = 0,
}) => {
  let weightStatusColor = 'bg-emerald-500';
  let weightStatusText = 'text-emerald-400';

  if (weightPercent >= 100) {
    weightStatusColor = 'bg-rose-500 animate-pulse';
    weightStatusText = 'text-rose-400 font-bold';
  } else if (weightPercent >= 90) {
    weightStatusColor = 'bg-rose-500';
    weightStatusText = 'text-rose-400';
  } else if (weightPercent >= 70) {
    weightStatusColor = 'bg-amber-500';
    weightStatusText = 'text-amber-400';
  }

  return (
    <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-1.5 shrink-0">
      <div className="flex items-center justify-between text-xs flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Переносимый вес
          </span>
          {coinsWeight > 0 && itemsWeight !== undefined && (
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              (снаряжение: {itemsWeight.toFixed(1)} кг, монеты: {coinsWeight.toFixed(1)} кг)
            </span>
          )}
        </div>
        <span className={`font-mono text-xs font-semibold ${weightStatusText}`}>
          <strong>{totalWeight.toFixed(1)}</strong> / {maxWeight} кг ({weightPercent}%)
        </span>
      </div>

      <div className="w-full h-2 bg-[#10111a] rounded-full overflow-hidden border border-[#1f2233]">
        <div
          className={`h-full transition-all duration-300 ${weightStatusColor}`}
          style={{ width: `${Math.min(100, weightPercent)}%` }}
        />
      </div>
    </div>
  );
};
