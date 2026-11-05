import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Check, X } from 'lucide-react';
import {
  useRosterStore,
  useLogStore,
  taleSpireDriver,
  parseModifier,
  formatModifier,
  computeProfBonus,
} from '../../../shared';

export const ConcentrationBanner: React.FC = () => {
  const {
    playerData,
    activeConcentration,
    setConcentration,
    pendingConcentrationCheck,
    setPendingConcentrationCheck,
  } = useRosterStore();

  const [notice, setNotice] = useState<{ type: 'success' | 'fail'; text: string } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const charName = playerData?.name || 'Персонаж';
  const conMod = parseModifier(playerData?.stats?.con || '10');
  const isConProf = playerData?.savingThrowsProficient?.includes('con') || false;
  const profBonus = computeProfBonus(playerData?.level || 1);
  const saveMod = conMod + (isConProf ? profBonus : 0);
  const modStr = formatModifier(saveMod);
  const rollFormula = `1d20${modStr}`;

  const handleDropConcentration = () => {
    if (activeConcentration) {
      useLogStore
        .getState()
        .addLog(
          'action',
          `[Концентрация] ${charName} прекратил концентрацию на «${activeConcentration.spellName}»`
        );
    }
    setConcentration(null);
    setPendingConcentrationCheck(null);
  };

  const applySaveOutcome = (roll: number, dc: number) => {
    const spellName = activeConcentration?.spellName || 'Заклинание';
    if (roll >= dc) {
      const msg = `Концентрация удержана! (${roll} >= ${dc})`;
      setNotice({ type: 'success', text: msg });
      useLogStore
        .getState()
        .addLog(
          'roll',
          `[Концентрация] ${charName}: спасбросок Телосложения (${roll} >= ${dc}). Концентрация на «${spellName}» сохранена.`
        );
      setPendingConcentrationCheck(null);
    } else {
      const msg = `Концентрация потеряна! (${roll} < ${dc})`;
      setNotice({ type: 'fail', text: msg });
      useLogStore
        .getState()
        .addLog(
          'roll',
          `[Концентрация] ${charName}: спасбросок Телосложения (${roll} < ${dc}). Концентрация на «${spellName}» потеряна.`
        );
      setConcentration(null);
      setPendingConcentrationCheck(null);
    }
  };

  const handleRollSave = () => {
    if (!pendingConcentrationCheck) return;
    const dc = pendingConcentrationCheck.dc;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const localTotal = d20 + saveMod;

    taleSpireDriver.rollDice(
      rollFormula,
      `Спасбросок Телосложения (СЛ ${dc}) (${charName})`
    );

    if (taleSpireDriver.isReady()) {
      setIsRolling(true);
      let settled = false;

      const unsubscribe = taleSpireDriver.onRollResult((total) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        setIsRolling(false);
        applySaveOutcome(total, dc);
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          unsubscribe();
          setIsRolling(false);
          applySaveOutcome(localTotal, dc);
        }
      }, 3500);
    } else {
      // Local fallback
      applySaveOutcome(localTotal, dc);
    }
  };

  if (!activeConcentration && !pendingConcentrationCheck && !notice) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {notice && (
        <div
          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 shadow-sm transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {notice.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate">{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {pendingConcentrationCheck && (
        <div className="p-3 rounded-lg bg-rose-950/70 border-2 border-rose-500 text-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold text-xs truncate">
              Получен урон: {pendingConcentrationCheck.damage}! Проверка концентрации (СЛ {pendingConcentrationCheck.dc})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRollSave}
              disabled={isRolling}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow transition-colors whitespace-nowrap"
            >
              {isRolling
                ? 'Бросаем...'
                : `Бросить спасбросок Телосложения (СЛ ${pendingConcentrationCheck.dc})`}
            </button>
            <button
              type="button"
              onClick={handleDropConcentration}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition-colors"
              title="Прервать концентрацию без спасброска"
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      {!pendingConcentrationCheck && activeConcentration && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold truncate">
              Концентрация: «{activeConcentration.spellName}»
            </span>
          </div>
          <button
            type="button"
            onClick={handleDropConcentration}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-100 border border-amber-500/30 cursor-pointer transition-colors shrink-0"
            title="Прервать концентрацию"
          >
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
};
