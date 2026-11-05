import { httpBase, serverInfo } from '../api/endpoint';
// TaleBridge Media Helper Utilities

export function getWebSocketPort(): number {
  return serverInfo().port;
}

/**
 * Resolves local Obsidian vault paths or external URLs into playable/loadable URLs.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/media/')) return httpBase() + trimmed;
  return ''; // Private vault paths are not HTTP resources.
}

/**
 * Extracts YouTube 11-character video ID from any valid YouTube URL.
 */
export function getYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.trim().match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Returns embed URL for YouTube videos.
 */
export function getYouTubeEmbedUrl(url: string | undefined | null, autoplay = true): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}

/**
 * Returns thumbnail URL for YouTube videos.
 */
export function getYouTubeThumbnailUrl(url: string | undefined | null): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Automatically detects media type based on URL / path.
 */
export function detectMediaType(
  url: string | undefined | null
): 'image' | 'video' | 'audio' | 'text' {
  if (!url) return 'image';
  const clean = url.trim().toLowerCase();

  if (getYouTubeVideoId(url)) return 'video';
  if (/\.(mp4|webm|mov|mkv|avi|m4v)(\?.*)?$/i.test(clean)) return 'video';
  if (/\.(mp3|ogg|wav|aac|flac|m4a)(\?.*)?$/i.test(clean)) return 'audio';
  if (/\.(md|txt)$/i.test(clean)) return 'text';
  if (/\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(clean)) return 'image';

  return 'image';
}

/**
 * Sanitizes and cleans a filename to produce a human-friendly title.
 */
export function cleanFileNameToTitle(filePath: string): string {
  if (!filePath) return '';
  const base = filePath.split(/[/\\]/).pop() || '';
  const withoutExt = base.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/[_-]+/g, ' ').trim();
}
