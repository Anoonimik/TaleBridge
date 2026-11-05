import { createId } from '../../../../packages/domain/id';
import type { TaleSpireCreature, Bookmark } from '../types';
import { cleanDiceFormula } from '../../../../packages/domain/dice';
import { wsBridge } from './websocket';
interface RollDescriptor {
  name: string;
  roll: string;
}
interface TaleSpireApi {
  dice: {
    makeRollDescriptors(formula: string): Promise<RollDescriptor[]>;
    putDiceInTray(descriptors: RollDescriptor[], quietResults: boolean): Promise<string>;
  };
  creatures: {
    getSelectedCreatures(): Promise<{ id: string }[]>;
    getMoreInfo(
      ids: { id: string }[],
    ): Promise<{ id: string; name: string; hp?: { current: number; max: number } }[]>;
  };
  bookmarks: {
    getBookmarksInThisBoard(): Promise<Bookmark[]>;
    gotoBookmark(id: string): Promise<void>;
  };
}
declare global {
  interface Window {
    TS?: TaleSpireApi;
    handleRollResults?: (event: unknown) => void;
    handleCreatureStateChange?: (event: unknown) => void;
    onStateChangeEvent?: (event: unknown) => void;
    handleVisibilityEvent?: (event: unknown) => void;
  }
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function evaluateRoll(value: unknown, depth = 0): number | null {
  if (depth > 20) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const node = record(value);
  if (typeof node.value === 'number') return evaluateRoll(node.value, depth + 1);
  if (typeof node.total === 'number') return evaluateRoll(node.total, depth + 1);
  if (Array.isArray(node.results)) {
    const values = node.results.map((v) => evaluateRoll(v, depth + 1));
    return values.every((v) => v !== null) ? values.reduce<number>((a, b) => a + b!, 0) : null;
  }
  if (Array.isArray(node.operands) && node.operands.length === 2) {
    const a = evaluateRoll(node.operands[0], depth + 1),
      b = evaluateRoll(node.operands[1], depth + 1);
    return a === null || b === null
      ? null
      : node.operator === '+'
        ? a + b
        : node.operator === '-'
          ? a - b
          : null;
  }
  return null;
}
export function parseRollResults(raw: unknown): number | null {
  const event = record(raw),
    payload = record(event.payload || event);
  if (Array.isArray(payload.resultsGroups)) {
    const values = payload.resultsGroups.map((g) => evaluateRoll(record(g).result));
    return values.length > 0 && values.every((v) => v !== null)
      ? values.reduce<number>((a, b) => a + b!, 0)
      : null;
  }
  return evaluateRoll(payload);
}
interface DriverPorts {
  role: () => 'gm' | 'player';
  secret: () => boolean;
  log: (message: string) => void;
  error: (message: string) => void;
  token: (token: TaleSpireCreature | null) => void;
  bookmarks: (bookmarks: Bookmark[]) => void;
}
export class TaleSpireDriver {
  private ports: DriverPorts = {
    role: () => 'player',
    secret: () => false,
    log: () => {},
    error: () => {},
    token: () => {},
    bookmarks: () => {},
  };
  private unsubscribers: (() => void)[] = [];
  private engineRolls = new Map<string, string>();
  private awaiting = new Map<
    string,
    {
      resolve: (total: number) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  configure(ports: DriverPorts) {
    this.ports = ports;
  }
  isReady() {
    return typeof window !== 'undefined' && Boolean(window.TS);
  }
  init() {
    this.dispose();
    window.handleRollResults = (raw) => {
      const event = record(raw),
        payload = record(event.payload || event),
        engineId = payload.rollId;
      if (typeof engineId !== 'string') return;
      const rollId = this.engineRolls.get(engineId);
      if (!rollId) return;
      const total = parseRollResults(raw);
      if (total === null) return;
      this.engineRolls.delete(engineId);
      wsBridge.send('DICE_RESULT', { rollId, total });
    };
    window.handleCreatureStateChange = () => {
      void this.pollActiveToken();
    };
    window.onStateChangeEvent = (event) => {
      if (record(event).kind === 'hasInitialized') {
        void this.pollActiveToken();
        wsBridge.send('REGISTER_DRIVER', { ready: true });
      }
    };
    window.handleVisibilityEvent = () => {};
    this.unsubscribers.push(
      wsBridge.subscribe<{ total: number; rollId: string }>('DICE_RESULT', (p) => {
        const pending = this.awaiting.get(p.rollId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.awaiting.delete(p.rollId);
        pending.resolve(p.total);
      }),
      wsBridge.subscribe<{ rollId: string; message: string }>('ROLL_ERROR', (p) => {
        const pending = this.awaiting.get(p.rollId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error(p.message));
          this.awaiting.delete(p.rollId);
        }
      }),
      wsBridge.subscribe<{ formula: string; name: string; rollId: string; isGmOnly?: boolean }>(
        'ROLL_DICE',
        (p) => {
          void this.executeRoll(p).catch((error) =>
            this.ports.error(error instanceof Error ? error.message : 'Ошибка кубиков'),
          );
        },
      ),
      wsBridge.subscribe('GET_BOOKMARKS', () => {
        void this.getBookmarks();
      }),
      wsBridge.subscribe<{ id?: string; name?: string }>('GOTO_BOOKMARK', (p) => {
        void this.executeBookmark(p.id, p.name);
      }),
    );
  }
  async executeRoll(payload: {
    formula: string;
    name: string;
    rollId: string;
    isGmOnly?: boolean;
  }) {
    const api = window.TS;
    if (!api) throw new Error('Исполнитель TaleSpire недоступен');
    const descriptors = await api.dice.makeRollDescriptors(cleanDiceFormula(payload.formula));
    if (!Array.isArray(descriptors) || !descriptors.length)
      throw new Error('TaleSpire не распознал формулу');
    const engineId = await api.dice.putDiceInTray(
      descriptors.map((d) => ({ ...d, name: payload.name })),
      this.ports.role() === 'gm' && Boolean(payload.isGmOnly),
    );
    if (typeof engineId !== 'string') throw new Error('TaleSpire не вернул rollId');
    this.engineRolls.set(engineId, payload.rollId);
  }
  async rollForResult(
    raw: string,
    name = 'Бросок',
    secret: boolean | null = null,
  ): Promise<number> {
    const formula = cleanDiceFormula(raw),
      rollId = createId();
    const result = new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.awaiting.delete(rollId);
        reject(new Error('Истекло время ожидания броска'));
      }, 65000);
      this.awaiting.set(rollId, { resolve, reject, timer });
    });
    try {
      await wsBridge.request('ROLL_DICE', {
        formula,
        name,
        rollId,
        isGmOnly: this.ports.role() === 'gm' && (secret ?? this.ports.secret()),
      });
    } catch (error) {
      this.ports.error(error instanceof Error ? error.message : 'Ошибка броска');
      const pending = this.awaiting.get(rollId);
      if (pending) {
        clearTimeout(pending.timer);
        this.awaiting.delete(rollId);
        pending.reject(error instanceof Error ? error : new Error('Ошибка броска'));
      }
    }
    return result;
  }
  async rollDice(raw: string, name = 'Бросок', secret: boolean | null = null): Promise<void> {
    try {
      const result = await this.rollForResult(raw, name, secret);
      this.ports.log(`${name}: ${result}`);
    } catch (error) {
      this.ports.error(error instanceof Error ? error.message : 'Ошибка броска');
    }
  }
  async getSelectedCreatureId(): Promise<string> {
    if (!window.TS || this.ports.role() !== 'gm')
      throw new Error('Выделите миниатюру в клиенте TaleSpire мастера');
    const selected = await window.TS.creatures.getSelectedCreatures();
    if (selected.length !== 1 || typeof selected[0]?.id !== 'string' || !selected[0].id.trim())
      throw new Error('Выберите ровно одну миниатюру в TaleSpire');
    return selected[0].id;
  }
  async pollActiveToken() {
    const api = window.TS;
    if (!api) return;
    try {
      const selected = await api.creatures.getSelectedCreatures();
      if (!selected.length) {
        this.ports.token(null);
        return;
      }
      const info = (await api.creatures.getMoreInfo([selected[0]]))[0];
      if (info)
        this.ports.token({
          id: info.id,
          name: info.name,
          hp: info.hp?.current,
          hpMax: info.hp?.max,
        });
    } catch {
      this.ports.log('Не удалось прочитать выбранный токен');
    }
  }
  async getBookmarks(): Promise<Bookmark[]> {
    if (!window.TS) {
      wsBridge.send('GET_BOOKMARKS');
      return [];
    }
    try {
      const bookmarks = await window.TS.bookmarks.getBookmarksInThisBoard();
      this.ports.bookmarks(bookmarks);
      wsBridge.send('BOOKMARKS_LIST', bookmarks);
      return bookmarks;
    } catch {
      this.ports.log('Не удалось прочитать закладки');
      return [];
    }
  }
  async gotoBookmark(id?: string, name?: string) {
    wsBridge.send('GOTO_BOOKMARK', { id, name });
  }
  private async executeBookmark(id?: string, name?: string) {
    if (!window.TS) return;
    try {
      const bookmarks = await window.TS.bookmarks.getBookmarksInThisBoard();
      const target =
        bookmarks.find((b) => b.id === id) ||
        bookmarks.find((b) => b.name.toLowerCase() === name?.toLowerCase());
      if (!target) throw new Error('Закладка не найдена');
      await window.TS.bookmarks.gotoBookmark(target.id);
    } catch (error) {
      this.ports.log(error instanceof Error ? error.message : 'Ошибка камеры');
    }
  }
  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    for (const p of this.awaiting.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Клиент закрыт'));
    }
    this.awaiting.clear();
    this.engineRolls.clear();
  }
}
export const taleSpireDriver = new TaleSpireDriver();
