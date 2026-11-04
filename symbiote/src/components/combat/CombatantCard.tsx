import React, { useState } from 'react';
import { Combatant, CombatSide } from '../../types';
import { CONDITIONS_DND5E } from '../../constants';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';
import { wsBridge } from '../../api/websocket';
import { CombatSideMenu } from './CombatSideMenu';

interface Props {
  combatant: Combatant;
  isCurrentTurn: boolean;
  onOpenConditions: (id: string) => void;
}

export const CombatantCard: React.FC<Props> = ({ combatant, isCurrentTurn, onOpenConditions }) => {
  const { setInitiative, modifyHp, removeCombatant, toggleCondition, getDexModifier } = useCombatStore();
  const { gmDiceMode } = useAppStore();
  const [sideMenuPos, setSideMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [rotating, setRotating] = useState(false);

  const hp = combatant.hp;
  const maxHp = combatant.maxHp || 10;
  const hpPct = Math.max(0, Math.min(100, (hp / (maxHp || 1)) * 100));

  const category = combatant.category || (combatant.isPlayer ? 'Игроки' : 'Враги');
  let sideBorder = 'border-l-red-500';
  let badgeColor = 'bg-red-950/50 text-red-300 border-red-800/60';

  if (combatant.isPlayer || category === 'Игроки' || category === 'Игрок') {
    sideBorder = 'border-l-blue-500';
    badgeColor = 'bg-blue-950/50 text-blue-300 border-blue-800/60';
  } else if (category === 'Союзники' || category === 'Союзник') {
    sideBorder = 'border-l-emerald-500';
    badgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
  } else if (category === 'Нейтрал' || category === 'Нейтралы' || category === 'Нейтральный') {
    sideBorder = 'border-l-amber-500';
    badgeColor = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
  }

  const dexMod = getDexModifier(combatant);
  const modStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

  const handleRollInit = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    setInitiative(combatant.id, d20 + dexMod);
  };

  const handleOpenSideMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSideMenuPos({ top: rect.bottom + 4, left: rect.left });
  };

  const handleSyncFromObsidian = () => {
    setRotating(true);
    wsBridge.requestRefresh();
    setTimeout(() => setRotating(false), 700);
  };

  const handleOpenNote = () => {
    if (combatant.path) {
      wsBridge.send('OPEN_NOTE', { path: combatant.path });
    }
  };

  const isSecret = gmDiceMode === 'secret';

  return (
    <div
      className={`relative flex items-start gap-2.5 p-2.5 rounded-lg border border-l-4 transition shadow-sm ${sideBorder} ${
        isCurrentTurn
          ? 'bg-[#181a2b] border-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.22)]'
          : 'bg-[#131522] border-[#25293d] hover:border-[#383e5a]'
      }`}
    >
      {/* Initiative Box */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        {isCurrentTurn && (
          <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow-sm tracking-wider">
            ХОД
          </span>
        )}
        <input
          type="number"
          value={combatant.initiative}
          onChange={(e) => setInitiative(combatant.id, parseInt(e.target.value, 10) || 0)}
          className="w-10 h-7 text-center bg-[#0d0e17] border border-[#2b3046] rounded text-xs font-extrabold text-white focus:outline-none focus:border-indigo-500 transition"
          title={`Инициатива: d20 ${modStr} ЛОВ`}
        />
        <button
          type="button"
          onClick={handleRollInit}
          className="px-1.5 py-0.5 bg-[#1d2133] hover:bg-indigo-600 text-slate-300 hover:text-white rounded text-[10px] font-bold border border-[#2d334e] transition cursor-pointer"
          title={`Перебросить инициативу (d20 ${modStr} ЛОВ)`}
        >
          d20
        </button>
      </div>

      {/* Main Info */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-white tracking-wide truncate max-w-[150px]" title={combatant.name}>
            {combatant.name}
          </span>
          <button
            type="button"
            onClick={handleOpenSideMenu}
            className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border transition cursor-pointer flex items-center gap-1 ${badgeColor}`}
            title="Сменить сторону"
          >
            {category} ▾
          </button>
          <span className="text-[10.5px] font-semibold text-slate-400">
            КД: <strong className="text-slate-200">{combatant.ac || 10}</strong>
          </span>
          {combatant.speed && (
            <span className="text-[10.5px] font-semibold text-slate-400">
              {combatant.speed}
            </span>
          )}
        </div>

        {/* HP Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-300 ${
                hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-[10.5px] font-bold text-slate-200 shrink-0">
            {hp} / {maxHp} HP
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="px-1 py-0.2 bg-red-950/40 hover:bg-red-900/80 text-red-300 border border-red-900/50 rounded text-[9.5px] font-bold transition cursor-pointer"
              onClick={() => modifyHp(combatant.id, -5)}
              title="Нанести 5 урона"
            >
              -5
            </button>
            <button
              type="button"
              className="px-1 py-0.2 bg-red-950/40 hover:bg-red-900/80 text-red-300 border border-red-900/50 rounded text-[9.5px] font-bold transition cursor-pointer"
              onClick={() => modifyHp(combatant.id, -1)}
              title="Нанести 1 урон"
            >
              -1
            </button>
            <button
              type="button"
              className="px-1 py-0.2 bg-emerald-950/40 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-900/50 rounded text-[9.5px] font-bold transition cursor-pointer"
              onClick={() => modifyHp(combatant.id, 1)}
              title="Восстановить 1 ХП"
            >
              +1
            </button>
            <button
              type="button"
              className="px-1 py-0.2 bg-emerald-950/40 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-900/50 rounded text-[9.5px] font-bold transition cursor-pointer"
              onClick={() => modifyHp(combatant.id, 5)}
              title="Восстановить 5 ХП"
            >
              +5
            </button>
          </div>
        </div>

        {/* Attacks Row */}
        {combatant.attacks && combatant.attacks.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Атаки:</span>
            {combatant.attacks.map((att, atkIdx) => (
              <div
                key={atkIdx}
                className="flex items-center gap-1 bg-[#10121d] border border-white/8 rounded px-1.5 py-0.5"
              >
                {isCurrentTurn && (
                  <span className="text-[8.5px] font-black bg-indigo-600 text-white rounded px-1">
                    {atkIdx + 1}
                  </span>
                )}
                <span className="text-[10.5px] font-semibold text-slate-200">{att.name}</span>
                {att.hit && (
                  <button
                    type="button"
                    className="px-1 py-0.2 bg-indigo-950/60 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[9.5px] font-bold transition cursor-pointer"
                    onClick={() =>
                      wsBridge.rollDice(att.hit!, `Атака [${combatant.name}]: ${att.name}`, isSecret)
                    }
                    title={`Бросок атаки: ${att.hit}`}
                  >
                    Атк {att.hit}
                  </button>
                )}
                {att.dmg && (
                  <button
                    type="button"
                    className="px-1 py-0.2 bg-rose-950/60 hover:bg-rose-700 text-rose-300 hover:text-white rounded text-[9.5px] font-bold transition cursor-pointer"
                    onClick={() =>
                      wsBridge.rollDice(att.dmg!, `Урон [${combatant.name}]: ${att.name}`, isSecret)
                    }
                    title={`Бросок урона: ${att.dmg}`}
                  >
                    Урон {att.dmg}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Conditions Row */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              Дебаффы / Состояния ({combatant.conditions.length}):
            </span>
            <button
              type="button"
              onClick={() => onOpenConditions(combatant.id)}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              + Добавить
            </button>
          </div>
          {combatant.conditions.length > 0 && (
            <div className="flex flex-col gap-1">
              {combatant.conditions.map((condId) => {
                const meta = CONDITIONS_DND5E.find((c) => c.id === condId) || {
                  id: condId,
                  name: condId,
                  color: '#64748b',
                  desc: '',
                };
                return (
                  <div
                    key={condId}
                    className="flex items-start gap-1.5 p-1 rounded bg-[#0e101b] border border-white/5"
                  >
                    <span
                      className="px-1.5 py-0.2 rounded text-[9.5px] font-bold flex items-center gap-1 shrink-0"
                      style={{
                        backgroundColor: `${meta.color}20`,
                        borderColor: meta.color,
                        color: meta.color,
                        borderWidth: 1,
                      }}
                    >
                      {meta.name}
                      <button
                        type="button"
                        onClick={() => toggleCondition(combatant.id, condId)}
                        className="hover:opacity-75 cursor-pointer ml-0.5"
                        title="Снять состояние"
                      >
                        ✕
                      </button>
                    </span>
                    <span className="text-[10px] text-slate-300 leading-tight pt-0.5">{meta.desc}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex flex-col gap-1 shrink-0 pt-0.5">
        {combatant.path && (
          <button
            type="button"
            className="px-1.5 py-0.5 bg-[#1b1f2e] hover:bg-[#282e44] text-slate-300 rounded text-[10px] font-semibold border border-white/5 transition cursor-pointer"
            onClick={handleOpenNote}
            title="Открыть заметку"
          >
            Заметка
          </button>
        )}
        <button
          type="button"
          className={`px-1.5 py-0.5 bg-[#1b1f2e] hover:bg-sky-950/60 text-sky-400 rounded text-[10px] font-bold border border-sky-900/40 transition cursor-pointer ${
            rotating ? 'rotating' : ''
          }`}
          onClick={handleSyncFromObsidian}
          title="Обновить статы и атаки из Obsidian"
        >
          ⟳
        </button>
        <button
          type="button"
          className="px-1.5 py-0.5 bg-red-950/30 hover:bg-red-900/60 text-red-400 rounded text-[10px] font-bold border border-red-900/40 transition cursor-pointer"
          onClick={() => removeCombatant(combatant.id)}
          title="Удалить из боя"
        >
          ✕
        </button>
      </div>

      {sideMenuPos && (
        <CombatSideMenu
          combatantId={combatant.id}
          position={sideMenuPos}
          onClose={() => setSideMenuPos(null)}
        />
      )}
    </div>
  );
};
