import { randomUUID } from 'node:crypto';
import type { Character } from '../../../packages/domain/types';
import { ProtocolError } from '../../../packages/protocol';
import { frontmatter, patchFrontmatter, readCharacter, revisionOf } from './documents';

export interface NoteFile {
  path: string;
  basename: string;
  extension: string;
}
export interface VaultPort {
  getMarkdownFiles(): NoteFile[];
  read(file: NoteFile): Promise<string>;
  process(file: NoteFile, update: (content: string) => string): Promise<string>;
  backup?(file: NoteFile, content: string): Promise<void>;
}
export class CharacterRepository {
  private paths = new Map<string, NoteFile>();
  private queues = new Map<string, Promise<unknown>>();
  constructor(
    private vault: VaultPort,
    private onChanged?: (character: Character) => void,
  ) {}
  async identify(file: NoteFile): Promise<Character> {
    let content = await this.vault.read(file);
    if (!frontmatter(content).talebridge_id) {
      await this.vault.backup?.(file, content);
      content = await this.vault.process(file, (raw) =>
        frontmatter(raw).talebridge_id
          ? raw
          : patchFrontmatter(raw, { talebridge_id: randomUUID() }),
      );
    }
    const character = readCharacter(file.path, content);
    this.paths.set(character.id!, file);
    return character;
  }
  async get(id: string): Promise<Character> {
    const file = this.paths.get(id);
    if (!file || !this.vault.getMarkdownFiles().some((f) => f.path === file.path))
      throw new ProtocolError('NOT_FOUND', 'Персонаж не найден');
    const character = readCharacter(file.path, await this.vault.read(file));
    if (character.id !== id)
      throw new ProtocolError('NOT_FOUND', 'Идентификатор персонажа изменился');
    return character;
  }
  async update(
    id: string,
    expected: string | undefined,
    transform: (content: string) => string,
  ): Promise<Character> {
    if (!expected)
      throw new ProtocolError('REVISION_REQUIRED', 'Требуется актуальная версия персонажа');
    const previous = this.queues.get(id) || Promise.resolve();
    const operation = previous
      .catch(() => {})
      .then(async () => {
        const file = this.paths.get(id);
        if (!file) throw new ProtocolError('NOT_FOUND', 'Персонаж не найден');
        const result = await this.vault.process(file, (content) => {
          if (frontmatter(content).talebridge_id !== id)
            throw new ProtocolError('NOT_FOUND', 'Персонаж изменился');
          if (revisionOf(content) !== expected)
            throw new ProtocolError(
              'CONFLICT',
              'Заметка изменилась. Обновите данные и повторите правку.',
            );
          return transform(content);
        });
        const saved = readCharacter(file.path, result);
        this.onChanged?.(saved);
        return saved;
      });
    this.queues.set(id, operation);
    try {
      return await operation;
    } finally {
      if (this.queues.get(id) === operation) this.queues.delete(id);
    }
  }
}
