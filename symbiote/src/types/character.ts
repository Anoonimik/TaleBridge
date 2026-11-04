export interface AbilityScores {
  str?: number | string;
  dex?: number | string;
  con?: number | string;
  int?: number | string;
  wis?: number | string;
  cha?: number | string;
}

export interface Attack {
  name: string;
  type?: string;
  hit?: string;
  dmg?: string;
  desc?: string;
  range?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty?: number;
  weight?: number;
  category?: 'Оружие' | 'Броня' | 'Зелья' | 'Свитки' | 'Снаряжение' | string;
  equipped?: boolean;
  desc?: string;
}

export interface Clue {
  id: string;
  title: string;
  content: string;
  location?: string;
  archived?: boolean;
}

export interface Character {
  name: string;
  class?: string;
  category?: 'Игроки' | 'Союзники' | 'Враги' | 'Бестиарий' | 'Нейтрал' | string;
  playable?: boolean;
  isPlayer?: boolean;
  hp?: number;
  hp_max?: number;
  maxHp?: number;
  ac?: number;
  speed?: string;
  stats?: AbilityScores;
  dexMod?: number;
  attacks?: Attack[];
  inventory?: InventoryItem[];
  clues?: Clue[];
  path?: string | null;
  pinned?: boolean;
  avatar?: string;
  noteContent?: string;
}

export interface SceneCheck {
  skill: string;
  dc: number;
  success: string;
  fail: string;
}

export interface SceneBranch {
  choice: string;
  targetScene: string;
  condition?: string;
}

export interface Scene {
  id: string;
  title: string;
  path?: string;
  location?: string;
  target?: string;
  readAloud?: string[];
  roleplay?: string[];
  checks?: SceneCheck[];
  branches?: SceneBranch[];
  secrets?: string[];
  npcs?: string[];
  monsters?: string[];
}
