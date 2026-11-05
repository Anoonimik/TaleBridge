import type { Character } from '../../../packages/domain/types';
/** Serializes index changes; only invalidated files are reparsed after the initial scan. */
export class CharacterIndex {
  private records = new Map<string, Character>();
  private dirty = new Set<string>();
  private initialized = false;
  private work: Promise<void> = Promise.resolve();
  constructor(
    private loadAll: () => Promise<Character[]>,
    private loadOne: (path: string) => Promise<Character | null>,
  ) {}
  invalidate(path?: string) {
    if (path) this.dirty.add(path);
    else {
      this.initialized = false;
      this.records.clear();
    }
  }
  upsert(character: Character) {
    if (character.path && this.records.has(character.path))
      this.records.set(character.path, { ...this.records.get(character.path), ...character });
  }
  async list(): Promise<Character[]> {
    const work = this.work
      .catch(() => {})
      .then(async () => {
        if (!this.initialized) {
          const records = await this.loadAll();
          this.records = new Map(records.filter((c) => c.path).map((c) => [c.path!, c]));
          this.initialized = true;
        }
        while (this.dirty.size) {
          const paths = [...this.dirty];
          this.dirty.clear();
          for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            try {
              const record = await this.loadOne(path);
              if (record) this.records.set(path, record);
              else this.records.delete(path);
            } catch (error) {
              for (const pending of paths.slice(i)) this.dirty.add(pending);
              throw error;
            }
          }
        }
      });
    this.work = work;
    await work;
    return [...this.records.values()];
  }
}
