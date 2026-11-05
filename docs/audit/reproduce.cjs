/* Review-only probes: no real Obsidian vault, clipboard, sockets or application writes.
 * Run from repository root: node docs/audit/reproduce.cjs
 * These assertions document the audited defects, not desired future behavior.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const results = [];
async function probe(id, fn) {
  try { await fn(); results.push({ id, reproduced: true }); }
  catch (e) { results.push({ id, reproduced: false, error: e.stack }); }
}
class TFile { constructor(p) { this.path = p; this.basename = p.replace(/.*\//, '').replace(/\.md$/, ''); this.extension = p.split('.').pop(); } }
const obsidian = { Plugin: class {}, PluginSettingTab: class {}, FuzzySuggestModal: class {}, TFile, Notice: class {} };
const context = { require: n => n === 'obsidian' ? obsidian : require(n), module: { exports: {} }, Buffer, URL, console, setTimeout, clearTimeout };
vm.runInNewContext(read('obsidian-plugin/main.js') + '\nmodule.exports.__audit = { SimpleWebSocketServer, updateCharacterSection, updateCharacterActions };', context);
const Plugin = context.module.exports;
const { SimpleWebSocketServer, updateCharacterSection, updateCharacterActions } = Plugin.__audit;
function plugin() {
  const p = new Plugin();
  p.settings = { gmPin: 'review-only-pin' };
  p.messages = [];
  p.wss = { send: (c, m) => p.messages.push(m), broadcast: m => p.messages.push(m) };
  p.app = { vault: { getName: () => 'mock' } };
  return p;
}
function store(init) {
  let state;
  const get = () => state;
  const set = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
  state = init(set, get);
  return { getState: get, setState: set };
}
const mem = new Map();
const localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
function tsModule(p, names, globals = {}) {
  const source = read(p).replace(/import\s[\s\S]*?from\s*['"][^'"]+['"];?/g, '').replace(/export\s+(?=(?:const|function|class|interface|type)\b)/g, '');
  const js = stripTypeScriptTypes(source, { mode: 'transform' });
  const ctx = { create: store, localStorage, console, ...globals };
  return vm.runInNewContext(js + '\n;({' + names.join(',') + '})', ctx);
}
const storage = tsModule('symbiote/src/shared/lib/character-storage.ts', ['mergeCharWithMeta', 'persistPlayerData', 'getStoredCharMeta', 'DEFAULT_SLOTS', 'getStoredArray', 'getStoredJson'], { STORAGE_KEYS: { PLAYER_DATA: 'pd' } });
const sent = [];
const roster = tsModule('symbiote/src/shared/lib/useRosterStore.ts', ['useRosterStore'], {
  ...storage, STORAGE_KEYS: {}, wsBridge: { send: (...m) => sent.push(m) },
  taleSpireDriver: { rollDice() {} }, useLogStore: { getState: () => ({ addLog() {} }) }, parseModifier: () => 0,
}).useRosterStore;

(async () => {
  await probe('S01-handshake-leaks-gm-pin', async () => {
    const p = plugin(); await p.handleIncomingMessage(JSON.stringify({ type: 'HANDSHAKE' }), {});
    assert.equal(p.messages[0].payload.gmPin, 'review-only-pin');
  });
  await probe('S02-unauthenticated-character-write', async () => {
    const p = plugin(); const fm = {};
    p.findCharacterFile = () => new TFile('someone-else.md');
    p.app.fileManager = { processFrontMatter: async (f, fn) => fn(fm) };
    await p.handleIncomingMessage(JSON.stringify({ type: 'UPDATE_CHARACTER_HP', payload: { characterName: 'other', hp: -500 } }), {});
    assert.equal(fm.hp, -500);
  });
  await probe('S03-http-reads-private-vault-file', async () => {
    const p = plugin(); const file = new TFile('private/secret.md'); let requested, data;
    p.app.vault.getAbstractFileByPath = s => { requested = s; return file; };
    p.app.vault.readBinary = async () => Buffer.from('mock secret');
    await p.handleHttpRequest({ method: 'GET', url: '/vault-file?path=private%2Fsecret.md' }, { setHeader() {}, writeHead() {}, end: b => data = b });
    assert.equal(requested, file.path); assert.equal(data.toString(), 'mock secret');
  });
  await probe('S04-http-reads-host-clipboard-without-auth', async () => {
    const p = plugin(); let body;
    p.readSystemClipboard = async () => 'mock clipboard';
    await p.handleHttpRequest({ method: 'GET', url: '/clipboard' }, { setHeader() {}, writeHead() {}, end: s => body = JSON.parse(s) });
    assert.equal(body.text, 'mock clipboard');
  });
  for (const type of ['GET_SYSTEM_CLIPBOARD', 'SET_SYSTEM_CLIPBOARD']) {
    await probe('F01-undefined-data-' + type, async () => {
      const p = plugin(); p.readSystemClipboard = async () => 'mock';
      await assert.rejects(p.handleIncomingMessage(JSON.stringify({ type, payload: { requestId: 'r', text: 'mock' } }), {}), /data is not defined/);
    });
  }
  await probe('F02-client-attack-command-ignored', async () => {
    const p = plugin(); let lookedUp = false;
    p.findCharacterFile = () => { lookedUp = true; return null; };
    await p.handleIncomingMessage(JSON.stringify({ type: 'UPDATE_CHARACTER_ATTACKS', payload: { characterName: 'hero', attacks: [] } }), {});
    assert.equal(lookedUp, false); assert.equal(p.messages.length, 0);
    assert.match(read('symbiote/src/shared/lib/useRosterStore.ts'), /send\('UPDATE_CHARACTER_ATTACKS'/);
  });
  await probe('D01-action-update-deletes-intermediate-prose', async () => {
    const original = '# Hero\n```dnd-action\nname: A\n```\nKEEP THIS TEXT\n```dnd-action\nname: B\n```\n## Tail\nKeep tail';
    let output;
    await updateCharacterActions({ read: async () => original, modify: async (f, s) => output = s }, {}, [{ name: 'C' }]);
    assert.ok(!output.includes('KEEP THIS TEXT')); assert.ok(output.includes('Keep tail'));
  });
  await probe('D02-section-replacement-interprets-dollar-text', async () => {
    const original = '# Hero\n\n## Заметки игрока\nOLD\n\n## Next\nKeep'; let output;
    await updateCharacterSection({ read: async () => original, modify: async (f, s) => output = s }, {}, 'Заметки игрока', '## Заметки игрока\n$&');
    assert.ok(!output.includes('$&')); assert.ok(output.includes('OLD'));
  });
  await probe('D03-concurrent-section-updates-lose-first-write', async () => {
    let content = '# Hero\n\n## Инвентарь\nOLD ITEM\n\n## Заметки игрока\nOLD NOTE\n';
    const vault = { read: async () => content, modify: async (f, s) => { content = s; } };
    await Promise.all([
      updateCharacterSection(vault, {}, 'Инвентарь', '## Инвентарь\nNEW ITEM'),
      updateCharacterSection(vault, {}, 'Заметки игрока', '## Заметки игрока\nNEW NOTE'),
    ]);
    assert.ok(content.includes('NEW NOTE')); assert.ok(!content.includes('NEW ITEM'));
  });
  await probe('S05-websocket-accepts-unmasked-client-frame', async () => {
    const s = new SimpleWebSocketServer(); let message;
    s.on('message', m => message = m);
    s._processBuffer(Buffer.from([0x81, 2, 0x7b, 0x7d]), { socket: {} });
    assert.equal(message, '{}');
  });
  await probe('S06-websocket-pong-drops-ping-payload', async () => {
    const s = new SimpleWebSocketServer(); let pong;
    s._processBuffer(Buffer.from([0x89, 2, 65, 66]), { socket: { write: b => pong = b } });
    assert.equal(pong.toString('hex'), '8a00');
  });
  await probe('S07-websocket-dispatches-incomplete-fragment', async () => {
    const s = new SimpleWebSocketServer(); const messages = [];
    s.on('message', m => messages.push(m));
    s._processBuffer(Buffer.from([0x01, 1, 0x7b, 0x80, 1, 0x7d]), { socket: {} });
    assert.equal(messages.length, 1); assert.equal(messages[0], '{');
  });
  await probe('F03-player-data-for-other-character-replaces-selection-data', async () => {
    roster.setState({ playerCharacterName: 'Alice' });
    roster.getState().setPlayerData({ name: 'Bob', hp: 10 });
    assert.equal(roster.getState().playerCharacterName, 'Alice'); assert.equal(roster.getState().playerData.name, 'Bob');
  });
  await probe('D04-skill-proficiency-lost-on-server-refresh', async () => {
    roster.getState().setPlayerData({ name: 'Alice', hp: 10 });
    roster.getState().setSkillProficiency('athletics', 'expert');
    assert.equal(roster.getState().playerData.skills.athletics, 'expert');
    roster.getState().setPlayerData({ name: 'Alice', hp: 10 });
    assert.equal(roster.getState().playerData.skills, undefined);
  });
  await probe('F04-media-always-resolves-to-loopback-default-port', async () => {
    const media = tsModule('symbiote/src/shared/lib/media.ts', ['resolveMediaUrl'], { DEFAULT_WS_PORT: 30123 });
    assert.equal(media.resolveMediaUrl('public/a.png'), 'http://127.0.0.1:30123/vault-file?path=public%2Fa.png');
  });
  await probe('F05-active-scene-remains-stale-after-refresh', async () => {
    const s = tsModule('symbiote/src/shared/lib/useStoryStore.ts', ['useStoryStore']).useStoryStore;
    s.getState().setScenes([{ id: '1', title: 'old' }]);
    s.getState().setScenes([{ id: '1', title: 'new' }]);
    assert.equal(s.getState().activeScene.title, 'old');
  });
  await probe('F06-removing-earlier-combatant-skips-active-turn', async () => {
    const s = tsModule('symbiote/src/shared/lib/useCombatStore.ts', ['useCombatStore'], {
      wsBridge: { send() {} }, taleSpireDriver: { rollDice() {} },
    }).useCombatStore;
    s.setState({ turnIndex: 1, combatants: [{ id: 'A' }, { id: 'B' }, { id: 'C' }] });
    s.getState().removeCombatant('A');
    assert.equal(s.getState().combatants[s.getState().turnIndex].id, 'C');
  });
  await probe('F07-game-fallback-commands-dropped-by-host', async () => {
    const p = plugin(); let broadcasts = 0; p.wss.broadcast = () => broadcasts++;
    for (const type of ['ROLL_DICE', 'DICE_RESULT', 'GET_BOOKMARKS', 'GOTO_BOOKMARK']) {
      await p.handleIncomingMessage(JSON.stringify({ type, payload: { total: 10 } }), {});
    }
    assert.equal(broadcasts, 0); assert.equal(p.messages.length, 0);
  });
  await probe('F08-composite-dice-formula-is-silently-truncated', async () => {
    const { cleanFormula } = tsModule('symbiote/src/shared/lib/text-utils.ts', ['cleanFormula']);
    assert.equal(cleanFormula('2d6+1d4+3'), '2d6');
  });
  console.log(JSON.stringify({ auditedCommit: '9f3b05257abaf9b9c65d930f6ac92aa6aa012e5e', probes: results.length, reproduced: results.filter(r => r.reproduced).length, results }, null, 2));
  process.exitCode = results.some(r => !r.reproduced) ? 1 : 0;
})();
