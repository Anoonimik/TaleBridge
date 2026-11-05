import { concentrationDamage, breaksConcentration } from '../../packages/domain/concentration';
import { randomUUID } from 'node:crypto';
import type { Character, CombatState, Scene, Bookmark } from '../../packages/domain/types';
import {
  APP_VERSION,
  PROTOCOL_VERSION,
  ProtocolError,
  parseCommand,
  isWriteCommand,
  type Command,
  type WireMessage,
} from '../../packages/protocol';
import { cleanDiceFormula } from '../../packages/domain/dice';
import { CharacterRepository } from './vault/repository';
import {
  patchFrontmatter,
  frontmatter,
  replaceSection,
  replaceActions,
  replaceStats,
} from './vault/documents';
import { serializeInventory } from './vault/parsers';
import { SessionManager, type Session, newCode, secretHash } from './server/sessions';
import type { Client } from './server/transport';

export interface ApplicationPorts {
  repository: CharacterRepository;
  vaultName(): string;
  campaignId: string;
  listCharacters(): Promise<Character[]>;
  listScenes(): Promise<Scene[]>;
  readNote(path: string): Promise<string>;
  openNote(path: string): Promise<void>;
  linkCreature(id: string, name: string): Promise<void>;
  selectedCreature?(id: string, name: string): Promise<void>;
  images(): { name: string; path: string }[];
  readAsset(path: string): Promise<Buffer>;
  saveCombat(state: CombatState): Promise<void>;
  send(client: Client, message: WireMessage): void;
  clients(): Iterable<Client>;
  publications?(): Record<string, string>;
  savePublication?(id: string, path: string): Promise<void>;
}
export class BridgeApplication {
  private mutationWork: Promise<unknown> = Promise.resolve();
  private combat: CombatState;
  private bookmarks: Bookmark[] = [];
  private handout: (Command & { type: 'BROADCAST_HANDOUT' }) | null = null;
  private dedupe = new Map<string, Promise<WireMessage>>();
  private assets = new Map<string, string>();
  private tickets = new Map<string, { id: string; session: Session }>();
  private rolls = new Map<
    string,
    { requester: Client; driver: Client; secret: boolean; timer: ReturnType<typeof setTimeout> }
  >();
  constructor(
    readonly sessions: SessionManager,
    private ports: ApplicationPorts,
    combat?: CombatState,
  ) {
    for (const [id, path] of Object.entries(ports.publications?.() || {}))
      this.assets.set(id, path);
    this.combat = combat || { active: false, round: 1, turnIndex: 0, combatants: [] };
    this.combat.revision ||= randomUUID();
  }
  private send(client: Client, type: string, payload: unknown, requestId?: string) {
    this.ports.send(client, { protocolVersion: PROTOCOL_VERSION, type, payload, requestId });
  }
  private members(): Client[] {
    return [...this.ports.clients()].filter((c) => this.sessions.isValid(c.session));
  }
  private requireSession(client: Client): Session {
    if (!this.sessions.isValid(client.session))
      throw new ProtocolError('UNAUTHORIZED', 'Введите код доступа');
    return client.session;
  }
  private gm(client: Client) {
    if (this.requireSession(client).role !== 'gm')
      throw new ProtocolError('FORBIDDEN', 'Требуются права Мастера');
  }
  private driver(): Client {
    const client = this.members().find((c) => c.session?.role === 'gm' && c.session.driver);
    if (!client)
      throw new ProtocolError(
        'DRIVER_OFFLINE',
        'Откройте TaleBridge в TaleSpire и подключитесь как Мастер',
      );
    return client;
  }
  async handle(raw: string, client: Client): Promise<void> {
    let requestId: string | undefined;
    try {
      const input: unknown = JSON.parse(raw);
      if (
        input &&
        typeof input === 'object' &&
        'requestId' in input &&
        typeof input.requestId === 'string'
      )
        requestId = input.requestId.slice(0, 100);
      const command = parseCommand(input);
      if (command.type === 'HANDSHAKE') {
        const session = this.sessions.authenticate(client.peer, command.payload);
        client.session = session;
        clearTimeout(client.authTimer);
        this.send(client, 'HANDSHAKE_ACK', {
          vault: this.ports.vaultName(),
          version: APP_VERSION,
          campaignId: this.ports.campaignId,
          role: session.role,
          characterId: session.characterId,
          token: session.token,
          expires: session.expires,
        });
        this.send(client, 'ACK', { ok: true }, command.requestId);
        await this.snapshot(client);
        return;
      }
      const session = this.requireSession(client);
      const key = `${secretHash(session.token)}:${command.requestId}`;
      if (!this.dedupe.has(key)) {
        if (this.dedupe.size >= 2048) this.dedupe.delete(this.dedupe.keys().next().value!);
        const operation = isWriteCommand(command.type)
          ? this.mutationWork.catch(() => {}).then(() => this.execute(command, client))
          : this.execute(command, client);
        if (isWriteCommand(command.type)) this.mutationWork = operation;
        this.dedupe.set(
          key,
          operation
            .then((data) => ({
              type: 'ACK',
              payload: { ok: true, data },
              requestId: command.requestId,
            }))
            .catch((error) => this.errorMessage(error, command.requestId)),
        );
      }
      this.ports.send(client, {
        ...(await this.dedupe.get(key)!),
        protocolVersion: PROTOCOL_VERSION,
      });
    } catch (error) {
      this.ports.send(client, this.errorMessage(error, requestId));
    }
  }
  private errorMessage(error: unknown, requestId?: string): WireMessage {
    return {
      protocolVersion: PROTOCOL_VERSION,
      type: 'ERROR',
      requestId,
      payload: {
        code: error instanceof ProtocolError ? error.code : 'FAILED',
        message:
          error instanceof ProtocolError
            ? error.message
            : 'Не удалось выполнить действие. Проверьте заметку и обновите данные.',
      },
    };
  }
  private async target(
    client: Client,
    payload: { characterId?: string; characterName?: string },
  ): Promise<Character> {
    const session = this.requireSession(client);
    const list = await this.ports.listCharacters();
    const found = payload.characterId
      ? list.find((c) => c.id === payload.characterId)
      : list.filter((c) => c.name === payload.characterName);
    const character = Array.isArray(found) ? (found.length === 1 ? found[0] : undefined) : found;
    if (!character?.id || (session.role !== 'gm' && character.id !== session.characterId))
      throw new ProtocolError('FORBIDDEN', 'Персонаж недоступен');
    return this.ports.repository.get(character.id);
  }
  private projectCombat(client: Client): CombatState {
    if (client.session?.role === 'gm') return this.combat;
    return {
      ...this.combat,
      combatants: this.combat.combatants.map((c) => ({
        id: c.id,
        name: c.name,
        side: c.side,
        initiative: c.initiative,
        hp: c.isPlayer ? c.hp : 0,
        maxHp: c.isPlayer ? c.maxHp : 0,
        ac: c.isPlayer ? c.ac : 0,
        conditions: c.conditions,
        isPlayer: c.isPlayer,
      })),
    };
  }
  private async sendRoster(client: Client) {
    const list = await this.ports.listCharacters();
    this.send(
      client,
      'CHARACTERS_LIST',
      client.session?.role === 'gm'
        ? list
        : list.filter((c) => c.id === client.session?.characterId),
    );
  }
  async snapshot(client: Client): Promise<void> {
    await this.sendRoster(client);
    this.send(client, 'COMBAT_STATE_UPDATE', this.projectCombat(client));
    if (client.session?.role === 'gm') {
      this.send(client, 'SCENES_LIST', await this.ports.listScenes());
      this.send(client, 'VAULT_IMAGES_LIST', this.imageList(client));
    } else if (client.session?.characterId)
      this.send(client, 'PLAYER_DATA', await this.ports.repository.get(client.session.characterId));
    this.send(client, 'BOOKMARKS_LIST', client.session?.role === 'gm' ? this.bookmarks : []);
    if (this.handout) this.sendHandout(client);
    this.send(
      client,
      'PUBLISHED_MEDIA',
      Object.fromEntries(
        Object.keys(this.ports.publications?.() || {}).map((id) => [id, this.mediaUrl(id, client)]),
      ),
    );
  }
  async refresh(): Promise<void> {
    for (const c of this.members()) await this.snapshot(c);
  }
  private asset(path: string): string {
    if (
      path.includes('\\') ||
      path.split('/').some((p) => !p || p === '.' || p === '..') ||
      !/\.(png|jpe?g|gif|webp|mp4|webm|mp3|ogg|wav)$/i.test(path)
    )
      throw new ProtocolError('INVALID_ASSET', 'Неподдерживаемый файл');
    if (![...this.ports.images()].some((i) => i.path === path))
      throw new ProtocolError('NOT_FOUND', 'Файл не найден');
    const existing = [...this.assets].find(([, p]) => p === path)?.[0];
    if (existing) return existing;
    const id = secretHash(path).slice(0, 32);
    this.assets.set(id, path);
    return id;
  }
  private mediaUrl(id: string, client: Client): string {
    for (const [key, ticket] of this.tickets)
      if (!this.sessions.isValid(ticket.session)) this.tickets.delete(key);
    const existing = [...this.tickets].find(
      ([, ticket]) => ticket.id === id && ticket.session.token === client.session?.token,
    )?.[0];
    if (existing) return `/media/${id}?ticket=${existing}`;
    if (this.tickets.size > 10000)
      throw new ProtocolError('SERVER_BUSY', 'Лимит опубликованных ссылок');
    const ticket = newCode();
    this.tickets.set(ticket, { id, session: this.requireSession(client) });
    return `/media/${id}?ticket=${ticket}`;
  }
  private imageList(client: Client) {
    return this.ports
      .images()
      .filter((image) => /\.(png|jpe?g|gif|webp)$/i.test(image.path))
      .slice(0, 500)
      .map((image) => ({
        name: image.name,
        path: this.mediaUrl(this.asset(image.path), client),
        isPublic: false,
      }));
  }
  async readMedia(id: string, ticket: string): Promise<{ data: Buffer; path: string }> {
    const access = this.tickets.get(ticket);
    if (!access || access.id !== id || !this.sessions.isValid(access.session))
      throw new ProtocolError('FORBIDDEN', 'Материал недоступен');
    const path = this.assets.get(id);
    if (!path) throw new ProtocolError('NOT_FOUND', 'Материал не найден');
    const data = await this.ports.readAsset(path);
    if (data.length > 25 * 1024 * 1024) throw new ProtocolError('TOO_LARGE', 'Файл больше 25 МБ');
    return { data, path };
  }
  private sendHandout(client: Client) {
    if (!this.handout) return;
    const payload = { ...this.handout.payload };
    if (payload.type !== 'text' && payload.url.startsWith('asset:'))
      payload.url = this.mediaUrl(payload.url.slice(6), client);
    this.send(client, 'MEDIA_HANDOUT', payload);
  }
  private async syncCombat(next: CombatState): Promise<void> {
    const characters = await this.ports.listCharacters();
    for (const combatant of next.combatants) {
      const linked = characters.find((c) => c.path === combatant.path && c.playable);
      if (!linked?.id) continue;
      const current = await this.ports.repository.get(linked.id);
      if (
        current.hp === combatant.hp &&
        current.hp_max === combatant.maxHp &&
        (current.temp_hp || 0) === (combatant.tempHp || 0) &&
        !(current.activeConcentration && breaksConcentration(combatant.conditions))
      )
        continue;
      const saved = await this.ports.repository.update(linked.id, current.revision, (content) =>
        patchFrontmatter(content, {
          hp: combatant.hp,
          hp_max: combatant.maxHp,
          talebridge: {
            ...(frontmatter(content).talebridge || {}),
            temp_hp: combatant.tempHp || 0,
            ...concentrationDamage(
              { ...current, conditions: combatant.conditions },
              combatant.hp,
              Math.max(0, (current.hp || 0) - combatant.hp) +
                Math.max(0, (current.temp_hp || 0) - (combatant.tempHp || 0)),
            ),
          },
        }),
      );
      for (const c of this.members())
        if (c.session?.characterId === saved.id) this.send(c, 'PLAYER_DATA', saved);
    }
    const desiredIndex = next.combatants.findIndex((c) => c.id === next.activeCombatantId);
    const turnIndex =
      desiredIndex >= 0
        ? desiredIndex
        : Math.min(next.turnIndex, Math.max(0, next.combatants.length - 1));
    const id = next.combatants[turnIndex]?.id || null;
    const state = { ...next, activeCombatantId: id, turnIndex, revision: randomUUID() };
    await this.ports.saveCombat(state);
    this.combat = state;
    for (const c of this.members()) this.send(c, 'COMBAT_STATE_UPDATE', this.projectCombat(c));
  }
  private async execute(command: Command, client: Client): Promise<unknown> {
    switch (command.type) {
      case 'HANDSHAKE':
        return;
      case 'LOGOUT':
        this.sessions.revoke(this.requireSession(client).token);
        client.session = undefined;
        return;
      case 'REGISTER_DRIVER':
        this.requireSession(client);
        client.session!.driver = command.payload.ready;
        return;
      case 'PING':
        return { time: Date.now() };
      case 'GET_ROSTER':
      case 'GET_CHARACTERS':
        await this.sendRoster(client);
        return;
      case 'GET_SCENES':
        this.gm(client);
        this.send(client, 'SCENES_LIST', await this.ports.listScenes());
        return;
      case 'GET_COMBAT_STATE':
        this.send(client, 'COMBAT_STATE_UPDATE', this.projectCombat(client));
        return;
      case 'GET_CURRENT_HANDOUT':
        this.sendHandout(client);
        return;
      case 'GET_VAULT_IMAGES':
        this.gm(client);
        this.send(client, 'VAULT_IMAGES_LIST', this.imageList(client));
        return;
      case 'GET_PLAYER_DATA':
        this.send(client, 'PLAYER_DATA', await this.target(client, command.payload));
        return;
      case 'GET_NOTE':
      case 'OPEN_IN_OBSIDIAN': {
        this.gm(client);
        const list = await this.ports.listCharacters();
        const character = list.find(
          (c) => c.path === command.payload.path || c.name === command.payload.name,
        );
        const path = command.payload.path || character?.path;
        if (!path) throw new ProtocolError('NOT_FOUND', 'Заметка не найдена');
        if (command.type === 'OPEN_IN_OBSIDIAN') await this.ports.openNote(path);
        else
          this.send(client, 'NOTE_CONTENT', {
            name: character?.name || path,
            path,
            content: await this.ports.readNote(path),
          });
        return;
      }
      case 'LINK_CREATURE_TO_NOTE':
        this.gm(client);
        await this.ports.linkCreature(command.payload.creature.id, command.payload.creature.name);
        return;
      case 'CREATURE_SELECTED':
        this.gm(client);
        if (command.payload)
          await this.ports.selectedCreature?.(command.payload.id, command.payload.name);
        return;
      case 'UPDATE_CHARACTER_HP':
      case 'UPDATE_CHARACTER_PARAM':
      case 'UPDATE_CHARACTER_STATS':
      case 'UPDATE_CHARACTER_ACTIONS':
      case 'UPDATE_CHARACTER_STATE':
      case 'UPDATE_INVENTORY':
      case 'UPDATE_PLAYER_NOTES': {
        const current = await this.target(client, command.payload);
        const saved = await this.ports.repository.update(
          current.id!,
          command.expectedRevision,
          (content) => {
            switch (command.type) {
              case 'UPDATE_CHARACTER_HP':
                return patchFrontmatter(content, {
                  talebridge: {
                    ...(frontmatter(content).talebridge || {}),
                    ...concentrationDamage(
                      current,
                      command.payload.hp,
                      command.payload.damage ?? Math.max(0, (current.hp || 0) - command.payload.hp),
                    ),
                  },
                  hp: command.payload.hp,
                  hp_max: command.payload.maxHp ?? current.hp_max,
                });
              case 'UPDATE_CHARACTER_PARAM': {
                const { param, value } = command.payload;
                if (
                  ['ac', 'level', 'hp_max'].includes(param) &&
                  (typeof value !== 'number' ||
                    value < (param === 'level' ? 1 : 0) ||
                    (param === 'level' && value > 20))
                )
                  throw new ProtocolError('INVALID_PAYLOAD', 'Некорректное число');
                if (!['ac', 'level', 'hp_max'].includes(param) && typeof value !== 'string')
                  throw new ProtocolError('INVALID_PAYLOAD', 'Требуется текст');
                return patchFrontmatter(content, { [param]: value });
              }
              case 'UPDATE_CHARACTER_STATS':
                return replaceStats(content, command.payload.stats);
              case 'UPDATE_CHARACTER_ACTIONS':
                return replaceActions(content, command.payload.attacks);
              case 'UPDATE_INVENTORY':
                return replaceSection(
                  content,
                  'Инвентарь',
                  serializeInventory(command.payload.items),
                );
              case 'UPDATE_PLAYER_NOTES':
                return replaceSection(
                  content,
                  'Заметки игрока',
                  `## Заметки игрока\n\n${command.payload.notes}`,
                );
              case 'UPDATE_CHARACTER_STATE': {
                const fm = frontmatter(content);
                const meta =
                  fm.talebridge && typeof fm.talebridge === 'object' ? fm.talebridge : {};
                return patchFrontmatter(content, {
                  talebridge: { ...meta, ...command.payload.state },
                });
              }
            }
          },
        );
        for (const c of this.members())
          if (c.session?.characterId === saved.id || c.id === client.id)
            this.send(c, 'PLAYER_DATA', saved);
        const combatants = this.combat.combatants.map((c) =>
          c.path === saved.path
            ? { ...c, hp: saved.hp!, maxHp: saved.hp_max!, tempHp: saved.temp_hp || 0 }
            : c,
        );
        if (combatants.some((c, i) => c !== this.combat.combatants[i]))
          await this.syncCombat({ ...this.combat, combatants });
        return { characterId: saved.id, revision: saved.revision };
      }
      case 'SYNC_COMBAT_STATE': {
        this.gm(client);
        if (command.expectedRevision !== this.combat.revision)
          throw new ProtocolError('CONFLICT', 'Состояние боя изменилось');
        await this.syncCombat(command.payload);
        return { revision: this.combat.revision };
      }
      case 'END_PLAYER_TURN': {
        const owner = await this.ports.repository.get(
          this.requireSession(client).characterId || '',
        );
        if (this.combat.combatants[this.combat.turnIndex]?.path !== owner.path)
          throw new ProtocolError('FORBIDDEN', 'Сейчас ход другого участника');
        const next = (this.combat.turnIndex + 1) % this.combat.combatants.length;
        await this.syncCombat({
          ...this.combat,
          turnIndex: next,
          activeCombatantId: this.combat.combatants[next].id,
          round: this.combat.round + (next === 0 ? 1 : 0),
        });
        return;
      }
      case 'BROADCAST_HANDOUT': {
        this.gm(client);
        let url = command.payload.url;
        if (url.startsWith('/media/')) {
          const id = new URL(url, 'http://localhost').pathname.split('/').pop()!;
          if (!this.assets.has(id)) throw new ProtocolError('NOT_FOUND', 'Материал не найден');
          url = `asset:${id}`;
        } else if (!/^https?:\/\//i.test(url) && command.payload.type !== 'text')
          url = `asset:${this.asset(url)}`;
        if (command.payload.type !== 'text' && url.startsWith('asset:')) {
          const id = url.slice(6);
          await this.ports.savePublication?.(id, this.assets.get(id)!);
        }
        this.handout = { ...command, payload: { ...command.payload, url } };
        for (const c of this.members()) this.sendHandout(c);
        return;
      }
      case 'DISMISS_HANDOUT':
        this.gm(client);
        this.handout = null;
        for (const c of this.members()) this.send(c, 'DISMISS_HANDOUT', {});
        return;
      case 'BOOKMARKS_LIST':
        this.gm(client);
        this.bookmarks = command.payload;
        for (const c of this.members())
          if (c.session?.role === 'gm') this.send(c, 'BOOKMARKS_LIST', this.bookmarks);
        return;
      case 'GET_BOOKMARKS':
        this.gm(client);
        this.send(client, 'BOOKMARKS_LIST', this.bookmarks);
        this.send(this.driver(), 'GET_BOOKMARKS', {});
        return;
      case 'GOTO_BOOKMARK':
        this.gm(client);
        this.send(this.driver(), 'GOTO_BOOKMARK', command.payload);
        return;
      case 'ROLL_DICE': {
        if (this.rolls.size >= 100)
          throw new ProtocolError('RATE_LIMIT', 'Слишком много ожидающих бросков');
        if (this.rolls.has(command.payload.rollId))
          throw new ProtocolError('CONFLICT', 'Идентификатор броска уже используется');
        const driver = client.session?.driver ? client : this.driver(),
          secret = client.session?.role === 'gm' && Boolean(command.payload.isGmOnly);
        const timer = setTimeout(() => {
          this.rolls.delete(command.payload.rollId);
          this.send(client, 'ROLL_ERROR', {
            rollId: command.payload.rollId,
            message: 'Истекло время ожидания броска',
          });
        }, 60000);
        this.rolls.set(command.payload.rollId, { requester: client, driver, secret, timer });
        this.send(driver, 'ROLL_DICE', {
          ...command.payload,
          formula: cleanDiceFormula(command.payload.formula),
          isGmOnly: secret,
        });
        return;
      }
      case 'DICE_RESULT': {
        const roll = this.rolls.get(command.payload.rollId);
        if (!roll || roll.driver !== client)
          throw new ProtocolError('FORBIDDEN', 'Неизвестный результат броска');
        clearTimeout(roll.timer);
        this.rolls.delete(command.payload.rollId);
        this.send(roll.requester, 'DICE_RESULT', command.payload);
        return;
      }
    }
  }
  disconnect(client: Client) {
    for (const [id, roll] of this.rolls)
      if (roll.driver === client || roll.requester === client) {
        clearTimeout(roll.timer);
        this.rolls.delete(id);
        if (roll.requester !== client)
          this.send(roll.requester, 'ROLL_ERROR', {
            rollId: id,
            message: 'Исполнитель броска отключился',
          });
      }
  }
  async rollFromHost(formula: string, name: string) {
    return this.execute(
      {
        protocolVersion: PROTOCOL_VERSION,
        requestId: randomUUID(),
        type: 'ROLL_DICE',
        payload: { formula, name, rollId: randomUUID(), isGmOnly: false },
      },
      this.driver(),
    );
  }
  bookmarksForHost() {
    return this.bookmarks;
  }
  remapAssets(oldPath: string, newPath: string) {
    for (const [id, path] of this.assets) {
      if (path === oldPath || path.startsWith(oldPath + '/'))
        this.assets.set(id, newPath + path.slice(oldPath.length));
    }
  }
  gotoFromHost(id: string) {
    this.send(this.driver(), 'GOTO_BOOKMARK', { id });
  }
  dispose() {
    for (const roll of this.rolls.values()) clearTimeout(roll.timer);
    this.rolls.clear();
    this.dedupe.clear();
    this.tickets.clear();
    this.sessions.revokeAll();
  }
}
