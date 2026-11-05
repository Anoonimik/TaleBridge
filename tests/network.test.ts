import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { BridgeServer, allowedOrigin } from '../obsidian-plugin/src/server/transport';
import { serveHttp } from '../obsidian-plugin/src/server/http';
import { fixture } from './fixtures';

test('origin policy allows only configured or same origins, with explicit WebView exception', () => {
  const opts = { allowedOrigins: ['https://game.example'], allowWebview: false };
  assert.ok(allowedOrigin('http://host:3000', 'host:3000', opts));
  assert.ok(allowedOrigin('https://game.example', 'host:3000', opts));
  assert.ok(!allowedOrigin('https://evil.example', 'host:3000', opts));
  assert.ok(!allowedOrigin('null', 'host:3000', opts));
  assert.ok(allowedOrigin(undefined, undefined, { ...opts, allowWebview: true }));
  assert.ok(!allowedOrigin('http://localhost:56848', '127.0.0.1:30123', opts));
  const webview = { ...opts, allowWebview: true };
  for (const port of [56848, 43210])
    assert.ok(allowedOrigin(`http://localhost:${port}`, '127.0.0.1:30123', webview));
  for (const origin of ['http://localhost.evil.example:56848', 'http://localhost:56848/path',
    'http://localhost:56848@evil.example', 'https://evil.example', 'garbage'])
    assert.ok(!allowedOrigin(origin, '127.0.0.1:30123', webview));
});
test('HTTP/WS integration: static app, health, private file rejection, authentication and frame limit', async () => {
  const f = fixture((client, message) => server.send(client, message));
  const server = new BridgeServer(
    { port: 0, bind: '127.0.0.1', allowedOrigins: [], allowWebview: true },
    (req, res) =>
      serveHttp(req, res, {
        application: f.app,
        readStatic: async () => Buffer.from('<html>Test app</html>'),
      }),
  );
  server.on('message', (raw, client) => {
    void f.app.handle(raw, client);
  });
  // The fixture application routes sends via this transport for this test.
  server.on('connection', (client) => {
    f.clients.push(client);
    f.messages.set(client.id, []);
  });
  const port = await server.start();
  let ws: WebSocket | undefined;
  try {
    const base = `http://127.0.0.1:${port}`;
    assert.ok((await (await fetch(base)).text()).includes('Test app'));
    assert.equal((await (await fetch(base + '/health')).json()).status, 'online');
    const taleSpireOrigin = 'http://localhost:56848';
    const health = await fetch(base + '/health', { headers: { Origin: taleSpireOrigin } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('Access-Control-Allow-Origin'), taleSpireOrigin);
    for (const route of [
      '/vault-file?path=private.md',
      '/clipboard',
      '/clipboard-write',
      '/public/image.png',
    ])
      assert.equal((await fetch(base + route)).status, 403);
    assert.equal((await fetch(base + '/assets/../private.md')).status, 404);
    assert.equal((await fetch(base, { headers: { Origin: 'https://evil.example' } })).status, 403);
    ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: taleSpireOrigin });
    await once(ws, 'open');
    const denied = once(ws, 'message');
    ws.send(
      JSON.stringify({
        protocolVersion: 1,
        type: 'GET_CHARACTERS',
        requestId: 'anonymous',
        payload: {},
      }),
    );
    assert.equal(JSON.parse((await denied)[0].toString()).type, 'ERROR');
    const granted = once(ws, 'message');
    ws.send(
      JSON.stringify({
        protocolVersion: 1,
        type: 'HANDSHAKE',
        requestId: 'login',
        payload: { role: 'player', code: 'alice-code' },
      }),
    );
    assert.equal(JSON.parse((await granted)[0].toString()).type, 'HANDSHAKE_ACK');
    const pong = once(ws, 'pong');
    ws.ping('same-payload');
    assert.equal((await pong)[0].toString(), 'same-payload');
    const closed = once(ws, 'close');
    ws.send('x'.repeat(600 * 1024));
    assert.equal((await closed)[0], 1009);
    const bad = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: 'https://evil.example' });
    await assert.rejects(once(bad, 'open'));
    bad.terminate();
  } finally {
    ws?.terminate();
    await server.stop();
    f.app.dispose();
  }
});
