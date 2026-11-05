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
  const owner = useRosterStore((state) => state.playerData?.id);
  window.reactSessions = {
    open: setMode,
    refresh: () => setEpoch((n) => n + 1),
    refreshItem: () => setItem({ ...item, name: 'Server rope' }),
    changeSpell: () => setSpellId('second-spell'),
    exhaust: () => setExhausted(true),
    character: (id, instance) => useRosterStore.setState({ playerData: character(id, instance) }),
    resolve: (total) => rolls.shift()?.resolve(total),
    reject: () => rolls.shift()?.reject(Error('Old request failed')),
    pending: () => rolls.length,
    saved: () => saved,
  };
  return (
    <div data-epoch={epoch}>
      <EditItemModal
        isOpen={mode === 'item'}
        item={{ ...item }}
        onClose={() => setMode('none')}
        onSave={(value) => {
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
      refresh: () => void;
      refreshItem: () => void;
      changeSpell: () => void;
      exhaust: () => void;
      character: (id: string, instance?: string) => void;
      resolve: (total: number) => void;
      reject: () => void;
      pending: () => number;
      saved: () => InventoryItem | undefined;
    };
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
