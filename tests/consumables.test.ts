import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getConsumableActionInfo } from '../symbiote/src/features/manage-inventory/lib/consumable-helper';
import { fixture } from './fixtures';

test('non-healing potions never restore HP and custom healing formulas take priority', () => {
  for (const name of ['Potion of invisibility', 'Зелье силы', 'Greater potion of resistance']) {
    const action = getConsumableActionInfo({ id: 'p', name });
    assert.equal(action.isHealing, false);
    assert.equal(action.formula, null);
  }
  for (const [name, formula] of [['Potion of Healing', '2d4+2'], ['Greater Potion of Healing', '4d4+4'], ['Superior Potion of Healing', '8d4+8'], ['Supreme Potion of Healing', '10d4+20']])
    assert.equal(getConsumableActionInfo({ id: 'p', name }).formula, formula);
  assert.equal(getConsumableActionInfo({ id: 'p', name: 'Зелье лечения', description: 'Восстанавливает 3d6+5 ХП' }).formula, '3d6+5');
});

test('all five coin balances survive a server save and fresh read', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');
    const currency = { cp: 13, sp: 24, ep: 3, gp: 42, pp: 5 };
    const saved = await f.send(player, 'UPDATE_CHARACTER_STATE', { characterId: 'alice', state: { currency } }, before.revision);
    assert.equal(saved.type, 'ACK');
    assert.deepEqual((await f.repo.get('alice')).currency, currency);
  } finally { f.app.dispose(); }
});
