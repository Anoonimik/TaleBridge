import { Character, Scene } from './character';
import { CombatState } from './combat';

export type WebSocketMessageType =
  | 'PING'
  | 'PONG'
  | 'GET_ROSTER'
  | 'CHARACTERS_LIST'
  | 'GET_SCENES'
  | 'SCENES_LIST'
  | 'GET_PLAYER_DATA'
  | 'PLAYER_DATA'
  | 'GET_NOTE'
  | 'OPEN_NOTE'
  | 'NOTE_CONTENT'
  | 'UPDATE_CHARACTER_ACTIONS'
  | 'UPDATE_CHARACTER_PARAM'
  | 'SYNC_COMBAT_STATE'
  | 'COMBAT_STATE'
  | 'BROADCAST_IMAGE'
  | 'PLAY_AUDIO'
  | 'SYSTEM_NOTICE';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload?: T;
  timestamp?: number;
}
