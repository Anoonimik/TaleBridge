export type CombatSide = 'player' | 'ally' | 'neutral' | 'enemy';

export interface AbilityScores {
  str: string;
  dex: string;
  con: string;
  int: string;
  wis: string;
  cha: string;
}

export interface Attack {
  name: string;
  hit?: string;
  dmg?: string;
  type?: string;
  desc?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  equipped?: boolean;
  quantity?: number;
  weight?: number;
  category?: string;
  description?: string;
}

export interface Bookmark {
  id: string;
  name: string;
}

export interface Clue {
  id: string;
  title: string;
  type: 'image' | 'video' | 'text' | 'audio';
  url?: string;
  text?: string;
  date?: string;
}

export interface Character {
  name: string;
  path?: string;
  category?: string;
  playable?: boolean;
  tags?: string[];
  hp?: number;
  hp_max?: number;
  ac?: number;
  speed?: string;
  race?: string;
  class?: string;
  status?: string;
  level?: number;
  talespire_id?: string;
  talespire_name?: string;
  attacks?: Attack[];
  stats?: AbilityScores | null;
  dexMod?: number;
  inventory?: InventoryItem[];
  playerNotes?: string;
}

export interface Combatant {
  id: string;
  name: string;
  side: CombatSide;
  initiative: number;
  hp: number;
  maxHp: number;
  tempHp?: number;
  ac: number;
  speed?: string;
  conditions: string[];
  notes?: string;
  isPlayer?: boolean;
  category?: string;
  path?: string | null;
  talespireId?: string | null;
  stats?: AbilityScores | null;
  dexMod?: number;
  attacks?: Attack[];
}

export interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
}

export interface ScenePersona {
  title: string;
  body: string;
}

export interface SceneMechanic {
  type: string;
  title: string;
  content: string;
}

export interface Scene {
  id: string;
  scene_id?: string;
  session?: string;
  file?: string;
  path?: string;
  title: string;
  goal?: string;
  sensory?: string;
  location?: string;
  target?: string;
  readAloud?: string | string[];
  personas?: ScenePersona[];
  clues?: string[];
  branches?: string[];
  nudge?: string;
  dialogues?: string[];
  cast?: string[];
  mechanics?: SceneMechanic[];
  raw?: string;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  requestId?: string;
}

export interface ConditionMeta {
  name: string;
  label: string;
  color: string;
  desc: string;
}

export interface TaleSpireCreature {
  id: string;
  name: string;
  hp?: number;
  hpMax?: number;
}
