import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleDiceFormula } from '../symbiote/src/features/manage-spells/lib/spellScaling';

test('upcasting requires an explicit per-slot scaling rule', () => {
  assert.equal(scaleDiceFormula('8d6', 3, 5), '8d6');
  assert.equal(scaleDiceFormula('8d6', 3, 5, 'Наносит 8d6 урона.'), '8d6');
  assert.equal(scaleDiceFormula('8d6', 3, 5, 'Урон увеличивается на 1d6 за каждый уровень ячейки выше третьего.'), '10d6');
  assert.equal(scaleDiceFormula('2d8+3', 1, 3, 'Healing increases by 1d8 for each slot level above 1st.'), '4d8+3');
  assert.equal(scaleDiceFormula('2d6+1d4+3', 1, 2, 'Damage increases by 2d8 for each slot level.'), '2d6+1d4+3+2d8');
  assert.equal(scaleDiceFormula('1d10', 0, 3, 'Damage increases by 1d10 for each slot level.'), '1d10');
  assert.equal(scaleDiceFormula('2d6', 3, 2), '2d6');
  assert.equal(scaleDiceFormula('2d6', 1, 10), '2d6');
});
