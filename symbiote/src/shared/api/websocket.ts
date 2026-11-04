import { WebSocketMessage } from '../types';
import { useAppStore } from '../lib/useAppStore';
import { useRosterStore } from '../lib/useRosterStore';
import { useStoryStore } from '../lib/useStoryStore';
import { useCombatStore } from '../lib/useCombatStore';
import { useLogStore } from '../lib/useLogStore';

type MessageListener = (payload: any) => void;

class WebSocketBridge {
  private ws: WebSocket | null = null;
  private port = 30123;
  private reconnectTimer: any = null;
  private listeners: Map<string, Set<MessageListener>> = new Map();

  constructor() {
    this.connect();
  }

  public connect(port = 30123): void {
    this.port = port;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }

    const url = `ws://127.0.0.1:${this.port}`;
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        useAppStore.getState().setConnected(true);
        useLogStore.getState().addLog('sync', `Подключено к Obsidian на порту ${this.port}`);
        this.send('HANDSHAKE', { client: 'TaleSpire-Symbiote-React' });
        this.send('GET_CHARACTERS', {});
        this.send('GET_SCENES', {});
        this.send('GET_COMBAT_STATE', {});
        this.send('GET_VAULT_IMAGES', {});
        this.send('GET_BOOKMARKS', {});

        const activePlayer = useRosterStore.getState().playerCharacterName;
        if (activePlayer) {
          this.send('GET_PLAYER_DATA', { characterName: activePlayer });
        }
      };

      this.ws.onclose = () => {
        useAppStore.getState().setConnected(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        useAppStore.getState().setConnected(false);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.port);
    }, 2500);
  }

  public send(type: string, payload: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  public subscribe(type: string, listener: MessageListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(type);
      }
    };
  }

  private handleMessage(msg: { type: string; payload: any }): void {
    const { type, payload } = msg;

    switch (type) {
      case 'HANDSHAKE_ACK':
        if (payload?.vault) useAppStore.getState().setVaultName(payload.vault);
        if (payload?.gmPin !== undefined) useAppStore.getState().setGmPin(String(payload.gmPin));
        break;

      case 'CONFIG_UPDATE':
        if (payload?.gmPin !== undefined) {
          useAppStore.getState().setGmPin(String(payload.gmPin));
        }
        break;

      case 'CHARACTERS_LIST':
        if (Array.isArray(payload)) {
          useRosterStore.getState().setRoster(payload);
          useLogStore.getState().addLog('sync', `Обновлен ростер: ${payload.length} записей`);

          const currentName = useRosterStore.getState().playerCharacterName;
          if (currentName) {
            this.send('GET_PLAYER_DATA', { characterName: currentName });
          } else if (payload.length > 0) {
            const firstPlayer = payload.find((c: any) => c.playable || c.category === 'Игроки');
            if (firstPlayer) {
              useRosterStore.getState().setPlayerCharacterName(firstPlayer.name);
            }
          }
        }
        break;

      case 'SCENES_LIST':
        if (Array.isArray(payload)) {
          useStoryStore.getState().setScenes(payload);
          useLogStore.getState().addLog('sync', `Обновлены сцены: ${payload.length} записей`);
        }
        break;

      case 'COMBAT_STATE_UPDATE':
        if (payload) {
          useCombatStore.getState().setFromSync(payload);
        }
        break;

      case 'PLAYER_DATA':
        if (payload) {
          useRosterStore.getState().setPlayerData(payload);
        }
        break;

      case 'NOTE_CONTENT':
        if (payload) {
          useRosterStore.getState().setNoteContent(payload);
        }
        break;

      case 'VAULT_IMAGES_LIST':
        if (Array.isArray(payload)) {
          useAppStore.getState().setVaultImages(payload);
        }
        break;

      case 'BOOKMARKS_LIST':
        if (Array.isArray(payload)) {
          useAppStore.getState().setBookmarks(payload);
        }
        break;

      case 'MEDIA_HANDOUT':
        if (payload) {
          useAppStore.getState().setCinemaMedia({ ...payload, active: true });
        }
        break;

      case 'DISMISS_HANDOUT':
        useAppStore.getState().setCinemaMedia(null);
        break;

      case 'CONFIG_UPDATE':
        if (payload?.gmPin !== undefined) {
          useAppStore.getState().setGmPin(payload.gmPin);
        }
        break;
    }

    const custom = this.listeners.get(type);
    if (custom) {
      custom.forEach((listener) => {
        try {
          listener(payload);
        } catch (e) {
          console.error(`Error in listener for ${type}:`, e);
        }
      });
    }
  }
}

export const wsBridge = new WebSocketBridge();
