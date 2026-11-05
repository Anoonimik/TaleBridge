import { z } from 'zod';

export const PROTOCOL_VERSION = 1;
export const APP_VERSION = '0.7.0';
const text = z.string().max(4096);
const line = z
  .string()
  .max(500)
  .refine((s) => !/[\r\n`]/.test(s), 'Single-line text required');
const amount = z.number().finite().min(0).max(100000);
const count = amount.int();
const abilityValue = line.regex(/^(?:[1-9]|[12]\d|30)(?:\s*\([+-]?\d{1,2}\))?$/);
const ability = z.object({
  str: abilityValue,
  dex: abilityValue,
  con: abilityValue,
  int: abilityValue,
  wis: abilityValue,
  cha: abilityValue,
});
export const attackSchema = z.object({
  name: line.min(1),
  hit: line.optional(),
  dmg: line.optional(),
  type: line.optional(),
  desc: line.optional(),
});
export const inventorySchema = z
  .array(
    z.object({
      id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
      name: line.min(1),
      equipped: z.boolean().optional(),
      quantity: count.min(1).optional(),
      weight: amount.optional(),
      category: line.optional(),
      description: text.optional(),
    }),
  )
  .max(1000)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    'Duplicate inventory ID',
  );
export const stateSchema = z.object({
  currency: z.object({ cp: count, sp: count, ep: count, gp: count, pp: count }).optional(),
  activeConcentration: z
    .object({ spellId: line.optional(), spellName: line, instanceId: line })
    .nullable()
    .optional(),
  concentrationChecks: z
    .array(z.object({ id: line, dc: count, damage: count }))
    .max(100)
    .optional(),
  temp_hp: count.optional(),
  inspiration: z.boolean().optional(),
  deathSaves: z
    .object({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) })
    .optional(),
  hitDice: z
    .object({
      current: count,
      total: count,
      dieType: z.enum(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']),
    })
    .refine((v) => v.current <= v.total)
    .optional(),
  spellcastingAbility: z.enum(['int', 'wis', 'cha']).optional(),
  spellSlots: z
    .array(
      z
        .object({ level: z.number().int().min(1).max(9), max: count, current: count })
        .refine((v) => v.current <= v.max),
    )
    .max(9)
    .optional(),
  spells: z
    .array(
      z.object({
        id: line,
        name: line,
        level: z.number().int().min(0).max(9),
        school: line.optional(),
        time: line.optional(),
        range: line.optional(),
        components: line.optional(),
        duration: line.optional(),
        concentration: z.boolean().optional(),
        ritual: z.boolean().optional(),
        desc: text.optional(),
        dmg: line.optional(),
        prepared: z.boolean().optional(),
      }),
    )
    .max(1000)
    .optional(),
  resources: z
    .array(
      z
        .object({
          id: line,
          name: line,
          current: count,
          max: count,
          resetOn: z.enum(['short', 'long', 'none']).optional(),
        })
        .refine((v) => v.current <= v.max),
    )
    .max(100)
    .optional(),
  savingThrowsProficient: z
    .array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']))
    .max(6)
    .optional(),
  skills: z.record(z.string().max(80), z.enum(['none', 'proficient', 'expert'])).optional(),
});
export const combatantSchema = z
  .object({
    id: line.min(1),
    name: line,
    side: z.enum(['player', 'ally', 'neutral', 'enemy']),
    initiative: z.number().finite().min(-100).max(1000),
    hp: count,
    maxHp: count,
    tempHp: count.optional(),
    ac: count,
    speed: line.optional(),
    conditions: z.array(line).max(100),
    notes: text.optional(),
    isPlayer: z.boolean().optional(),
    category: line.optional(),
    path: line.nullish(),
    talespireId: line.nullish(),
    stats: ability.nullish(),
    dexMod: z.number().min(-30).max(30).optional(),
    attacks: z.array(attackSchema).max(100).optional(),
  })
  .refine((v) => v.hp <= v.maxHp);
export const combatSchema = z
  .object({
    active: z.boolean(),
    round: z.number().int().min(1).max(100000),
    turnIndex: count,
    activeCombatantId: line.nullish(),
    combatants: z.array(combatantSchema).max(500),
  })
  .refine(
    (v) => new Set(v.combatants.map((c) => c.id)).size === v.combatants.length,
    'Duplicate combatant ID',
  );
export const mediaSchema = z
  .object({
    type: z.enum(['image', 'video', 'audio', 'text']),
    url: text,
    title: line.optional(),
    description: z.string().max(100000).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => !/^\s*(?:javascript|file|data):/i.test(v.url), 'Unsupported media URL');
const target = z
  .object({ characterId: line.optional(), characterName: line.optional() })
  .refine((v) => Boolean(v.characterId || v.characterName));
const empty = z.object({});
export const commandPayloads = {
  HANDSHAKE: z.object({
    role: z.enum(['gm', 'player']),
    code: z.string().max(256).optional(),
    token: z.string().max(256).optional(),
    driver: z.boolean().optional(),
  }),
  LOGOUT: empty,
  PING: empty,
  GET_ROSTER: empty,
  GET_CHARACTERS: empty,
  GET_SCENES: empty,
  GET_COMBAT_STATE: empty,
  REGISTER_DRIVER: z.object({ ready: z.boolean() }),
  GET_CURRENT_HANDOUT: empty,
  GET_VAULT_IMAGES: empty,
  GET_BOOKMARKS: empty,
  GET_PLAYER_DATA: target,
  GET_NOTE: z
    .object({ path: line.optional(), name: line.optional() })
    .refine((v) => Boolean(v.path || v.name)),
  OPEN_IN_OBSIDIAN: z.object({ path: line.optional(), name: line.optional() }),
  UPDATE_CHARACTER_HP: target
    .safeExtend({ hp: count, maxHp: count.optional(), damage: count.optional() })
    .refine((v) => v.maxHp === undefined || v.hp <= v.maxHp),
  UPDATE_CHARACTER_PARAM: target.safeExtend({
    param: z.enum(['ac', 'speed', 'level', 'status', 'race', 'class', 'hp_max']),
    value: z.union([line, count]),
  }),
  UPDATE_CHARACTER_STATS: target.safeExtend({ stats: ability }),
  UPDATE_CHARACTER_ACTIONS: target.safeExtend({ attacks: z.array(attackSchema).max(100) }),
  UPDATE_INVENTORY: target.safeExtend({ items: inventorySchema }),
  UPDATE_PLAYER_NOTES: target.safeExtend({ notes: z.string().max(200000) }),
  UPDATE_CHARACTER_STATE: target.safeExtend({ state: stateSchema }),
  BROADCAST_HANDOUT: mediaSchema,
  DISMISS_HANDOUT: empty,
  SYNC_COMBAT_STATE: combatSchema,
  END_PLAYER_TURN: empty,
  BOOKMARKS_LIST: z.array(z.object({ id: line, name: line })).max(1000),
  ROLL_DICE: z.object({
    formula: line,
    name: line,
    rollId: line,
    isGmOnly: z.boolean().optional(),
  }),
  DICE_RESULT: z.object({ rollId: line, total: z.number().finite(), raw: z.unknown().optional() }),
  GOTO_BOOKMARK: z.object({ id: line.optional(), name: line.optional() }),
  CREATURE_SELECTED: z
    .object({ id: line, name: line, hp: count.optional(), hpMax: count.optional() })
    .nullable(),
  LINK_CREATURE_TO_NOTE: z.object({ creature: z.object({ id: line, name: line }) }),
};
export type CommandType = keyof typeof commandPayloads;
export type Command = {
  [K in CommandType]: {
    protocolVersion: typeof PROTOCOL_VERSION;
    requestId: string;
    type: K;
    payload: z.infer<(typeof commandPayloads)[K]>;
    expectedRevision?: string;
  };
}[CommandType];
export type WireMessage<T = unknown> = {
  type: string;
  payload: T;
  requestId?: string;
  protocolVersion?: number;
};
const envelope = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  requestId: z.string().min(1).max(100),
  type: z.string().max(80),
  payload: z.unknown(),
  expectedRevision: z.string().max(128).optional(),
});
export class ProtocolError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function parseCommand(input: unknown): Command {
  const result = envelope.safeParse(input);
  if (!result.success)
    throw new ProtocolError('INVALID_MESSAGE', 'Неверное сообщение или версия протокола');
  const message = result.data;
  const schema = commandPayloads[message.type as CommandType];
  if (!schema) throw new ProtocolError('UNKNOWN_COMMAND', 'Неизвестная команда');
  const payload = schema.safeParse(message.payload);
  if (!payload.success) throw new ProtocolError('INVALID_PAYLOAD', 'Неверные параметры команды');
  return { ...message, payload: payload.data } as Command;
}
export const isWriteCommand = (type: string) =>
  type.startsWith('UPDATE_') || ['SYNC_COMBAT_STATE', 'END_PLAYER_TURN'].includes(type);
export const handshakeSchema = z.object({
  vault: z.string(),
  version: z.string(),
  campaignId: z.string().min(1),
  role: z.enum(['gm', 'player']),
  characterId: z.string().optional(),
  token: z.string().min(1),
  expires: z.number().finite(),
});
