export interface TSToken {
  id: string;
  name: string;
  hp?: number;
  maxHp?: number;
}

export interface TSDiceRoll {
  rollId?: string;
  formula?: string;
  results?: number[];
  total?: number;
}

declare global {
  interface Window {
    TS?: {
      dice?: {
        putDiceInTray: (diceGroups: any[], isSecret?: boolean) => Promise<string>;
      };
      creatures?: {
        getSelectedCreatures: () => Promise<any[]>;
        setHp: (id: string, hp: number) => Promise<void>;
      };
      sync?: {
        setCampaignState: (key: string, val: any) => Promise<void>;
        getCampaignState: (key: string) => Promise<any>;
      };
    };
  }
}
