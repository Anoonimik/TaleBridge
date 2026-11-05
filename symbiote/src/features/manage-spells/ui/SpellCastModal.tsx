import React, { useState } from 'react';
import type { Spell, SpellSlot } from '../../../../../packages/domain/types';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { getFormulaScalingPreview } from '../lib/spellScaling';

export interface SpellCastModalProps {
  isOpen: boolean;
  spell: Spell | null;
  spellSlots: SpellSlot[];
  onClose: () => void;
  onCast: (spell: Spell, circle: number) => void;
}

function getInitialCircle(spellLevel: number, slots: SpellSlot[]): number {
  const baseSlot = slots.find((s) => s.level === spellLevel);
  if (baseSlot && baseSlot.current > 0) {
    return spellLevel;
  }
  for (let lvl = spellLevel + 1; lvl <= 9; lvl++) {
    const s = slots.find((slot) => slot.level === lvl);
    if (s && s.current > 0) {
      return lvl;
    }
  }
  return spellLevel;
}

export const SpellCastModal = (props: SpellCastModalProps) => {
  if (!props.isOpen || !props.spell) return null;
  return (
    <SpellCastSession
      key={`${props.spell.id}:${props.spell.level}`}
      {...props}
      spell={props.spell}
    />
  );
};

function SpellCastSession({
  spell,
  spellSlots,
  onClose,
  onCast,
}: Omit<SpellCastModalProps, 'spell'> & { spell: Spell }) {
  const baseLevel = spell.level;
  const [selectedCircle, setSelectedCircle] = useState(() =>
    getInitialCircle(baseLevel, spellSlots),
  );

  const circleOptions = Array.from(
    { length: Math.max(0, 10 - baseLevel) },
    (_, index) => baseLevel + index,
  );
  const scalingPreview = getFormulaScalingPreview(
    spell.dmg,
    spell.level,
    selectedCircle,
    spell.desc,
    spell.upcastDice,
  );

  const selectedSlot = spellSlots.find((s) => s.level === selectedCircle);
  const canCast = Boolean(
    selectedCircle >= baseLevel &&
    selectedCircle <= 9 &&
    selectedSlot &&
    selectedSlot.current > 0 &&
    !scalingPreview?.error,
  );

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Сотворение заклинания"
      subtitle={`${spell.name} (${spell.level} круг)`}
      maxWidthClass="max-w-md"
    >
      <div className="p-4 flex flex-col gap-3.5 overflow-y-auto scrollbar-thin">
        {/* Spell Metadata Header */}
        <div className="bg-[#10111a] border border-[#262a3d] rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-slate-100 text-sm">{spell.name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {spell.level} круг
              </span>
              {spell.school && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1d2d] text-slate-400 border border-[#262a3d]">
                  {spell.school}
                </span>
              )}
              {spell.concentration && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  title="Требует концентрации"
                >
                  Концентрация
                </span>
              )}
              {spell.ritual && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  title="Ритуал"
                >
                  Ритуал
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-[#262a3d]/60">
            {spell.time && (
              <div>
                <span className="text-slate-500">Время: </span>
                <span className="text-slate-300">{spell.time}</span>
              </div>
            )}
            {spell.range && (
              <div>
                <span className="text-slate-500">Дистанция: </span>
                <span className="text-slate-300">{spell.range}</span>
              </div>
            )}
            {spell.duration && (
              <div>
                <span className="text-slate-500">Длительность: </span>
                <span className="text-slate-300">{spell.duration}</span>
              </div>
            )}
            {spell.components && (
              <div className="col-span-2 sm:col-span-3">
                <span className="text-slate-500">Компоненты: </span>
                <span className="text-slate-300">{spell.components}</span>
              </div>
            )}
          </div>

          {spell.desc && (
            <div className="mt-1 pt-1.5 border-t border-[#262a3d]/60">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Описание</div>
              <div className="max-h-28 overflow-y-auto scrollbar-thin text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
                {spell.desc}
              </div>
            </div>
          )}
        </div>

        {/* Circle Slot Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase font-bold text-slate-400">
            Выбор ячейки заклинания (круг):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {circleOptions.map((circle) => {
              const slot = spellSlots.find((s) => s.level === circle);
              const current = slot?.current ?? 0;
              const max = slot?.max ?? 0;
              const isEmpty = current <= 0;
              const isSelected = selectedCircle === circle;

              return (
                <button
                  key={circle}
                  type="button"
                  disabled={isEmpty}
                  onClick={() => setSelectedCircle(circle)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isEmpty
                      ? 'opacity-40 bg-[#0d0e15] border-[#262a3d] border-dashed text-slate-500 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500 shadow-sm cursor-pointer'
                        : 'bg-[#10111a] border-[#262a3d] text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer'
                  }`}
                  title={
                    isEmpty
                      ? `${circle} круг: нет доступных ячеек`
                      : `Выбрать ${circle} круг (${current}/${max})`
                  }
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{circle} круг:</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isEmpty
                          ? 'text-slate-600'
                          : isSelected
                            ? 'text-indigo-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {current}/{max}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Formula Scaling Preview */}
        {scalingPreview && (
          <div className="bg-[#10111a] border border-[#262a3d] rounded-lg p-2.5 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
              Масштабирование формулы броска
            </span>
            <div className="text-xs text-slate-200 font-mono bg-[#0c0d14] px-2.5 py-1.5 rounded border border-[#1e2233]">
              {scalingPreview.previewText}
            </div>
            {scalingPreview.error ? (
              <p role="alert" className="text-xs text-rose-300">
                {scalingPreview.error}
              </p>
            ) : selectedCircle > baseLevel && !scalingPreview.hasScaling ? (
              <p role="status" className="text-xs text-amber-300">
                Усиление не задано: будет брошена базовая формула. Укажите дополнительные кубики за
                круг в редакторе заклинания, если оно усиливается.
              </p>
            ) : null}
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a3d] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onCast(spell, selectedCircle)}
            disabled={!canCast}
            className={`px-4 py-1.5 rounded text-xs font-bold transition-all shadow-xs ${
              canCast
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95'
                : 'bg-indigo-950/40 text-slate-500 border border-indigo-900/40 cursor-not-allowed opacity-50'
            }`}
            title={
              canCast
                ? `Сотворить «${spell.name}» с ячейкой ${selectedCircle} круга`
                : scalingPreview?.error || `Нет доступных ячеек ${selectedCircle} круга`
            }
          >
            Сотворить заклинание ({selectedCircle} круг)
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
