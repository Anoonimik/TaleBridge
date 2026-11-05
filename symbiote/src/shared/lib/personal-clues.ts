import { archiveMediaUrl } from './media';
import type { Clue } from '../types';
import { storageKey, getStoredArray } from './character-storage';
import { STORAGE_KEYS } from '../config/constants';
import { z } from 'zod';

const clueSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['image', 'video', 'audio', 'text']),
  url: z.string().optional(),
  text: z.string().optional(),
  date: z.string().optional(),
});
const archiveSchema = z.object({ items: z.array(clueSchema) });
export type PersonalArchive = z.infer<typeof archiveSchema>;
let owner: string | undefined;
export function configureClueStorage(identity?: string) {
  owner = identity;
}

/** Session tickets change on reconnect; the publication ID is the same material. */
export function clueKey(clue: Pick<Clue, 'type' | 'url' | 'title' | 'text'>): string {
  const url = archiveMediaUrl(clue.url || '');
  return JSON.stringify([clue.type, url, clue.title || '', clue.text || '']);
}
export function readPersonalClues(): PersonalArchive {
  if (!owner) return { items: [] };
  const raw = localStorage.getItem(storageKey(`clues:${owner}`));
  if (raw !== null) {
    const archive = archiveSchema.parse(JSON.parse(raw));
    return {
      ...archive,
      items: archive.items.map((clue) => ({
        ...clue,
        url: clue.url ? archiveMediaUrl(clue.url) : clue.url,
      })),
    };
  }
  // Retain the old shared archive as an unchanged backup. Each account gets its own copy.
  const items = getStoredArray<unknown>(STORAGE_KEYS.CLUES_ARCHIVE).flatMap((value) => {
    const parsed = clueSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  return {
    items: items.map((clue) => ({ ...clue, url: clue.url ? archiveMediaUrl(clue.url) : clue.url })),
  };
}
export function writePersonalClues(archive: PersonalArchive) {
  if (!owner) throw new Error('Подключитесь к кампании перед изменением архива.');
  localStorage.setItem(storageKey(`clues:${owner}`), JSON.stringify(archive));
}
