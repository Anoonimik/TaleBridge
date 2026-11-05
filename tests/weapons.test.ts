import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doubleDamageDice, resolveAttackRoll, createAttackFromWeapon, suggestWeaponDamageDice } from '../symbiote/src/shared/lib/dnd-rules';

test('critical damage doubles every dice term, preserving fixed modifiers', () => {
  assert.equal(doubleDamageDice('1d8+3'), '2d8+3');
  assert.equal(doubleDamageDice('2d6 + 1d4 - 2'), '4d6 + 2d4 - 2');
  assert.equal(doubleDamageDice('d10+5'), '2d10+5');
  assert.equal(doubleDamageDice('5'), '5');
});
test('only natural 20 is critical, independently of signed hit bonus', () => {
  assert.deepEqual(resolveAttackRoll(20, 5), { natural: 15, critical: false });
  assert.deepEqual(resolveAttackRoll(25, 5), { natural: 20, critical: true });
  assert.deepEqual(resolveAttackRoll(18, -2), { natural: 20, critical: true });
  assert.deepEqual(resolveAttackRoll(6, 5), { natural: 1, critical: false });
  assert.throws(() => resolveAttackRoll(30, 5));
});
test('specific short weapons override generic sword and bow suggestions', () => {
  for (const weapon of ['Короткий меч', 'Короткий лук', 'Ручной арбалет'])
    assert.equal(suggestWeaponDamageDice(weapon), '1d6');
  assert.equal(suggestWeaponDamageDice('Двуручный меч'), '2d6');
  assert.equal(suggestWeaponDamageDice('Кинжал'), '1d4');
  const hero = { name: 'Hero', level: 5, stats: { str: '18 (+4)', dex: '12 (+1)', con: '10', int: '10', wis: '10', cha: '10' } };
  assert.equal(createAttackFromWeapon({ id: 'dart', name: 'Дротик' }, hero).hit, '+7');
  assert.equal(createAttackFromWeapon({ id: 'bow', name: 'Длинный лук' }, hero).hit, '+4');
});
