import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  Shield,
  Footprints,
  Dices,
  Sparkles,
  Eye,
  Pencil,
  Activity,
  Target,
  Link2,
} from 'lucide-react';
import {
  Attack,
  useRosterStore,
  useCombatStore,
  wsBridge,
  parseModifier,
  formatModifier,
  computeProfBonus,
  taleSpireDriver,
} from '../../shared';
import { AbilityCell } from '../../entities/character/ui/AbilityCell';
import { AttackCard } from '../../entities/character/ui/AttackCard';
import { ActionModal } from '../../entities/character/ui/ActionModal';
import { PlayerConditionsBanner } from '../../entities/character/ui/PlayerConditionsBanner';
import { ConcentrationBanner } from '../../features/manage-concentration/ui/ConcentrationBanner';
import { ApplyDamageControl } from '../../features/apply-damage/ApplyDamageControl';
import { InventoryManager } from '../../features/manage-inventory/InventoryManager';
import { CluesArchive } from '../../features/archive-clues/CluesArchive';
import { PlayerNotesEditor } from '../../features/save-notes/PlayerNotesEditor';
import { DeathSavesControl } from '../../features/death-saves/DeathSavesControl';
import { ClassResourcesManager } from '../../features/manage-resources/ClassResourcesManager';
import { SpellcastingManager } from '../../features/manage-spells/SpellcastingManager';
import { SkillsListAccordion } from '../../features/manage-saves-skills/SkillsListAccordion';
import { EditCharacterBasicsModal } from '../../features/manage-character-basics/ui/EditCharacterBasicsModal';

type CockpitSubTab = 'sheet' | 'spells' | 'inventory' | 'clues' | 'notes';

export const PlayerCockpit = () => {
  const {
    playerCharacterName,
    playerCharacterId,
    playerData,
    roster,
    selectedToken,
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
    toggleSkillProficiency,
    setSkillProficiency,
    setSpellcastingAbility,
    updateCharacterBasics,
    performRest,
  } = useRosterStore(
    useShallow((s) => ({
      playerCharacterName: s.playerCharacterName,
      playerCharacterId: s.playerCharacterId,
      playerData: s.playerData,
      roster: s.roster,
      selectedToken: s.selectedToken,
      setPlayerCharacterName: s.setPlayerCharacterName,
      deletePlayerAttack: s.deletePlayerAttack,
      savePlayerAttack: s.savePlayerAttack,
      updatePlayerHp: s.updatePlayerHp,
      updateDeathSaves: s.updateDeathSaves,
      rollDeathSave: s.rollDeathSave,
      applyDeathSaveRoll: s.applyDeathSaveRoll,
      resetDeathSaves: s.resetDeathSaves,
      toggleInspiration: s.toggleInspiration,
      updateSpellSlots: s.updateSpellSlots,
      useSpellSlot: s.useSpellSlot,
      regainSpellSlot: s.regainSpellSlot,
      resetAllSpellSlots: s.resetAllSpellSlots,
      saveSpell: s.saveSpell,
      deleteSpell: s.deleteSpell,
      updateResources: s.updateResources,
      updateHitDice: s.updateHitDice,
      spendHitDice: s.spendHitDice,
      toggleSavingThrowProficiency: s.toggleSavingThrowProficiency,
      toggleSkillProficiency: s.toggleSkillProficiency,
      setSkillProficiency: s.setSkillProficiency,
      setSpellcastingAbility: s.setSpellcastingAbility,
      updateCharacterBasics: s.updateCharacterBasics,
      performRest: s.performRest,
    })),
  );

  const { combatants, active: inCombat } = useCombatStore(
    useShallow((s) => ({ combatants: s.combatants, active: s.active })),
  );

  const [activeSubTab, setActiveSubTab] = useState<CockpitSubTab>('sheet');
  const [modalAttack, setModalAttack] = useState<{ attack: Attack | null; index?: number } | null>(
    null,
  );
  const [isEditBasicsOpen, setIsEditBasicsOpen] = useState(false);

  const pcList = useMemo(
    () => roster.filter((r) => r.playable || r.category === 'Игроки'),
    [roster],
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

  const dexMod = useMemo(
    () => parseModifier(playerData?.stats?.dex || '10'),
    [playerData?.stats?.dex],
  );
  const wisMod = useMemo(
    () => parseModifier(playerData?.stats?.wis || '10'),
    [playerData?.stats?.wis],
  );
  const level = playerData?.level || 1;
  const profBonus = useMemo(() => computeProfBonus(level), [level]);
  const isWisProf = playerData?.savingThrowsProficient?.includes('wis') || false;
  const passivePerception = 10 + wisMod + (isWisProf ? profBonus : 0);

  const activeConditions = useMemo(() => {
    const list: string[] = [];
    if (playerData?.conditions) {
      list.push(...playerData.conditions);
    }
    const combatMatch = combatants.find(
      (c) =>
        (c.name &&
          playerCharacterName &&
          c.name.toLowerCase() === playerCharacterName.toLowerCase()) ||
        (c.talespireId && playerData?.talespire_id && c.talespireId === playerData.talespire_id),
    );
    if (combatMatch?.conditions) {
      combatMatch.conditions.forEach((c) => {
        if (!list.includes(c)) list.push(c);
      });
    }
    return list;
  }, [playerData?.conditions, playerData?.talespire_id, combatants, playerCharacterName]);

  const handleEditAttack = useCallback((atk: Attack, idx: number) => {
    setModalAttack({ attack: atk, index: idx });
  }, []);

  const handleAddAttack = useCallback(() => {
    setModalAttack({ attack: null });
  }, []);

  const handleSaveAttack = useCallback(
    (atk: Attack, idx?: number) => {
      savePlayerAttack(atk, idx);
      setModalAttack(null);
    },
    [savePlayerAttack],
  );

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
          <label
            htmlFor="hero-select"
            className="text-xs uppercase font-bold text-slate-400 shrink-0"
          >
            Герой:
          </label>
          <select
            id="hero-select"
            value={playerCharacterId || playerCharacterName}
            onChange={(e) => setPlayerCharacterName(e.target.value)}
            className="bg-[#10111a] border border-[#262a3d] text-slate-100 text-sm rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 max-w-[170px] truncate cursor-pointer font-medium"
          >
            <option value="">Выберите героя...</option>
            {pcList.map((pc) => (
              <option key={pc.id || pc.name} value={pc.id || pc.name}>
                {pc.name}
              </option>
            ))}
          </select>

          {playerData && (
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 truncate">
                {playerData.race && <span>{playerData.race}</span>}
                {playerData.class && (
                  <span className="text-slate-200 font-semibold">{playerData.class}</span>
                )}
                {playerData.level && <span>Ур. {playerData.level}</span>}
              </div>
              <button
                type="button"
                onClick={() => setIsEditBasicsOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-[#1a1d2d] hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-[#262a3d] hover:border-indigo-500/50 cursor-pointer font-medium transition-colors"
                title="Редактировать базовые параметры, здоровье, КД и характеристики"
              >
                <Sliders className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="hidden sm:inline">Параметры</span>
              </button>
            </div>
          )}

          {/* Quick link TaleSpire token if selected */}
          {selectedToken &&
            playerData &&
            (selectedToken.id === playerData.talespire_id ||
            (selectedToken.name &&
              playerData.name &&
              selectedToken.name.toLowerCase() === playerData.name.toLowerCase()) ? (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-medium"
                title={`Токен TaleSpire "${selectedToken.name}" привязан к персонажу`}
              >
                <Target className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>TS ✓</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (playerData.path) {
                    wsBridge.send('OPEN_IN_OBSIDIAN', {
                      path: playerData.path,
                      name: playerData.name,
                    });
                    wsBridge.send('OPEN_NOTE', { path: playerData.path, name: playerData.name });
                  }
                  wsBridge.send('LINK_CREATURE_TO_NOTE', { creature: selectedToken });
                }}
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 cursor-pointer font-medium transition-colors"
                title={`Привязать выбранный токен "${selectedToken.name}" к ${playerData.name} в Obsidian`}
              >
                <Link2 className="w-3 h-3 text-indigo-300 shrink-0" />
                <span>Привязать токен «{selectedToken.name}»</span>
              </button>
            ))}
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
                {/* 0. Active Conditions Banner (Blinded, Poisoned, etc. from Combat Tracker) */}
                <PlayerConditionsBanner conditions={activeConditions} isCombatActive={inCombat} />

                {/* 1. Death Saves (appears prominently when dying or if manually toggled) */}
                <ConcentrationBanner />
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
                  <div
                    onClick={() => setIsEditBasicsOpen(true)}
                    className="flex flex-col items-center justify-center p-1 bg-[#10111a] hover:bg-indigo-500/20 rounded border border-[#262a3d] hover:border-indigo-500/40 cursor-pointer transition-colors group"
                    title="Нажмите, чтобы изменить КД и базовые параметры"
                  >
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-300">
                      <Shield className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold">КД</span>
                    </div>
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
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-300">
                      <Dices className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold">Инициатива</span>
                    </div>
                    <span className="text-sm font-bold text-amber-300 font-mono">
                      {formatModifier(dexMod)}
                    </span>
                  </button>

                  <div
                    onClick={() => setIsEditBasicsOpen(true)}
                    className="flex flex-col items-center justify-center p-1 bg-[#10111a] hover:bg-indigo-500/20 rounded border border-[#262a3d] hover:border-indigo-500/40 cursor-pointer transition-colors group"
                    title="Нажмите, чтобы изменить скорость и базовые параметры"
                  >
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-300">
                      <Footprints className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold">Скорость</span>
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {playerData?.speed || '9 м'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold">Мастерство</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200 font-mono">+{profBonus}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 bg-[#10111a] rounded border border-[#262a3d] col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold">Пасс. внимат.</span>
                    </div>
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
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-0.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-300">
                      <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Характеристики и спасброски</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditBasicsOpen(true)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1 font-medium"
                      title="Редактировать значения 6 характеристик (1 - 30)"
                    >
                      <Pencil className="w-3 h-3 shrink-0" />
                      <span>Изменить</span>
                    </button>
                  </div>
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
                </div>

                {/* 5. Classic 18 Skills Accordion (Collapsible under Ability Scores) */}
                <SkillsListAccordion
                  playerData={playerData}
                  profBonus={profBonus}
                  characterName={playerCharacterName}
                  onToggleSkill={toggleSkillProficiency}
                  onSetSkillProficiency={setSkillProficiency}
                />

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
                        Нет добавленных атак. Нажмите «+ Действие» чтобы добавить оружие или
                        заклинание.
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

      {/* Edit Character Basics Modal */}
      <EditCharacterBasicsModal
        isOpen={isEditBasicsOpen}
        onClose={() => setIsEditBasicsOpen(false)}
        playerData={playerData}
        onSave={updateCharacterBasics}
      />
    </div>
  );
};
