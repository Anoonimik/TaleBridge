import { TaleSpireCreature, Bookmark } from '../types';
import { useRosterStore } from '../lib/useRosterStore';
import { useAppStore } from '../lib/useAppStore';
import { useLogStore } from '../lib/useLogStore';
import { cleanFormula } from '../lib/text-utils';
import { wsBridge } from './websocket';

declare global {
  interface Window {
    TS?: any;
    handleRollResults?: (rollResults: any) => void;
    handleCreatureStateChange?: (event: any) => void;
    onStateChangeEvent?: (msg: any) => void;
    handleVisibilityEvent?: (visibility: any) => void;
  }
}

export const parseRollResults = (rollResults: any): number | null => {
  if (!rollResults) return null;

  if (typeof rollResults.total === 'number') return rollResults.total;
  if (typeof rollResults.value === 'number') return rollResults.value;

  if (Array.isArray(rollResults.results) && rollResults.results.length > 0) {
    return rollResults.results.reduce((sum: number, r: any) => {
      const v = typeof r === 'number' ? r : r && typeof r.value === 'number' ? r.value : 0;
      return sum + v;
    }, 0);
  }

  const groups = rollResults.resultsGroups || rollResults.resultsGroup;
  if (Array.isArray(groups) && groups.length > 0) {
    let sum = 0;
    let foundAny = false;
    for (const g of groups) {
      if (typeof g.total === 'number') {
        sum += g.total;
        foundAny = true;
      } else if (typeof g.value === 'number') {
        sum += g.value;
        foundAny = true;
      } else if (Array.isArray(g.results)) {
        for (const r of g.results) {
          const v = typeof r === 'number' ? r : r && typeof r.value === 'number' ? r.value : 0;
          sum += v;
          foundAny = true;
        }
      } else if (Array.isArray(g.operands)) {
        for (const op of g.operands) {
          const v = typeof op === 'number' ? op : op && typeof op.value === 'number' ? op.value : 0;
          sum += v;
          foundAny = true;
        }
      }
    }
    if (foundAny) return sum;
  }

  return null;
};

export type RollResultListener = (total: number, raw?: any) => void;

class TaleSpireDriver {
  private lastTokenId: string | null = null;
  private rollListeners: Set<RollResultListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 0);
    }
  }

  public onRollResult(listener: RollResultListener): () => void {
    this.rollListeners.add(listener);
    return () => {
      this.rollListeners.delete(listener);
    };
  }

  public notifyRollListeners(total: number, raw?: any): void {
    this.rollListeners.forEach((l) => {
      try {
        l(total, raw);
      } catch (e) {
        console.error('Error in roll listener:', e);
      }
    });
  }

  public isReady(): boolean {
    return typeof window !== 'undefined' && Boolean(window.TS);
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // 1. TaleSpire Engine Subscriptions callbacks (mandated by manifest.json)
    window.handleRollResults = (rollResults: any) => {
      const total = parseRollResults(rollResults);
      const displayTotal = total !== null ? total : rollResults?.kind || 'Завершен';
      useLogStore.getState().addLog('roll', `Кубик в лотке TaleSpire: [${displayTotal}]`);

      wsBridge.send('DICE_RESULT', {
        total: displayTotal,
        name: 'Бросок',
        raw: rollResults,
      });

      if (typeof total === 'number') {
        this.notifyRollListeners(total, rollResults);
      }
    };

    window.handleCreatureStateChange = () => {
      this.pollActiveToken();
    };

    window.onStateChangeEvent = async (msg: any) => {
      if (msg && msg.kind === 'hasInitialized') {
        useLogStore.getState().addLog('sync', 'TaleSpire Engine: API инициализировано');
        this.pollActiveToken();
        const bms = await this.getBookmarks();
        if (bms && bms.length > 0) {
          useLogStore.getState().addLog('sync', `Синхронизировано ${bms.length} закладок камеры`);
        }
      }
    };

    window.handleVisibilityEvent = (visibility: any) => {
      console.log('TaleSpire visibility change:', visibility);
    };

    // 2. WebSocket bridge hooks for bookmarks and dice results
    if (typeof wsBridge !== 'undefined' && wsBridge?.subscribe) {
      wsBridge.subscribe('DICE_RESULT', (payload: any) => {
        if (payload && typeof payload.total === 'number') {
          this.notifyRollListeners(payload.total, payload.raw);
        }
      });

      wsBridge.subscribe('GET_BOOKMARKS', () => {
        this.getBookmarks();
      });

      wsBridge.subscribe('GOTO_BOOKMARK', (payload: any) => {
        if (payload) {
          this.gotoBookmark(payload.id, payload.name);
        }
      });

      wsBridge.subscribe('FOCUS_CREATURE', (payload: any) => {
        if (payload?.id) {
          this.focusCreature(payload.id);
        }
      });
    }

    // 3. Creature selection is handled by handleCreatureStateChange callback above.
    // We do an initial check on first init only.
    this.pollActiveToken();
  }

  public async getSelectedCreatureId(): Promise<string | null> {
    if (!this.isReady() || !window.TS?.creatures?.getSelectedCreatures) {
      return null;
    }

    try {
      const selected = await window.TS.creatures.getSelectedCreatures();
      if (!selected || !Array.isArray(selected) || selected.length === 0) {
        return null;
      }

      const firstItem = selected[0];
      if (!firstItem) return null;

      if (typeof firstItem === 'string') {
        return firstItem;
      }

      if (typeof firstItem === 'object' && firstItem.id) {
        return firstItem.id;
      }

      if (window.TS?.creatures?.getMoreInfo) {
        try {
          const infos = await window.TS.creatures.getMoreInfo([firstItem]);
          const creatureInfo = Array.isArray(infos) ? infos[0] : infos;
          if (creatureInfo?.id) {
            return creatureInfo.id;
          }
        } catch {
          // ignore fallback
        }
      }

      return (firstItem as any)?.id || String(firstItem) || null;
    } catch (e) {
      console.warn('[TaleSpire] getSelectedCreatureId error:', e);
      return null;
    }
  }

  public async focusCreature(id: string): Promise<void> {
    if (!id) return;
    useLogStore.getState().addLog('sync', `Фокусировка на миниатюре [${id}]...`);

    if (typeof wsBridge !== 'undefined' && wsBridge?.send) {
      wsBridge.send('FOCUS_CREATURE', { id });
    }

    if (!this.isReady()) {
      return;
    }

    try {
      const ts = window.TS as any;
      let focused = false;

      // 1. TaleSpire camera namespace methods
      if (ts.camera) {
        if (typeof ts.camera.focusCreature === 'function') {
          await ts.camera.focusCreature(id);
          focused = true;
        } else if (typeof ts.camera.focus === 'function') {
          await ts.camera.focus(id);
          focused = true;
        } else if (typeof ts.camera.centerOnCreature === 'function') {
          await ts.camera.centerOnCreature(id);
          focused = true;
        } else if (typeof ts.camera.lookAtCreature === 'function') {
          await ts.camera.lookAtCreature(id);
          focused = true;
        }
      }

      // 2. TaleSpire creatures namespace methods
      if (!focused && ts.creatures) {
        if (typeof ts.creatures.focus === 'function') {
          await ts.creatures.focus(id);
          focused = true;
        } else if (typeof ts.creatures.select === 'function') {
          await ts.creatures.select(id);
          focused = true;
        } else if (typeof ts.creatures.setSelectedCreatures === 'function') {
          await ts.creatures.setSelectedCreatures([id]);
          focused = true;
        } else if (typeof ts.creatures.focusCreature === 'function') {
          await ts.creatures.focusCreature(id);
          focused = true;
        }
      }

      // 3. Fallback to bookmark matching if bookmark with creature id exists
      if (!focused && ts.bookmarks?.gotoBookmark) {
        const bookmarks = useAppStore.getState().bookmarks || [];
        const match = bookmarks.find((b) => b.id === id);
        if (match) {
          await window.TS.bookmarks.gotoBookmark(match.id);
          focused = true;
        }
      }

      if (focused) {
        useLogStore.getState().addLog('sync', `Камера сфокусирована на миниатюре [${id}]`);
      } else {
        useLogStore.getState().addLog('sync', `Запрос фокуса миниатюры [${id}] отправлен в TaleSpire`);
      }
    } catch (e: any) {
      console.warn('[TaleSpire] focusCreature error:', e);
      useLogStore.getState().addLog('sync', `Ошибка фокусировки на миниатюре: ${e?.message || e}`);
    }
  }

  public async pollActiveToken(): Promise<void> {
    if (!this.isReady() || !window.TS?.creatures?.getSelectedCreatures) {
      return;
    }

    try {
      const selected = await window.TS.creatures.getSelectedCreatures();

      if (!selected || selected.length === 0) {
        if (this.lastTokenId !== null) {
          this.lastTokenId = null;
          useRosterStore.getState().setSelectedToken(null);
          wsBridge.send('CREATURE_SELECTED', null);
        }
        return;
      }

      const firstItem = selected[0];
      const infos = await window.TS.creatures.getMoreInfo([firstItem]);
      const creatureInfo = Array.isArray(infos) ? infos[0] : infos;

      if (!creatureInfo || creatureInfo.cause) {
        return;
      }

      const id = creatureInfo.id || (typeof firstItem === 'object' ? firstItem.id : firstItem);
      const name = creatureInfo.name || 'Токен';
      const hp = creatureInfo.hp;

      if (id !== this.lastTokenId) {
        this.lastTokenId = id;
        const token: TaleSpireCreature = {
          id,
          name,
          hp: typeof hp?.current === 'number' ? hp.current : undefined,
          hpMax: typeof hp?.max === 'number' ? hp.max : undefined,
        };

        useRosterStore.getState().setSelectedToken(token);
        wsBridge.send('CREATURE_SELECTED', token);
      }
    } catch (e) {
      console.warn('[TaleSpire] pollActiveToken error:', e);
    }
  }

  public async rollDice(
    rawFormula: string,
    label = 'Бросок',
    isGmOnly: boolean | null = null
  ): Promise<void> {
    const clean = cleanFormula(rawFormula);
    const currentRole = useAppStore.getState().role;

    // If role is player: always open rolls.
    // If role is gm: respect gmOnly override or diceSecret setting.
    let isSecret = false;
    if (typeof isGmOnly === 'boolean') {
      isSecret = isGmOnly;
    } else if (currentRole === 'player') {
      isSecret = false;
    } else {
      isSecret = useAppStore.getState().diceSecret;
    }

    const trayLabel = isSecret ? 'GM-лоток (скрытый)' : 'общий лоток (открытый)';
    useLogStore.getState().addLog('roll', `Бросок: ${clean} (${label}) [${trayLabel}]`);

    if (this.isReady() && window.TS?.dice?.putDiceInTray) {
      try {
        let descriptors: any = null;

        if (typeof window.TS.dice.makeRollDescriptors === 'function') {
          descriptors = await window.TS.dice.makeRollDescriptors(clean);
        }

        if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
          descriptors = [{ name: label, roll: clean }];
        }

        descriptors.forEach((d: any) => {
          if (label) d.name = label;
          d.hideResults = Boolean(isSecret);
          d.quietResults = Boolean(isSecret);
          d.isSecret = Boolean(isSecret);
          d.secret = Boolean(isSecret);
        });

        await window.TS.dice.putDiceInTray(descriptors, Boolean(isSecret));
        return;
      } catch (err: any) {
        console.warn('TaleSpire putDiceInTray error:', err);
        useLogStore.getState().addLog('roll', `Ошибка 3D-кубов TaleSpire: ${err?.message || err}`);
      }
    }

    // Fallback: send to Obsidian Host
    wsBridge.send('ROLL_DICE', { formula: clean, name: label, isGmOnly: isSecret });
  }

  public async getBookmarks(): Promise<Bookmark[]> {
    if (!this.isReady() || !window.TS?.bookmarks?.getBookmarksInThisBoard) {
      wsBridge.send('GET_BOOKMARKS', {});
      return useAppStore.getState().bookmarks || [];
    }

    try {
      const raw = await window.TS.bookmarks.getBookmarksInThisBoard();
      if (raw && Array.isArray(raw)) {
        const bms: Bookmark[] = raw.map((b: any) => ({
          id: b.id || b,
          name: b.name || 'Локация',
        }));
        useAppStore.getState().setBookmarks(bms);
        wsBridge.send('BOOKMARKS_LIST', bms);
        return bms;
      }
      return [];
    } catch (e: any) {
      console.error('getBookmarks error:', e);
      return [];
    }
  }

  public async gotoBookmark(id?: string, name?: string): Promise<void> {
    const label = name || id || 'Локация';
    useLogStore.getState().addLog('sync', `Камера: поиск «${label}»...`);

    if (!this.isReady() || !window.TS?.bookmarks?.gotoBookmark) {
      useLogStore.getState().addLog('sync', `Запрос камеры через Obsidian Host: ${label}`);
      wsBridge.send('GOTO_BOOKMARK', { id, name: label });
      return;
    }

    try {
      let targetId = id;
      let bookmarks = useAppStore.getState().bookmarks || [];

      if (bookmarks.length === 0 || !targetId) {
        const fresh = await this.getBookmarks();
        if (fresh && fresh.length > 0) {
          bookmarks = fresh;
        }
      }

      if (!targetId && name) {
        const clean = name.toLowerCase().replace(/^(камера|локация|сцена\s*\d+[:.]?)\s*:?\s*/i, '').trim();

        // 1. Exact match
        let found = bookmarks.find((b) => b.name.toLowerCase() === clean);

        // 2. Substring match
        if (!found) {
          found = bookmarks.find(
            (b) =>
              b.name.toLowerCase().includes(clean) ||
              clean.includes(b.name.toLowerCase())
          );
        }

        // 3. Match by individual words (>3 chars)
        if (!found) {
          const words = clean.split(/[\s,«»—\-#.]+/i).filter((w) => w.length > 3);
          found = bookmarks.find((b) => words.some((w) => b.name.toLowerCase().includes(w)));
        }

        if (found) {
          targetId = found.id;
          name = found.name;
        }
      }

      if (targetId) {
        await window.TS.bookmarks.gotoBookmark(targetId);
        useLogStore.getState().addLog('sync', `Камера направлена к «${name || targetId}»`);
      } else {
        useLogStore.getState().addLog(
          'sync',
          `Маркер «${label}» не найден на доске. Поставьте Marker Block или закладку камеры в игре`
        );
      }
    } catch (e: any) {
      useLogStore.getState().addLog('sync', `Ошибка камеры: ${e?.message || e}`);
    }
  }
}

export const taleSpireDriver = new TaleSpireDriver();
