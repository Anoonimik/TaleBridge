import { SpellcastingManager } from '../src/features/manage-spells/SpellcastingManager';
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EditItemModal } from '../src/features/manage-inventory/ui/EditItemModal';
import { SpellCastModal } from '../src/features/manage-spells/ui/SpellCastModal';
import { AttackCard } from '../src/entities/character/ui/AttackCard';
import { ConcentrationBanner } from '../src/features/manage-concentration/ui/ConcentrationBanner';
import { useRosterStore } from '../src/entities/character/model/store';
import { taleSpireDriver } from '../src/shared/api/talespire';
import type { InventoryItem } from '../../packages/domain/types';

let saved: InventoryItem | undefined;
const spellRolls: string[] = [];
let slotsUsed = 0;
taleSpireDriver.rollDice = async (formula) => {
  spellRolls.push(formula);
};
let delaySave = false;
const saves: { resolve: () => void; reject: (error: Error) => void }[] = [];
const rolls: { resolve: (total: number) => void; reject: (error: Error) => void }[] = [];
taleSpireDriver.rollForResult = () =>
  new Promise((resolve, reject) => rolls.push({ resolve, reject }));
const character = (id = 'alice', instance = 'first') => ({
  id,
  name: id,
  hp: 10,
  activeConcentration: { instanceId: instance, spellName: 'Bless' },
  concentrationChecks: [{ id: 'save-' + instance, dc: 10, damage: 5 }],
});
useRosterStore.setState({ playerData: character() });
function Harness() {
  const [mode, setMode] = useState('none');
  const [item, setItem] = useState<InventoryItem>({ id: 'rope', name: 'Rope', quantity: 1 });
  const [epoch, setEpoch] = useState(0);
  const [spellId, setSpellId] = useState('spell');
  const [exhausted, setExhausted] = useState(false);
  const playerData = useRosterStore((state) => state.playerData);
  const owner = playerData?.id;
  window.reactSessions = {
    open: setMode,
    startSpellCast: () => {
      spellRolls.length = 0;
      slotsUsed = 0;
      useRosterStore.setState({
        playerData: {
          id: 'alice',
          name: 'Alice',
          spells: [{ id: 'test', name: 'ва', level: 1, dmg: '1d8', desc: 'ва' }],
          spellSlots: [
            { level: 1, current: 4, max: 4 },
            { level: 2, current: 3, max: 3 },
            { level: 3, current: 2, max: 2 },
          ],
        },
      });
      setMode('casting');
    },
    spellRolls: () => spellRolls,
    slotsUsed: () => slotsUsed,
    refresh: () => setEpoch((n) => n + 1),
    refreshItem: () => setItem({ ...item, name: 'Server rope' }),
    changeSpell: () => setSpellId('second-spell'),
    exhaust: () => setExhausted(true),
    character: (id, instance) => useRosterStore.setState({ playerData: character(id, instance) }),
    resolve: (total) => rolls.shift()?.resolve(total),
    reject: () => rolls.shift()?.reject(Error('Old request failed')),
    pending: () => rolls.length,
    saved: () => saved,
    deferSave: (value) => {
      delaySave = value;
    },
    resolveSave: () => saves.shift()?.resolve(),
    rejectSave: () => saves.shift()?.reject(Error('Inventory save failed')),
  };
  return (
    <div data-epoch={epoch}>
      <EditItemModal
        isOpen={mode === 'item'}
        item={{ ...item }}
        onClose={() => setMode('none')}
        onSave={async (value) => {
          if (delaySave)
            await new Promise<void>((resolve, reject) => saves.push({ resolve, reject }));
          saved = value;
        }}
      />
      <SpellCastModal
        isOpen={mode === 'spell'}
        spell={{ id: spellId, name: 'Spell', level: 1, dmg: '1d6' }}
        spellSlots={[
          { level: 1, current: 2, max: 2 },
          { level: 3, current: exhausted ? 0 : 2, max: 2 },
        ]}
        onClose={() => setMode('none')}
        onCast={() => setMode('none')}
      />
      {mode === 'casting' && (
        <SpellcastingManager
          playerData={playerData}
          onUseSpellSlot={(level) => {
            slotsUsed++;
            const current = useRosterStore.getState().playerData!;
            useRosterStore.setState({
              playerData: {
                ...current,
                spellSlots: current.spellSlots!.map((slot) =>
                  slot.level === level ? { ...slot, current: slot.current - 1 } : slot,
                ),
              },
            });
          }}
          onSaveSpell={(spell) => {
            const current = useRosterStore.getState().playerData!;
            useRosterStore.setState({ playerData: { ...current, spells: [spell] } });
          }}
          onUpdateSpellSlots={() => {}}
          onRegainSpellSlot={() => {}}
          onResetAllSpellSlots={() => {}}
          onDeleteSpell={() => {}}
          onSetSpellcastingAbility={() => {}}
        />
      )}
      {mode === 'attack' && (
        <AttackCard
          attack={{ name: 'Sword', hit: '+5', dmg: '1d8+3' }}
          index={0}
          characterId={owner}
        />
      )}
      {mode === 'concentration' && <ConcentrationBanner />}
    </div>
  );
}
declare global {
  interface Window {
    reactSessions: {
      open: (mode: string) => void;
      startSpellCast: () => void;
      spellRolls: () => string[];
      slotsUsed: () => number;
      refresh: () => void;
      refreshItem: () => void;
      changeSpell: () => void;
      exhaust: () => void;
      character: (id: string, instance?: string) => void;
      resolve: (total: number) => void;
      reject: () => void;
      pending: () => number;
      saved: () => InventoryItem | undefined;
      deferSave: (value: boolean) => void;
      resolveSave: () => void;
      rejectSave: () => void;
    };
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
