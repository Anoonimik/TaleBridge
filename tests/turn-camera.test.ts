import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnCameraBookmark } from '../packages/domain/turn-camera';
import type { CombatState } from '../packages/domain/types';
import { fixture } from './fixtures';
import { TaleSpireDriver } from '../symbiote/src/shared/api/talespire';

test('miniature linking requires exactly one selection and a GM client', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let selected: { id: string }[] = [];
  let role: 'gm' | 'player' = 'gm';
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { TS: { creatures: { getSelectedCreatures: async () => selected } } },
  });
  const driver = new TaleSpireDriver();
  driver.configure({
    role: () => role,
    secret: () => false,
    log: () => {},
    error: () => {},
    token: () => {},
    bookmarks: () => {},
  });
  try {
    await assert.rejects(driver.getSelectedCreatureId());
    selected = [{ id: 'one' }, { id: 'two' }];
    await assert.rejects(driver.getSelectedCreatureId());
    selected = [{ id: 'one' }];
    assert.equal(await driver.getSelectedCreatureId(), 'one');
    role = 'player';
    await assert.rejects(driver.getSelectedCreatureId());
  } finally {
    driver.dispose();
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

const combatants = ['one', 'two'].map((id) => ({
  id,
  name: 'Same name',
  side: 'enemy' as const,
  initiative: 10,
  hp: 10,
  maxHp: 10,
  ac: 10,
  conditions: [],
  cameraBookmarkId: `bookmark-${id}`,
  talespireId: `mini-${id}`,
}));
const state: CombatState = {
  active: true,
  round: 1,
  turnIndex: 0,
  activeCombatantId: 'one',
  combatants,
};
test('camera tracks stable turn identity and round, not array reorder or ordinary HP edits', () => {
  assert.equal(turnCameraBookmark({ ...state, active: false }, state), 'bookmark-one');
  assert.equal(
    turnCameraBookmark(state, { ...state, combatants: [...combatants].reverse(), turnIndex: 1 }),
    null,
  );
  assert.equal(
    turnCameraBookmark(state, { ...state, activeCombatantId: 'two', turnIndex: 1 }),
    'bookmark-two',
  );
  assert.equal(turnCameraBookmark(state, { ...state, round: 2 }), 'bookmark-one');
  assert.equal(turnCameraBookmark(state, { ...state, active: false }), null);
});

test('accepted turn updates route one bookmark command to the GM driver, never to players', async () => {
  const f = fixture();
  try {
    const gm = await f.login('gm', 'gm-code', true);
    const player = await f.login('player', 'alice-code', true);
    await f.send(gm, 'BOOKMARKS_LIST', [
      { id: 'bookmark-one', name: 'One' },
      { id: 'bookmark-two', name: 'Two' },
    ]);
    const revision = () =>
      (
        f.messages
          .get(gm.id)!
          .filter((m) => m.type === 'COMBAT_STATE_UPDATE')
          .at(-1)!.payload as { revision: string }
      ).revision;
    assert.equal((await f.send(gm, 'SYNC_COMBAT_STATE', state, revision())).type, 'ACK');
    assert.equal(f.messages.get(gm.id)!.filter((m) => m.type === 'GOTO_BOOKMARK').length, 1);
    await f.send(gm, 'SYNC_COMBAT_STATE', state, revision());
    assert.equal(f.messages.get(gm.id)!.filter((m) => m.type === 'GOTO_BOOKMARK').length, 1);
    await f.send(
      gm,
      'SYNC_COMBAT_STATE',
      { ...state, turnIndex: 1, activeCombatantId: 'two' },
      revision(),
    );
    assert.equal(f.messages.get(gm.id)!.filter((m) => m.type === 'GOTO_BOOKMARK').length, 2);
    assert.equal(f.messages.get(player.id)!.filter((m) => m.type === 'GOTO_BOOKMARK').length, 0);
    assert.equal((await f.send(player, 'GOTO_BOOKMARK', { id: 'bookmark-one' })).type, 'ERROR');
    assert.equal((await f.send(player, 'SYNC_COMBAT_STATE', state, revision())).type, 'ERROR');
  } finally {
    f.app.dispose();
  }
});
