import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './fixtures';
import { BridgeServer } from '../obsidian-plugin/src/server/transport';
import { serveHttp } from '../obsidian-plugin/src/server/http';
const f = fixture((client, message) => server.send(client, message));
const server = new BridgeServer(
  { port: 0, bind: '127.0.0.1', allowedOrigins: [], allowWebview: true },
  (req, res) =>
    serveHttp(req, res, {
      application: f.app,
      readStatic: async (relative) => readFile(path.resolve('symbiote/dist', relative)),
    }),
);
server.on('connection', (client) => {
  f.clients.push(client);
  f.messages.set(client.id, []);
});
server.on('message', (raw, client) => {
  void f.app.handle(raw, client);
});
server.on('disconnect', (client) => f.app.disconnect(client));
const port = await server.start();
console.log(`READY http://127.0.0.1:${port}`);
async function stop() {
  await server.stop();
  f.app.dispose();
  process.exit(0);
}
process.on('SIGTERM', () => {
  void stop();
});
process.on('SIGINT', () => {
  void stop();
});
