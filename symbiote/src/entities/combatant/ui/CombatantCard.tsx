import React, { useMemo } from 'react';
import { Dices, FileText, X, Crosshair, Link2 } from 'lucide-react';
import {
  Combatant,
  COMBAT_SIDES,
  useCombatStore,
  useRosterStore,
  useLogStore,
  taleSpireDriver,
  wsBridge,
} from '../../../shared';
import { CombatantHpPanel } from './CombatantHpPanel';
import { CombatantConditionsList } from './CombatantConditionsList';
import { CombatantAttackRow } from './CombatantAttackRow';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onOpenConditions: (id: string) => void;
  onOpenSideMenu: (e: React.MouseEvent, c: Combatant) => void;
}

export const CombatantCard = ({
  combatant,
  isActive,
  onOpenConditions,
  onOpenSideMenu,
}: CombatantCardProps) => {
  const {
    updateCombatantHp,
    setInitiative,
    rollSingleInitiative,
    removeCombatant,
    toggleCondition,
    setCombatantTalespireId,
  } = useCombatStore();
  const { setSelectedCharacter, roster } = useRosterStore();

  const conditions = useMemo(
    () => (Array.isArray(combatant.conditions) ? combatant.conditions : []),
    [combatant.conditions]
  );

  const attacks = useMemo(() => {
    if (combatant.attacks && combatant.attacks.length > 0) {
      return combatant.attacks;
    }
    return roster.find((r) => r.name.toLowerCase() === combatant.name.toLowerCase())?.attacks || [];
  }, [combatant.attacks, combatant.name, roster]);

  const sideMeta = useMemo(
    () => COMBAT_SIDES.find((s) => s.id === combatant.side) || COMBAT_SIDES[3],
    [combatant.side]
  );

  const handleOpenNote = () => {
    const found = roster.find(
      (r) => r.name.toLowerCase() === combatant.name.toLowerCase()
    );
    if (found) {
      setSelectedCharacter(found);
      if (found.path) {
        wsBridge.send('GET_NOTE', { path: found.path, name: found.name });
      }
    }
  };

  const handleLinkMiniature = async () => {
    const selectedId = await taleSpireDriver.getSelectedCreatureId();
    if (!selectedId) {
      useLogStore.getState().addLog('sync', 'Миниатюра не выбрана в TaleSpire. Выделите токен на доске');
      return;
    }

    setCombatantTalespireId(combatant.id, selectedId);
    useLogStore.getState().addLog('sync', `Миниатюра [${selectedId}] привязана к «${combatant.name}»`);

    const char = roster.find((r) => r.name.toLowerCase() === combatant.name.toLowerCase());
    if (char?.path || combatant.path) {
      const notePath = char?.path || combatant.path;
      wsBridge.send('OPEN_NOTE', { path: notePath, name: combatant.name });
    }
    wsBridge.send('LINK_CREATURE_TO_NOTE', {
      creature: {
        id: selectedId,
        name: combatant.name,
        hpMax: combatant.maxHp,
      },
    });
  };

  const handleFocusMiniature = async () => {
    if (combatant.talespireId) {
      await taleSpireDriver.focusCreature(combatant.talespireId);
    }
  };

  const handleUnlinkMiniature = () => {
    setCombatantTalespireId(combatant.id, null);
    useLogStore.getState().addLog('sync', `Миниатюра отвязана от «${combatant.name}»`);
  };

  return (
    <div
      className={`rounded-lg border p-2.5 flex flex-col gap-2 transition-all relative ${
        isActive
          ? 'bg-[#181a27] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50'
          : 'bg-[#141622] border-[#262a3d] hover:border-[#383d57]'
      }`}
    >
      {/* Top row: Side badge, Name, Initiative, Note & Delete */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <button
            type="button"
            className={`text-xs px-2 py-0.5 rounded font-bold border cursor-pointer uppercase transition-colors shrink-0 ${sideMeta.bg} ${sideMeta.text} ${sideMeta.border}`}
            onClick={(e) => onOpenSideMenu(e, combatant)}
            title="Сменить сторону (Игрок / Союзник / Нейтрал / Враг)"
          >
            {sideMeta.label} ▾
          </button>

          <span
            className="font-semibold text-slate-100 text-sm truncate"
            title={combatant.name}
          >
            {combatant.name}
          </span>

          {combatant.talespireId ? (
            <div className="inline-flex items-center gap-1 shrink-0 bg-cyan-950/60 border border-cyan-800/50 rounded px-1.5 py-0.5 text-[10px]">
              <span className="text-cyan-300 font-medium">3D Миниатюра</span>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-cyan-800/50 text-cyan-400 hover:text-cyan-200 cursor-pointer transition-colors"
                onClick={handleFocusMiniature}
                title={`Сфокусировать камеру в TaleSpire (${combatant.talespireId})`}
              >
                <Crosshair className="w-3 h-3 shrink-0" />
              </button>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                onClick={handleUnlinkMiniature}
                title="Отвязать миниатюру"
              >
                <X className="w-2.5 h-2.5 shrink-0" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#10111a] hover:bg-[#1a1d2d] text-slate-400 hover:text-cyan-300 border border-[#262a3d] hover:border-cyan-700/50 cursor-pointer transition-colors shrink-0 font-medium"
              onClick={handleLinkMiniature}
              title="Привязать выбранную фигурку на доске TaleSpire"
            >
              <Link2 className="w-2.5 h-2.5 shrink-0" />
              <span>Привязать миниатюру</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#10111a] px-2 py-0.5 rounded border border-[#262a3d] text-xs">
            <span className="text-xs text-slate-400 font-mono">Иниц</span>
            <input
              type="number"
              className="w-9 bg-transparent text-right font-mono font-bold text-amber-400 focus:outline-none text-sm"
              value={combatant.initiative ?? 0}
              onChange={(e) => setInitiative(combatant.id, parseInt(e.target.value, 10) || 0)}
            />
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 text-xs cursor-pointer transition-colors"
              onClick={() => rollSingleInitiative(combatant.id)}
              title={`Бросить инициативу в TaleSpire (1d20${(combatant.dexMod ?? 0) >= 0 ? '+' : ''}${combatant.dexMod ?? 0})`}
            >
              <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </button>
          </div>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-slate-700 text-slate-300 hover:text-white text-sm cursor-pointer transition-colors"
            onClick={handleOpenNote}
            title="Открыть заметку существа"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          </button>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1d2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-sm cursor-pointer transition-colors"
            onClick={() => removeCombatant(combatant.id)}
            title="Удалить из боя"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* HP Bar and Quick Deltas */}
      <CombatantHpPanel
        combatantId={combatant.id}
        hp={combatant.hp}
        maxHp={combatant.maxHp || 1}
        ac={combatant.ac}
        onUpdateHp={updateCombatantHp}
      />

      {/* Conditions list, badges and picker trigger */}
      <CombatantConditionsList
        combatantId={combatant.id}
        conditions={conditions}
        onOpenConditions={onOpenConditions}
        onToggleCondition={toggleCondition}
      />

      {/* Actions & Attacks list */}
      <CombatantAttackRow
        combatantName={combatant.name}
        attacks={attacks}
        isActive={isActive}
      />
    </div>
  );
};
