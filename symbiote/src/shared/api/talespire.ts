import { TaleSpireCreature } from '../types';
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

class TaleSpireDriver {
  private lastTokenId: string | null = null;
  private pollInterval: any = null;

  constructor() {
    this.init();
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
    };

    window.handleCreatureStateChange = () => {
      this.pollActiveToken();
    };

    window.onStateChangeEvent = (msg: any) => {
      if (msg && msg.kind === 'hasInitialized') {
        useLogStore.getState().addLog('sync', 'TaleSpire Engine: API инициализировано');
        this.pollActiveToken();
      }
    };

    window.handleVisibilityEvent = (visibility: any) => {
      console.log('TaleSpire visibility change:', visibility);
    };

    // 2. Start polling selected creatures every 400ms
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.pollActiveToken();
    }, 400);

    // Initial check
    this.pollActiveToken();
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
    } catch {
      // ignore transient board loading errors
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
}

export const taleSpireDriver = new TaleSpireDriver();
