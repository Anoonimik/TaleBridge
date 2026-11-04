import React, { useState } from 'react';
import { Attack, useRosterStore } from '../../shared';
import { AbilityCell, AttackCard, ActionModal } from '../../entities';
import {
  ApplyDamageControl,
  InventoryManager,
  CluesArchive,
  PlayerNotesEditor,
} from '../../features';

export const PlayerCockpit = () => {
  const {
    playerCharacterName,
    playerData,
    roster,
    setPlayerCharacterName,
    deletePlayerAttack,
    savePlayerAttack,
    updatePlayerHp,
  } = useRosterStore();

  const [activeSubTab, setActiveSubTab] = useState<'sheet' | 'inventory' | 'clues' | 'notes'>('sheet');
  const [modalAttack, setModalAttack] = useState<{ attack: Attack | null; index?: number } | null>(null);

  const pcList = roster.filter((r) => r.playable || r.category === 'Игроки');

  const curHp = playerData?.hp ?? 20;
  const maxHp = playerData?.hp_max ?? curHp;

  const handleEditAttack = (atk: Attack, idx: number) => {
    setModalAttack({ attack: atk, index: idx });
  };

  const handleAddAttack = () => {
    setModalAttack({ attack: null });
  };

  const handleSaveAttack = (atk: Attack, idx?: number) => {
    savePlayerAttack(atk, idx);
    setModalAttack(null);
  };

  const handleLongRest = () => {
    if (playerData) {
      updatePlayerHp(maxHp - curHp);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14]">
      {/* Cockpit Top Bar: Character Select & Tabs */}
      <div className="bg-[#141622] border-b border-[#262a3d] px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs uppercase font-bold text-slate-400 shrink-0">Герой:</span>
          <select
            value={playerCharacterName}
            onChange={(e) => setPlayerCharacterName(e.target.value)}
            className="bg-[#10111a] border border-[#262a3d] text-slate-100 text-sm rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 max-w-[170px] truncate cursor-pointer font-medium"
          >
            <option value="">Выберите героя...</option>
            {pcList.map((pc) => (
              <option key={pc.name} value={pc.name}>
                {pc.name}
              </option>
            ))}
          </select>

          {playerData && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 truncate">
              {playerData.race && <span>{playerData.race}</span>}
              {playerData.class && <span className="text-slate-200 font-semibold">{playerData.class}</span>}
              {playerData.level && <span>Ур. {playerData.level}</span>}
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-[#10111a] p-0.5 rounded border border-[#262a3d] shrink-0">
          {(['sheet', 'inventory', 'clues', 'notes'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                activeSubTab === t
                  ? 'bg-[#1a1d2d] text-amber-300 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveSubTab(t)}
            >
              {t === 'sheet'
                ? 'Лист'
                : t === 'inventory'
                ? 'Инвентарь'
                : t === 'clues'
                ? 'Улики'
                : 'Журнал'}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab views */}
      <div className="flex-1 overflow-hidden relative">
        {!playerCharacterName ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Выберите персонажа в выпадающем списке сверху для управления карточкой
          </div>
        ) : (
          <>
            {activeSubTab === 'sheet' && (
              <div className="h-full overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin">
                {/* Health & Rest Controls */}
                <div className="flex flex-col gap-2">
                  <ApplyDamageControl
                    currentHp={curHp}
                    maxHp={maxHp}
                    onApplyHpDelta={updatePlayerHp}
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-[#141622] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-500/30 rounded text-xs font-medium cursor-pointer transition-colors"
                      onClick={handleLongRest}
                      title="Восстановить здоровье до максимума"
                    >
                      Полный отдых (ХП макс)
                    </button>
                  </div>
                </div>

                {/* Ability Scores Grid (6 cells) */}
                <div className="grid grid-cols-6 gap-1.5">
                  <AbilityCell
                    label="СИЛ"
                    name="Сила"
                    scoreStr={playerData?.stats?.str || '10'}
                    characterName={playerCharacterName}
                  />
                  <AbilityCell
                    label="ЛОВ"
                    name="Ловкость"
                    scoreStr={playerData?.stats?.dex || '10'}
                    characterName={playerCharacterName}
                  />
                  <AbilityCell
                    label="ТЕЛ"
                    name="Телосложение"
                    scoreStr={playerData?.stats?.con || '10'}
                    characterName={playerCharacterName}
                  />
                  <AbilityCell
                    label="ИНТ"
                    name="Интеллект"
                    scoreStr={playerData?.stats?.int || '10'}
                    characterName={playerCharacterName}
                  />
                  <AbilityCell
                    label="МУД"
                    name="Мудрость"
                    scoreStr={playerData?.stats?.wis || '10'}
                    characterName={playerCharacterName}
                  />
                  <AbilityCell
                    label="ХАР"
                    name="Харизма"
                    scoreStr={playerData?.stats?.cha || '10'}
                    characterName={playerCharacterName}
                  />
                </div>

                {/* Actions & Attacks Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#262a3d]">
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Действия и атаки ({playerData?.attacks?.length || 0})
                    </h4>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium cursor-pointer"
                      onClick={handleAddAttack}
                    >
                      + Действие
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {(!playerData?.attacks || playerData.attacks.length === 0) ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        Нет добавленных атак. Нажмите «+ Действие» чтобы добавить оружие или заклинание.
                      </div>
                    ) : (
                      playerData.attacks.map((atk, idx) => (
                        <AttackCard
                          key={idx}
                          attack={atk}
                          index={idx}
                          canManage={true}
                          onEdit={handleEditAttack}
                          onDelete={deletePlayerAttack}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'inventory' && <InventoryManager playerData={playerData} />}
            {activeSubTab === 'clues' && <CluesArchive />}
            {activeSubTab === 'notes' && <PlayerNotesEditor />}
          </>
        )}
      </div>

      {/* Action Add/Edit Modal */}
      {modalAttack && (
        <ActionModal
          isOpen={true}
          initialAttack={modalAttack.attack}
          index={modalAttack.index}
          onClose={() => setModalAttack(null)}
          onSave={handleSaveAttack}
        />
      )}
    </div>
  );
};
