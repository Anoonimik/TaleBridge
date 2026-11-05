import { resolveAttackRoll } from '../../../shared/lib/dnd-rules';
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

  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const epoch = ++generation.current;
    setIsCritical(false);
    setLastRoll(null);
    return () => {
      generation.current = epoch + 1;
    };
  }, [attack.name, attack.hit, attack.dmg, charName, playerData?.id]);
  const rollAttack = async (damage: boolean) => {
    if (waitingForDiceRef.current) return;
    waitingForDiceRef.current = true;
    setBusy(true);
    setError('');
    setIsCritical(false);
    setLastRoll(null);
    const current = generation.current;
    try {
      if (!/^[+-]\d+$/.test(bonus)) throw new Error('Бонус атаки должен быть целым числом');
      const total = await taleSpireDriver.rollForResult(`1d20${bonus}`, `${attack.name} - Атака`);
      if (current !== generation.current) return;
      const { natural, critical } = resolveAttackRoll(total, bonusNum);
      setIsCritical(critical);
      setLastRoll({ d20: natural, isCrit: critical });
      useLogStore
        .getState()
        .addLog(
          'roll',
          `${charName}: ${attack.name}, d20=${natural}, итог ${total}${critical ? ' — критическое попадание' : ''}`,
        );
      if (damage && attack.dmg && natural !== 1)
        await taleSpireDriver.rollDice(
          critical ? doubleDamageDice(attack.dmg) : attack.dmg,
          `${attack.name} - ${critical ? 'Критический урон' : 'Урон'}`,
        );
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : 'Ошибка броска');
    } finally {
      waitingForDiceRef.current = false;
      setBusy(false);
    }
  };
  const handleRollHit = (event: React.MouseEvent) => {
    event.stopPropagation();
    void rollAttack(false);
  };
  const handleRollAttackAndDamage = (event: React.MouseEvent) => {
    event.stopPropagation();
    void rollAttack(true);
  };
  const handleRollDamage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!attack.dmg || waitingForDiceRef.current) return;
    try {
      void taleSpireDriver.rollDice(
        isCritical ? doubleDamageDice(attack.dmg) : attack.dmg,
        `${attack.name} - Урон`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка формулы');
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
          disabled={busy}
          onClick={handleRollHit}
          title="Бросить 1d20 + бонус попадания в TaleSpire"
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
          disabled={busy}
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
          disabled={busy}
          onClick={handleRollAttackAndDamage}
          title="Полная атака: попадание и урон (удваивает кости при натуральной 20)"
        >
          <span>Атака + Урон</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="text-rose-300 text-xs">
          {error}
        </p>
      )}
      {lastRoll && !isCritical && (
        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
          <span>
            Бросок d20: <strong className="text-slate-200 font-mono">{lastRoll.d20}</strong>
            {bonus && <span className="text-slate-400 font-mono"> ({bonus})</span>}
          </span>
          <span className="font-mono text-slate-300">Итог: {lastRoll.d20 + bonusNum}</span>
        </div>
      )}
    </div>
  );
};
