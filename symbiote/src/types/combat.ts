import { AbilityScores, Attack } from './character';

export type CombatSide = 'Враги' | 'Союзники' | 'Нейтрал' | 'Игроки';

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: string;
  category: CombatSide | string;
  isPlayer: boolean;
  conditions: string[];
  creatureId?: string | null;
  path?: string | null;
  stats?: AbilityScores;
  dexMod?: number;
  attacks: Attack[];
}

export interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
}

export interface ConditionMeta {
  id: string;
  name: string;
  en: string;
  color: string;
  desc: string;
}
