import React, { useState, useEffect, useRef } from 'react';
import {
  Attack,
  taleSpireDriver,
  useConfirmDelete,
  normalizeHitBonus,
  doubleDamageDice,
  useRosterStore,
  useLogStore,
} from '../../../shared';

interface AttackCardProps {
  attack: Attack;
  index: number;
  canManage?: boolean;
  characterName?: string;
  onEdit?: (attack: Attack, index: number) => void;
  onDelete?: (index: number) => void;
}

export const AttackCard = ({
  attack,
  index,
  canManage = false,
  characterName,
  onEdit,
  onDelete,
}: AttackCardProps) => {
  const { playerData } = useRosterStore();
  const charName = characterName || playerData?.name || 'Персонаж';

  const [isCritical, setIsCritical] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ d20: number; isCrit: boolean } | null>(null);
  const waitingForDiceRef = useRef(false);

  const { isConfirming: isConfirmingDelete, handleDelete: handleDeleteClick } = useConfirmDelete({
    onDelete: () => onDelete?.(index),
  });

  const bonus = normalizeHitBonus(attack.hit);
  const bonusNum = parseInt(bonus, 10) || 0;

  // Listen for real 3D dice roll result from TaleSpire / Host
  useEffect(() => {
    const unsubscribe = taleSpireDriver.onRollResult((total) => {
      if (!waitingForDiceRef.current) return;
      waitingForDiceRef.current = false;

      const isNat20 = total === 20 || total - bonusNum === 20;
      if (isNat20 && !isCritical) {
        setIsCritical(true);
        setLastRoll({ d20: 20, isCrit: true });

        if (attack.dmg) {
          const doubled = doubleDamageDice(attack.dmg);
          taleSpireDriver.rollDice(doubled, `${attack.name} - Критический урон (натуральная 20!)`);
        }

        useLogStore
          .getState()
          .addLog(
            'roll',
            `[КРИТИЧЕСКИЙ УДАР!] ${charName} нанес критический удар атакой «${attack.name}» (натуральная 20!)`
          );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [attack, bonusNum, isCritical, charName]);

  const triggerCriticalSequence = (hitBonus: string) => {
    setIsCritical(true);
    setLastRoll({ d20: 20, isCrit: true });

    // Send attack roll to TaleSpire
    taleSpireDriver.rollDice(`1d20${hitBonus}`, `${attack.name} - Атака (натуральная 20!)`);

    // Double the damage dice according to 5e rules and send to TaleSpire
    if (attack.dmg) {
      const doubledDamage = doubleDamageDice(attack.dmg);
      taleSpireDriver.rollDice(
        doubledDamage,
        `${attack.name} - Критический урон (натуральная 20!)`
      );
    }

    useLogStore
      .getState()
      .addLog(
        'roll',
        `[КРИТИЧЕСКИЙ УДАР!] ${charName} нанес критический удар атакой «${attack.name}» (натуральная 20!)`
      );
  };

  const handleRollHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    waitingForDiceRef.current = true;

    // Shift+Click forces Natural 20 for convenient manual testing
    const d20 = e.shiftKey ? 20 : Math.floor(Math.random() * 20) + 1;
    const isCrit = d20 === 20;

    if (isCrit) {
      triggerCriticalSequence(bonus);
    } else {
      setIsCritical(false);
      setLastRoll({ d20, isCrit: false });
      taleSpireDriver.rollDice(`1d20${bonus}`, `${attack.name} - Атака`);
      useLogStore
        .getState()
        .addLog('roll', `${charName}: Атака «${attack.name}» [d20: ${d20}${bonus} = ${d20 + bonusNum}]`);
    }
  };

  const handleRollDamage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attack.dmg) return;

    if (isCritical) {
      const doubledDamage = doubleDamageDice(attack.dmg);
      taleSpireDriver.rollDice(doubledDamage, `${attack.name} - Критический урон`);
      useLogStore
        .getState()
        .addLog('roll', `${charName}: Критический урон «${attack.name}» (${doubledDamage})`);
    } else {
      taleSpireDriver.rollDice(attack.dmg, `${attack.name} - Урон`);
      useLogStore
        .getState()
        .addLog('roll', `${charName}: Урон «${attack.name}» (${attack.dmg})`);
    }
  };

  const handleRollAttackAndDamage = (e: React.MouseEvent) => {
    e.stopPropagation();
    waitingForDiceRef.current = true;

    // Shift+Click forces Natural 20
    const d20 = e.shiftKey ? 20 : Math.floor(Math.random() * 20) + 1;
    const isCrit = d20 === 20;

    if (isCrit) {
      triggerCriticalSequence(bonus);
    } else {
      setIsCritical(false);
      setLastRoll({ d20, isCrit: false });
      taleSpireDriver.rollDice(`1d20${bonus}`, `${attack.name} - Атака`);
      if (attack.dmg) {
        taleSpireDriver.rollDice(attack.dmg, `${attack.name} - Урон`);
      }
      useLogStore
        .getState()
        .addLog(
          'roll',
          `${charName}: Атака «${attack.name}» [d20: ${d20}${bonus} = ${d20 + bonusNum}] и Урон [${attack.dmg || '—'}]`
        );
    }
  };

  return (
    <div
      className={`bg-[#141622] border rounded-lg p-2.5 flex flex-col gap-2 transition-all shadow-sm ${
        isCritical
          ? 'border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
          : 'border-[#262a3d] hover:border-[#383d57]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <strong className="text-slate-100 text-sm font-semibold truncate" title={attack.name}>
            {attack.name}
          </strong>
          {attack.type && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
              {attack.type}
            </span>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                onClick={() => onEdit(attack, index)}
                title="Редактировать действие"
              >
                ✎
              </button>
            )}

            <button
              type="button"
              className={`px-2 h-7 flex items-center justify-center rounded text-xs cursor-pointer transition-colors font-medium ${
                isConfirmingDelete
                  ? 'bg-rose-600 text-white font-bold animate-pulse px-2.5'
                  : 'bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 w-7'
              }`}
              onClick={handleDeleteClick}
              title={
                isConfirmingDelete
                  ? 'Нажмите еще раз для подтверждения удаления'
                  : 'Удалить действие (Shift+клик для мгновенного удаления)'
              }
            >
              {isConfirmingDelete ? 'Удалить?' : '✕'}
            </button>
          </div>
        )}
      </div>

      {/* Critical Hit Banner Highlight */}
      {isCritical && (
        <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/60 rounded px-2.5 py-1 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <span className="uppercase tracking-wider font-extrabold text-amber-400">
              КРИТИЧЕСКИЙ УДАР!
            </span>
            <span className="text-rose-300 font-mono text-[11px] font-normal">
              (натуральная 20! Урон удвоен)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCritical(false);
            }}
            className="text-amber-400/80 hover:text-white cursor-pointer ml-1 text-xs px-1"
            title="Сбросить статус крита"
          >
            ✕
          </button>
        </div>
      )}

      {attack.desc && (
        <p className="text-xs text-slate-300 leading-relaxed m-0 italic bg-[#10111a] p-2 rounded border border-[#1f2233]">
          {attack.desc}
        </p>
      )}

      {/* Action Buttons: «Атака», «Урон», «Атака + Урон» */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          className="flex-1 px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
          onClick={handleRollHit}
          title="Бросить 1d20 + попадание (Shift+клик для симуляции крита 20)"
        >
          <span>Атака</span>
          {attack.hit && <span className="font-mono text-xs font-bold">({attack.hit})</span>}
        </button>

        <button
          type="button"
          className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1 ${
            isCritical
              ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50'
              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
          }`}
          onClick={handleRollDamage}
          title={isCritical ? 'Бросить удвоенный критический урон' : 'Бросок урона'}
        >
          <span>Урон</span>
          {attack.dmg && (
            <span className="font-mono text-xs font-bold">
              ({isCritical ? doubleDamageDice(attack.dmg) : attack.dmg})
            </span>
          )}
        </button>

        <button
          type="button"
          className="flex-1 px-2 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
          onClick={handleRollAttackAndDamage}
          title="Полная атака: попадание и урон (удваивает кости при натуральной 20)"
        >
          <span>Атака + Урон</span>
        </button>
      </div>

      {lastRoll && !isCritical && (
        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
          <span>
            Бросок d20: <strong className="text-slate-200 font-mono">{lastRoll.d20}</strong>
            {bonus && <span className="text-slate-400 font-mono"> ({bonus})</span>}
          </span>
          <span className="font-mono text-slate-300">
            Итог: {lastRoll.d20 + bonusNum}
          </span>
        </div>
      )}
    </div>
  );
};
