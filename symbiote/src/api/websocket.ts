import { WebSocketMessage, WebSocketMessageType, CombatState, Attack } from '../types';
import { TB_CONFIG } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useCombatStore } from '../store/useCombatStore';
import { useRosterStore } from '../store/useRosterStore';
import { useStoryStore } from '../store/useStoryStore';
import { useLogStore } from '../store/useLogStore';

class WebSocketBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private url: string = TB_CONFIG.WS_URL;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        useAppStore.getState().setConnected(true, 'В сети');
        useLogStore.getState().addLog('Связь с Obsidian установлена', 'sys');

        // Request initial data
        this.send('GET_ROSTER', {});
        this.send('GET_SCENES', {});
        const curChar = useRosterStore.getState().playerCharacterName;
        if (curChar) {
          this.send('GET_PLAYER_DATA', { characterName: curChar });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        useAppStore.getState().setConnected(false, 'Поиск...');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        useAppStore.getState().setConnected(false, 'Ошибка');
        if (this.ws) this.ws.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  send(type: WebSocketMessageType, payload: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }

  private handleMessage(msg: WebSocketMessage) {
    switch (msg.type) {
      case 'CHARACTERS_LIST':
        if (Array.isArray(msg.payload)) {
          useRosterStore.getState().setRoster(msg.payload);
          useCombatStore.getState().syncFromRoster(msg.payload);
        }
        break;

      case 'SCENES_LIST':
        if (Array.isArray(msg.payload)) {
          useStoryStore.getState().setScenes(msg.payload);
        }
        break;

      case 'PLAYER_DATA':
        if (msg.payload) {
          useRosterStore.getState().setPlayerData(msg.payload);
        }
        break;

      case 'COMBAT_STATE':
        if (msg.payload) {
          useCombatStore.getState().setCombatState(msg.payload);
        }
        break;

      case 'BROADCAST_IMAGE':
        useAppStore.getState().setCinemaMedia({
          active: true,
          url: msg.payload?.url || msg.payload?.path,
          type: 'image',
        });
        break;

      case 'PLAY_AUDIO':
        useAppStore.getState().setCinemaMedia({
          active: true,
          url: msg.payload?.url || msg.payload?.path,
          type: 'audio',
        });
        break;

      case 'SYSTEM_NOTICE':
        if (msg.payload?.message) {
          useLogStore.getState().addLog(msg.payload.message, 'sys');
        }
        break;

      default:
        break;
    }
  }

  // --- Convenience Methods ---

  requestRefresh() {
    this.send('GET_ROSTER', {});
    this.send('GET_SCENES', {});
    const curChar = useRosterStore.getState().playerCharacterName;
    if (curChar) {
      this.send('GET_PLAYER_DATA', { characterName: curChar });
    }
    useLogStore.getState().addLog('Запрос обновления из Obsidian...', 'sys');
  }

  syncCombatState(state: CombatState) {
    this.send('SYNC_COMBAT_STATE', state);
  }

  updateCharacterActions(characterName: string, attacks: Attack[]) {
    this.send('UPDATE_CHARACTER_ACTIONS', { characterName, attacks });
  }

  updateCharacterParam(characterName: string, param: string, value: any) {
    this.send('UPDATE_CHARACTER_PARAM', { characterName, param, value });
  }

  rollDice(formula: string, name: string = 'Бросок', isSecret: boolean = false) {
    if (window.TS?.dice?.putDiceInTray) {
      const parts = formula.match(/(\d+)d(\d+)([+-]\d+)?/i);
      if (parts) {
        const count = parseInt(parts[1], 10) || 1;
        const kind = `d${parts[2]}`;
        const diceGroups = [{ Name: name, Count: count, Kind: kind }];
        window.TS.dice.putDiceInTray(diceGroups, isSecret);
        useLogStore.getState().addLog(`Бросок кубиков: ${name} (${formula}) [${isSecret ? 'Скрытый' : 'Открытый'}]`, 'roll');
        return;
      }
    }

    // Fallback simulation
    const d20 = Math.floor(Math.random() * 20) + 1;
    useLogStore.getState().addLog(`${name} (${formula}): Результат ${d20}`, 'roll');
  }
}

export const wsBridge = new WebSocketBridge();
