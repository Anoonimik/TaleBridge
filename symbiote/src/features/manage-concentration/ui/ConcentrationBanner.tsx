import type { Character } from '../../../../../packages/domain/types';
import { useAsyncAction } from '../../../shared/lib/hooks/useAsyncAction';
import { useLogStore } from '../../../shared/lib/useLogStore';
import React, { useState } from 'react';
import { useRosterStore } from '../../../entities/character/model/store';
import { taleSpireDriver } from '../../../shared/api/talespire';
import { computeProfBonus } from '../../../shared/lib/dnd-rules';
import { parseModifier } from '../../../shared/lib/text-utils';
export const ConcentrationBanner = () => {
  const character = useRosterStore((s) => s.playerData);
  if (!character?.activeConcentration) return null;
  return (
    <ConcentrationSession
      key={`${character.id}:${character.activeConcentration.instanceId}`}
      character={character}
    />
  );
};
function ConcentrationSession({ character }: { character: Character }) {
  const { pending: busy, error, run } = useAsyncAction();
  const [notice, setNotice] = useState('');
  const concentration = character.activeConcentration!;
  const check = character.concentrationChecks?.[0];
  const drop = () => {
    const state = useRosterStore.getState();
    if (state.playerData && state.playerData.id === character.id)
      state.setPlayerData({
        ...state.playerData,
        activeConcentration: null,
        concentrationChecks: [],
      });
  };
  const roll = () =>
    run(async (isCurrent) => {
      if (!check) return;
      setNotice('');
      const bonus =
        parseModifier(character.stats?.con || '10') +
        (character.savingThrowsProficient?.includes('con')
          ? computeProfBonus(character.level || 1)
          : 0);
      const total = await taleSpireDriver.rollForResult(
        `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
        `Концентрация: ${character.name} (СЛ ${check.dc})`,
        false,
      );
      if (!isCurrent()) return;
      const state = useRosterStore.getState();
      const latest = state.playerData;
      if (
        latest?.id !== character.id ||
        latest?.activeConcentration?.instanceId !== concentration.instanceId ||
        latest?.concentrationChecks?.[0]?.id !== check.id
      )
        return;
      const success = total >= check.dc;
      state.setPlayerData({
        ...latest,
        activeConcentration: success ? latest.activeConcentration : null,
        concentrationChecks: success ? latest.concentrationChecks.slice(1) : [],
      });
      setNotice(
        `${total} / СЛ ${check.dc}: ${success ? 'концентрация сохранена' : 'концентрация потеряна'}`,
      );
      useLogStore
        .getState()
        .addLog(
          'roll',
          `${character.name}: концентрация ${success ? 'сохранена' : 'потеряна'} (${total} / СЛ ${check.dc})`,
        );
    });

  return (
    <section
      aria-label="Концентрация"
      className="p-3 rounded border border-amber-500 text-amber-200 text-xs flex flex-col gap-2"
    >
      <span>Концентрация: {concentration.spellName}</span>
      {check && (
        <>
          <span>
            Урон: {check.damage}. СЛ {check.dc}. Ожидает проверок:{' '}
            {character.concentrationChecks?.length}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void roll();
            }}
            className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors self-start"
          >
            {busy ? 'Ожидание кубиков…' : 'Спасбросок Телосложения'}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={drop}
        className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-[#262a3d] hover:border-rose-500/40 cursor-pointer transition-colors self-start"
      >
        Прекратить концентрацию
      </button>
      <span role="status">{error || notice}</span>
    </section>
  );
}
