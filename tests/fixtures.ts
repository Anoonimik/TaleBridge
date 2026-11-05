import { randomUUID } from 'node:crypto';
import type { Client } from '../obsidian-plugin/src/server/transport';
import type { WireMessage } from '../packages/protocol';
import { BridgeApplication, type ApplicationPorts } from '../obsidian-plugin/src/application';
import { CharacterRepository, type NoteFile } from '../obsidian-plugin/src/vault/repository';
import { SessionManager, secretHash } from '../obsidian-plugin/src/server/sessions';
export function fixture(transmit?: (client: Client, message: WireMessage) => void) {
  const docs = new Map([
    [
      'players/Alice.md',
      '---\ntalebridge_id: alice\nhp: 10\nhp_max: 20\nplayable: true\ncustom: keep\n---\n# Alice\n\n## Инвентарь\n- [ ] Rope (кол-во: 1, вес: 1 кг)\n\n## Заметки игрока\nAlice secret\n',
    ],
    [
      'players/Bob.md',
      '---\ntalebridge_id: bob\nhp: 15\nhp_max: 20\nplayable: true\n---\n# Bob\n\n## Заметки игрока\nBob secret\n',
    ],
  ]);
  const files = [...docs.keys()].map((path) => ({
    path,
    basename: path.replace(/.*\//, '').replace('.md', ''),
    extension: 'md',
  }));
  let lock = Promise.resolve();
  const vault = {
    getMarkdownFiles: () => files,
    read: async (file: NoteFile) => docs.get(file.path)!,
    process: async (file: NoteFile, update: (content: string) => string) => {
      const work = lock.then(() => {
        const content = update(docs.get(file.path)!);
        docs.set(file.path, content);
        return content;
      });
      lock = work.then(
        () => {},
        () => {},
      );
      return work;
    },
  };
  const repo = new CharacterRepository(vault),
    messages = new Map<string, WireMessage[]>(),
    clients: Client[] = [];
  const sessions = new SessionManager(() => ({
    gmHash: secretHash('gm-code'),
    invites: { alice: secretHash('alice-code'), bob: secretHash('bob-code') },
  }));
  const published: Record<string, string> = {};
  const ports: ApplicationPorts = {
    repository: repo,
    campaignId: 'campaign',
    vaultName: () => 'Test',
    listCharacters: async () =>
      Promise.all(files.map(async (file) => ({ ...(await repo.identify(file)), playable: true }))),
    listScenes: async () => [
      { id: 'scene', title: 'Private scene', raw: 'GM secret', nudge: 'secret' },
    ],
    readNote: async (path) => docs.get(path)!,
    openNote: async () => {},
    linkCreature: async () => {},
    images: () => [{ name: 'image.png', path: 'private/image.png' }],
    readAsset: async () => Buffer.from('image'),
    saveCombat: async () => {},
    send: (client, message) => {
      messages.get(client.id)!.push(message);
      transmit?.(client, message);
    },
    clients: () => clients,
    publications: () => published,
    savePublication: async (id, path) => {
      published[id] = path;
    },
  };
  const app = new BridgeApplication(sessions, ports);
  const client = () => {
    const c = {
      id: randomUUID(),
      peer: randomUUID(),
      received: 0,
      windowStart: Date.now(),
      alive: true,
      socket: { close() {} },
    } as unknown as Client;
    clients.push(c);
    messages.set(c.id, []);
    return c;
  };
  const send = async (
    c: Client,
    type: string,
    payload: unknown = {},
    expectedRevision?: string,
    requestId: string = randomUUID(),
  ) => {
    await app.handle(
      JSON.stringify({ protocolVersion: 1, requestId, type, payload, expectedRevision }),
      c,
    );
    return messages.get(c.id)!.at(-1)!;
  };
  const login = async (role: 'gm' | 'player', code: string, driver = false) => {
    const c = client();
    await send(c, 'HANDSHAKE', { role, code, driver });
    return c;
  };
  return {
    docs,
    files,
    vault,
    repo,
    app,
    sessions,
    messages,
    clients,
    client,
    send,
    login,
    ports,
    published,
  };
}
