import React, { useState } from 'react';
import { CONDITIONS, ConditionMeta } from '../../../shared';

interface PlayerConditionsBannerProps {
  conditions: string[];
  isCombatActive?: boolean;
}

export const PlayerConditionsBanner: React.FC<PlayerConditionsBannerProps> = ({
  conditions,
  isCombatActive = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);

  if (!conditions || conditions.length === 0) {
    return null;
  }

  // Map condition strings (which might be English IDs or Russian names) to ConditionMeta
  const matchedConditions: { raw: string; meta: ConditionMeta }[] = conditions.map((raw) => {
    const rawLower = raw.toLowerCase().trim();
    const found = CONDITIONS.find(
      (c) =>
        c.name.toLowerCase() === rawLower ||
        c.label.toLowerCase() === rawLower
    );

    if (found) {
      return { raw, meta: found };
    }

    return {
      raw,
      meta: {
        name: raw,
        label: raw,
        color: '#ef4444',
        desc: 'Активное состояние или эффект, наложенный мастером.',
      },
    };
  });

  const toggleConditionDetails = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-rose-950/25 border border-rose-500/40 rounded-lg p-2.5 flex flex-col gap-2 shadow-xs transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
            Активные состояния ({matchedConditions.length})
          </h4>
          {isCombatActive && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
              Бой
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAllDetails((prev) => !prev)}
          className="text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
        >
          {showAllDetails ? 'Скрыть описания правил' : 'Правила и штрафы 5e'}
        </button>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {matchedConditions.map(({ raw, meta }) => {
          const isSelected = expandedId === meta.name || showAllDetails;
          return (
            <button
              key={raw}
              type="button"
              onClick={() => toggleConditionDetails(meta.name)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-rose-900/50 border-rose-400 text-white shadow-xs'
                  : 'bg-[#141622] border-[#262a3d] hover:border-rose-500/50 text-slate-200'
              }`}
              title="Нажмите, чтобы прочитать правила и штрафы"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <span className="font-semibold">{meta.label}</span>
              <span className="text-[10px] text-slate-400">ℹ️</span>
            </button>
          );
        })}
      </div>

      {/* Detailed rule effects for expanded condition or all */}
      <div className="flex flex-col gap-1.5 pt-1">
        {matchedConditions.map(({ raw, meta }) => {
          const isVisible = showAllDetails || expandedId === meta.name;
          if (!isVisible) return null;

          return (
            <div
              key={raw}
              className="bg-[#10111a] border border-[#262a3d] rounded p-2 text-xs flex flex-col gap-0.5 animate-fadeIn"
            >
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  (D&D 5e)
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px] pl-3.5">
                {meta.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
