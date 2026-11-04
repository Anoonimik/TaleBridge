import { TaleSpireCreature } from '../types';
import { useRosterStore } from '../lib/useRosterStore';
import { useAppStore } from '../lib/useAppStore';
import { useLogStore } from '../lib/useLogStore';
import { wsBridge } from './websocket';

declare global {
  interface Window {
    TS?: any;
  }
}

class TaleSpireDriver {
  private isAvailable = false;

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability(): void {
    if (typeof window !== 'undefined' && window.TS) {
      this.isAvailable = true;
      this.initEvents();
    }
  }

  private initEvents(): void {
    if (!window.TS?.creatures) return;

    try {
      window.TS.creatures.onSelectionChanged((selection: any) => {
        if (!selection || !selection.creatures || selection.creatures.length === 0) {
          useRosterStore.getState().setSelectedToken(null);
          return;
        }

        const raw = selection.creatures[0];
        const token: TaleSpireCreature = {
          id: raw.id || raw.creatureId,
          name: raw.name || 'Токен',
          hp: raw.hp?.current,
          hpMax: raw.hp?.max,
        };

        useRosterStore.getState().setSelectedToken(token);
        wsBridge.send('CREATURE_SELECTED', token);
      });
    } catch (e) {
      console.warn('TaleSpire creatures event init error:', e);
    }
  }

  public async rollDice(formula: string, label = 'Бросок', isGmOnly: boolean | null = null): Promise<void> {
    const isSecret = isGmOnly !== null ? isGmOnly : useAppStore.getState().diceSecret;
    useLogStore.getState().addLog('roll', `${label}: ${formula} ${isSecret ? '(Скрытно)' : ''}`);

    if (window.TS?.dice) {
      try {
        const rollObj = [{ name: label, roll: formula }];
        if (isSecret) {
          await window.TS.dice.putDiceInTray(rollObj, true);
        } else {
          await window.TS.dice.putDiceInTray(rollObj, false);
        }
        return;
      } catch (e) {
        console.warn('TaleSpire rollDice fallback:', e);
      }
    }

    // Fallback: send to Obsidian
    wsBridge.send('ROLL_DICE', { formula, name: label });
  }
}

export const taleSpireDriver = new TaleSpireDriver();
