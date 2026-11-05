import { createId } from '../../../../packages/domain/id';
import {
  PROTOCOL_VERSION,
  isWriteCommand,
  handshakeSchema,
  type WireMessage,
} from '../../../../packages/protocol';
import {
  configureEndpoint,
  endpointScope,
  initialEndpoint,
  httpBase,
  serverInfo,
  socketUrl,
} from './endpoint';
import { STORAGE_KEYS } from '../config/constants';
type Listener = (payload: unknown) => void;
class RemoteError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}
interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
interface Outbox {
  requestId: string;
  type: string;
  payload: Record<string, unknown>;
  expectedRevision?: string;
  fixedRevision?: boolean;
  sent: boolean;
  created: number;
  campaignId: string;
}
export class WebSocketBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private attempts = 0;
  private started = false;
  private authenticated = false;
  private campaignId = '';
  private listeners = new Map<string, Set<Listener>>();
  private pending = new Map<string, Pending>();
  private revisions = new Map<string, string>();
  private nameIds = new Map<string, string>();
  private queues = new Map<string, Promise<unknown>>();
  private outbox = new Map<string, Outbox>();
  private activeWrites = new Map<string, number>();
  private token?: { role: 'gm' | 'player'; token: string };
  getServerInfo = serverInfo;
  hasPendingWrites(id?: string) {
    return Boolean(id && this.activeWrites.get(id));
  }
  start() {
    if (this.started) return;
    this.started = true;
    initialEndpoint();
    this.connect();
  }
  private tokenKey() {
    return `tb_session_v1:${endpointScope()}`;
  }
  private outboxKey() {
    return `tb_outbox_v1:${endpointScope()}`;
  }
  private status() {
    this.emit('STATUS', {
      connected: this.authenticated,
      connecting: Boolean(this.ws && this.ws.readyState === WebSocket.CONNECTING),
    });
  }
  setServer(host: string, port: number) {
    configureEndpoint(host.trim() || '127.0.0.1', port);
    try {
      localStorage.setItem(STORAGE_KEYS.HOST, host);
      localStorage.setItem(STORAGE_KEYS.PORT, String(port));
    } catch {
      /* settings can be ephemeral */
    }
    this.outbox.clear();
    this.revisions.clear();
    this.nameIds.clear();
    this.token = undefined;
    this.campaignId = '';
    this.connect();
  }
  async pingServer(
    host: string,
    port: number,
  ): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const url = new URL(/^https?:\/\//.test(host) ? host : `http://${host}`);
      url.port = String(port);
      url.pathname = '/health';
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      return res.ok
        ? { ok: true, data: await res.json() }
        : { ok: false, error: `HTTP ${res.status}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Нет связи' };
    }
  }
  connect() {
    clearTimeout(this.reconnectTimer);
    const generation = ++this.generation;
    this.authenticated = false;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onerror = null;
      this.ws.close();
    }
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Соединение прервано'));
      this.pending.delete(id);
    }
    try {
      const socket = (this.ws = new WebSocket(socketUrl()));
      this.status();
      socket.onopen = () => {
        if (generation !== this.generation) return;
        this.attempts = 0;
        this.status();
        try {
          this.token = JSON.parse(sessionStorage.getItem(this.tokenKey()) || 'null') || undefined;
        } catch {
          this.token = undefined;
        }
        if (this.token)
          void this.authenticate(this.token.role, undefined, this.token.token).catch(() => {});
      };
      socket.onmessage = (event) => {
        if (generation !== this.generation) return;
        try {
          this.receive(JSON.parse(String(event.data)));
        } catch {
          this.emit('ERROR', { message: 'Некорректное сообщение сервера' });
        }
      };
      socket.onerror = () => {
        if (generation === this.generation) this.status();
      };
      socket.onclose = () => {
        if (generation !== this.generation) return;
        this.authenticated = false;
        this.status();
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error('Соединение прервано'));
        }
        this.pending.clear();
        if (this.started)
          this.reconnectTimer = setTimeout(
            () => this.connect(),
            Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5)) + Math.random() * 500,
          );
      };
    } catch {
      if (this.started) this.reconnectTimer = setTimeout(() => this.connect(), 2500);
    }
  }
  async authenticate(role: 'gm' | 'player', code?: string, token?: string) {
    if (!this.started) this.start();
    const deadline = Date.now() + 8000;
    while (this.ws?.readyState !== WebSocket.OPEN) {
      if (Date.now() > deadline) throw new Error('Сервер недоступен');
      await new Promise((r) => setTimeout(r, 50));
    }
    await this.transmit('HANDSHAKE', {
      role,
      code,
      token,
      driver: typeof window !== 'undefined' && Boolean(window.TS),
    });
  }
  async logout() {
    if (this.authenticated)
      try {
        await this.request('LOGOUT');
      } catch {
        /* clear local capability even offline */
      }
    this.token = undefined;
    this.authenticated = false;
    try {
      sessionStorage.removeItem(this.tokenKey());
    } catch {
      /* ephemeral session */
    }
    this.status();
    this.emit('LOGGED_OUT', {});
  }
  send(type: string, payload: unknown = {}): boolean {
    void this.request(type, payload).catch((error) =>
      this.emit('ERROR', {
        message: error instanceof Error ? error.message : 'Ошибка отправки',
        type,
      }),
    );
    return this.authenticated;
  }
  request<T = unknown>(
    type: string,
    payload: unknown = {},
    options?: { expectedRevision?: string },
  ): Promise<T> {
    const data =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...(payload as Record<string, unknown>) }
        : payload;
    if (!isWriteCommand(type)) {
      if (!this.authenticated)
        return Promise.reject(new Error('Требуется подключение с кодом доступа'));
      return this.transmit(type, data) as Promise<T>;
    }
    if (!this.campaignId) return Promise.reject(new Error('Сначала подключитесь к кампании'));
    const object = data as Record<string, unknown>;
    const id =
      typeof object.characterId === 'string'
        ? object.characterId
        : typeof object.characterName === 'string'
          ? this.nameIds.get(object.characterName)
          : undefined;
    if (id) {
      object.characterId = id;
      delete object.characterName;
    }
    const key = id || 'combat';
    if (this.outbox.size >= 100)
      return Promise.reject(
        new Error('Очередь заполнена. Сохраните черновик и восстановите связь.'),
      );
    const entry: Outbox = {
      requestId: createId(),
      type,
      payload: object,
      expectedRevision: options?.expectedRevision || this.revisions.get(key),
      fixedRevision: Boolean(options?.expectedRevision),
      sent: false,
      created: Date.now(),
      campaignId: this.campaignId,
    };
    this.outbox.set(entry.requestId, entry);
    this.persistOutbox();
    this.activeWrites.set(key, (this.activeWrites.get(key) || 0) + 1);
    const operation = (this.queues.get(key) || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        if (!this.authenticated)
          throw new Error('Нет связи. Правка оставлена в локальной очереди.');
        if (!entry.fixedRevision)
          entry.expectedRevision = this.revisions.get(key) || entry.expectedRevision;
        return this.deliver(entry);
      })
      .finally(() => {
        const count = (this.activeWrites.get(key) || 1) - 1;
        this.activeWrites.set(key, count);
        if (count === 0 && this.authenticated && id)
          this.send('GET_PLAYER_DATA', { characterId: id });
        if (this.queues.get(key) === operation) this.queues.delete(key);
      });
    this.queues.set(key, operation);
    return operation as Promise<T>;
  }
  private async deliver(entry: Outbox): Promise<unknown> {
    if (entry.campaignId !== this.campaignId || Date.now() - entry.created > 24 * 60 * 60 * 1000)
      throw new Error('Правка требует ручного восстановления из черновика');
    entry.sent = true;
    this.persistOutbox();
    try {
      const result = await this.transmit(
        entry.type,
        entry.payload,
        entry.requestId,
        entry.expectedRevision,
      );
      this.outbox.delete(entry.requestId);
      this.persistOutbox();
      return result;
    } catch (error) {
      if (error instanceof RemoteError) {
        try {
          const key = `tb_conflicts_v1:${endpointScope()}`;
          const conflicts = JSON.parse(sessionStorage.getItem(key) || '[]');
          sessionStorage.setItem(key, JSON.stringify([...conflicts.slice(-99), entry]));
        } catch {
          /* Keep the original outbox if recovery storage fails. */ throw error;
        }
        this.outbox.delete(entry.requestId);
        this.persistOutbox();
      }
      throw error;
    }
  }
  private persistOutbox() {
    try {
      sessionStorage.setItem(this.outboxKey(), JSON.stringify([...this.outbox.values()]));
    } catch {
      this.emit('ERROR', {
        message: 'Не удалось сохранить локальную очередь. Не закрывайте страницу.',
      });
    }
  }
  private async replay() {
    let entries: Outbox[];
    try {
      entries = JSON.parse(sessionStorage.getItem(this.outboxKey()) || '[]');
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!this.authenticated) break;
      if (this.pending.has(entry.requestId)) continue;
      this.outbox.set(entry.requestId, entry);
      try {
        await this.deliver(entry);
      } catch (error) {
        this.emit('ERROR', {
          message: error instanceof Error ? error.message : 'Конфликт очереди',
        });
      }
    }
  }
  private transmit(
    type: string,
    payload: unknown,
    requestId: string = createId(),
    expectedRevision?: string,
  ): Promise<unknown> {
    if (this.ws?.readyState !== WebSocket.OPEN)
      return Promise.reject(new Error('Нет соединения с сервером'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Нет подтверждения сервера. Проверьте сохранение перед повтором.'));
      }, 10000);
      this.pending.set(requestId, { resolve, reject, timer });
      this.ws!.send(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          type,
          payload,
          requestId,
          expectedRevision,
        }),
      );
    });
  }
  private receive(input: unknown) {
    if (
      !input ||
      typeof input !== 'object' ||
      !('type' in input) ||
      typeof input.type !== 'string' ||
      !('payload' in input)
    )
      return;
    const message = input as WireMessage;
    const payload = message.payload as Record<string, unknown>;
    if (message.protocolVersion !== PROTOCOL_VERSION) {
      this.emit('ERROR', {
        message: 'Несовместимая версия сервера. Обновите оба компонента TaleBridge.',
      });
      return;
    }
    if (!payload || typeof payload !== 'object') return;
    if (message.type === 'HANDSHAKE_ACK') {
      if (!handshakeSchema.safeParse(payload).success) {
        this.emit('ERROR', { message: 'Некорректное подтверждение подключения' });
        return;
      }
      this.authenticated = true;
      this.campaignId = String(payload.campaignId);
      this.token = { role: payload.role as 'gm' | 'player', token: String(payload.token) };
      try {
        sessionStorage.setItem(this.tokenKey(), JSON.stringify(this.token));
      } catch {
        /* session remains in memory */
      }
      this.status();
      setTimeout(() => {
        void this.replay();
      }, 0);
    }
    if (
      message.type === 'PLAYER_DATA' &&
      typeof payload.id === 'string' &&
      typeof payload.revision === 'string'
    )
      this.revisions.set(payload.id, payload.revision);
    if (message.type === 'CHARACTERS_LIST' && Array.isArray(payload))
      for (const c of payload)
        if (c && typeof c.id === 'string') {
          this.nameIds.set(c.name, c.id);
          this.revisions.set(c.id, c.revision);
        }
    if (message.type === 'COMBAT_STATE_UPDATE' && typeof payload.revision === 'string')
      this.revisions.set('combat', payload.revision);
    if (message.type === 'ACK' && payload?.data && typeof payload.data === 'object') {
      const data = payload.data as Record<string, unknown>;
      if (typeof data.revision === 'string')
        this.revisions.set(
          typeof data.characterId === 'string' ? data.characterId : 'combat',
          data.revision,
        );
    }
    if (message.requestId && ['ACK', 'ERROR'].includes(message.type)) {
      const pending = this.pending.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(message.requestId);
        if (message.type === 'ACK') pending.resolve(payload.data);
        else
          pending.reject(
            new RemoteError(String(payload.message || 'Ошибка сервера'), String(payload.code)),
          );
      }
    }
    if (
      message.type === 'ERROR' &&
      ['AUTH_FAILED', 'UNAUTHORIZED'].includes(String(payload.code))
    ) {
      this.authenticated = false;
      this.status();
      if (payload.code === 'AUTH_FAILED') {
        this.token = undefined;
        try {
          sessionStorage.removeItem(this.tokenKey());
        } catch {
          /* no persistence */
        }
      }
    }
    this.emit(message.type, message.payload);
  }
  subscribe<T = unknown>(type: string, listener: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    const callback = listener as Listener;
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  private emit(type: string, payload: unknown) {
    for (const listener of this.listeners.get(type) || [])
      try {
        listener(payload);
      } catch (error) {
        console.error('TaleBridge listener failed', type, error);
      }
  }
  dispose() {
    this.started = false;
    ++this.generation;
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Клиент закрыт'));
    }
    this.pending.clear();
    this.authenticated = false;
    this.status();
  }
  retryPending() {
    return this.replay();
  }
}
export const wsBridge = new WebSocketBridge();
export { httpBase };
