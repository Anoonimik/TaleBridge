import http from 'node:http';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import type { Session } from './sessions';
import type { WireMessage } from '../../../packages/protocol';

export interface Client {
  id: string;
  peer: string;
  socket: WebSocket;
  session?: Session;
  received: number;
  windowStart: number;
  alive: boolean;
  authTimer?: ReturnType<typeof setTimeout>;
  pending?: number;
}
export interface TransportOptions {
  port: number;
  bind: string;
  allowedOrigins: string[];
  allowWebview: boolean;
}
export function isWebviewOrigin(origin: string | undefined): boolean {
  if (!origin || origin === 'null') return true;
  return (
    origin === 'file://' ||
    origin.startsWith('file:') ||
    origin.startsWith('talespire:') ||
    origin.startsWith('app:') ||
    origin.startsWith('vscode-webview:')
  );
}
export function allowedOrigin(
  origin: string | undefined,
  host: string | undefined,
  options: Pick<TransportOptions, 'allowedOrigins' | 'allowWebview'>,
): boolean {
  if (isWebviewOrigin(origin)) return options.allowWebview;
  if (!origin) return false;
  return (
    Boolean(host && [`http://${host}`, `https://${host}`].includes(origin)) ||
    options.allowedOrigins.includes(origin)
  );
}
export class BridgeServer extends EventEmitter {
  readonly clients = new Set<Client>();
  private server?: http.Server;
  private sockets?: WebSocketServer;
  private heartbeat?: ReturnType<typeof setInterval>;
  constructor(
    private options: TransportOptions,
    private httpHandler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>,
  ) {
    super();
  }
  async start(): Promise<number> {
    this.server = http.createServer((req, res) => {
      const origin = req.headers.origin;
      if (!allowedOrigin(origin, req.headers.host, this.options)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const allowOrigin = !origin || isWebviewOrigin(origin) ? '*' : origin;
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (origin && !isWebviewOrigin(origin)) {
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Private-Network': 'true',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Authorization, Content-Type, Access-Control-Request-Private-Network',
          'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
      }
      this.httpHandler(req, res).catch(() => {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
    });
    this.server.requestTimeout = 10000;
    this.server.headersTimeout = 10000;
    this.server.maxConnections = 128;
    this.sockets = new WebSocketServer({
      noServer: true,
      maxPayload: 512 * 1024,
      perMessageDeflate: false,
      clientTracking: false,
    });
    this.server.on('upgrade', (req, socket, head) => {
      if (
        req.url !== '/ws' ||
        !allowedOrigin(req.headers.origin, req.headers.host, this.options) ||
        this.clients.size >= 64
      ) {
        socket.destroy();
        return;
      }
      const peer = req.socket.remoteAddress || 'unknown';
      if ([...this.clients].filter((c) => c.peer === peer).length >= 12) {
        socket.destroy();
        return;
      }
      this.sockets!.handleUpgrade(req, socket, head, (ws) => {
        const client: Client = {
          id: randomUUID(),
          peer,
          socket: ws,
          received: 0,
          windowStart: Date.now(),
          alive: true,
        };
        this.clients.add(client);
        client.authTimer = setTimeout(() => {
          if (!client.session) ws.close(1008, 'Authentication required');
        }, 15000);
        ws.on('pong', () => {
          client.alive = true;
        });
        ws.on('message', (raw, binary) => {
          if (Date.now() - client.windowStart >= 1000) {
            client.windowStart = Date.now();
            client.received = 0;
          }
          if (binary || ++client.received > 100) {
            ws.close(1008, 'Rate limit');
            return;
          }
          this.emit('message', raw.toString(), client);
        });
        ws.on('error', () => this.emit('client-error', client.id));
        ws.on('close', () => {
          clearTimeout(client.authTimer);
          this.clients.delete(client);
          this.emit('disconnect', client);
        });
        this.emit('connection', client);
      });
    });
    this.heartbeat = setInterval(() => {
      for (const c of this.clients) {
        if (!c.alive) c.socket.terminate();
        else {
          c.alive = false;
          c.socket.ping();
        }
      }
    }, 30000);
    await new Promise<void>((resolve, reject) =>
      this.server!.listen(this.options.port, this.options.bind, resolve).once('error', reject),
    );
    const address = this.server.address();
    return address && typeof address === 'object' ? address.port : this.options.port;
  }
  send(client: Client, message: WireMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) return;
    if (client.socket.bufferedAmount > 2 * 1024 * 1024) {
      client.socket.close(1008, 'Slow client');
      return;
    }
    client.socket.send(JSON.stringify(message));
  }
  async stop(): Promise<void> {
    clearInterval(this.heartbeat);
    for (const c of this.clients) {
      clearTimeout(c.authTimer);
      c.socket.terminate();
    }
    this.clients.clear();
    if (this.sockets) this.sockets.close();
    this.server?.closeAllConnections();
    if (this.server?.listening)
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
  }
}
