import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Attack,
  useRosterStore,
  wsBridge,
  parseModifier,
  formatModifier,
  computeProfBonus,
  taleSpireDriver,
} from '../../shared';
import { AbilityCell, AttackCard, ActionModal } from '../../entities';
import {
  ApplyDamageControl,
  InventoryManager,
  CluesArchive,
  PlayerNotesEditor,
  DeathSavesControl,
  ClassResourcesManager,
  SpellcastingManager,
} from '../../features';

type CockpitSubTab = 'sheet' | 'spells' | 'inventory' | 'clues' | 'notes';

export const PlayerCockpit = () => {
  const {
    playerCharacterName,
    playerData,
    roster,
    setPlayerCharacterName,
    deletePlayerAttack,
    savePlayerAttack,
    updatePlayerHp,
    updateDeathSaves,
    rollDeathSave,
    applyDeathSaveRoll,
    resetDeathSaves,
    toggleInspiration,
    updateSpellSlots,
    useSpellSlot,
    regainSpellSlot,
    resetAllSpellSlots,
    saveSpell,
    deleteSpell,
    updateResources,
    updateHitDice,
    spendHitDice,
    toggleSavingThrowProficiency,
    setSpellcastingAbility,
    performRest,
  } = useRosterStore();

  const [activeSubTab, setActiveSubTab] = useState<CockpitSubTab>('sheet');
  const [modalAttack, setModalAttack] = useState<{ attack: Attack | null; index?: number } | null>(
    null
  );

  const pcList = useMemo(
    () => roster.filter((r) => r.playable || r.category === 'Игроки'),
    [roster]
  );

  useEffect(() => {
    if (playerCharacterName) {
      wsBridge.send('GET_PLAYER_DATA', { characterName: playerCharacterName });
    } else if (pcList.length > 0) {
      setPlayerCharacterName(pcList[0].name);
    }
  }, [playerCharacterName, pcList, setPlayerCharacterName]);

  const curHp = playerData?.hp ?? 20;
  const maxHp = playerData?.hp_max ?? curHp;

  const dexMod = useMemo(() => parseModifier(playerData?.stats?.dex || '10'), [playerData?.stats?.dex]);
  const wisMod = useMemo(() => parseModifier(playerData?.stats?.wis || '10'), [playerData?.stats?.wis]);
  const level = playerData?.level || 1;
  const profBonus = useMemo(() => computeProfBonus(level), [level]);
  const isWisProf = playerData?.savingThrowsProficient?.includes('wis') || false;
  const passivePerception = 10 + wisMod + (isWisProf ? profBonus : 0);

  const handleEditAttack = useCallback((atk: Attack, idx: number) => {
    setModalAttack({ attack: atk, index: idx });
  }, []);

  const handleAddAttack = useCallback(() => {
    setModalAttack({ attack: null });
  }, []);

  const handleSaveAttack = useCallback((atk: Attack, idx?: number) => {
    savePlayerAttack(atk, idx);
    setModalAttack(null);
  }, [savePlayerAttack]);

  const handleRollInitiative = useCallback(() => {
    if (!playerData) return;
    const modStr = formatModifier(dexMod);
    taleSpireDriver.rollDice(`1d20${modStr}`, `Инициатива (${playerData.name})`);
  }, [playerData, dexMod]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0c0d14]">
      {/* Cockpit Top Bar: Character Select & Tabs */}
      <div className="bg-[#141622] border-b border-[#262a3d] px-3 py-2 flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="hero-select" className="text-xs uppercase font-bold text-slate-400 shrink-0">
            Герой:
          </label>
          <select
            id="hero-select"
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
              {playerData.class && (
                <span className="text-slate-200 font-semibold">{playerData.class}</span>
              )}
              {playerData.level && <span>Ур. {playerData.level}</span>}
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-[#10111a] p-0.5 rounded border border-[#262a3d] shrink-0 overflow-x-auto">
          {(
            [
              { id: 'sheet', label: 'Лист' },
              {
                id: 'spells',
                label: `Заклинания${
                  playerData?.spells?.length ? ` (${playerData.spells.length})` : ''
                }`,
              },
              { id: 'inventory', label: 'Инвентарь' },
              { id: 'clues', label: 'Улики' },
              { id: 'notes', label: 'Журнал' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-[#1a1d2d] text-amber-300 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
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
                {/* 1. Death Saves (appears prominently when dying or if manually toggled) */}
                <DeathSavesControl
                  hp={curHp}
                  deathSaves={playerData?.deathSaves || { successes: 0, failures: 0 }}
                  onRollDeathSave={rollDeathSave}
                  onApplyDeathSaveRoll={applyDeathSaveRoll}
                  onUpdateDeathSaves={updateDeathSaves}
                  onResetDeathSaves={resetDeathSaves}
                />

                {/* 2. Vitals Grid (AC, Initiative, Speed, Proficiency Bonus, Passive Perception) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-[#141622] p-2 rounded-lg border border-[#262a3d] text-center">
                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">КД</span>
                    <span className="text-sm font-bold text-indigo-300 font-mono">
                      {playerData?.ac ?? 10}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRollInitiative}
                    className="flex flex-col items-center justify-center p-1 bg-[#10111a] hover:bg-amber-500/20 rounded border border-[#262a3d] hover:border-amber-500/40 cursor-pointer transition-colors group"
                    title="Бросить инициативу в TaleSpire"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-amber-300">
                      Инициатива
                    </span>
                    <span className="text-sm font-bold text-amber-300 font-mono">
                      {formatModifier(dexMod)}
                    </span>
                  </button>

                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Скорость</span>
                    <span className="text-xs font-bold text-slate-200">
                      {playerData?.speed || '9 м'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Мастерство
                    </span>
                    <span className="text-sm font-bold text-slate-200 font-mono">
                      +{profBonus}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d] col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Пасс. внимат.
                    </span>
                    <span className="text-sm font-bold text-emerald-300 font-mono">
                      {passivePerception}
                    </span>
                  </div>
                </div>

                {/* 3. Health & Damage Controls */}
                <ApplyDamageControl
                  currentHp={curHp}
                  maxHp={maxHp}
                  onApplyHpDelta={updatePlayerHp}
                />

                {/* 4. Ability Scores Grid (6 cells with integrated Checks & Saves) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  <AbilityCell
                    label="СИЛ"
                    name="Сила"
                    scoreStr={playerData?.stats?.str || '10'}
                    characterName={playerCharacterName}
                    abilityKey="str"
                    isProficient={playerData?.savingThrowsProficient?.includes('str')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                  <AbilityCell
                    label="ЛОВ"
                    name="Ловкость"
                    scoreStr={playerData?.stats?.dex || '10'}
                    characterName={playerCharacterName}
                    abilityKey="dex"
                    isProficient={playerData?.savingThrowsProficient?.includes('dex')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                  <AbilityCell
                    label="ТЕЛ"
                    name="Телосложение"
                    scoreStr={playerData?.stats?.con || '10'}
                    characterName={playerCharacterName}
                    abilityKey="con"
                    isProficient={playerData?.savingThrowsProficient?.includes('con')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                  <AbilityCell
                    label="ИНТ"
                    name="Интеллект"
                    scoreStr={playerData?.stats?.int || '10'}
                    characterName={playerCharacterName}
                    abilityKey="int"
                    isProficient={playerData?.savingThrowsProficient?.includes('int')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                  <AbilityCell
                    label="МУД"
                    name="Мудрость"
                    scoreStr={playerData?.stats?.wis || '10'}
                    characterName={playerCharacterName}
                    abilityKey="wis"
                    isProficient={playerData?.savingThrowsProficient?.includes('wis')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                  <AbilityCell
                    label="ХАР"
                    name="Харизма"
                    scoreStr={playerData?.stats?.cha || '10'}
                    characterName={playerCharacterName}
                    abilityKey="cha"
                    isProficient={playerData?.savingThrowsProficient?.includes('cha')}
                    onToggleProficiency={toggleSavingThrowProficiency}
                    profBonus={profBonus}
                  />
                </div>

                {/* 6. Class & Expendable Resources (Inspiration, Hit Dice, Short/Long Rest) */}
                <ClassResourcesManager
                  playerData={playerData}
                  onToggleInspiration={toggleInspiration}
                  onUpdateResources={updateResources}
                  onUpdateHitDice={updateHitDice}
                  onSpendHitDice={spendHitDice}
                  onPerformRest={performRest}
                />

                {/* 7. Actions & Attacks Section */}
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
                    {!playerData?.attacks || playerData.attacks.length === 0 ? (
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

            {/* Spells Sub-tab */}
            {activeSubTab === 'spells' && (
              <div className="h-full overflow-y-auto p-3 scrollbar-thin">
                <SpellcastingManager
                  playerData={playerData}
                  onUpdateSpellSlots={updateSpellSlots}
                  onUseSpellSlot={useSpellSlot}
                  onRegainSpellSlot={regainSpellSlot}
                  onResetAllSpellSlots={resetAllSpellSlots}
                  onSaveSpell={saveSpell}
                  onDeleteSpell={deleteSpell}
                  onSetSpellcastingAbility={setSpellcastingAbility}
                />
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
