import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCombatant } from '../packages/domain/combatant-clean';
import type { AbilityScores } from '../packages/domain/types';
import {
  combatantSchema,
  commandPayloads,
  parseCommand,
  PROTOCOL_VERSION,
} from '../packages/protocol/index';
import { fixture } from './fixtures';

test('cleanCombatant ensures maxHp >= hp when token hp exceeds maxHp', () => {
  const dirty = {
    id: 'c_test_1',
    name: 'Алира Стерн',
    side: 'ally' as const,
    hp: 15,
    maxHp: 10,
    ac: 14,
  };
  const cleaned = cleanCombatant(dirty);
  assert.equal(cleaned.hp, 15);
  assert.equal(cleaned.maxHp, 15, 'maxHp must be at least curHp');

  // Must successfully validate against combatantSchema
  const parsed = combatantSchema.safeParse(cleaned);
  assert.equal(parsed.success, true, 'combatantSchema must accept cleanCombatant output');
});

test('cleanCombatant rounds floating numbers and clamps invalid values', () => {
  const dirty = {
    id: 'c_test_2',
    name: 'Гоблин',
    side: 'enemy' as const,
    hp: 12.8,
    maxHp: 12.2,
    initiative: 14.7,
    ac: 13.1,
    tempHp: 3.4,
  };
  const cleaned = cleanCombatant(dirty);
  assert.equal(cleaned.hp, 13);
  assert.equal(cleaned.maxHp, 13);
  assert.equal(cleaned.initiative, 15);
  assert.equal(cleaned.ac, 13);
  assert.equal(cleaned.tempHp, 3);
});

test('cleanCombatant handles invalid or partial stats gracefully', () => {
  const invalidStats = {
    id: 'c_test_3',
    name: 'Скелет',
    side: 'enemy' as const,
    stats: { str: '10' } as unknown as AbilityScores, // missing other 5 ability keys
  };
  const cleaned = cleanCombatant(invalidStats);
  assert.equal(cleaned.stats, null, 'Partial stats object must become null');

  const validStats = {
    id: 'c_test_4',
    name: 'Маг',
    side: 'player' as const,
    stats: {
      str: '10 (+0)',
      dex: '14 (+2)',
      con: '12 (+1)',
      int: '18 (+4)',
      wis: '13 (+1)',
      cha: '8 (-1)',
    },
  };
  const cleanedValid = cleanCombatant(validStats);
  assert.deepEqual(cleanedValid.stats, validStats.stats);
});

test('CREATURE_SELECTED payload supports nullish values and floats', () => {
  const res1 = commandPayloads.CREATURE_SELECTED.safeParse({
    id: 'creature-123',
    name: 'Alira',
    hp: null,
    hpMax: null,
  });
  assert.equal(res1.success, true, 'CREATURE_SELECTED must allow null for hp and hpMax');

  const res2 = commandPayloads.CREATURE_SELECTED.safeParse({
    id: 'creature-123',
    name: 'Alira',
    hp: 15.2,
    hpMax: 28.7,
  });
  assert.equal(res2.success, true, 'CREATURE_SELECTED must round floats');
  if (res2.success && res2.data) {
    assert.equal(res2.data.hp, 15);
    assert.equal(res2.data.hpMax, 29);
  }
});

test('OPEN_NOTE command payload validates and executes without error', async () => {
  const cmd = parseCommand({
    protocolVersion: PROTOCOL_VERSION,
    requestId: 'req_open_note',
    type: 'OPEN_NOTE',
    payload: {
      path: 'players/Alice.md',
      name: 'Alice',
    },
  });
  assert.equal(cmd.type, 'OPEN_NOTE');

  const f = fixture();
  const gm = await f.login('gm', 'gm-code');
  const r = await f.send(gm, 'OPEN_NOTE', {
    path: 'players/Alice.md',
    name: 'Alice',
  });
  assert.equal(r.type, 'ACK');
  f.app.dispose();
});

test('SYNC_COMBAT_STATE accepts clean combatant synchronized from token HUD', () => {
  const combatant = cleanCombatant({
    name: 'Алира Стерн',
    side: 'ally',
    category: 'Союзники',
    hp: 15,
    maxHp: 28,
    ac: 14,
    talespireId: 'ts-token-uuid-1',
  });

  const cmd = parseCommand({
    protocolVersion: PROTOCOL_VERSION,
    requestId: 'req_sync_combat',
    type: 'SYNC_COMBAT_STATE',
    payload: {
      active: false,
      round: 1,
      turnIndex: 0,
      activeCombatantId: null,
      combatants: [combatant],
    },
  });

  assert.equal(cmd.type, 'SYNC_COMBAT_STATE');
});
