import { cleanUpcastDice } from '../packages/domain/dice';
import { stateSchema } from '../packages/protocol';
import { fixture } from './fixtures';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleDiceFormula } from '../symbiote/src/features/manage-spells/lib/spellScaling';

test('upcasting requires an explicit per-slot scaling rule', () => {
  assert.equal(scaleDiceFormula('8d6', 3, 5), '8d6');
  assert.equal(scaleDiceFormula('8d6', 3, 5, 'Наносит 8d6 урона.'), '8d6');
  assert.equal(
    scaleDiceFormula(
      '8d6',
      3,
      5,
      'Урон увеличивается на 1d6 за каждый уровень ячейки выше третьего.',
    ),
    '10d6',
  );
  assert.equal(
    scaleDiceFormula('2d8+3', 1, 3, 'Healing increases by 1d8 for each slot level above 1st.'),
    '4d8+3',
  );
  assert.equal(
    scaleDiceFormula('2d6+1d4+3', 1, 2, 'Damage increases by 2d8 for each slot level.'),
    '2d6+1d4+3+2d8',
  );
  assert.equal(
    scaleDiceFormula('1d10', 0, 3, 'Damage increases by 1d10 for each slot level.'),
    '1d10',
  );
  assert.equal(scaleDiceFormula('2d6', 3, 2), '2d6');
  assert.equal(scaleDiceFormula('2d6', 1, 10), '2d6');
});

test('explicit per-slot dice scale the screenshot example without requiring a description', () => {
  assert.equal(scaleDiceFormula('1d8', 1, 1, 'ва', '1d8'), '1d8');
  assert.equal(scaleDiceFormula('1d8', 1, 2, 'ва', '1d8'), '2d8');
  assert.equal(scaleDiceFormula('1d8', 1, 3, 'ва', '1d8'), '3d8');
  assert.equal(scaleDiceFormula('1d8+3', 1, 3, undefined, '1d8'), '3d8+3');
  assert.equal(scaleDiceFormula('1d8+1d4-2', 1, 2, undefined, '2d6'), '1d8+1d4-2+2d6');
  assert.equal(scaleDiceFormula('1d8kh1', 1, 2, undefined, '1d8'), '1d8kh1+1d8');
  assert.equal(
    scaleDiceFormula('1d8', 1, 2, 'Damage increases by 2d6 for each slot level.', '1d8'),
    '2d8',
  );
});

test('invalid upcast dice never become an implicit d20 and cannot be persisted', () => {
  for (const value of ['', '5', '0d8', '101d8', '1d1', '1d1001', '1d8 огонь', '1d8kh1', '1d8+3']) {
    assert.throws(() => cleanUpcastDice(value));
    assert.equal(
      stateSchema.safeParse({ spells: [{ id: 'test', name: 'Test', level: 1, upcastDice: value }] })
        .success,
      false,
    );
  }
  assert.equal(cleanUpcastDice(' 2D8 '), '2d8');
});

test('upcast dice survive an authenticated server save and fresh character read', async () => {
  const f = fixture();
  try {
    const player = await f.login('player', 'alice-code');
    const before = await f.repo.get('alice');
    const spells = [
      { id: 'test', name: 'ва', level: 1, dmg: '1d8', desc: 'ва', upcastDice: '1d8' },
    ];
    const result = await f.send(
      player,
      'UPDATE_CHARACTER_STATE',
      { characterId: 'alice', state: { spells } },
      before.revision,
    );
    assert.equal(result.type, 'ACK');
    assert.deepEqual((await f.repo.get('alice')).spells, spells);
  } finally {
    f.app.dispose();
  }
});
