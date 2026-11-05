import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concentrationDamage } from '../packages/domain/concentration';
import { fixture } from './fixtures';
import type { Character } from '../packages/domain/types';

const hero: Character = {
  id: 'alice',
  name: 'Alice',
  hp: 100,
  activeConcentration: { spellName: 'Bless', instanceId: 'instance' },
};
test('damage DC rounds down, queues each hit, and zero HP ends concentration', () => {
  const first = concentrationDamage(hero, 90, 21);
  assert.equal(first.concentrationChecks[0].dc, 10);
  const next = concentrationDamage({ ...hero, ...first }, 60, 31);
  assert.equal(next.concentrationChecks.length, 2);
  assert.equal(next.concentrationChecks[1].dc, 15);
  assert.notEqual(next.concentrationChecks[0].id, next.concentrationChecks[1].id);
  assert.deepEqual(concentrationDamage({ ...hero, ...next }, 0, 100), {
    activeConcentration: null,
    concentrationChecks: [],
  });
});
test('healing does not prompt and non-concentrating characters have no checks', () => {
  assert.equal(concentrationDamage(hero, 100, 0).concentrationChecks.length, 0);
  assert.equal(
    concentrationDamage({ ...hero, conditions: ['unconscious'] }, 100, 0).activeConcentration,
    null,
  );
  assert.equal(
    concentrationDamage({ ...hero, activeConcentration: null }, 50, 50).concentrationChecks.length,
    0,
  );
});
test('server persists concentration, queues damage and clears it at zero HP', async () => {
  const f = fixture();
  try {
    const client = await f.login('player', 'alice-code');
    let character = await f.repo.get('alice');
    let result = await f.send(
      client,
      'UPDATE_CHARACTER_STATE',
      {
        characterId: 'alice',
        state: { activeConcentration: hero.activeConcentration, concentrationChecks: [] },
      },
      character.revision,
    );
    assert.equal(result.type, 'ACK');
    for (const hp of [9, 8]) {
      character = await f.repo.get('alice');
      result = await f.send(
        client,
        'UPDATE_CHARACTER_HP',
        { characterId: 'alice', hp, damage: 1 },
        character.revision,
      );
      assert.equal(result.type, 'ACK');
    }
    character = await f.repo.get('alice');
    assert.equal(character.concentrationChecks?.length, 2);
    assert.equal(character.activeConcentration?.instanceId, 'instance');
    await f.send(
      client,
      'UPDATE_CHARACTER_HP',
      { characterId: 'alice', hp: 0, damage: 8 },
      character.revision,
    );
    character = await f.repo.get('alice');
    assert.equal(character.activeConcentration, null);
    assert.deepEqual(character.concentrationChecks, []);
  } finally {
    f.app.dispose();
  }
});
