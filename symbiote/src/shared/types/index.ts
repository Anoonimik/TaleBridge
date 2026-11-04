export type CombatSide = 'player' | 'ally' | 'neutral' | 'enemy';

export interface AbilityScores {
  str: string;
  dex: string;
  con: string;
  int: string;
  wis: string;
  cha: string;
}

export type MediaType = 'image' | 'video' | 'text' | 'audio';

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

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
  type: MediaType;
  url?: string;
  text?: string;
  date?: string;
}

export interface DeathSaves {
  successes: number; // 0..3
  failures: number;  // 0..3
}

export interface SpellSlot {
  level: number; // 1..9
  max: number;
  current: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 for cantrip, 1..9
  school?: string;
  time?: string;
  range?: string;
  components?: string;
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  desc?: string;
  dmg?: string;
  prepared?: boolean;
}

export interface ExpendableResource {
  id: string;
  name: string;
  current: number;
  max: number;
  resetOn?: 'short' | 'long' | 'none';
}

export interface HitDice {
  current: number;
  total: number;
  dieType: DieType | string;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface Character {
  name: string;
  path?: string;
  category?: string;
  playable?: boolean;
  tags?: string[];
  hp?: number;
  hp_max?: number;
  temp_hp?: number;
  ac?: number;
  speed?: string;
  race?: string;
  class?: string;
  status?: string;
  level?: number;
  inspiration?: boolean;
  deathSaves?: DeathSaves;
  hitDice?: HitDice;
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  spellSlots?: SpellSlot[];
  spells?: Spell[];
  resources?: ExpendableResource[];
  currency?: Currency;
  savingThrowsProficient?: string[];
  talespire_id?: string;
  talespire_name?: string;
  attacks?: Attack[];
  stats?: AbilityScores | null;
  dexMod?: number;
  inventory?: InventoryItem[];
  playerNotes?: string;
  conditions?: string[];
  skills?: Record<string, 'proficient' | 'expert' | 'none'>;
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
