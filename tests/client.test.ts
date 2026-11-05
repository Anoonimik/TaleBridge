import { scaleDiceFormula } from '../symbiote/src/features/manage-spells/lib/spellScaling';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketBridge } from '../symbiote/src/shared/api/websocket';
import { configureEndpoint } from '../symbiote/src/shared/api/endpoint';
import { resolveMediaUrl } from '../symbiote/src/shared/lib/media';
import { useRosterStore } from '../symbiote/src/shared/lib/useRosterStore';
import { useCombatStore } from '../symbiote/src/shared/lib/useCombatStore';
import { useStoryStore } from '../symbiote/src/shared/lib/useStoryStore';
import {
  configureCharacterStorage,
  mergeCharWithMeta,
  persistPlayerData,
  storageKey,
} from '../symbiote/src/shared/lib/character-storage';
import { TaleSpireDriver } from '../symbiote/src/shared/api/talespire';
import { wsBridge } from '../symbiote/src/shared/api/websocket';

class MemoryStorage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  getItem(k: string) {
    return this.data.get(k) || null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  key(i: number) {
    return [...this.data.keys()][i] || null;
  }
}
class FakeSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: Record<string, unknown>[] = [];
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(value: string) {
    this.sent.push(JSON.parse(value));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(type: string, payload: unknown, requestId?: string) {
    this.onmessage?.({ data: JSON.stringify({ protocolVersion: 1, type, payload, requestId }) });
  }
}
const local = new MemoryStorage(),
  session = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true });
Object.defineProperty(globalThis, 'WebSocket', { value: FakeSocket, configurable: true });
const tick = () => new Promise((r) => setTimeout(r, 0));
async function authenticatedBridge() {
  const bridge = new WebSocketBridge();
  bridge.start();
  const socket = FakeSocket.instances.at(-1)!;
  socket.open();
  const login = bridge.authenticate('player', 'code');
  const message = socket.sent.at(-1)!;
  socket.receive('HANDSHAKE_ACK', {
    vault: 'Test',
    version: '0.7.0',
    expires: Date.now() + 3600000,
    role: 'player',
    token: 'token',
    campaignId: 'campaign',
  });
  socket.receive('CHARACTERS_LIST', [{ id: 'a', name: 'Alice', revision: 'one' }]);
  socket.receive('PLAYER_DATA', { id: 'a', name: 'Alice', revision: 'one' });
  socket.receive('ACK', { ok: true }, message.requestId as string);
  await login;
  await tick();
  return { bridge, socket };
}
test('adapter has no constructor network side effects and stale socket close cannot reconnect', async () => {
  const before = FakeSocket.instances.length;
  const bridge = new WebSocketBridge();
  assert.equal(FakeSocket.instances.length, before);
  bridge.start();
  const old = FakeSocket.instances.at(-1)!;
  const stale = old.onclose;
  bridge.setServer('new-host', 31000);
  const current = FakeSocket.instances.at(-1)!;
  stale?.();
  assert.ok(current.url.includes('new-host:31000/ws'));
  bridge.dispose();
});
test('write queue waits for ACK and chains latest server revision', async () => {
  const { bridge, socket } = await authenticatedBridge();
  let confirmed = false;
  const first = bridge
    .request('UPDATE_CHARACTER_HP', { characterName: 'Alice', hp: 5 })
    .then(() => {
      confirmed = true;
    });
  const second = bridge.request('UPDATE_CHARACTER_STATE', {
    characterName: 'Alice',
    state: { skills: { athletics: 'expert' } },
  });
  await tick();
  const firstMessage = socket.sent.at(-1)!;
  assert.equal(firstMessage.expectedRevision, 'one');
  assert.equal(confirmed, false);
  socket.receive(
    'ACK',
    { ok: true, data: { characterId: 'a', revision: 'two' } },
    firstMessage.requestId as string,
  );
  await first;
  await tick();
  const next = socket.sent.at(-1)!;
  assert.equal(next.expectedRevision, 'two');
  socket.receive(
    'ACK',
    { ok: true, data: { characterId: 'a', revision: 'three' } },
    next.requestId as string,
  );
  await second;
  bridge.dispose();
});
test('explicit stale draft revision is never silently rebased', async () => {
  const { bridge, socket } = await authenticatedBridge();
  const request = bridge.request(
    'UPDATE_PLAYER_NOTES',
    { characterId: 'a', notes: 'draft' },
    { expectedRevision: 'old' },
  );
  await tick();
  const message = socket.sent.at(-1)!;
  assert.equal(message.expectedRevision, 'old');
  socket.receive('ERROR', { code: 'CONFLICT', message: 'Conflict' }, message.requestId as string);
  await assert.rejects(request, /Conflict/);
  bridge.dispose();
});
test('player selection is stable by ID and another character cannot replace it', () => {
  const store = useRosterStore.getState();
  store.setRoster([
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
  ]);
  store.setPlayerCharacterName('Alice');
  store.setPlayerData({ id: 'alice', name: 'Alice', hp: 10 });
  store.setPlayerData({ id: 'bob', name: 'Bob', hp: 20 });
  assert.equal(useRosterStore.getState().playerData?.id, 'alice');
});
test('characters with the same display name are selected by stable ID', () => {
  const store = useRosterStore.getState();
  store.setRoster([
    { id: 'first', name: 'Same' },
    { id: 'second', name: 'Same' },
  ]);
  store.setPlayerCharacterName('second');
  store.setPlayerData({ id: 'second', name: 'Same', hp: 9 });
  assert.equal(useRosterStore.getState().playerCharacterId, 'second');
  assert.equal(useRosterStore.getState().playerData?.hp, 9);
});
test('combat deletion and reorder preserve active participant', () => {
  const c = (id: string, initiative: number) => ({
    id,
    name: id,
    side: 'enemy' as const,
    initiative,
    hp: 10,
    maxHp: 10,
    ac: 10,
    conditions: [],
  });
  useCombatStore.setState({
    active: true,
    round: 1,
    turnIndex: 1,
    combatants: [c('A', 15), c('B', 10), c('C', 5)],
  });
  useCombatStore.getState().removeCombatant('A');
  assert.equal(useCombatStore.getState().combatants[useCombatStore.getState().turnIndex].id, 'B');
  useCombatStore.getState().setInitiative('C', 30);
  assert.equal(useCombatStore.getState().combatants[useCombatStore.getState().turnIndex].id, 'B');
});
test('active scene receives fresh content and empty lists clear selection', () => {
  const store = useStoryStore.getState();
  store.setScenes([{ id: 's', title: 'old' }]);
  store.setScenes([{ id: 's', title: 'new' }]);
  assert.equal(useStoryStore.getState().activeScene?.title, 'new');
  store.setScenes([]);
  assert.equal(useStoryStore.getState().activeScene, null);
});
test('media uses configured remote endpoint and never constructs private file routes', () => {
  configureEndpoint('https://gm.example', 444);
  assert.equal(
    resolveMediaUrl('/media/image?ticket=abc'),
    'https://gm.example:444/media/image?ticket=abc',
  );
  assert.equal(resolveMediaUrl('private/secret.md'), '');
  assert.equal(resolveMediaUrl('javascript:alert(1)'), '');
});
test('campaign-scoped storage preserves legacy backup and skill/temp/currency cache', () => {
  local.setItem('tb_player_data', 'legacy');
  configureCharacterStorage('one');
  const merged = mergeCharWithMeta(
    { id: 'a', name: 'Alice' },
    {
      skills: { athletics: 'expert' },
      temp_hp: 4,
      currency: { cp: 1, sp: 2, ep: 0, gp: 3, pp: 0 },
    },
  );
  persistPlayerData(merged);
  assert.ok(local.getItem('tb_legacy_backup_v1')?.includes('legacy'));
  assert.ok(local.getItem(storageKey('tb_player_data'))?.includes('athletics'));
  configureCharacterStorage('two');
  assert.equal(local.getItem(storageKey('tb_player_data')), null);
});
test('TaleSpire adapter ignores unrelated engine events and correlates official rollId', async () => {
  const messages: unknown[] = [];
  const send = wsBridge.send;
  wsBridge.send = (type, payload) => {
    messages.push({ type, payload });
    return true;
  };
  const win: { TS: unknown; handleRollResults?: (raw: unknown) => void } = {
    TS: {
      dice: {
        makeRollDescriptors: async () => [{ name: 'test', roll: '1d20' }],
        putDiceInTray: async () => 'engine-id',
      },
    },
  };
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  const driver = new TaleSpireDriver();
  try {
    driver.configure({
      role: () => 'gm',
      secret: () => false,
      log: () => {},
      error: () => {},
      token: () => {},
      bookmarks: () => {},
    });
    driver.init();
    await driver.executeRoll({ formula: '1d20', name: 'Save', rollId: 'request-id' });
    win.handleRollResults!({
      kind: 'rollResults',
      payload: { rollId: 'unrelated', resultsGroups: [{ result: { kind: 'd20', results: [20] } }] },
    });
    assert.equal(messages.length, 0);
    win.handleRollResults!({
      kind: 'rollResults',
      payload: { rollId: 'engine-id', resultsGroups: [{ result: { kind: 'd20', results: [8] } }] },
    });
    assert.deepEqual(messages, [
      { type: 'DICE_RESULT', payload: { rollId: 'request-id', total: 8 } },
    ]);
  } finally {
    driver.dispose();
    wsBridge.send = send;
    Reflect.deleteProperty(globalThis, 'window');
  }
});

test('upcast dice reach both TaleSpire API calls without losing additional dice', async () => {
  const formulas: string[] = [];
  const tray: unknown[] = [];
  const win = {
    TS: {
      dice: {
        makeRollDescriptors: async (formula: string) => {
          formulas.push(formula);
          return [{ name: '', roll: formula }];
        },
        putDiceInTray: async (descriptors: unknown) => {
          tray.push(descriptors);
          return 'engine-id';
        },
      },
    },
  };
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  const driver = new TaleSpireDriver();
  try {
    for (const level of [2, 3])
      await driver.executeRoll({
        formula: scaleDiceFormula('1d8', 1, level, 'ва', '1d8'),
        name: 'ва',
        rollId: 'test-' + level,
      });
    assert.deepEqual(formulas, ['2d8', '3d8']);
    assert.deepEqual(tray, [[{ name: 'ва', roll: '2d8' }], [{ name: 'ва', roll: '3d8' }]]);
  } finally {
    driver.dispose();
    Reflect.deleteProperty(globalThis, 'window');
  }
});
